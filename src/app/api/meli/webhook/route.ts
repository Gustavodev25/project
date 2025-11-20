/**
 * Webhook do Mercado Livre - Sincronização em Tempo Real
 *
 * Recebe notificações do Mercado Livre quando eventos ocorrem (vendas, atualizações, etc)
 * e dispara sincronização automática da venda específica.
 *
 * Documentação: https://developers.mercadolibre.com.ar/en_us/real-time-notifications
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30; // Webhook deve responder rapidamente

// Tipos de notificação do Mercado Livre
type MeliNotification = {
  _id: string;
  resource: string; // Ex: "/orders/1234567890" ou "/orders/1234567890/shipments/1111"
  user_id: number;
  topic: string; // "orders_v2", "items", "questions", "claims", "messages"
  application_id: number;
  sent: string; // ISO datetime
  received: string; // ISO datetime
  attempts: number;
};

/**
 * POST /api/meli/webhook
 *
 * Endpoint que recebe notificações do Mercado Livre
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Parse da notificação
    const notification: MeliNotification = await req.json();

    console.log("[Webhook] Notificação recebida:", {
      topic: notification.topic,
      resource: notification.resource,
      user_id: notification.user_id,
      attempts: notification.attempts,
      notification_id: notification._id
    });

    // 2. Validar application_id (segurança básica)
    const expectedAppId = process.env.MELI_APP_ID;
    if (expectedAppId && String(notification.application_id) !== String(expectedAppId)) {
      console.warn("[Webhook] ⚠️ Application ID inválido:", {
        received: notification.application_id,
        expected: expectedAppId
      });
      return NextResponse.json(
        { error: "Invalid application_id" },
        { status: 403 }
      );
    }

    // 3. Filtrar apenas notificações de pedidos
    if (notification.topic !== "orders_v2") {
      console.log(`[Webhook] Topic "${notification.topic}" ignorado (apenas orders_v2 são processados)`);
      return NextResponse.json({
        message: "Topic ignored",
        topic: notification.topic
      });
    }

    // 4. Extrair order_id do resource
    // Resource pode vir como "/orders/1234567890" ou "/orders/1234567890/shipments/1111"
    const orderId = extractOrderIdFromResource(notification.resource);

    if (!orderId) {
      console.error("[Webhook] ❌ Não foi possível extrair order_id do resource:", notification.resource);
      return NextResponse.json(
        { error: "Invalid resource format" },
        { status: 400 }
      );
    }

    console.log(`[Webhook] 📦 Processando venda ${orderId} do usuário ML ${notification.user_id}`);

    // 5. Buscar conta ML no banco de dados
    const account = await prisma.meliAccount.findFirst({
      where: {
        ml_user_id: notification.user_id,
        isInvalid: false // Apenas contas válidas
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!account) {
      console.warn(`[Webhook] ⚠️ Conta ML ${notification.user_id} não encontrada ou inválida no sistema`);
      // Retornar 200 para evitar retry do ML (conta não está no nosso sistema)
      return NextResponse.json({
        message: "Account not found or invalid",
        user_id: notification.user_id
      });
    }

    console.log(`[Webhook] ✅ Conta encontrada: ${account.nickname} (user: ${account.user.email})`);

    // 6. Disparar sincronização específica desta venda
    // Chama a rota de sincronização existente com o orderIdsByAccount
    const syncUrl = new URL("/api/meli/vendas/sync", req.url);

    const syncBody = {
      accountIds: [account.id],
      orderIdsByAccount: {
        [account.id]: [orderId]
      },
      quickMode: true, // Sincronização rápida (apenas esta venda)
      fullSync: false
    };

    // Buscar token de sessão do cron (se disponível)
    const cronSecret = process.env.CRON_SECRET;

    const syncResponse = await fetch(syncUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret || "", // Autenticar como cron job
        // Passar cookies da requisição original (se houver sessão)
        "Cookie": req.headers.get("cookie") || ""
      },
      body: JSON.stringify(syncBody)
    });

    const syncResult = await syncResponse.json();
    const duration = Date.now() - startTime;

    if (!syncResponse.ok) {
      console.error(`[Webhook] ❌ Erro ao sincronizar venda ${orderId}:`, syncResult);
      // Retornar 200 para evitar retry excessivo do ML
      return NextResponse.json({
        message: "Sync failed but acknowledged",
        order_id: orderId,
        error: syncResult,
        duration_ms: duration
      });
    }

    console.log(`[Webhook] ✅ Venda ${orderId} sincronizada com sucesso (${duration}ms)`);

    // 7. Responder 200 OK rapidamente
    return NextResponse.json({
      success: true,
      order_id: orderId,
      account_id: account.id,
      account_nickname: account.nickname,
      user_id: account.user.id,
      duration_ms: duration,
      notification_id: notification._id,
      attempts: notification.attempts
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[Webhook] ❌ Erro ao processar notificação:", error);

    // Retornar 200 mesmo com erro para evitar retries excessivos do ML
    // (o ML pode tentar novamente se retornarmos 500)
    return NextResponse.json({
      error: "Processing failed",
      message: error instanceof Error ? error.message : String(error),
      duration_ms: duration
    }, { status: 200 });
  }
}

/**
 * GET /api/meli/webhook
 *
 * Endpoint para validação do webhook (alguns sistemas requerem GET para validação)
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    service: "Mercado Livre Webhook",
    status: "active",
    topics: ["orders_v2"],
    timestamp: new Date().toISOString()
  });
}

/**
 * Extrai o order_id do resource recebido na notificação
 *
 * Exemplos de resources:
 * - "/orders/1234567890" → "1234567890"
 * - "/orders/1234567890/shipments/1111" → "1234567890"
 * - "orders/1234567890" → "1234567890"
 */
function extractOrderIdFromResource(resource: string): string | null {
  if (!resource) return null;

  // Normalizar: remover "/" inicial se existir
  const normalized = resource.startsWith("/") ? resource.substring(1) : resource;

  // Dividir por "/"
  const parts = normalized.split("/");

  // Formato esperado: "orders/1234567890" ou "orders/1234567890/..."
  if (parts[0] === "orders" && parts[1]) {
    const orderId = parts[1].trim();
    return orderId.length > 0 ? orderId : null;
  }

  return null;
}
