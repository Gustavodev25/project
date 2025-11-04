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

function isCanceled(status?: string | null): boolean {
  if (!status) return false;
  return status.toLowerCase().includes("cancel");
}

function isCMVCategory(nome?: string | null, descricao?: string | null): boolean {
  const normalized = `${nome || ""} ${descricao || ""}`.toLowerCase();
  return normalized.includes("cmv") || normalized.includes("cpv") || normalized.includes("csp");
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
    const tipoParam = (url.searchParams.get("tipo") || "caixa").toLowerCase() as "caixa" | "competencia";
    const categoriaIds = categoriaIdsParam ? categoriaIdsParam.split(",").filter(Boolean) : [];

    const now = new Date();

    // Determinar período
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

    // 1) Vendas do período (inclui canceladas para alinhar com o DRE)
    const [vendasMeli, vendasShopee] = await Promise.all([
      prisma.meliVenda.findMany({
        where: { userId: session.sub, dataVenda: { gte: start, lte: end } },
        select: {
          valorTotal: true,
          taxaPlataforma: true,
          frete: true,
          quantidade: true,
          sku: true,
          plataforma: true,
          status: true,
          orderId: true,
        },
        distinct: ["orderId"],
      }),
      prisma.shopeeVenda.findMany({
        where: { userId: session.sub, dataVenda: { gte: start, lte: end } },
        select: {
          valorTotal: true,
          taxaPlataforma: true,
          frete: true,
          quantidade: true,
          sku: true,
          plataforma: true,
          status: true,
          orderId: true,
        },
        distinct: ["orderId"],
      }),
    ]);

    const vendasConfirmadas = [
      ...vendasMeli.filter((v) => !isCanceled(v.status)),
      ...vendasShopee.filter((v) => !isCanceled(v.status)),
    ];

    type VendaResumo = typeof vendasMeli[number] | typeof vendasShopee[number];

    // CMV com base em custos dos SKUs das vendas confirmadas
    const skusUnicos = Array.from(
      new Set(vendasConfirmadas.map((v) => v.sku).filter((s): s is string => Boolean(s))),
    );
    const skuCustos = skusUnicos.length
      ? await prisma.sKU.findMany({
          where: { userId: session.sub, sku: { in: skusUnicos } },
          select: { sku: true, custoUnitario: true },
        })
      : [];
    const mapaCustos = new Map(skuCustos.map((s) => [s.sku, toNumber(s.custoUnitario)]));

    let faturamentoTotal = 0;
    let deducoesReceita = 0;
    let taxasTotalAbs = 0;
    let freteTotalAbs = 0;
    let cmvTotal = 0;

    const taxasPorPlataforma = new Map<string, number>();
    const fretePorPlataforma = new Map<string, number>();

    const acumularPorPlataforma = (map: Map<string, number>, plataforma: string, valor: number) => {
      map.set(plataforma, (map.get(plataforma) || 0) + valor);
    };

    const processarVenda = (venda: VendaResumo, plataforma: "Mercado Livre" | "Shopee") => {
      const valorTotal = toNumber(venda.valorTotal);
      faturamentoTotal += valorTotal;

      if (isCanceled(venda.status)) {
        deducoesReceita += valorTotal;
        return;
      }

      const taxaAbs = Math.abs(toNumber(venda.taxaPlataforma));
      const freteAbs = Math.abs(toNumber(venda.frete));
      const quantidade = toNumber(venda.quantidade);
      const custoUnit = venda.sku && mapaCustos.has(venda.sku) ? mapaCustos.get(venda.sku)! : 0;

      taxasTotalAbs += taxaAbs;
      freteTotalAbs += freteAbs;
      acumularPorPlataforma(taxasPorPlataforma, plataforma, taxaAbs);
      acumularPorPlataforma(fretePorPlataforma, plataforma, freteAbs);
      cmvTotal += custoUnit * quantidade;
    };

    for (const venda of vendasMeli) {
      processarVenda(venda, "Mercado Livre");
    }
    for (const venda of vendasShopee) {
      processarVenda(venda, "Shopee");
    }

    // 2) Despesas operacionais no período (contas a pagar)
    let categoriaIdsParaFiltro = categoriaIds;
    if (categoriaIds.length === 0) {
      const todasCategoriasDespesa = await prisma.categoria.findMany({
        where: { userId: session.sub, tipo: { equals: "DESPESA", mode: "insensitive" } },
        select: { id: true },
      });
      categoriaIdsParaFiltro = todasCategoriasDespesa.map((c) => c.id);
    }

    const whereDespesas: Prisma.ContaPagarWhereInput = {
      userId: session.sub,
      OR:
        tipoParam === "caixa"
          ? [
              { dataPagamento: { gte: start, lte: end } },
              { AND: [{ dataPagamento: null }, { dataVencimento: { gte: start, lte: end } }] },
            ]
          : [
              { dataCompetencia: { gte: start, lte: end } },
              { AND: [{ dataCompetencia: null }, { dataVencimento: { gte: start, lte: end } }] },
            ],
    };
    if (portadorIdParam) whereDespesas.formaPagamentoId = String(portadorIdParam);
    if (categoriaIdsParaFiltro.length > 0) whereDespesas.categoriaId = { in: categoriaIdsParaFiltro };

    const despesas = await prisma.contaPagar.findMany({
      where: whereDespesas,
      select: {
        valor: true,
        categoriaId: true,
        categoria: { select: { nome: true, descricao: true } },
      },
    });

    const cmvCategoryCache = new Map<string, boolean>();
    let despesasOperacionais = 0;
    for (const despesa of despesas) {
      const valor = toNumber(despesa.valor);
      despesasOperacionais += valor;

      const categoriaId = despesa.categoriaId || "";
      let ehCMV = false;
      if (categoriaId && cmvCategoryCache.has(categoriaId)) {
        ehCMV = cmvCategoryCache.get(categoriaId)!;
      } else {
        ehCMV = isCMVCategory(despesa.categoria?.nome, despesa.categoria?.descricao);
        if (categoriaId) {
          cmvCategoryCache.set(categoriaId, ehCMV);
        }
      }
      if (ehCMV) {
        cmvTotal += valor;
      }
    }

    const receitaLiquida = faturamentoTotal - deducoesReceita;
    const receitaOperacionalLiquida = receitaLiquida - taxasTotalAbs - freteTotalAbs;
    const lucroBruto = receitaOperacionalLiquida - cmvTotal;
    const lucroLiquido = lucroBruto - despesasOperacionais;

    return NextResponse.json({
      faturamentoBruto: faturamentoTotal,
      deducoesReceita,
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
      receitaLiquida,
      receitaOperacionalLiquida,
      cmv: cmvTotal,
      lucroBruto,
      despesasOperacionais,
      lucroLiquido,
      periodo: { start: start.toISOString(), end: end.toISOString() },
    });
  } catch (err) {
    console.error("Erro ao calcular stats do dashboard financeiro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
