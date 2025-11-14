/**
 * Cron Job para Sincronização Automática do Mercado Livre
 *
 * Este endpoint é chamado automaticamente pelo Vercel Cron
 * para sincronizar vendas do Mercado Livre de todas as contas ativas.
 *
 * Configuração em vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/meli-sync",
 *     "schedule": "0 * * * *"  // A cada hora
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  console.log('[Cron] Iniciando sincronização automática do Mercado Livre...');

  try {
    // Buscar todas as contas Meli ativas
    // Agrupa por userId para sincronizar uma conta por usuário por vez
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
      console.log('[Cron] Nenhuma conta do Mercado Livre encontrada');
      return NextResponse.json({
        success: true,
        message: 'Nenhuma conta encontrada',
        synced: 0
      });
    }

    console.log(`[Cron] Encontradas ${accounts.length} contas do Mercado Livre`);

    // Agrupar contas por usuário
    const accountsByUser = accounts.reduce((acc, account) => {
      if (!acc[account.userId]) {
        acc[account.userId] = [];
      }
      acc[account.userId].push(account);
      return acc;
    }, {} as Record<string, typeof accounts>);

    const results = [];

    // Sincronizar uma conta de cada usuário (para não sobrecarregar)
    for (const [userId, userAccounts] of Object.entries(accountsByUser)) {
      const account = userAccounts[0]; // Pegar primeira conta do usuário

      try {
        console.log(`[Cron] Sincronizando conta ${account.nickname || account.ml_user_id} (usuário ${userId})...`);

        // Fazer requisição para endpoint de sync
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        // Criar token de sessão temporário para o cron job
        // Nota: Em produção, considere usar um mecanismo mais seguro
        const response = await fetch(`${baseUrl}/api/meli/vendas/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': process.env.CRON_SECRET || ''
          },
          body: JSON.stringify({
            accountIds: [account.id],
            quickMode: true,
            fullSync: false
          })
        });

        const data = await response.json();

        results.push({
          accountId: account.id,
          nickname: account.nickname,
          success: response.ok,
          status: response.status,
          vendas: data.totals?.saved || 0
        });

        console.log(`[Cron] ✅ Conta ${account.nickname}: ${data.totals?.saved || 0} vendas sincronizadas`);

      } catch (error) {
        console.error(`[Cron] ❌ Erro ao sincronizar conta ${account.id}:`, error);
        results.push({
          accountId: account.id,
          nickname: account.nickname,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalVendas = results.reduce((sum, r) => sum + (r.vendas || 0), 0);

    console.log(`[Cron] ✅ Sincronização completa: ${successCount}/${results.length} contas sincronizadas, ${totalVendas} vendas`);

    return NextResponse.json({
      success: true,
      message: `${successCount}/${results.length} contas sincronizadas`,
      totalVendas,
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
