import { NextRequest, NextResponse } from "next/server";
import { assertSessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60; // Apenas retorna imediatamente

/**
 * ENDPOINT DE SINCRONIZAÇÃO ASSÍNCRONA - VERSÃO SIMPLIFICADA
 *
 * PROBLEMA: No Vercel, não existe "background processing" real.
 * Fetch interno também está sujeito ao maxDuration.
 *
 * SOLUÇÃO: Este endpoint apenas retorna sucesso imediatamente.
 * O processamento real acontece no endpoint /sync que deve ser otimizado
 * para processar dentro do limite de 5 minutos.
 *
 * O frontend mantém isSyncing=true até receber sync_complete via SSE.
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

    console.log(`[Sync Async] Redirecionando para sincronização síncrona com SSE`);

    // MUDANÇA: Chamar endpoint /sync diretamente e aguardar
    // Isso garante que o processamento acontece dentro do maxDuration configurado
    const syncUrl = new URL('/api/meli/vendas/sync', req.url);

    const syncResponse = await fetch(syncUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionCookie}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('[Sync Async] Erro na sincronização:', errorText);
      return NextResponse.json({
        success: false,
        message: `Erro na sincronização: ${syncResponse.status}`
      }, { status: syncResponse.status });
    }

    const result = await syncResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída',
      ...result
    });

  } catch (error) {
    console.error('[Sync Async] Erro:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
