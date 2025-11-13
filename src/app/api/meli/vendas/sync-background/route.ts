/**
 * Endpoint de Sincronização em Background
 *
 * Este endpoint sincroniza vendas antigas que não foram baixadas na sincronização rápida inicial.
 * - Deve ser chamado APÓS a sincronização inicial (/sync com quickMode=true)
 * - Usa quickMode=false internamente para buscar mais vendas (até 2500 por vez)
 * - Reporta progresso via SSE
 * - Pode ser chamado múltiplas vezes até sincronizar todo histórico
 */

import { NextRequest, NextResponse } from "next/server";
import { assertSessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 segundos

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
    } = {};

    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (error) {
      console.error('[Sync Background] Erro ao parsear body:', error);
    }

    console.log(`[Sync Background] 🔄 Iniciando sincronização de vendas antigas para usuário ${session.sub}`, {
      accountIds: requestBody.accountIds
    });

    // Chamar o endpoint principal com quickMode=false
    const syncBody = {
      accountIds: requestBody.accountIds,
      quickMode: false // IMPORTANTE: modo completo para buscar vendas antigas
    };

    // Fazer fetch interno para o endpoint /sync
    const baseUrl = process.env.NEXTAUTH_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    const syncUrl = `${baseUrl}/api/meli/vendas/sync`;

    console.log(`[Sync Background] Chamando ${syncUrl} com quickMode=false`);

    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionCookie}` // Passar cookie de sessão
      },
      body: JSON.stringify(syncBody)
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('[Sync Background] Erro na sincronização:', errorText);
      return NextResponse.json({
        success: false,
        message: `Erro na sincronização: ${syncResponse.status} ${syncResponse.statusText}`
      }, { status: syncResponse.status });
    }

    const syncResult = await syncResponse.json();

    console.log(`[Sync Background] ✅ Sincronização background concluída`, {
      saved: syncResult.totals?.saved,
      hasMoreToSync: syncResult.hasMoreToSync
    });

    return NextResponse.json({
      success: true,
      message: 'Sincronização de vendas antigas concluída',
      ...syncResult
    });

  } catch (error) {
    console.error('[Sync Background] Erro:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
