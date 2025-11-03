import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function toNumber(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
    const periodoParam = url.searchParams.get("periodo");
    const dataInicioParam = url.searchParams.get("dataInicio");
    const dataFimParam = url.searchParams.get("dataFim");
    const portadorIdParam = url.searchParams.get("portadorId");
    const categoriaIdsParam = url.searchParams.get("categoriaIds");
    const categoriaIds = categoriaIdsParam ? categoriaIdsParam.split(",").filter(Boolean) : [];
    const tipoParam = (url.searchParams.get("tipo") || "despesas").toLowerCase(); // despesas | receitas
    const tipoDataParam = (url.searchParams.get("tipoData") || "caixa").toLowerCase() as 'caixa' | 'competencia'; // caixa | competencia

    const now = new Date();

    let start: Date;
    let end: Date;
    if (dataInicioParam && dataFimParam) {
      start = new Date(dataInicioParam);
      const endBase = new Date(dataFimParam);
      end = new Date(endBase.getTime() + (24 * 60 * 60 * 1000 - 1));
    } else if (periodoParam) {
      switch (periodoParam) {
        case "mes_passado": {
          const primeiroDiaMesPassado = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const ultimoDiaMesPassado = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          start = primeiroDiaMesPassado;
          end = ultimoDiaMesPassado;
          break;
        }
        case "este_mes": {
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        }
        case "todos":
        default: {
          start = new Date(0);
          end = new Date();
          break;
        }
      }
    } else {
      start = new Date(0);
      end = new Date();
    }

    if (tipoParam === "receitas") {
      // Contas a receber por categoria
      const where: any = {
        userId: session.sub,
        OR: [
          { dataRecebimento: { gte: start, lte: end } },
          { AND: [{ dataRecebimento: null }, { dataVencimento: { gte: start, lte: end } }] },
        ],
      };
      if (portadorIdParam) where.formaPagamentoId = String(portadorIdParam);
      if (categoriaIds.length > 0) where.categoriaId = { in: categoriaIds };

      const rows = await prisma.contaReceber.findMany({
        where,
        select: {
          valor: true,
          dataRecebimento: true,
          dataVencimento: true,
          categoria: { select: { id: true, nome: true, descricao: true } },
        },
      });

      const out = buildCategorySeries(rows.map(r => ({
        date: r.dataRecebimento || r.dataVencimento,
        valor: toNumber(r.valor),
        categoria: r.categoria?.descricao || r.categoria?.nome || "Sem categoria",
      })));
      return NextResponse.json(out);
    }

    // Default: despesas (contas a pagar)
    // Escolher critério de data baseado no tipo de visualização
    const where: any = {
      userId: session.sub,
      OR: tipoDataParam === 'caixa'
        ? [
            // Caixa: usar dataPagamento (ou dataVencimento se null)
            { dataPagamento: { gte: start, lte: end } },
            { AND: [{ dataPagamento: null }, { dataVencimento: { gte: start, lte: end } }] },
          ]
        : [
            // Competência: usar dataCompetencia (ou dataVencimento se null)
            { dataCompetencia: { gte: start, lte: end } },
            { AND: [{ dataCompetencia: null }, { dataVencimento: { gte: start, lte: end } }] },
          ],
    };
    if (portadorIdParam) where.formaPagamentoId = String(portadorIdParam);
    if (categoriaIds.length > 0) where.categoriaId = { in: categoriaIds };

    const rows = await prisma.contaPagar.findMany({
      where,
      select: {
        valor: true,
        dataPagamento: true,
        dataVencimento: true,
        dataCompetencia: true,
        categoria: { select: { id: true, nome: true, descricao: true } },
      },
    });

    const data = rows.map(r => ({
      date: tipoDataParam === 'caixa'
        ? (r.dataPagamento || r.dataVencimento)
        : (r.dataCompetencia || r.dataVencimento),
      valor: toNumber(r.valor),
      categoria: r.categoria?.descricao || r.categoria?.nome || "Sem categoria",
    }));

    const out = buildCategorySeries(data);
    return NextResponse.json(out);
  } catch (err) {
    console.error("Erro ao calcular séries de categorias (financeiro):", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

function buildCategorySeries(rows: Array<{ date: Date | string | null; valor: number; categoria: string }>) {
  // Agrupar por dia e categoria
  const byDay = new Map<string, Map<string, number>>();
  const catTotals = new Map<string, number>();

  for (const r of rows) {
    if (!r.date) continue;
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cat = r.categoria || "Sem categoria";
    const val = Number.isFinite(r.valor) ? r.valor : 0;

    if (!byDay.has(key)) byDay.set(key, new Map<string, number>());
    const dayMap = byDay.get(key)!;
    dayMap.set(cat, (dayMap.get(cat) || 0) + val);

    catTotals.set(cat, (catTotals.get(cat) || 0) + val);
  }

  // Top categorias
  const topN = 5;
  const sortedCats = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1]);
  const topCats = sortedCats.slice(0, topN).map(([c]) => c);

  // Montar série (datas ordenadas)
  const dates = Array.from(byDay.keys()).sort();
  const data = dates.map(date => {
    const entry: any = { date };
    const dayMap = byDay.get(date)!;
    let others = 0;
    for (const [cat, val] of dayMap.entries()) {
      if (topCats.includes(cat)) {
        entry[cat] = val;
      } else {
        others += val;
      }
    }
    if (others > 0) entry["Outras"] = others;
    // garantir zeros
    for (const c of topCats) entry[c] = entry[c] || 0;
    return entry;
  });

  const categories = [...topCats];
  if (sortedCats.length > topN) categories.push("Outras");

  return { categories, data };
}

