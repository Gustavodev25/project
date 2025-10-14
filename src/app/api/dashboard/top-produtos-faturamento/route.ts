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
    const agrupamentoSKUParam = url.searchParams.get("agrupamentoSKU") || "mlb";

    let start: Date;
    let end: Date;
    let usarTodasVendas = false;

    if (dataInicioParam && dataFimParam) {
      // Período personalizado
      // Inclusão do dia final completo (fuso-independente)
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
    const vendasMeli = await prisma.meliVenda.findMany({
      where: whereClauseMeli,
      select: {
        titulo: true,
        sku: true,
        valorTotal: true,
        quantidade: true,
        dataVenda: true,
        plataforma: true,
      },
      distinct: ['orderId'],
      orderBy: { dataVenda: "desc" },
    });

    // Buscar vendas do Shopee
    const vendasShopee = await prisma.shopeeVenda.findMany({
      where: whereClauseShopee,
      select: {
        titulo: true,
        sku: true,
        valorTotal: true,
        quantidade: true,
        dataVenda: true,
        plataforma: true,
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

    console.log(`[TopProdutosFaturamento] Encontradas ${vendas.length} vendas no período`);
    console.log(`[TopProdutosFaturamento] Período: ${usarTodasVendas ? 'todos' : `${start.toISOString()} - ${end.toISOString()}`}`);
    if (vendas.length > 0) {
      console.log(`[TopProdutosFaturamento] Primeira venda: ${vendas[0].titulo} - R$ ${vendas[0].valorTotal} - Plataforma: ${vendas[0].plataforma}`);
      console.log(`[TopProdutosFaturamento] Últimas 3 vendas:`, vendas.slice(0, 3).map(v => ({
        titulo: v.titulo.substring(0, 50),
        valor: v.valorTotal,
        plataforma: v.plataforma,
        data: v.dataVenda
      })));
    }

    // Buscar dados de SKU para agrupamento inteligente
    const skusData = await prisma.sKU.findMany({
      where: { userId: session.sub },
      select: {
        sku: true,
        produto: true,
        tipo: true,
        hierarquia1: true,
        hierarquia2: true,
      },
    });

    // Criar mapa de SKUs para lookup rápido
    const skuMap = new Map<string, typeof skusData[0]>();
    skusData.forEach(sku => {
      skuMap.set(sku.sku, sku);
    });

    // Função para determinar a chave de agrupamento baseada no filtro
    function getGroupingKey(venda: typeof vendas[0]): string {
      const skuData = skuMap.get(venda.sku || "");
      
      switch (agrupamentoSKUParam) {
        case "sku":
          return venda.sku || venda.titulo;
        case "hierarquia1":
          return skuData?.hierarquia1 || "Sem Hierarquia 1";
        case "hierarquia2":
          return skuData?.hierarquia2 || "Sem Hierarquia 2";
        case "kit":
          return skuData?.tipo === "pai" ? "Kits" : "Produtos Individuais";
        case "mlb":
        default:
          return venda.sku || venda.titulo;
      }
    }

    // Função para determinar o nome de exibição baseado no agrupamento
    function getDisplayName(venda: typeof vendas[0], groupingKey: string): string {
      const skuData = skuMap.get(venda.sku || "");
      
      switch (agrupamentoSKUParam) {
        case "sku":
          return venda.titulo.length > 30 
            ? venda.titulo.substring(0, 30) + "..." 
            : venda.titulo;
        case "hierarquia1":
          return groupingKey;
        case "hierarquia2":
          return groupingKey;
        case "kit":
          return groupingKey;
        case "mlb":
        default:
          return venda.titulo.length > 30 
            ? venda.titulo.substring(0, 30) + "..." 
            : venda.titulo;
      }
    }

    // Agrupar por produto/SKU baseado no filtro
    const produtosMap = new Map<string, {
      produto: string;
      sku: string;
      faturamento: number;
      quantidade: number;
    }>();

    for (const venda of vendas) {
      const groupingKey = getGroupingKey(venda);
      const faturamento = toNumber(venda.valorTotal);
      const quantidade = toNumber(venda.quantidade);

      const displayName = getDisplayName(venda, groupingKey);

      if (produtosMap.has(groupingKey)) {
        const existing = produtosMap.get(groupingKey)!;
        existing.faturamento += faturamento;
        existing.quantidade += quantidade;
      } else {
        produtosMap.set(groupingKey, {
          produto: displayName,
          sku: venda.sku || "",
          faturamento,
          quantidade,
        });
      }
    }

    // Converter para array e calcular ticket médio
    const produtos = Array.from(produtosMap.values()).map(produto => ({
      ...produto,
      ticketMedio: produto.quantidade > 0 ? produto.faturamento / produto.quantidade : 0,
    }));

    // Ordenar por faturamento (maior para menor) e pegar top 10
    const topProdutos = produtos
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 10);

    console.log(`[TopProdutosFaturamento] Produtos processados: ${produtos.length}`);
    console.log(`[TopProdutosFaturamento] Top 3 produtos:`, topProdutos.slice(0, 3).map(p => ({
      produto: p.produto,
      faturamento: p.faturamento,
      quantidade: p.quantidade
    })));

    return NextResponse.json(topProdutos);
  } catch (err) {
    console.error("Erro ao calcular top produtos faturamento:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
