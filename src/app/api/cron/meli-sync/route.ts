/**
 * Cron Job para Sincronização Automática do Mercado Livre
 *
 * Este endpoint é chamado automaticamente pelo Vercel Cron
 * para sincronizar vendas do Mercado Livre de todas as contas ativas.
 *
 * ESTRATÉGIA:
 * - Processa múltiplas contas em paralelo (lotes de 3)
 * - Usa quickMode para sincronizar apenas vendas recentes
 * - Evita timeout ao processar em lotes pequenos
 * - Cada execução sincroniza TODAS as contas em ~60s
 *
 * Configuração em vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/meli-sync",
 *     "schedule": "0 *\\/2 * * *"  // A cada 2 horas
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutos para processar todas as contas

export async function GET(req: NextRequest) {
  // Verificar autorização via CRON_SECRET
  const authHeader = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error('[Cron] CRON_SECRET não configurado');
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 });
  }

  if (authHeader !== expectedAuth) {
    console.error('[Cron] Unauthorized - invalid CRON_SECRET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[Cron] 🚀 Iniciando sincronização automática do Mercado Livre...');

  try {
    // Buscar todas as contas Meli ativas
    const accounts = await prisma.meliAccount.findMany({
      select: {
        id: true,
        userId: true,
        ml_user_id: true,
        nickname: true
      },
      orderBy: { created_at: 'desc' }
    });

    if (accounts.length === 0) {
      console.log('[Cron] ⚠️ Nenhuma conta do Mercado Livre encontrada');
      return NextResponse.json({
        success: true,
        message: 'Nenhuma conta encontrada',
        synced: 0,
        duration: Date.now() - startTime
      });
    }

    console.log(`[Cron] 📊 Encontradas ${accounts.length} contas do Mercado Livre`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Processar contas em lotes paralelos de 3
    const BATCH_SIZE = 3;
    const results = [];

    for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
      const batch = accounts.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(accounts.length / BATCH_SIZE);

      console.log(`[Cron] 🔄 Processando lote ${batchNumber}/${totalBatches} (${batch.length} contas)...`);

      // Processar lote em paralelo
      const batchResults = await Promise.allSettled(
        batch.map(async (account) => {
          const accountStartTime = Date.now();
          try {
            console.log(`[Cron]   → Sincronizando ${account.nickname || account.ml_user_id}...`);

            const response = await fetch(`${baseUrl}/api/meli/vendas/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': process.env.CRON_SECRET || ''
              },
              body: JSON.stringify({
                accountIds: [account.id],
                quickMode: true,  // Sincroniza apenas vendas recentes (rápido)
                fullSync: false   // Não busca histórico completo
              })
            });

            const data = await response.json();
            const duration = Date.now() - accountStartTime;

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${data.error || 'Erro desconhecido'}`);
            }

            console.log(`[Cron]   ✅ ${account.nickname}: ${data.totals?.saved || 0} vendas em ${duration}ms`);

            return {
              accountId: account.id,
              nickname: account.nickname,
              ml_user_id: account.ml_user_id,
              success: true,
              status: response.status,
              vendas: data.totals?.saved || 0,
              duration
            };

          } catch (error) {
            const duration = Date.now() - accountStartTime;
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error(`[Cron]   ❌ ${account.nickname}: ${errorMessage}`);

            return {
              accountId: account.id,
              nickname: account.nickname,
              ml_user_id: account.ml_user_id,
              success: false,
              error: errorMessage,
              duration
            };
          }
        })
      );

      // Adicionar resultados do lote
      results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : r.reason));

      // Log do lote
      const batchSuccess = batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      console.log(`[Cron] ✓ Lote ${batchNumber}/${totalBatches}: ${batchSuccess}/${batch.length} contas sincronizadas`);
    }

    const successCount = results.filter(r => r.success).length;
    const totalVendas = results.reduce((sum, r) => sum + (r.vendas || 0), 0);
    const totalDuration = Date.now() - startTime;

    console.log(`[Cron] 🎉 Sincronização completa: ${successCount}/${results.length} contas, ${totalVendas} vendas, ${totalDuration}ms`);

    return NextResponse.json({
      success: true,
      message: `${successCount}/${results.length} contas sincronizadas`,
      totalVendas,
      totalAccounts: results.length,
      successCount,
      duration: totalDuration,
      results
    });

  } catch (error) {
    console.error('[Cron] Erro crítico na sincronização automática:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
