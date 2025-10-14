import { NextRequest, NextResponse } from "next/server";
import { assertSessionToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStatusWhere, getCanalWhere, getTipoAnuncioWhere, getModalidadeWhere } from "@/lib/dashboard-filters";

export const runtime = "nodejs";

function toNumber(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getDateRange(periodo: string): { start: Date; end: Date } {
  const now = new Date();
  
  switch (periodo) {
    case "este_mes": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "mes_passado": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "ultimos_3_meses": {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "ultimos_6_meses": {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "todos":
    default: {
      return { start: new Date(0), end: new Date() };
    }
  }
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  let session;
  try {
    session = assertSessionToken(sessionCookie);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const periodoParam = url.searchParams.get("periodo") || "todos";
    const dataInicioParam = url.searchParams.get("dataInicio");
    const dataFimParam = url.searchParams.get("dataFim");
    const canalParam = url.searchParams.get("canal");
    const statusParam = url.searchParams.get("status");
    const tipoAnuncioParam = url.searchParams.get("tipoAnuncio");
    const modalidadeParam = url.searchParams.get("modalidade");

    let start: Date;
    let end: Date;
    let usarTodasVendas = false;

    if (dataInicioParam && dataFimParam) {
      // Período personalizado
      // Incluir o dia final completamente, independente do fuso
      start = new Date(dataInicioParam);
      const endBase = new Date(dataFimParam);
      end = new Date(endBase.getTime() + (24 * 60 * 60 * 1000 - 1));
    } else if (periodoParam === "todos") {
      // Para "todos", buscar todas as vendas
      usarTodasVendas = true;
      start = new Date(0);
      end = new Date();
    } else {
      const range = getDateRange(periodoParam);
      start = range.start;
      end = range.end;
    }

    // Buscar vendas no período
    const statusWhere = getStatusWhere(statusParam);
    const canalWhere = getCanalWhere(canalParam);
    const tipoWhere = getTipoAnuncioWhere(tipoAnuncioParam);
    const modalidadeWhere = getModalidadeWhere(modalidadeParam);

    // WhereClause para Mercado Livre (com tipoAnuncio e modalidade)
    const whereClauseMeli = usarTodasVendas
      ? { userId: session.sub, ...statusWhere, ...canalWhere, ...tipoWhere, ...modalidadeWhere }
      : { userId: session.sub, dataVenda: { gte: start, lte: end }, ...statusWhere, ...canalWhere, ...tipoWhere, ...modalidadeWhere };

    // WhereClause para Shopee (sem tipoAnuncio e modalidade)
    const whereClauseShopee = usarTodasVendas
      ? { userId: session.sub, ...statusWhere, ...canalWhere }
      : { userId: session.sub, dataVenda: { gte: start, lte: end }, ...statusWhere, ...canalWhere };

    // Buscar vendas do Mercado Livre
    const vendas = await prisma.meliVenda.findMany({
      where: whereClauseMeli,
      select: {
        valorTotal: true,
        tipoAnuncio: true,
        dataVenda: true,
      },
      distinct: ['orderId'],
      orderBy: { dataVenda: "desc" },
    });

    console.log(`[FaturamentoPorTipoAnuncio] Encontradas ${vendas.length} vendas Meli no período`);
    console.log(`[FaturamentoPorTipoAnuncio] Período: ${usarTodasVendas ? 'todos' : `${start.toISOString()} - ${end.toISOString()}`}`);

    if (vendas.length > 0) {
      const catalogo = vendas.filter(v => v.tipoAnuncio && v.tipoAnuncio.toLowerCase().includes('catálogo'));
      const proprio = vendas.filter(v => v.tipoAnuncio && v.tipoAnuncio.toLowerCase().includes('próprio'));
      const outros = vendas.filter(v => !v.tipoAnuncio || (!v.tipoAnuncio.toLowerCase().includes('catálogo') && !v.tipoAnuncio.toLowerCase().includes('próprio')));
      console.log(`[FaturamentoPorTipoAnuncio] Catálogo: ${catalogo.length}, Próprio: ${proprio.length}, Outros/Null: ${outros.length}`);
      console.log(`[FaturamentoPorTipoAnuncio] Exemplos tipo anúncio:`, vendas.slice(0, 5).map(v => ({ tipoAnuncio: v.tipoAnuncio, valor: v.valorTotal })));
    }

    // Agrupar por tipo de anúncio (Catálogo vs Próprio) - apenas Mercado Livre
    let faturamentoCatalogo = 0;
    let faturamentoProprio = 0;
    let quantidadeCatalogo = 0;
    let quantidadeProprio = 0;

    // Processar vendas do Mercado Livre (com tipoAnuncio)
    for (const venda of vendas) {
      const valor = toNumber(venda.valorTotal);
      const isCatalogo = venda.tipoAnuncio &&
                        venda.tipoAnuncio.toString().toLowerCase().includes('catálogo');

      if (isCatalogo) {
        faturamentoCatalogo += valor;
        quantidadeCatalogo += 1;
      } else {
        faturamentoProprio += valor;
        quantidadeProprio += 1;
      }
    }

    const faturamentoTotal = faturamentoCatalogo + faturamentoProprio;
    const quantidadeTotal = quantidadeCatalogo + quantidadeProprio;

    // Calcular percentuais de faturamento
    const percentualFaturamentoCatalogo = faturamentoTotal > 0 ? (faturamentoCatalogo / faturamentoTotal) * 100 : 0;
    const percentualFaturamentoProprio = faturamentoTotal > 0 ? (faturamentoProprio / faturamentoTotal) * 100 : 0;

    // Calcular percentuais de quantidade
    const percentualQuantidadeCatalogo = quantidadeTotal > 0 ? (quantidadeCatalogo / quantidadeTotal) * 100 : 0;
    const percentualQuantidadeProprio = quantidadeTotal > 0 ? (quantidadeProprio / quantidadeTotal) * 100 : 0;

    // Montar resultado
    const resultado = [];

    if (faturamentoCatalogo > 0) {
      resultado.push({
        tipoAnuncio: "Catálogo",
        faturamento: Math.round(faturamentoCatalogo * 100) / 100,
        quantidade: quantidadeCatalogo,
        percentual: Math.round(percentualFaturamentoCatalogo * 100) / 100,
        percentualFaturamento: Math.round(percentualFaturamentoCatalogo * 100) / 100,
        percentualQuantidade: Math.round(percentualQuantidadeCatalogo * 100) / 100,
      });
    }

    if (faturamentoProprio > 0) {
      resultado.push({
        tipoAnuncio: "Próprio",
        faturamento: Math.round(faturamentoProprio * 100) / 100,
        quantidade: quantidadeProprio,
        percentual: Math.round(percentualFaturamentoProprio * 100) / 100,
        percentualFaturamento: Math.round(percentualFaturamentoProprio * 100) / 100,
        percentualQuantidade: Math.round(percentualQuantidadeProprio * 100) / 100,
      });
    }

    console.log(`[FaturamentoPorTipoAnuncio] Resultado final:`, resultado);

    return NextResponse.json(resultado);
  } catch (err) {
    console.error("Erro ao calcular faturamento por tipo de anúncio:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
