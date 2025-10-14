import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

type MesInfo = { key: string; label: string; ano: number; mes: number };

function parseMesKey(key: string): { start: Date; end: Date; ano: number; mes: number } | null {
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(key);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (!Number.isFinite(ano) || !Number.isFinite(mes) || mes < 1 || mes > 12) return null;
  const start = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const end = new Date(ano, mes, 0, 23, 59, 59, 999);
  return { start, end, ano, mes };
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(ano: number, mes: number): string {
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

function isCMVCategory(nome?: string | null, descricao?: string | null): boolean {
  const s = `${nome || ""} ${descricao || ""}`.toLowerCase();
  return s.includes("cmv") || s.includes("cpv") || s.includes("csp");
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  let session;
  try {
    session = await assertSessionToken(sessionCookie);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const mesesParam = (url.searchParams.get("meses") || "").split(",").map(s => s.trim()).filter(Boolean);
    const categoriasParam = (url.searchParams.get("categorias") || "").split(",").map(s => s.trim()).filter(Boolean);
    const tipoParam = (url.searchParams.get("tipo") || "competencia").toLowerCase() as 'caixa' | 'competencia';

    if (mesesParam.length === 0) {
      return NextResponse.json({ error: "Meses não informados" }, { status: 400 });
    }

    // Build month windows
    const parsed = mesesParam.map(parseMesKey).filter(Boolean) as Array<{ start: Date; end: Date; ano: number; mes: number }>;
    if (parsed.length === 0) {
      return NextResponse.json({ error: "Meses inválidos" }, { status: 400 });
    }
    // Sort ascending by ano/mes
    parsed.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
    const meses: MesInfo[] = parsed.map(({ ano, mes }) => ({
      key: `${ano}-${String(mes).padStart(2, "0")}`,
      label: monthLabel(ano, mes),
      ano,
      mes,
    }));

    const rangeStart = parsed[0].start;
    const rangeEnd = parsed[parsed.length - 1].end;

    // Load categorias de despesa do usuário (limitadas às selecionadas se houver filtro)
    const whereCategoria: any = { userId: session.sub };
    if (categoriasParam.length > 0) whereCategoria.id = { in: categoriasParam };
    const categorias = await prisma.categoria.findMany({
      where: whereCategoria,
      select: { id: true, nome: true, descricao: true, tipo: true },
    });
    // Focar em DESPESA para o DRE (lista de categorias para tabela)
    const categoriasDespesa = categorias.filter(c => (c.tipo || "").toUpperCase() === "DESPESA");
    const categoriaIdsDespesa = new Set(categoriasDespesa.map(c => c.id));

    // Definir critérios de data baseado no tipo de visualização
    // Por enquanto, ambos usam a mesma lógica (dataPagamento/dataRecebimento)
    // No futuro, caixa usará dataPagamento e competência usará dataVencimento
    const getDateCriteria = (tipo: 'caixa' | 'competencia') => {
      if (tipo === 'caixa') {
        // Caixa: usar data de pagamento/recebimento (efetivo)
        return {
          pagar: [
            { dataPagamento: { gte: rangeStart, lte: rangeEnd } },
            { AND: [{ dataPagamento: null }, { dataVencimento: { gte: rangeStart, lte: rangeEnd } }] },
          ],
          receber: [
            { dataRecebimento: { gte: rangeStart, lte: rangeEnd } },
            { AND: [{ dataRecebimento: null }, { dataVencimento: { gte: rangeStart, lte: rangeEnd } }] },
          ],
        };
      } else {
        // Competência: usar data de vencimento (competência)
        return {
          pagar: [
            { dataVencimento: { gte: rangeStart, lte: rangeEnd } },
          ],
          receber: [
            { dataVencimento: { gte: rangeStart, lte: rangeEnd } },
          ],
        };
      }
    };

    const dateCriteria = getDateCriteria(tipoParam);

    // Contas a pagar (despesas)
    const wherePagar: any = {
      userId: session.sub,
      OR: dateCriteria.pagar,
    };
    if (categoriasParam.length > 0) wherePagar.categoriaId = { in: categoriasParam };

    const contasPagar = await prisma.contaPagar.findMany({
      where: wherePagar,
      select: {
        valor: true,
        dataPagamento: true,
        dataVencimento: true,
        categoriaId: true,
        categoria: { select: { id: true, nome: true, descricao: true } },
      },
    });

    // Contas a receber (receitas)
    const whereReceber: any = {
      userId: session.sub,
      OR: dateCriteria.receber,
    };
    const contasReceber = await prisma.contaReceber.findMany({
      where: whereReceber,
      select: {
        valor: true,
        dataRecebimento: true,
        dataVencimento: true,
        categoriaId: true,
        categoria: { select: { id: true, nome: true, descricao: true } },
      },
    });

    // Prepare outputs keyed by month
    const receitasPorMes: Record<string, number> = {};
    const despesasPorMes: Record<string, number> = {};
    const cmvPorMes: Record<string, number> = {};
    const valoresPorCategoriaMes: Record<string, Record<string, number>> = {};

    for (const m of meses) {
      receitasPorMes[m.key] = 0;
      despesasPorMes[m.key] = 0;
      cmvPorMes[m.key] = 0;
    }

    // Helper map for category CMV detection
    const cmvCategoryIds = new Set<string>();
    for (const c of categoriasDespesa) {
      if (isCMVCategory(c.nome, c.descricao)) cmvCategoryIds.add(c.id);
    }

    // Aggregate despesas (contas a pagar) por categoria e mês
    for (const row of contasPagar) {
      // Escolher data baseada no tipo de visualização
      const d = tipoParam === 'caixa' 
        ? (row.dataPagamento || row.dataVencimento)  // Caixa: prioriza dataPagamento
        : row.dataVencimento;                        // Competência: sempre dataVencimento
      
      if (!d) continue;
      const key = monthKey(new Date(d));
      if (!receitasPorMes.hasOwnProperty(key)) continue; // fora dos meses solicitados
      const catId = row.categoriaId || row.categoria?.id || "sem_categoria";
      if (!valoresPorCategoriaMes[catId]) valoresPorCategoriaMes[catId] = {};
      valoresPorCategoriaMes[catId][key] = (valoresPorCategoriaMes[catId][key] || 0) + Number(row.valor || 0);
      despesasPorMes[key] += Number(row.valor || 0);
      if (cmvCategoryIds.has(catId)) cmvPorMes[key] += Number(row.valor || 0);
    }

    // Aggregate receitas (contas a receber) por mês
    for (const row of contasReceber) {
      // Escolher data baseada no tipo de visualização
      const d = tipoParam === 'caixa' 
        ? (row.dataRecebimento || row.dataVencimento)  // Caixa: prioriza dataRecebimento
        : row.dataVencimento;                          // Competência: sempre dataVencimento
      
      if (!d) continue;
      const key = monthKey(new Date(d));
      if (!receitasPorMes.hasOwnProperty(key)) continue;
      receitasPorMes[key] += Number(row.valor || 0);
    }

    // Filter categorias to those present in DESPESA set or that appear in valores
    const categoriasOut = categoriasDespesa.filter(c => {
      return valoresPorCategoriaMes[c.id] || categoriasParam.length === 0 || categoriaIdsDespesa.has(c.id);
    }).map(c => ({ id: c.id, nome: c.nome, descricao: c.descricao }));

    // Totals
    const totalReceitas = Object.values(receitasPorMes).reduce((a, b) => a + b, 0);
    const totalDespesas = Object.values(despesasPorMes).reduce((a, b) => a + b, 0);
    const totalCMV = Object.values(cmvPorMes).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      months: meses,
      categorias: categoriasOut,
      valoresPorCategoriaMes,
      receitasPorMes,
      despesasPorMes,
      cmvPorMes,
      totals: {
        receitas: totalReceitas,
        despesas: totalDespesas,
        cmv: totalCMV,
      },
    });
  } catch (err) {
    console.error("Erro ao calcular séries do DRE:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

