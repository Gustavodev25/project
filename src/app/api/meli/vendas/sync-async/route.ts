import { NextRequest, NextResponse } from "next/server";
import { assertSessionToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 10; // Apenas para retornar imediatamente

/**
 * ENDPOINT QUE APENAS VALIDA E RETORNA IMEDIATAMENTE
 *
 * O frontend deve chamar diretamente /sync e aguardar via SSE.
 * Este endpoint só serve para compatibilidade, mas redireciona o frontend
 * para usar /sync diretamente.
 */

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    let session;
    try {
      session = await assertSessionToken(sessionCookie);
    } catch {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ler body para contas selecionadas
    let requestBody: {
      accountIds?: string[];
      orderIdsByAccount?: Record<string, string[]>;
    } = {};

    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (error) {
      console.error('[Sync Async] Erro ao parsear body:', error);
    }

    // Buscar contas para validar
    const accountsWhere: any = { userId: session.sub };
    if (requestBody.accountIds && requestBody.accountIds.length > 0) {
      accountsWhere.id = { in: requestBody.accountIds };
    }

    const accounts = await prisma.meliAccount.findMany({
      where: accountsWhere,
      select: { id: true, nickname: true, ml_user_id: true }
    });

    if (accounts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Nenhuma conta encontrada"
      }, { status: 404 });
    }

    console.log(`[Sync Async] Retornando imediatamente. Frontend deve monitorar SSE.`);

    // Retornar imediatamente - frontend monitora via SSE
    return NextResponse.json({
      success: true,
      message: `Use o endpoint /sync diretamente. Este endpoint está deprecated.`,
      accounts: accounts,
      redirectTo: '/api/meli/vendas/sync'
    });

  } catch (error) {
    console.error('[Sync Async] Erro:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
