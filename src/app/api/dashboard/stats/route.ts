import { NextRequest, NextResponse } from "next/server";
import { assertSessionToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStatusWhere, getCanalWhere, getTipoAnuncioWhere, getModalidadeWhere } from "@/lib/dashboard-filters";

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
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");
    const periodoParam = url.searchParams.get("periodo");
    const dataInicioParam = url.searchParams.get("dataInicio");
    const dataFimParam = url.searchParams.get("dataFim");
    const canalParam = url.searchParams.get("canal"); // mercado_livre | shopee
    const statusParam = url.searchParams.get("status"); // pagos | cancelados | todos
    const tipoAnuncioParam = url.searchParams.get("tipoAnuncio"); // catalogo | proprio
    const modalidadeParam = url.searchParams.get("modalidade"); // me | full | flex
    const now = new Date();
    const accountPlatformParam = url.searchParams.get("accountPlatform"); // 'meli' | 'shopee'
    const accountIdParam = url.searchParams.get("accountId");

    // Determinar período baseado nos parâmetros
    let start: Date;
    let end: Date;
    let useRange = false;

    if (dataInicioParam && dataFimParam) {
      // Período personalizado
      // Incluir o dia final completo: soma 24h - 1ms no fim
      start = new Date(dataInicioParam);
      const endBase = new Date(dataFimParam);
      end = new Date(endBase.getTime() + (24 * 60 * 60 * 1000 - 1));
      useRange = true;
    } else if (periodoParam) {
      // Período pré-definido
      switch (periodoParam) {
        case "hoje": {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          useRange = true;
          break;
        }
        case "ontem": {
          const ontem = new Date(now);
          ontem.setDate(ontem.getDate() - 1);
          start = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 0, 0, 0, 0);
          end = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59, 999);
          useRange = true;
          break;
        }
        case "ultimos_7d": {
          const seteAtras = new Date(now);
          seteAtras.setDate(seteAtras.getDate() - 6); // Hoje + 6 dias atrás = 7 dias
          start = new Date(seteAtras.getFullYear(), seteAtras.getMonth(), seteAtras.getDate(), 0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          useRange = true;
          break;
        }
        case "ultimos_30d": {
          const trintaAtras = new Date(now);
          trintaAtras.setDate(trintaAtras.getDate() - 29); // Hoje + 29 dias atrás = 30 dias
          start = new Date(trintaAtras.getFullYear(), trintaAtras.getMonth(), trintaAtras.getDate(), 0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          useRange = true;
          break;
        }
        case "ultimos_12m": {
          const dozeAtras = new Date(now);
          dozeAtras.setMonth(dozeAtras.getMonth() - 12);
          start = new Date(dozeAtras.getFullYear(), dozeAtras.getMonth(), dozeAtras.getDate(), 0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          useRange = true;
          break;
        }
        case "mes_passado": {
          const primeiroDiaMesPassado = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const ultimoDiaMesPassado = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          start = primeiroDiaMesPassado;
          end = ultimoDiaMesPassado;
          useRange = true;
          break;
        }
        case "este_mes": {
          start = startOfMonth(now);
          end = endOfMonth(now);
          useRange = true;
          break;
        }
        case "todos":
        default: {
          // Sem filtro de período - todos os dados
          start = new Date(0); // Data muito antiga
          end = new Date(); // Data atual
          useRange = false;
          break;
        }
      }
    } else if (startParam || endParam) {
      // Parâmetros legacy
      start = startParam ? new Date(startParam) : startOfMonth(now);
      end = endParam ? new Date(endParam) : endOfMonth(now);
      useRange = true;
    } else {
      // Sem filtros - todos os dados
      start = new Date(0);
      end = new Date();
      useRange = false;
    }

    // Previous month period for trend calculation (always last month vs penultimate)
    const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevStart = startOfMonth(lastMonthRef);
    const prevEnd = endOfMonth(lastMonthRef);
    const penultimateRef = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const penultStart = startOfMonth(penultimateRef);
    const penultEnd = endOfMonth(penultimateRef);

    // Aplicar filtros usando helpers centralizados
    const statusWhere = getStatusWhere(statusParam);
    const canalWhere = getCanalWhere(canalParam);
    const tipoWhere = getTipoAnuncioWhere(tipoAnuncioParam);
    const modalidadeWhere = getModalidadeWhere(modalidadeParam);

    // Helper for trend calculations (apenas vendas pagas/completas)
    const paidOnly = getStatusWhere('pagos');

    // Buscar vendas do Mercado Livre
    const vendasMeli = await prisma.meliVenda.findMany({
      where: useRange
        ? { userId: session.sub, dataVenda: { gte: start, lte: end }, ...(accountPlatformParam === 'meli' && accountIdParam ? { meliAccountId: accountIdParam } : {}), ...statusWhere, ...tipoWhere, ...modalidadeWhere }
        : { userId: session.sub, ...(accountPlatformParam === 'meli' && accountIdParam ? { meliAccountId: accountIdParam } : {}), ...statusWhere, ...tipoWhere, ...modalidadeWhere },
      select: {
        valorTotal: true,
        taxaPlataforma: true,
        frete: true,
        quantidade: true,
        sku: true,
        plataforma: true,
        dataVenda: true,
      },
      distinct: ['orderId'],
      orderBy: { dataVenda: "desc" },
    });

    // Buscar vendas do Shopee
    const vendasShopee = await prisma.shopeeVenda.findMany({
      where: useRange
        ? { userId: session.sub, dataVenda: { gte: start, lte: end }, ...(accountPlatformParam === 'shopee' && accountIdParam ? { shopeeAccountId: accountIdParam } : {}), ...statusWhere }
        : { userId: session.sub, ...(accountPlatformParam === 'shopee' && accountIdParam ? { shopeeAccountId: accountIdParam } : {}), ...statusWhere },
      select: {
        valorTotal: true,
        taxaPlataforma: true,
        frete: true,
        quantidade: true,
        sku: true,
        plataforma: true,
        dataVenda: true,
      },
      distinct: ['orderId'],
      orderBy: { dataVenda: "desc" },
    });

    // Consolidar vendas baseado no filtro de canal
    let vendas;
    if (canalParam === 'mercado_livre') {
      vendas = vendasMeli;
    } else if (canalParam === 'shopee') {
      vendas = vendasShopee;
    } else {
      // Se 'todos' ou não especificado, combinar ambas
      vendas = [...vendasMeli, ...vendasShopee];
    }

    // Unique SKUs for CMV calculation
    const skusUnicos = Array.from(
      new Set(vendas.map((v) => v.sku).filter((s): s is string => Boolean(s)))
    );

    const skuCustos = skusUnicos.length
      ? await prisma.sKU.findMany({
          where: { userId: session.sub, sku: { in: skusUnicos } },
          select: { sku: true, custoUnitario: true },
        })
      : [];

    const mapaCustos = new Map(skuCustos.map((s) => [s.sku, toNumber(s.custoUnitario)]));

    // Aggregate current period
    let faturamentoTotal = 0;
    let receitaLiquida = 0; // valorTotal + taxas + frete
    let cmvTotal = 0;
    let vendasRealizadas = 0;
    let unidadesVendidas = 0;
    let taxasTotalAbs = 0;
    let freteTotalAbs = 0;

    // Breakdown by plataforma
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
      receitaLiquida += vt + tp + fr; // taxa/frete podem ser negativos no banco
      cmvTotal += cmv;
      vendasRealizadas += 1;
      unidadesVendidas += qtd;

      const plataforma = v.plataforma || "Mercado Livre";
      const taxaAbs = Math.abs(tp);
      const freteAbs = Math.abs(fr);
      taxasTotalAbs += taxaAbs;
      freteTotalAbs += freteAbs;

      taxasPorPlataforma.set(
        plataforma,
        (taxasPorPlataforma.get(plataforma) || 0) + taxaAbs,
      );
      fretePorPlataforma.set(
        plataforma,
        (fretePorPlataforma.get(plataforma) || 0) + freteAbs,
      );
    }

    const lucroBruto = receitaLiquida - cmvTotal;

    // Calcular impostos baseado nas alíquotas cadastradas
    let impostosTotal = 0;
    
    // Buscar alíquotas ativas do usuário
    // @ts-ignore - modelo será disponível após executar migration
    const aliquotas = await prisma.aliquotaImposto.findMany({
      where: {
        userId: session.sub,
        ativo: true,
      },
    });

    // Se não houver alíquotas, pular o cálculo
    if (aliquotas.length > 0 && useRange) {
      // Agrupar vendas por mês/ano para aplicar alíquota específica de cada mês
      const faturamentoPorMes = new Map<string, number>();
      
      for (const v of vendas) {
        if (!v.dataVenda) continue; // Pular vendas sem data
        
        const dataVenda = new Date(v.dataVenda);
        // Chave no formato YYYY-MM
        const mesAno = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, '0')}`;
        const valorTotal = toNumber(v.valorTotal);
        
        faturamentoPorMes.set(mesAno, (faturamentoPorMes.get(mesAno) || 0) + valorTotal);
      }

      console.log('Faturamento agrupado por mês:', Object.fromEntries(faturamentoPorMes));

      // Para cada mês com faturamento, aplicar a alíquota correspondente
      for (const [mesAno, faturamentoMes] of faturamentoPorMes.entries()) {
        const [year, month] = mesAno.split('-').map(Number);
        const primeiroDiaMes = new Date(year, month - 1, 1);
        const ultimoDiaMes = new Date(year, month, 0, 23, 59, 59, 999);
        
        // Buscar alíquota para este mês específico
        const aliquotaMes = aliquotas.find((aliq: any) => {
          const aliqInicio = new Date(aliq.dataInicio);
          const aliqFim = new Date(aliq.dataFim);
          
          // Verificar se a alíquota se aplica a este mês
          return (primeiroDiaMes <= aliqFim && ultimoDiaMes >= aliqInicio);
        });

        if (aliquotaMes) {
          const aliquotaDecimal = toNumber(aliquotaMes.aliquota) / 100;
          const impostoMes = faturamentoMes * aliquotaDecimal;
          impostosTotal += impostoMes;
          
          console.log(`Imposto de ${mesAno}:`, {
            faturamento: faturamentoMes,
            aliquota: aliquotaMes.aliquota,
            imposto: impostoMes
          });
        } else {
          console.log(`Sem alíquota cadastrada para ${mesAno}`);
        }
      }

      if (impostosTotal > 0) {
        const aliquotaMediaEfetiva = (impostosTotal / faturamentoTotal) * 100;
        console.log('Imposto total calculado:', {
          impostosTotal,
          faturamentoTotal,
          aliquotaMediaEfetiva: aliquotaMediaEfetiva.toFixed(2) + '%'
        });
      }
    } else if (aliquotas.length > 0 && !useRange) {
      console.log('Alíquotas encontradas mas período não filtrado (todos). Selecione um período específico no dashboard.');
    }

    // Trend: faturamento do último mês vs penúltimo mês (considerando ambas plataformas)
    const vendasMeliUltimoMes = await prisma.meliVenda.findMany({
      where: { userId: session.sub, dataVenda: { gte: prevStart, lte: prevEnd }, ...paidOnly },
      select: { valorTotal: true },
      distinct: ['orderId'],
    });
    const vendasShopeeUltimoMes = await prisma.shopeeVenda.findMany({
      where: { userId: session.sub, dataVenda: { gte: prevStart, lte: prevEnd }, ...paidOnly },
      select: { valorTotal: true },
      distinct: ['orderId'],
    });
    const vendasMeliPenultimoMes = await prisma.meliVenda.findMany({
      where: { userId: session.sub, dataVenda: { gte: penultStart, lte: penultEnd }, ...paidOnly },
      select: { valorTotal: true },
      distinct: ['orderId'],
    });
    const vendasShopeePenultimoMes = await prisma.shopeeVenda.findMany({
      where: { userId: session.sub, dataVenda: { gte: penultStart, lte: penultEnd }, ...paidOnly },
      select: { valorTotal: true },
      distinct: ['orderId'],
    });

    const faturamentoPrev =
      vendasMeliPenultimoMes.reduce((acc, it) => acc + toNumber(it.valorTotal), 0) +
      vendasShopeePenultimoMes.reduce((acc, it) => acc + toNumber(it.valorTotal), 0);
    const faturamentoUltimo =
      vendasMeliUltimoMes.reduce((acc, it) => acc + toNumber(it.valorTotal), 0) +
      vendasShopeeUltimoMes.reduce((acc, it) => acc + toNumber(it.valorTotal), 0);
    const faturamentoTendencia = faturamentoPrev > 0
      ? ((faturamentoUltimo - faturamentoPrev) / Math.abs(faturamentoPrev)) * 100
      : 0;

    // Separar taxas e frete por plataforma
    const mercadoLivreTaxa = taxasPorPlataforma.get("Mercado Livre") || 0;
    const shopeeTaxa = taxasPorPlataforma.get("Shopee") || 0;
    const mercadoLivreFrete = fretePorPlataforma.get("Mercado Livre") || 0;
    const shopeeFrete = fretePorPlataforma.get("Shopee") || 0;

    return NextResponse.json({
      faturamentoTotal,
      faturamentoTendencia,
      impostos: impostosTotal,
      taxasPlataformas: {
        total: taxasTotalAbs,
        mercadoLivre: mercadoLivreTaxa,
        shopee: shopeeTaxa,
      },
      custoFrete: {
        total: freteTotalAbs,
        mercadoLivre: mercadoLivreFrete,
        shopee: shopeeFrete,
      },
      margemContribuicao: receitaLiquida, // Receita líquida após taxas e frete
      cmv: cmvTotal,
      lucroBruto,
      vendasRealizadas,
      unidadesVendidas,
      periodo: useRange ? { start: start.toISOString(), end: end.toISOString() } : null,
    });
  } catch (err) {
    console.error("Erro ao calcular stats do dashboard:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
