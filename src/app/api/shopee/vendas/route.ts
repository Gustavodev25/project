import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await assertSessionToken(req.cookies.get("session")?.value);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10000"); // Aumentado para 10000
    const offset = (page - 1) * limit;

    // Buscar vendas Shopee do usuário
    const vendas = await prisma.shopeeVenda.findMany({
      where: { userId: session.sub },
      orderBy: { dataVenda: "desc" },
      skip: offset,
      take: limit,
    });

    // Contar total de vendas
    const total = await prisma.shopeeVenda.count({
      where: { userId: session.sub },
    });

    // Buscar última sincronização
    const lastSync = await prisma.shopeeVenda.findFirst({
      where: { userId: session.sub },
      orderBy: { sincronizadoEm: "desc" },
      select: { sincronizadoEm: true },
    });

    return NextResponse.json({
      vendas,
      total,
      lastSync: lastSync?.sincronizadoEm?.toISOString() || null,
    });
  } catch (error) {
    console.error("Erro ao buscar vendas Shopee:", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}
