import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
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
    const tipoParam = (url.searchParams.get("tipo") || "caixa").toLowerCase() as 'caixa' | 'competencia';
    const categoriaIds = categoriaIdsParam ? categoriaIdsParam.split(",").filter(Boolean) : [];

    const now = new Date();

    // Determinar periodo
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

    // 1) Vendas no periodo (exclui canceladas)
    const notCanceled = { NOT: { status: { contains: "cancel", mode: "insensitive" } } } as const;
    const [vendasMeli, vendasShopee] = await Promise.all([
      prisma.meliVenda.findMany({
        where: { userId: session.sub, dataVenda: { gte: start, lte: end }, ...notCanceled },
        select: { valorTotal: true, taxaPlataforma: true, frete: true, quantidade: true, sku: true, plataforma: true },
        distinct: ['orderId'],
      }),
      prisma.shopeeVenda.findMany({
        where: { userId: session.sub, dataVenda: { gte: start, lte: end }, ...notCanceled },
        select: { valorTotal: true, taxaPlataforma: true, frete: true, quantidade: true, sku: true, plataforma: true },
        distinct: ['orderId'],
      }),
    ]);

    const vendas = [...vendasMeli, ...vendasShopee];

    // CMV com base em custos dos SKUs
    const skusUnicos = Array.from(new Set(vendas.map(v => v.sku).filter((s): s is string => Boolean(s))));
    const skuCustos = skusUnicos.length
      ? await prisma.sKU.findMany({ where: { userId: session.sub, sku: { in: skusUnicos } }, select: { sku: true, custoUnitario: true } })
      : [];
    const mapaCustos = new Map(skuCustos.map(s => [s.sku, toNumber(s.custoUnitario)]));

    let faturamentoTotal = 0;
    let receitaLiquida = 0; // vt + taxas + frete (taxas/frete podem ser negativos no banco)
    let cmvTotal = 0;
    let taxasTotalAbs = 0;
    let freteTotalAbs = 0;
    let vendasRealizadas = 0;
    let unidadesVendidas = 0;

    const taxasPorPlataforma = new Map<string, number>();
    const fretePorPlataforma = new Map<string, number>();

    for (const v of vendas) {
      const vt = toNumber(v.valorTotal);
      const tp = toNumber(v.taxaPlataforma);
      const fr = toNumber(v.frete);
      const qtd = toNumber(v.quantidade);
      const custoUnit = v.sku && mapaCustos.has(v.sku) ? mapaCustos.get(v.sku)! : 0;
      const cmv = custoUnit * qtd;

      faturamentoTotal += vt;
      receitaLiquida += vt + tp + fr;
      cmvTotal += cmv;
      vendasRealizadas += 1;
      unidadesVendidas += qtd;

      const plataforma = v.plataforma || "Mercado Livre";
      const taxaAbs = Math.abs(tp);
      const freteAbs = Math.abs(fr);
      taxasTotalAbs += taxaAbs;
      freteTotalAbs += freteAbs;
      taxasPorPlataforma.set(plataforma, (taxasPorPlataforma.get(plataforma) || 0) + taxaAbs);
      fretePorPlataforma.set(plataforma, (fretePorPlataforma.get(plataforma) || 0) + freteAbs);
    }

    // 1.1) Fallback de receitas pelo financeiro (contas a receber)
    const whereReceitas: Prisma.ContaReceberWhereInput = {
      userId: session.sub,
      OR: [
        { dataRecebimento: { gte: start, lte: end } },
        { AND: [{ dataRecebimento: null }, { dataVencimento: { gte: start, lte: end } }] },
      ],
    };
    if (portadorIdParam) whereReceitas.formaPagamentoId = String(portadorIdParam);
    if (categoriaIds.length > 0) whereReceitas.categoriaId = { in: categoriaIds };
    const receitasFin = await prisma.contaReceber.findMany({ where: whereReceitas, select: { valor: true } });
    const totalReceitasFin = receitasFin.reduce((acc, it) => acc + toNumber(it.valor), 0);

    // 2) Despesas operacionais no periodo (contas a pagar)
    // Escolher critério de data baseado no tipo de visualização
    const whereDespesas: Prisma.ContaPagarWhereInput = {
      userId: session.sub,
      OR: tipoParam === 'caixa'
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
    if (portadorIdParam) whereDespesas.formaPagamentoId = String(portadorIdParam);
    if (categoriaIds.length > 0) whereDespesas.categoriaId = { in: categoriaIds };
    const despesas = await prisma.contaPagar.findMany({ where: whereDespesas, select: { valor: true } });
    const despesasOperacionais = despesas.reduce((acc, it) => acc + toNumber(it.valor), 0);

    // Não usamos mais o fallback para contas a receber
    // Usamos apenas as vendas do Shopee e Mercado Livre
    const lucroBruto = receitaLiquida - cmvTotal;
    const lucroLiquido = (receitaLiquida - cmvTotal) - despesasOperacionais;


    return NextResponse.json({
      // Usa o faturamento total das vendas (Shopee e Mercado Livre)
      faturamentoBruto: faturamentoTotal,
      taxasPlataformas: {
        total: taxasTotalAbs,
        mercadoLivre: taxasPorPlataforma.get("Mercado Livre") || 0,
        shopee: taxasPorPlataforma.get("Shopee") || 0,
      },
      custoFrete: {
        total: freteTotalAbs,
        mercadoLivre: fretePorPlataforma.get("Mercado Livre") || 0,
        shopee: fretePorPlataforma.get("Shopee") || 0,
      },
      receitaLiquida: receitaLiquida,
      cmv: cmvTotal,
      lucroBruto: lucroBruto,
      despesasOperacionais,
      lucroLiquido,
      periodo: { start: start.toISOString(), end: end.toISOString() },
    });
  } catch (err) {
    console.error("Erro ao calcular stats do dashboard financeiro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}