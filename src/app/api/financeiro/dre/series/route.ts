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

    console.log('[DRE API] ===== INÍCIO DA REQUISIÇÃO =====');
    console.log('[DRE API] Usuário:', session.sub);
    console.log('[DRE API] Meses solicitados:', mesesParam);
    console.log('[DRE API] Categorias filtradas:', categoriasParam.length > 0 ? categoriasParam : 'TODAS');
    console.log('[DRE API] Tipo de visualização:', tipoParam);

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
    console.log('[DRE API] Categorias encontradas no banco:', categorias.length);
    
    // Focar em DESPESA para o DRE (lista de categorias para tabela)
    const categoriasDespesa = categorias.filter(c => (c.tipo || "").toUpperCase() === "DESPESA");
    const categoriaIdsDespesa = new Set(categoriasDespesa.map(c => c.id));
    console.log('[DRE API] Categorias de DESPESA:', categoriasDespesa.length);

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

    // ============================================
    // BUSCAR VENDAS (Mercado Livre + Shopee)
    // ============================================
    const notCanceled = { NOT: { status: { contains: "cancel", mode: "insensitive" as const } } };
    const [vendasMeli, vendasShopee] = await Promise.all([
      prisma.meliVenda.findMany({
        where: { 
          userId: session.sub, 
          dataVenda: { gte: rangeStart, lte: rangeEnd }, 
          ...notCanceled 
        },
        select: { 
          valorTotal: true, 
          taxaPlataforma: true, 
          frete: true, 
          quantidade: true, 
          sku: true, 
          dataVenda: true 
        },
        distinct: ['orderId'],
      }),
      prisma.shopeeVenda.findMany({
        where: { 
          userId: session.sub, 
          dataVenda: { gte: rangeStart, lte: rangeEnd }, 
          ...notCanceled 
        },
        select: { 
          valorTotal: true, 
          taxaPlataforma: true, 
          frete: true, 
          quantidade: true, 
          sku: true, 
          dataVenda: true 
        },
        distinct: ['orderId'],
      }),
    ]);
    const todasVendas = [...vendasMeli, ...vendasShopee];
    console.log('[DRE API] Vendas (ML + Shopee) encontradas:', todasVendas.length);

    // Buscar custos dos SKUs para calcular CMV
    const skusUnicos = Array.from(new Set(todasVendas.map(v => v.sku).filter((s): s is string => Boolean(s))));
    const skuCustos = skusUnicos.length
      ? await prisma.sKU.findMany({ 
          where: { userId: session.sub, sku: { in: skusUnicos } }, 
          select: { sku: true, custoUnitario: true } 
        })
      : [];
    const mapaCustos = new Map(skuCustos.map(s => [s.sku, Number(s.custoUnitario || 0)]));
    console.log('[DRE API] SKUs com custo encontrados:', skuCustos.length);

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
    console.log('[DRE API] Contas a Pagar encontradas:', contasPagar.length);
    if (contasPagar.length > 0) {
      console.log('[DRE API] Exemplo de Conta a Pagar:', {
        valor: contasPagar[0].valor,
        dataVencimento: contasPagar[0].dataVencimento,
        dataPagamento: contasPagar[0].dataPagamento,
        categoria: contasPagar[0].categoria?.nome
      });
    }

    // IMPORTANTE: Contas a receber NÃO entram na RECEITA BRUTA do DRE
    // A RECEITA BRUTA é composta APENAS por vendas (Mercado Livre + Shopee)
    // Este código foi removido para seguir o mesmo cálculo do faturamento do dashboard
    console.log('[DRE API] ⚠️ Contas a Receber NÃO são incluídas na RECEITA BRUTA');

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
      
      // CMV adicional de categorias específicas (CMV/CPV/CSP)
      // Soma ao CMV das vendas calculado anteriormente
      if (cmvCategoryIds.has(catId)) cmvPorMes[key] += Number(row.valor || 0);
    }

    // ============================================
    // PROCESSAR VENDAS (RECEITAS + CMV)
    // ============================================
    // IMPORTANTE: RECEITA BRUTA = valorTotal (faturamento)
    // Igual ao cálculo do dashboard (faturamentoTotal)
    // Taxas e frete NÃO entram na RECEITA BRUTA, pois são deduções
    for (const venda of todasVendas) {
      const d = venda.dataVenda;
      if (!d) continue;
      const key = monthKey(new Date(d));
      if (!receitasPorMes.hasOwnProperty(key)) continue;

      // RECEITA BRUTA = valorTotal (igual ao faturamento do dashboard)
      const valorTotal = Number(venda.valorTotal || 0);
      receitasPorMes[key] += valorTotal;

      // CMV = custo unitário × quantidade
      const quantidade = Number(venda.quantidade || 0);
      const custoUnit = venda.sku && mapaCustos.has(venda.sku) ? mapaCustos.get(venda.sku)! : 0;
      const cmvVenda = custoUnit * quantidade;
      cmvPorMes[key] += cmvVenda;
    }

    // NOTA: Contas a receber NÃO entram na RECEITA BRUTA
    // Apenas vendas do Mercado Livre e Shopee compõem a RECEITA BRUTA

    // Filter categorias to those present in DESPESA set or that appear in valores
    const categoriasOut = categoriasDespesa.filter(c => {
      return valoresPorCategoriaMes[c.id] || categoriasParam.length === 0 || categoriaIdsDespesa.has(c.id);
    }).map(c => ({ id: c.id, nome: c.nome, descricao: c.descricao }));

    // Totals
    const totalReceitas = Object.values(receitasPorMes).reduce((a, b) => a + b, 0);
    const totalDespesas = Object.values(despesasPorMes).reduce((a, b) => a + b, 0);
    const totalCMV = Object.values(cmvPorMes).reduce((a, b) => a + b, 0);

    console.log('[DRE API] ===== RESULTADO =====');
    console.log('[DRE API] 💰 RECEITA BRUTA (Faturamento ML + Shopee):', totalReceitas);
    console.log('[DRE API]    - Vendas Mercado Livre:', vendasMeli.length);
    console.log('[DRE API]    - Vendas Shopee:', vendasShopee.length);
    console.log('[DRE API]    - Total de Vendas:', todasVendas.length);
    console.log('[DRE API] 📊 Total de Despesas:', totalDespesas);
    console.log('[DRE API] 📦 Total de CMV:', totalCMV);
    console.log('[DRE API] 📂 Categorias retornadas:', categoriasOut.length);
    console.log('[DRE API] 📅 Receitas por mês:', receitasPorMes);
    console.log('[DRE API] 💸 Despesas por mês:', despesasPorMes);
    console.log('[DRE API] ⚠️ IMPORTANTE: Contas a receber NÃO incluídas na RECEITA BRUTA');
    console.log('[DRE API] ✅ RECEITA BRUTA = Faturamento (igual ao dashboard)');
    console.log('[DRE API] ===== FIM =====');

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

