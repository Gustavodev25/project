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
    case "hoje": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case "ontem": {
      const ontem = new Date(now);
      ontem.setDate(ontem.getDate() - 1);
      const start = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 0, 0, 0, 0);
      const end = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case "ultimos_7d": {
      const seteAtras = new Date(now);
      seteAtras.setDate(seteAtras.getDate() - 6);
      const start = new Date(seteAtras.getFullYear(), seteAtras.getMonth(), seteAtras.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case "ultimos_30d": {
      const trintaAtras = new Date(now);
      trintaAtras.setDate(trintaAtras.getDate() - 29);
      const start = new Date(trintaAtras.getFullYear(), trintaAtras.getMonth(), trintaAtras.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case "ultimos_12m": {
      const dozeAtras = new Date(now);
      dozeAtras.setMonth(dozeAtras.getMonth() - 12);
      const start = new Date(dozeAtras.getFullYear(), dozeAtras.getMonth(), dozeAtras.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
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
    session = await assertSessionToken(sessionCookie);
  } catch (error) {
    console.error('[FaturamentoPorExposicao] Erro de autenticação:', error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log('[FaturamentoPorExposicao] Iniciando requisição');
    const url = new URL(req.url);
    const periodoParam = url.searchParams.get("periodo") || "todos";
    const dataInicioParam = url.searchParams.get("dataInicio");
    const dataFimParam = url.searchParams.get("dataFim");
    const canalParam = url.searchParams.get("canal");
    const statusParam = url.searchParams.get("status");
    const tipoAnuncioParam = url.searchParams.get("tipoAnuncio");
    const modalidadeParam = url.searchParams.get("modalidade");
    const accountPlatformParam = url.searchParams.get("accountPlatform");
    const accountIdParam = url.searchParams.get("accountId");

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
      ? { userId: session.sub, ...(accountPlatformParam === 'meli' && accountIdParam ? { meliAccountId: accountIdParam } : {}), ...statusWhere, ...canalWhere, ...tipoWhere, ...modalidadeWhere }
      : { userId: session.sub, dataVenda: { gte: start, lte: end }, ...(accountPlatformParam === 'meli' && accountIdParam ? { meliAccountId: accountIdParam } : {}), ...statusWhere, ...canalWhere, ...tipoWhere, ...modalidadeWhere };

    // WhereClause para Shopee (sem tipoAnuncio e modalidade)
    const whereClauseShopee = usarTodasVendas
      ? { userId: session.sub, ...statusWhere, ...canalWhere }
      : { userId: session.sub, dataVenda: { gte: start, lte: end }, ...statusWhere, ...canalWhere };

    // Buscar vendas do Mercado Livre
    console.log('[FaturamentoPorExposicao] Buscando vendas com filtros:', {
      usarTodasVendas,
      periodo: periodoParam,
      accountPlatform: accountPlatformParam,
      accountId: accountIdParam
    });
    
    const vendas = await prisma.meliVenda.findMany({
      where: whereClauseMeli,
      select: {
        orderId: true,
        valorTotal: true,
        exposicao: true,
        dataVenda: true,
      },
      orderBy: { dataVenda: "desc" },
    });
    
    // Remover duplicatas manualmente para evitar problemas com distinct
    const vendasUnicas = Array.from(
      new Map(vendas.map(v => [v.orderId, v])).values()
    );

    console.log(`[FaturamentoPorExposicao] Encontradas ${vendas.length} vendas totais, ${vendasUnicas.length} únicas no período`);
    console.log(`[FaturamentoPorExposicao] Período: ${usarTodasVendas ? 'todos' : `${start.toISOString()} - ${end.toISOString()}`}`);

    if (vendasUnicas.length > 0) {
      const premium = vendasUnicas.filter(v => v.exposicao && v.exposicao.toLowerCase().includes('premium'));
      const classico = vendasUnicas.filter(v => !v.exposicao || v.exposicao.toLowerCase().includes('clássico') || v.exposicao.toLowerCase().includes('classico'));
      console.log(`[FaturamentoPorExposicao] Premium: ${premium.length}, Clássico: ${classico.length}`);
      console.log(`[FaturamentoPorExposicao] Exemplos exposição:`, vendasUnicas.slice(0, 5).map(v => ({ exposicao: v.exposicao, valor: v.valorTotal })));
    }

    // Agrupar por tipo de exposição (Premium vs Clássico) - apenas Mercado Livre
    let faturamentoPremium = 0;
    let faturamentoClassico = 0;
    let quantidadePremium = 0;
    let quantidadeClassico = 0;

    // Processar vendas do Mercado Livre (com exposição)
    for (const venda of vendasUnicas) {
      const valor = toNumber(venda.valorTotal);
      const isPremium = venda.exposicao &&
                       venda.exposicao.toString().toLowerCase().includes('premium');

      if (isPremium) {
        faturamentoPremium += valor;
        quantidadePremium += 1;
      } else {
        faturamentoClassico += valor;
        quantidadeClassico += 1;
      }
    }

    const faturamentoTotal = faturamentoPremium + faturamentoClassico;
    const quantidadeTotal = quantidadePremium + quantidadeClassico;

    // Calcular percentuais de faturamento
    const percentualFaturamentoPremium = faturamentoTotal > 0 ? (faturamentoPremium / faturamentoTotal) * 100 : 0;
    const percentualFaturamentoClassico = faturamentoTotal > 0 ? (faturamentoClassico / faturamentoTotal) * 100 : 0;

    // Calcular percentuais de quantidade
    const percentualQuantidadePremium = quantidadeTotal > 0 ? (quantidadePremium / quantidadeTotal) * 100 : 0;
    const percentualQuantidadeClassico = quantidadeTotal > 0 ? (quantidadeClassico / quantidadeTotal) * 100 : 0;

    // Montar resultado
    const resultado = [];

    if (faturamentoPremium > 0) {
      resultado.push({
        exposicao: "Premium",
        faturamento: Math.round(faturamentoPremium * 100) / 100,
        quantidade: quantidadePremium,
        percentual: Math.round(percentualFaturamentoPremium * 100) / 100,
        percentualFaturamento: Math.round(percentualFaturamentoPremium * 100) / 100,
        percentualQuantidade: Math.round(percentualQuantidadePremium * 100) / 100,
      });
    }

    if (faturamentoClassico > 0) {
      resultado.push({
        exposicao: "Clássico",
        faturamento: Math.round(faturamentoClassico * 100) / 100,
        quantidade: quantidadeClassico,
        percentual: Math.round(percentualFaturamentoClassico * 100) / 100,
        percentualFaturamento: Math.round(percentualFaturamentoClassico * 100) / 100,
        percentualQuantidade: Math.round(percentualQuantidadeClassico * 100) / 100,
      });
    }

    console.log(`[FaturamentoPorExposicao] Resultado final:`, resultado);

    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[FaturamentoPorExposicao] Erro ao calcular faturamento por exposição:", err);
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    console.error("[FaturamentoPorExposicao] Detalhes do erro:", {
      message: errorMessage,
      stack: errorStack,
      name: err instanceof Error ? err.name : 'Unknown'
    });
    
    return NextResponse.json({ 
      error: "Erro interno",
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
    }, { status: 500 });
  }
}
