import { NextRequest, NextResponse } from "next/server";
import { assertSessionToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cache, createCacheKey } from "@/lib/cache";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await assertSessionToken(req.cookies.get("session")?.value);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    // Verificar cache primeiro (TTL de 30 segundos)
    const cacheKey = createCacheKey("vendas-shopee", session.sub);
    const cachedData = cache.get<any>(cacheKey, 30000);
    
    if (cachedData) {
      console.log(`[Cache Hit] Retornando vendas do Shopee do cache`);
      return NextResponse.json(cachedData);
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10000"); // Aumentado para 10000
    const offset = (page - 1) * limit;

    // Calcular data de início: 1 mês atrás a partir do primeiro dia do mês atual
    const hoje = new Date();
    const primeiroDiaMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataInicio = new Date(primeiroDiaMesAtual);
    dataInicio.setMonth(dataInicio.getMonth() - 1); // Voltar 1 mês
    
    console.log(`[Shopee] Filtrando vendas a partir de: ${dataInicio.toISOString()}`);

    // Buscar vendas Shopee do usuário
    const vendas = await prisma.shopeeVenda.findMany({
      where: { 
        userId: session.sub,
        dataVenda: {
          gte: dataInicio, // Filtrar vendas >= data de início (últimos 2 meses)
        }
      },
      select: {
        orderId: true,
        dataVenda: true,
        status: true,
        conta: true,
        shopeeAccountId: true,
        valorTotal: true,
        quantidade: true,
        unitario: true,
        taxaPlataforma: true,
        frete: true,
        freteAjuste: true,
        titulo: true,
        sku: true,
        comprador: true,
        logisticType: true,
        envioMode: true,
        shippingStatus: true,
        shippingId: true,
        paymentMethod: true,
        paymentStatus: true,
        latitude: true,
        longitude: true,
        plataforma: true,
        canal: true,
        tags: true,
        internalTags: true,
        sincronizadoEm: true,
      },
      orderBy: { dataVenda: "desc" },
      skip: offset,
      take: limit,
    });

    // Contar total de vendas
    const total = await prisma.shopeeVenda.count({
      where: { 
        userId: session.sub,
        dataVenda: {
          gte: dataInicio, // Filtrar vendas >= data de início (últimos 2 meses)
        }
      },
    });

    // Buscar última sincronização
    const lastSync = await prisma.shopeeVenda.findFirst({
      where: { userId: session.sub },
      orderBy: { sincronizadoEm: "desc" },
      select: { sincronizadoEm: true },
    });

    const response = {
      vendas,
      total,
      lastSync: lastSync?.sincronizadoEm?.toISOString() || null,
    };

    // Armazenar no cache
    cache.set(cacheKey, response);
    console.log(`[Cache Miss] Vendas do Shopee salvas no cache`);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar vendas Shopee:", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}
