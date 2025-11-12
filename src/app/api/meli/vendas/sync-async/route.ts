import { NextRequest, NextResponse } from "next/server";
import { assertSessionToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60; // Apenas para iniciar o processo

/**
 * ENDPOINT DE SINCRONIZAÇÃO ASSÍNCRONA
 *
 * Este endpoint apenas INICIA a sincronização e retorna imediatamente.
 * A sincronização continua em background e envia progresso via SSE.
 *
 * Isso resolve o problema de timeout do Vercel.
 */

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  let session;
  try {
    session = await assertSessionToken(sessionCookie);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = session.sub;

  // Ler body para contas selecionadas
  let requestBody: {
    accountIds?: string[];
  } = {};

  try {
    const bodyText = await req.text();
    if (bodyText) {
      requestBody = JSON.parse(bodyText);
    }
  } catch (error) {
    console.error('[Sync Async] Erro ao parsear body:', error);
  }

  // Buscar contas
  const accountsWhere: any = { userId: session.sub };
  if (requestBody.accountIds && requestBody.accountIds.length > 0) {
    accountsWhere.id = { in: requestBody.accountIds };
  }

  const accounts = await prisma.meliAccount.findMany({
    where: accountsWhere,
    orderBy: { created_at: "desc" },
  });

  if (accounts.length === 0) {
    return NextResponse.json({
      success: false,
      message: "Nenhuma conta encontrada"
    });
  }

  // IMPORTANTE: Iniciar sincronização em background usando fetch interno
  // Isso permite que a sincronização continue mesmo após retornar a resposta
  const syncUrl = new URL('/api/meli/vendas/sync', req.url);

  // Fazer chamada assíncrona (não aguardar)
  fetch(syncUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${sessionCookie}`
    },
    body: JSON.stringify(requestBody),
  }).catch(error => {
    console.error('[Sync Async] Erro ao iniciar sincronização:', error);
  });

  console.log(`[Sync Async] Sincronização iniciada em background para ${accounts.length} conta(s)`);

  // Retornar imediatamente
  return NextResponse.json({
    success: true,
    message: `Sincronização iniciada para ${accounts.length} conta(s)`,
    accounts: accounts.map(a => ({
      id: a.id,
      nickname: a.nickname,
      ml_user_id: a.ml_user_id
    }))
  });
}
