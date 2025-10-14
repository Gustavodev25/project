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
        exposicao: true,
        dataVenda: true,
      },
      distinct: ['orderId'],
      orderBy: { dataVenda: "desc" },
    });

    console.log(`[FaturamentoPorExposicao] Encontradas ${vendas.length} vendas Meli no período`);
    console.log(`[FaturamentoPorExposicao] Período: ${usarTodasVendas ? 'todos' : `${start.toISOString()} - ${end.toISOString()}`}`);

    if (vendas.length > 0) {
      const premium = vendas.filter(v => v.exposicao && v.exposicao.toLowerCase().includes('premium'));
      const classico = vendas.filter(v => !v.exposicao || v.exposicao.toLowerCase().includes('clássico') || v.exposicao.toLowerCase().includes('classico'));
      console.log(`[FaturamentoPorExposicao] Premium: ${premium.length}, Clássico: ${classico.length}`);
      console.log(`[FaturamentoPorExposicao] Exemplos exposição:`, vendas.slice(0, 5).map(v => ({ exposicao: v.exposicao, valor: v.valorTotal })));
    }

    // Agrupar por tipo de exposição (Premium vs Clássico) - apenas Mercado Livre
    let faturamentoPremium = 0;
    let faturamentoClassico = 0;
    let quantidadePremium = 0;
    let quantidadeClassico = 0;

    // Processar vendas do Mercado Livre (com exposição)
    for (const venda of vendas) {
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
    console.error("Erro ao calcular faturamento por exposição:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
