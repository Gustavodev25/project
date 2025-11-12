import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";
import { smartRefreshMeliAccountToken, ensureActiveAccountsHaveValidTokens } from "@/lib/meli";
import { isAccountMarkedAsInvalid } from "@/lib/account-status";
import type { MeliAccount } from "@prisma/client";

export const runtime = "nodejs";

const MELI_API_BASE =
  process.env.MELI_API_BASE?.replace(/\/$/, "") ||
  "https://api.mercadolibre.com";
const PAGE_LIMIT = 50;
const MAX_OFFSET = 10000; // Limite máximo da API do Mercado Livre

type SyncError = {
  accountId: string;
  mlUserId: number;
  message: string;
};

type AccountSummary = {
  id: string;
  nickname: string | null;
  ml_user_id: number;
  expires_at: string;
};

type NewOrderSummary = {
  orderId: string;
  title: string;
  totalAmount: number;
  dateCreated: string;
  accountNickname: string | null;
  accountId: string; // ID da conta para mapeamento
};

async function checkNewOrdersForAccount(
  account: MeliAccount,
): Promise<{ newOrders: NewOrderSummary[]; expectedTotal: number }> {
  const results: NewOrderSummary[] = [];
  const headers = { Authorization: `Bearer ${account.access_token}` };

  // Buscar vendas já existentes no banco para esta conta
  const existingOrderIds = await prisma.meliVenda.findMany({
    where: { meliAccountId: account.id },
    select: { orderId: true }
  });
  const existingIds = new Set(existingOrderIds.map(v => v.orderId));
  console.log(`[meli][check] Conta ${account.ml_user_id} (${account.nickname}): ${existingIds.size} vendas já existem no banco`);

  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let expectedTotal = 0;

  // Buscar apenas últimas 48 horas para verificação rápida
  const now = new Date();
  const last48Hours = new Date(now.getTime() - (48 * 60 * 60 * 1000));
  
  while (offset < total && offset < MAX_OFFSET) {
    const limit = PAGE_LIMIT;
    // Usar endpoint /orders/search com filtro de data das últimas 48 horas
    const url = new URL(`${MELI_API_BASE}/orders/search`);
    url.searchParams.set("seller", account.ml_user_id.toString());
    url.searchParams.set("sort", "date_desc");
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());
    // Filtrar vendas das últimas 48 horas apenas
    url.searchParams.set("order.date_created.from", last48Hours.toISOString());
    url.searchParams.set("order.date_created.to", now.toISOString());

    const response = await fetch(url.toString(), { headers });
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const message = typeof payload?.message === "string"
        ? payload.message
        : `Status ${response.status}`;
      throw new Error(`Erro ao buscar pedidos: ${message}`);
    }

    const orders = Array.isArray(payload?.results) ? payload.results : [];
    
    // Atualizar total apenas na primeira requisição
    if (offset === 0 && typeof payload?.paging?.total === "number") {
      total = payload.paging.total;
      expectedTotal = payload.paging.total;
    }

    // Filtrar apenas vendas que não existem no banco
    for (const order of orders) {
      const orderId = String(order.id || "");
      if (orderId && !existingIds.has(orderId)) {
        const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
        const firstItem = orderItems[0] || {};
        const itemData = typeof firstItem?.item === "object" && firstItem.item !== null
          ? firstItem.item
          : {};

        const title = itemData?.title ||
          orderItems.find((item: any) => item?.item?.title)?.item?.title ||
          order.title ||
          "Pedido";

        results.push({
          orderId,
          title,
          totalAmount: Number(order.total_amount || 0),
          dateCreated: order.date_created || order.date_last_updated || new Date().toISOString(),
          accountNickname: account.nickname,
          accountId: account.id
        });

        console.log(`[meli][check] ✅ Venda nova detectada: ${orderId} - ${title.substring(0, 40)}...`);
      }
    }

    console.log(`[meli][check] Página concluída: ${results.length} vendas novas na página, ${orders.length} vendas totais na página`);

    const fetched = orders.length;
    offset += fetched;
    
    // Debug: log para verificar paginação
    console.log(`[meli][check] Conta ${account.ml_user_id}: página ${Math.floor(offset/limit) + 1}, offset: ${offset}, total: ${total}, fetched: ${fetched} (últimas 48h)`);
    
    // Parar apenas se não há mais vendas ou atingiu o total
    if (fetched === 0 || offset >= total) break;
  }

  console.log(`[meli][check] 🎯 RESULTADO FINAL - Conta ${account.ml_user_id} (${account.nickname}): ${results.length} vendas novas de ${expectedTotal} vendas das últimas 48h`);

  return { newOrders: results, expectedTotal };
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  let session;
  try {
    session = await assertSessionToken(sessionCookie);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // PRIMEIRO: Garantir que todas as contas ativas tenham tokens válidos
  console.log(`[meli][check] Verificando e renovando tokens de contas ativas...`);
  const tokenCheckResult = await ensureActiveAccountsHaveValidTokens();
  console.log(`[meli][check] Verificação de tokens: ${tokenCheckResult.success.length} sucessos, ${tokenCheckResult.failed.length} falhas, ${tokenCheckResult.recovered.length} recuperadas`);

  const accounts = await prisma.meliAccount.findMany({
    where: { userId: session.sub },
    orderBy: { created_at: "desc" },
  });

  if (accounts.length === 0) {
    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      accounts: [] as AccountSummary[],
      newOrders: [] as NewOrderSummary[],
      errors: [] as SyncError[],
      totals: { expected: 0, new: 0 },
      tokenCheck: tokenCheckResult,
    });
  }

  const newOrders: NewOrderSummary[] = [];
  const errors: SyncError[] = [];
  const summaries: AccountSummary[] = [];
  let totalExpectedOrders = 0;
  const newOrdersByAccount: Record<string, number> = {};

  for (const account of accounts) {
    const summary: AccountSummary = {
      id: account.id,
      nickname: account.nickname,
      ml_user_id: account.ml_user_id,
      expires_at: account.expires_at.toISOString(),
    };
    summaries.push(summary);

    let current = account;
    try {
      // Usar renovação inteligente que tenta múltiplas estratégias
      current = await smartRefreshMeliAccountToken(account);
      summary.expires_at = current.expires_at.toISOString();
      console.log(`[meli][check] ✅ Token renovado com sucesso para conta ${account.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao renovar token.";
      
      // Verificar se é erro de refresh token inválido
      if (message.includes("REFRESH_TOKEN_INVALID")) {
        // Verificar se a conta está realmente marcada como inválida
        const isMarkedInvalid = await isAccountMarkedAsInvalid(account.id, 'meli');
        
        if (isMarkedInvalid) {
          errors.push({ 
            accountId: account.id, 
            mlUserId: account.ml_user_id, 
            message: "Token expirado - reconexão necessária. Clique em 'Conectar' para reautenticar." 
          });
          console.error(`[meli][check] 🚫 Conta ${account.id} marcada como inválida após múltiplas tentativas`);
        } else {
          errors.push({ 
            accountId: account.id, 
            mlUserId: account.ml_user_id, 
            message: "Erro temporário na renovação. Tente novamente em alguns minutos." 
          });
          console.error(`[meli][check] ⚠️ Erro temporário na renovação da conta ${account.id}`);
        }
      } else {
        errors.push({ accountId: account.id, mlUserId: account.ml_user_id, message });
        console.error(`[meli][check] ❌ Erro ao renovar token da conta ${account.id}:`, error);
      }
      continue;
    }

    try {
      const { newOrders: accountNewOrders, expectedTotal } = await checkNewOrdersForAccount(current);
      totalExpectedOrders += expectedTotal;
      newOrders.push(...accountNewOrders);
      // Contar vendas novas por conta
      newOrdersByAccount[current.id] = accountNewOrders.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao verificar pedidos.";
      errors.push({ accountId: current.id, mlUserId: current.ml_user_id, message });
      console.error(`[meli][check] Erro ao verificar pedidos da conta ${current.id}:`, error);
    }
  }

  console.log(`[meli][check] ========================================`);
  console.log(`[meli][check] 📊 RESUMO FINAL DA VERIFICAÇÃO`);
  console.log(`[meli][check] Total de contas verificadas: ${accounts.length}`);
  console.log(`[meli][check] Total de vendas novas encontradas: ${newOrders.length}`);
  console.log(`[meli][check] Total de erros: ${errors.length}`);
  console.log(`[meli][check] Vendas novas por conta:`, newOrdersByAccount);
  console.log(`[meli][check] ========================================`);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    accounts: summaries,
    newOrders,
    errors,
    totals: {
      expected: totalExpectedOrders,
      new: newOrders.length
    },
    newOrdersByAccount,
    tokenCheck: tokenCheckResult,
  });
}
