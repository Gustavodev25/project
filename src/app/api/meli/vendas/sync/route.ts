import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";
import { refreshMeliAccountToken } from "@/lib/meli";
import { calcularFreteAdjust } from "@/lib/frete";
import type { MeliAccount } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { sendProgressToUser, closeUserConnections } from "@/lib/sse-progress";
import { invalidateVendasCache } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

const MELI_API_BASE =
  process.env.MELI_API_BASE?.replace(/\/$/, "") ||
  "https://api.mercadolibre.com";
// Máximo da API do ML é 50 (51 causa erro)
const PAGE_LIMIT = 50;
// Aumentado de 2-5 para 15 = 3-7x mais requisições simultâneas
const PAGE_FETCH_CONCURRENCY = Math.min(
  15,
  Math.max(1, Number(process.env.MELI_PAGE_FETCH_CONCURRENCY ?? "15") || 15),
);

type FreightSource = "shipment" | "order" | "shipping_option" | null;

type MeliOrderFreight = {
  logisticType: string | null;
  logisticTypeSource: FreightSource | null;
  shippingMode: string | null;

  baseCost: number | null;
  listCost: number | null;
  shippingOptionCost: number | null;
  shipmentCost: number | null;
  orderCostFallback: number | null;
  finalCost: number | null;
  finalCostSource: FreightSource;
  chargedCost: number | null;
  chargedCostSource: FreightSource;

  discount: number | null;
  totalAmount: number | null;
  quantity: number | null;
  unitPrice: number | null;
  diffBaseList: number | null;

  adjustedCost: number | null;
  adjustmentSource: string | null;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function roundCurrency(v: number): number {
  const r = Math.round((v + Number.EPSILON) * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

function truncateString(str: string | null | undefined, maxLength: number): string {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

// Preserve complete JSON payloads (no truncation to keep shipping data intact)
function truncateJsonData<T>(data: T): T {
  return data === undefined ? (null as T) : data;
}

function extractOrderDate(order: unknown): Date | null {
  if (!order || typeof order !== "object") return null;
  const rawDate =
    (order as any)?.date_closed ??
    (order as any)?.date_created ??
    (order as any)?.date_last_updated ??
    null;
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sumOrderQuantities(items: unknown): number | null {
  if (!Array.isArray(items)) return null;
  let total = 0;
  let counted = false;
  for (const it of items) {
    const q = toFiniteNumber((it as any)?.quantity);
    if (q !== null) {
      total += q;
      counted = true;
    }
  }
  return counted ? total : null;
}

function convertLogisticTypeName(logisticType: string | null): string | null {
  if (!logisticType) return logisticType;

  if (logisticType === "xd_drop_off") return "Agência";
  if (logisticType === "self_service") return "FLEX";
  if (logisticType === "cross_docking") return "Coleta";

  return logisticType;
}

function mapListingTypeToExposure(listingType: string | null): string | null {
  if (!listingType) return null;
  const normalized = listingType.toLowerCase();

  // gold_pro é Premium
  if (normalized === "gold_pro") return "Premium";

  // gold_special e outros tipos gold são Clássico
  if (normalized.startsWith("gold")) return "Clássico";

  // Silver é Clássico
  if (normalized === "silver") return "Clássico";

  // Outros tipos defaultam para Clássico
  return "Clássico";
}

function calculateFreightAdjustment(
  logisticType: string | null,
  unitPrice: number | null,
  quantity: number | null,
  baseCost: number | null,
  listCost: number | null,
  shippingOptionCost: number | null,
  shipmentCost: number | null
): { adjustedCost: number | null; adjustmentSource: string | null } {
  if (!logisticType) return { adjustedCost: null, adjustmentSource: null };

  // order_cost total = unitário * quantidade  (equivalente ao SQL)
  const orderCost = unitPrice !== null && quantity ? unitPrice * quantity : null;

  const freteAdjust = calcularFreteAdjust({
    shipment_logistic_type: logisticType,
    base_cost: baseCost,
    shipment_list_cost: listCost,
    shipping_option_cost: shippingOptionCost,
    shipment_cost: shipmentCost,
    order_cost: orderCost,
    quantity: quantity ?? 0,
  });

  // Se vier o sentinela (±999) do SQL, ignora override
  if (Math.abs(freteAdjust) === 999) {
    return { adjustedCost: null, adjustmentSource: null };
  }

  // IMPORTANTE: 0 é override válido (zera frete nos < 79 para NÃO-FLEX)
  const adj = roundCurrency(freteAdjust);

  const label =
    logisticType === 'self_service' ? 'FLEX' :
    logisticType === 'drop_off' ? 'Correios' :
    logisticType === 'xd_drop_off' ? 'Agência' :
    logisticType === 'fulfillment' ? 'FULL' :
    logisticType === 'cross_docking' ? 'Coleta' : logisticType;

  return { adjustedCost: adj, adjustmentSource: label };
}

function calculateFreight(order: any, shipment: any): MeliOrderFreight {
  const o = order ?? {};
  const s = shipment ?? {};
  const orderShipping = (o && typeof o.shipping === "object") ? o.shipping ?? {} : {};

  const shippingMode: string | null =
    typeof orderShipping.mode === "string" ? orderShipping.mode : null;

  const logisticTypeRaw: string | null =
    typeof s.logistic_type === "string" ? s.logistic_type : null;

  const logisticTypeFallback = shippingMode;
  const logisticType = logisticTypeRaw ?? logisticTypeFallback ?? null;
  const logisticTypeSource: FreightSource =
    logisticTypeRaw ? "shipment" : logisticTypeFallback ? "order" : null;

  const shipOpt = (s && typeof s.shipping_option === "object") ? s.shipping_option ?? {} : {};

  const baseCost = toFiniteNumber(s.base_cost);
  const optCost = toFiniteNumber((shipOpt as any).cost);
  const listCost = toFiniteNumber((shipOpt as any).list_cost);
  const shipCost = toFiniteNumber(s.cost);
  const orderCost = toFiniteNumber(orderShipping.cost);

  let chargedCost: number | null = null;
  let chargedCostSource: FreightSource = null;

  if (optCost !== null) {
    chargedCost = optCost;
    chargedCostSource = "shipping_option";
  } else if (shipCost !== null) {
    chargedCost = shipCost;
    chargedCostSource = "shipment";
  } else if (orderCost !== null) {
    chargedCost = orderCost;
    chargedCostSource = "order";
  }

  if (chargedCost !== null) chargedCost = roundCurrency(chargedCost);

  const discount =
    listCost !== null && chargedCost !== null
      ? roundCurrency(listCost - chargedCost)
      : null;

  const totalAmount = toFiniteNumber(o.total_amount);

  const items = Array.isArray(o.order_items) ? o.order_items : [];
  let quantity = sumOrderQuantities(items);
  if (quantity === null) {
    if (Array.isArray(items) && items.length > 0) quantity = items.length;
    else if (totalAmount !== null) quantity = 1;
  }

  let unitPrice: number | null = null;
  if (totalAmount !== null && quantity && quantity > 0) {
    unitPrice = roundCurrency(totalAmount / quantity);
  } else if (totalAmount !== null) {
    unitPrice = roundCurrency(totalAmount);
  }

  const diffBaseList =
    baseCost !== null && listCost !== null ? roundCurrency(baseCost - listCost) : null;

  const convertedLogisticType = convertLogisticTypeName(logisticType);
  const { adjustedCost, adjustmentSource } = calculateFreightAdjustment(
    logisticType,
    unitPrice,
    quantity,
    baseCost,
    listCost,
    optCost,
    shipCost
  );

  return {
    logisticType: convertedLogisticType,
    logisticTypeSource,
    shippingMode,
    baseCost,
    listCost,
    shippingOptionCost: optCost !== null ? roundCurrency(optCost) : null,
    shipmentCost: shipCost !== null ? roundCurrency(shipCost) : null,
    orderCostFallback: orderCost !== null ? roundCurrency(orderCost) : null,
    finalCost: chargedCost,
    finalCostSource: chargedCostSource,
    chargedCost,
    chargedCostSource,
    discount,
    totalAmount,
    quantity,
    unitPrice,
    diffBaseList,
    adjustedCost,
    adjustmentSource,
  };
}

/**
 * Calcula a margem de contribuição seguindo a fórmula:
 * Margem = Valor Total + Taxa Plataforma + Frete - CMV
 */
function calculateMargemContribuicao(
  valorTotal: number,
  taxaPlataforma: number | null,
  frete: number,
  cmv: number | null
): { valor: number; isMargemReal: boolean } {
  const taxa = taxaPlataforma || 0;

  if (cmv !== null && cmv !== undefined && cmv > 0) {
    const margemContribuicao = valorTotal + taxa + frete - cmv;
    return {
      valor: roundCurrency(margemContribuicao),
      isMargemReal: true
    };
  }

  const receitaLiquida = valorTotal + taxa + frete;
  return {
    valor: roundCurrency(receitaLiquida),
    isMargemReal: false
  };
}

type MeliOrderPayload = {
  accountId: string;
  accountNickname: string | null;
  mlUserId: number;
  order: unknown;
  shipment?: unknown;
  freight: MeliOrderFreight;
};

type OrdersFetchResult = {
  orders: MeliOrderPayload[];
  expectedTotal: number;
};

type FetchOrdersResult = {
  orders: MeliOrderPayload[];
  expectedTotal: number;
  forcedStop: boolean;
};

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

type SkuCacheEntry = {
  custoUnitario: number | null;
  tipo: string | null;
};

type FetchOrdersPageOptions = {
  account: MeliAccount;
  headers: Record<string, string>;
  userId: string;
  offset: number;
  pageNumber: number;
  dateFrom?: Date;
  dateTo?: Date;
};

type FetchOrdersPageResult = {
  offset: number;
  pageNumber: number;
  total: number | null;
  orders: MeliOrderPayload[];
};

/**
 * Verifica se um erro HTTP é temporário e pode ser retentado
 */
function isRetryableError(status: number): boolean {
  return [429, 500, 502, 503, 504].includes(status);
}

/**
 * Aguarda um tempo específico (exponential backoff)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Faz uma requisição HTTP com retry automático para erros temporários
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  userId?: string
): Promise<Response> {
  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      lastResponse = response;

      if (response.ok) {
        return response;
      }

      if (response.status === 401 || response.status === 403) {
        console.error(`[Sync] Erro de autenticação ${response.status} - Token pode estar inválido`);
        if (userId) {
          sendProgressToUser(userId, {
            type: "sync_warning",
            message: `Erro de autenticação ${response.status}. Verifique se a conta está conectada corretamente.`,
            errorCode: response.status.toString()
          });
        }
        return response;
      }

      if (!isRetryableError(response.status)) {
        console.warn(`[Sync] Erro HTTP ${response.status} (não-retryable) em ${url.substring(0, 80)}...`);
        return response;
      }

      lastError = new Error(`HTTP ${response.status}`);

      const baseDelay = 1000;
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const totalDelay = delay + jitter;

      console.warn(
        `[Retry] Erro ${response.status} em ${url.substring(0, 80)}... ` +
        `Tentativa ${attempt + 1}/${maxRetries}. Aguardando ${Math.round(totalDelay)}ms`
      );

      if (userId && attempt === 0) {
        sendProgressToUser(userId, {
          type: "sync_warning",
          message: `Erro temporário ${response.status} da API do Mercado Livre. Tentando novamente...`,
          errorCode: response.status.toString()
        });
      }

      await sleep(totalDelay);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(`[Retry] Erro na requisição (tentativa ${attempt + 1}/${maxRetries}):`, lastError.message);

      if (attempt === maxRetries - 1) {
        if (userId) {
          sendProgressToUser(userId, {
            type: "sync_warning",
            message: `Erro de conexão após ${maxRetries} tentativas: ${lastError.message}`,
            errorCode: "NETWORK_ERROR"
          });
        }
        throw lastError;
      }

      const baseDelay = 1000;
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const totalDelay = delay + jitter;

      console.warn(
        `[Retry] Erro de rede em ${url.substring(0, 80)}... ` +
        `Tentativa ${attempt + 1}/${maxRetries}. Aguardando ${Math.round(totalDelay)}ms`
      );

      if (userId && attempt === 0) {
        sendProgressToUser(userId, {
          type: "sync_warning",
          message: `Erro de conexão. Tentando novamente...`,
          errorCode: "NETWORK_ERROR"
        });
      }

      await sleep(totalDelay);
    }
  }

  if (lastResponse && !lastResponse.ok) {
    return lastResponse;
  }

  throw lastError || new Error('Falha após múltiplas tentativas');
}

/**
 * PÁGINA DE ORDERS - AGORA BUSCANDO DETALHES (internal_tags, context, etc.)
 */
async function fetchOrdersPage({
  account,
  headers,
  userId,
  offset,
  pageNumber,
  dateFrom,
  dateTo,
}: FetchOrdersPageOptions): Promise<FetchOrdersPageResult> {
  const limit = PAGE_LIMIT;
  const url = new URL(`${MELI_API_BASE}/orders/search`);
  url.searchParams.set("seller", account.ml_user_id.toString());
  url.searchParams.set("sort", "date_desc");
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("offset", offset.toString());
  if (dateFrom) {
    url.searchParams.set("order.date_created.from", dateFrom.toISOString());
  }
  if (dateTo) {
    url.searchParams.set("order.date_created.to", dateTo.toISOString());
  }

  const result: FetchOrdersPageResult = {
    offset,
    pageNumber,
    total: null,
    orders: [],
  };

  let response: Response;
  let payload: any = null;

  try {
    response = await fetchWithRetry(url.toString(), { headers }, 3, userId);
  } catch (error) {
    console.error(`[Sync] ⚠️ Erro ao buscar página ${pageNumber}:`, error);
    sendProgressToUser(userId, {
      type: "sync_warning",
      message: `Erro ao buscar página ${pageNumber}: ${
        error instanceof Error ? error.message : "Falha desconhecida"
      }`,
      errorCode: "PAGE_FETCH_ERROR",
    });
    return result;
  }

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  result.total =
    typeof payload?.paging?.total === "number" &&
    Number.isFinite(payload.paging.total)
      ? payload.paging.total
      : null;

  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : `Status ${response.status}`;
    console.error(
      `[Sync] ⚠️ Erro HTTP ${response.status} ao buscar página ${pageNumber}:`,
      message,
    );
    if (response.status === 400) {
      console.log(`[Sync] ⚠️ Limite da API atingido em offset ${offset}`);
    }
    sendProgressToUser(userId, {
      type: "sync_warning",
      message: `Erro HTTP ${response.status} na página ${pageNumber}: ${message}`,
      errorCode: response.status.toString(),
    });
    return result;
  }

  const orders = Array.isArray(payload?.results) ? payload.results : [];
  if (orders.length === 0) {
    console.log(`[Sync] 📄 Página ${pageNumber}: 0 vendas (offset ${offset})`);
    return result;
  }

  console.log(
    `[Sync] 📄 Página ${pageNumber}: ${orders.length} vendas (offset ${offset})${
      result.total
        ? ` (${Math.min(offset + orders.length, result.total)}/${result.total})`
        : ""
    }`,
  );

  // NOVO: buscar DETALHES completos de cada pedido (para ter internal_tags, context, etc.)
  const orderDetailsResults = await Promise.allSettled(
    orders.map(async (o: any) => {
      if (!o?.id) return o;
      try {
        const r = await fetchWithRetry(
          `${MELI_API_BASE}/orders/${o.id}`,
          { headers },
          3,
          userId,
        );
        return r.ok ? await r.json() : o;
      } catch {
        return o;
      }
    }),
  );

  const detailedOrders = orderDetailsResults.map((r, i) =>
    r.status === "fulfilled" && r.value ? r.value : orders[i],
  );

  // Aumentado de 10 para 50 para mais velocidade
  const SHIPMENT_BATCH_SIZE = 50;
  const shipments: any[] = new Array(orders.length).fill(null);

  for (let i = 0; i < orders.length; i += SHIPMENT_BATCH_SIZE) {
    const batchOrders = orders.slice(i, i + SHIPMENT_BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batchOrders.map(async (order: any) => {
        const shippingId = order?.shipping?.id;
        if (!shippingId) {
          return typeof order?.shipping === "object" ? order.shipping : null;
        }
        try {
          const res = await fetchWithRetry(
            `${MELI_API_BASE}/shipments/${shippingId}`,
            { headers },
            3,
            userId,
          );
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      }),
    );

    batchResults.forEach((r, idx) => {
      const originalIdx = i + idx;
      shipments[originalIdx] =
        r.status === "fulfilled" && r.value ? r.value : null;
    });
  }

  result.orders = detailedOrders
    .map((order: any, idx: number) => {
      if (!order) return null;
      const shipment = shipments[idx] ?? undefined;
      return {
        accountId: account.id,
        accountNickname: account.nickname,
        mlUserId: account.ml_user_id,
        order,
        shipment,
        freight: calculateFreight(order, shipment),
      };
    })
    .filter(Boolean) as MeliOrderPayload[];

  return result;
}

/**
 * Busca todas as vendas de uma conta (modo recente + histórico)
 */
async function fetchAllOrdersForAccount(
  account: MeliAccount,
  headers: Record<string, string>,
  userId: string,
  quickMode: boolean = false,
  fullSync: boolean = false,
): Promise<FetchOrdersResult> {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = fullSync ? Number.POSITIVE_INFINITY : 30000;

  const results: MeliOrderPayload[] = [];
  const logisticStats = new Map<string, number>();
  let forcedStop = false;

  const modoTexto = fullSync
    ? 'FULL SYNC (buscar TODAS as vendas)'
    : (quickMode ? 'QUICK (20s busca + 40s salvar)' : 'BACKGROUND (45s busca + 15s salvar)');
  console.log(`[Sync] 🚀 Iniciando busca de vendas para conta ${account.ml_user_id} (${account.nickname}) - Modo: ${modoTexto}`);

  const oldestSyncedOrder = await prisma.meliVenda.findFirst({
    where: { meliAccountId: account.id },
    orderBy: { dataVenda: 'asc' },
    select: { dataVenda: true }
  });

  const oldestSyncedDate = oldestSyncedOrder?.dataVenda;
  if (oldestSyncedDate) {
    console.log(`[Sync] 📅 Venda mais antiga no banco: ${oldestSyncedDate.toISOString().split('T')[0]}`);
  } else {
    console.log(`[Sync] 📅 Primeira sincronização - buscando desde o início`);
  }

  const MAX_OFFSET = 9950;
  let total = 0;
  let discoveredTotal: number | null = null;
  let nextOffset = 0;
  const SAFE_BATCH_SIZE = fullSync ? MAX_OFFSET : (quickMode ? 2000 : 5000);
  let maxOffsetToFetch = Math.min(MAX_OFFSET, SAFE_BATCH_SIZE);
  const activePages = new Set<Promise<void>>();
  let oldestOrderDate: Date | null = null;

  const schedulePageFetch = (offsetValue: number) => {
    const pageNumber = Math.floor(offsetValue / PAGE_LIMIT) + 1;
    const pagePromise = (async () => {
      try {
        const pageResult = await fetchOrdersPage({
          account,
          headers,
          userId,
          offset: offsetValue,
          pageNumber,
        });

        if (
          typeof pageResult.total === "number" &&
          pageResult.total >= 0 &&
          discoveredTotal === null
        ) {
          discoveredTotal = pageResult.total;
          total = discoveredTotal;
          maxOffsetToFetch = Math.min(MAX_OFFSET, SAFE_BATCH_SIZE, discoveredTotal);

          const volumeMessage = total > 50000 ? " (VOLUME MUITO ALTO! Múltiplas sincronizações serão necessárias)" :
                               total > 10000 ? " (ALTO VOLUME! Sincronização automática continuará até completar)" :
                               total > 5000 ? " (volume médio)" : "";

          console.log(
            `[Sync] 📊 Conta ${account.nickname || account.ml_user_id}: TOTAL ${total} vendas${volumeMessage}`,
          );
        }

        if (pageResult.orders.length === 0) {
          return;
        }

        for (const payload of pageResult.orders) {
          results.push(payload);
          const logisticTypeRaw =
            payload.freight.logisticType || payload.freight.shippingMode || "sem_tipo";
          logisticStats.set(
            logisticTypeRaw,
            (logisticStats.get(logisticTypeRaw) || 0) + 1,
          );

          const createdAt = extractOrderDate(payload.order);
          if (createdAt && (!oldestOrderDate || createdAt < oldestOrderDate)) {
            oldestOrderDate = createdAt;
          }
        }

        sendProgressToUser(userId, {
          type: "sync_progress",
          message: `${account.nickname || `Conta ${account.ml_user_id}`}: ${
            results.length
          }/${discoveredTotal ?? results.length} vendas baixadas (página ${pageNumber})`,
          current: results.length,
          total: discoveredTotal ?? results.length,
          fetched: results.length,
          expected: discoveredTotal ?? results.length,
          accountId: account.id,
          accountNickname: account.nickname,
          page: pageNumber,
        });
      } catch (error) {
        console.error(`[Sync] ?? Erro inesperado na página ${pageNumber}:`, error);
        sendProgressToUser(userId, {
          type: "sync_warning",
          message: `Erro inesperado na página ${pageNumber}: ${
            error instanceof Error ? error.message : "Falha desconhecida"
          }`,
          errorCode: "PAGE_FETCH_ERROR",
        });
      }
    })();

    pagePromise.finally(() => activePages.delete(pagePromise));
    activePages.add(pagePromise);
  };

  // PASSO 1: vendas recentes
  while (activePages.size < PAGE_FETCH_CONCURRENCY && nextOffset < Math.min(MAX_OFFSET, maxOffsetToFetch)) {
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.log(`[Sync] ⏳ Tempo limite atingido (${Math.round((Date.now() - startTime) / 1000)}s) - parando busca de vendas recentes`);
      forcedStop = true;
      break;
    }
    schedulePageFetch(nextOffset);
    nextOffset += PAGE_LIMIT;
  }

  while (activePages.size > 0) {
    await Promise.race(activePages);

    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.log(`[Sync] ⏳ Tempo limite atingido - parando paginação`);
      forcedStop = true;
      break;
    }

    while (
      activePages.size < PAGE_FETCH_CONCURRENCY &&
      nextOffset < maxOffsetToFetch &&
      Date.now() - startTime < MAX_EXECUTION_TIME
    ) {
      schedulePageFetch(nextOffset);
      nextOffset += PAGE_LIMIT;
    }
  }

  if (discoveredTotal === null) {
    total = results.length;
  }

  // PASSO 2: histórico
  const timeRemaining = MAX_EXECUTION_TIME - (Date.now() - startTime);
  const shouldFetchHistory = fullSync || timeRemaining > 15000;

  if (shouldFetchHistory && (total > results.length || oldestSyncedDate)) {
    console.log(`[Sync] 🔄 Buscando vendas históricas (tempo restante: ${Math.round(timeRemaining / 1000)}s)...`);

    let searchStartDate: Date;

    if (oldestSyncedDate) {
      searchStartDate = new Date(oldestSyncedDate);
      searchStartDate.setDate(searchStartDate.getDate() - 1);
      console.log(`[Sync] 📅 Continuando busca histórica a partir de ${searchStartDate.toISOString().split('T')[0]}`);
    } else {
      const fallbackOldest =
        results.length > 0
          ? extractOrderDate(results[results.length - 1].order) ?? new Date()
          : new Date();
      searchStartDate = oldestOrderDate ?? fallbackOldest;
      console.log(`[Sync] 📅 Primeira busca histórica a partir de ${searchStartDate.toISOString().split('T')[0]}`);
    }

    const currentMonthStart = new Date(searchStartDate);
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    currentMonthStart.setMonth(currentMonthStart.getMonth() - 1);

    const startDate = new Date('1999-01-01');
    console.log(`[Sync] 🎯 Buscando TODAS as vendas desde o início da conta (sem limite de data)`);

    while (currentMonthStart > startDate && Date.now() - startTime < MAX_EXECUTION_TIME - 5000) {
      const currentMonthEnd = new Date(currentMonthStart);
      currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1);
      currentMonthEnd.setDate(0);
      currentMonthEnd.setHours(23, 59, 59, 999);

      console.log(`[Sync] 📅 Buscando: ${currentMonthStart.toISOString().split('T')[0]} a ${currentMonthEnd.toISOString().split('T')[0]}`);

      const monthOrders = await fetchOrdersInDateRange(
        account,
        headers,
        userId,
        currentMonthStart,
        currentMonthEnd,
        logisticStats
      );

      console.log(`[Sync] ✅ Encontradas ${monthOrders.length} vendas neste período`);

      results.push(...monthOrders);

      sendProgressToUser(userId, {
        type: 'sync_progress',
        message: `${account.nickname || `Conta ${account.ml_user_id}`}: ${results.length} vendas baixadas (buscando histórico: ${currentMonthStart.toISOString().split('T')[0]})`,
        current: results.length,
        total: Math.max(total, results.length),
        fetched: results.length,
        expected: Math.max(total, results.length),
        accountId: account.id,
        accountNickname: account.nickname,
      });

      if (monthOrders.length === 0) {
        console.log(`[Sync] ✅ Nenhuma venda encontrada neste período - histórico completo!`);
        break;
      }

      currentMonthStart.setMonth(currentMonthStart.getMonth() - 1);
    }

    const elapsedTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Sync] ✅ Busca por período concluída em ${elapsedTime}s: ${results.length} vendas baixadas`);
    if (Date.now() - startTime >= MAX_EXECUTION_TIME - 5000 && currentMonthStart > startDate) {
      forcedStop = true;
    }
  } else if (!shouldFetchHistory && total > results.length) {
    if (timeRemaining <= 10000) {
      forcedStop = true;
    }
    console.log(`[Sync] ⏳ Tempo insuficiente para busca histórica - execute sincronização novamente para continuar`);
  }

  const elapsedTime = Math.round((Date.now() - startTime) / 1000);
  const finalTotal = Math.max(total, results.length);

  const percentualBaixado = total > 0 ? Math.round((results.length / total) * 100) : 100;
  console.log(`[Sync] 🎉 ${results.length} de ${total} vendas baixadas (${percentualBaixado}%) em ${elapsedTime}s`);
  console.log(`[Sync] 📊 Tipos de logística:`, Array.from(logisticStats.entries()));

  const totalInDatabase = await prisma.meliVenda.count({
    where: { meliAccountId: account.id }
  });

  if (totalInDatabase < total) {
    const remaining = total - totalInDatabase;
    console.log(`[Sync] 📌 ${remaining} vendas restantes - execute sincronização novamente para continuar`);
    sendProgressToUser(userId, {
      type: 'sync_warning',
      message: `${remaining} vendas antigas ainda não sincronizadas. Execute sincronização novamente para buscar o restante.`,
      accountId: account.id,
      accountNickname: account.nickname || undefined
    });
  } else {
    console.log(`[Sync] ✅ Histórico completo sincronizado!`);
  }

  return { orders: results, expectedTotal: finalTotal, forcedStop };
}

/**
 * Busca vendas em um período específico (para contornar limite de 10k)
 */
async function fetchOrdersInDateRange(
  account: MeliAccount,
  headers: Record<string, string>,
  userId: string,
  dateFrom: Date,
  dateTo: Date,
  logisticStats: Map<string, number>,
): Promise<MeliOrderPayload[]> {
  const results: MeliOrderPayload[] = [];
  let offset = 0;
  const MAX_OFFSET = 9950;
  let totalInPeriod = 0;
  let needsSplitting = false;

  const checkUrl = new URL(`${MELI_API_BASE}/orders/search`);
  checkUrl.searchParams.set("seller", account.ml_user_id.toString());
  checkUrl.searchParams.set("sort", "date_desc");
  checkUrl.searchParams.set("limit", "1");
  checkUrl.searchParams.set("offset", "0");
  checkUrl.searchParams.set("order.date_created.from", dateFrom.toISOString());
  checkUrl.searchParams.set("order.date_created.to", dateTo.toISOString());

  try {
    const checkResponse = await fetchWithRetry(checkUrl.toString(), { headers }, 3, userId);
    if (checkResponse.ok) {
      const checkPayload = await checkResponse.json();
      totalInPeriod = checkPayload?.paging?.total || 0;
      console.log(`[Sync] 📊 Período ${dateFrom.toISOString().split('T')[0]} a ${dateTo.toISOString().split('T')[0]}: ${totalInPeriod} vendas`);

      if (totalInPeriod > MAX_OFFSET) {
        needsSplitting = true;
        console.log(`[Sync] 🔄 Período tem ${totalInPeriod} vendas (> ${MAX_OFFSET}) - dividindo em sub-períodos`);
      }
    }
  } catch (error) {
    console.error(`[Sync] Erro ao verificar total do período:`, error);
  }

  if (needsSplitting) {
    const durationMs = dateTo.getTime() - dateFrom.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

    console.log(`[Sync] 📅 Período de ${durationDays} dias - dividindo em sub-períodos menores`);

    let subPeriodDays: number;
    if (totalInPeriod > 100000) {
      subPeriodDays = 3;
    } else if (totalInPeriod > 50000) {
      subPeriodDays = 5;
    } else if (totalInPeriod > 30000) {
      subPeriodDays = 7;
    } else {
      subPeriodDays = 14;
    }

    console.log(`[Sync] 🔄 Dividindo em sub-períodos de ${subPeriodDays} dias`);

    let currentStart = new Date(dateFrom);
    while (currentStart < dateTo) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + subPeriodDays);

      if (currentEnd > dateTo) {
        currentEnd.setTime(dateTo.getTime());
      }

      console.log(`[Sync] 📆 Buscando sub-período: ${currentStart.toISOString().split('T')[0]} a ${currentEnd.toISOString().split('T')[0]}`);

      const subResults = await fetchOrdersInDateRange(
        account,
        headers,
        userId,
        currentStart,
        currentEnd,
        logisticStats
      );

      results.push(...subResults);
      console.log(`[Sync] ✅ Sub-período: ${subResults.length} vendas baixadas (total acumulado: ${results.length})`);

      sendProgressToUser(userId, {
        type: 'sync_progress',
        message: `${results.length}/${totalInPeriod} vendas baixadas (período histórico)`,
        current: results.length,
        total: totalInPeriod,
        fetched: results.length,
        expected: totalInPeriod,
        accountId: account.id,
        accountNickname: account.nickname,
      });

      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    console.log(`[Sync] 🎉 Período completo: ${results.length} vendas de ${totalInPeriod} totais`);
    return results;
  }

  while (offset < MAX_OFFSET) {
    const url = new URL(`${MELI_API_BASE}/orders/search`);
    url.searchParams.set("seller", account.ml_user_id.toString());
    url.searchParams.set("sort", "date_desc");
    url.searchParams.set("limit", PAGE_LIMIT.toString());
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("order.date_created.from", dateFrom.toISOString());
    url.searchParams.set("order.date_created.to", dateTo.toISOString());

    try {
      const response = await fetchWithRetry(url.toString(), { headers }, 3, userId);

      if (!response.ok) {
        if (response.status === 400) {
          console.log(`[Sync] ⚠️ Atingiu limite no período - baixadas ${results.length} vendas`);
        }
        break;
      }

      const payload = await response.json();
      const orders = Array.isArray(payload?.results) ? payload.results : [];

      if (orders.length === 0) break;

      const orderDetailsResults = await Promise.allSettled(
        orders.map(async (o: any) => {
          if (!o?.id) return o;
          try {
            const r = await fetchWithRetry(`${MELI_API_BASE}/orders/${o.id}`, { headers }, 3, userId);
            return r.ok ? await r.json() : o;
          } catch { return o; }
        })
      );

      const detailedOrders = orderDetailsResults.map((r, i) =>
        r.status === "fulfilled" && r.value ? r.value : orders[i]
      );

      const SHIPMENT_BATCH_SIZE = 50;
      const shipments: any[] = new Array(orders.length).fill(null);

      for (let i = 0; i < orders.length; i += SHIPMENT_BATCH_SIZE) {
        const batchOrders = orders.slice(i, i + SHIPMENT_BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batchOrders.map(async (o: any) => {
            const sid = o?.shipping?.id;
            if (!sid) return null;
            try {
              const r = await fetchWithRetry(`${MELI_API_BASE}/shipments/${sid}`, { headers }, 3, userId);
              return r.ok ? await r.json() : null;
            } catch { return null; }
          })
        );

        batchResults.forEach((result, idx) => {
          shipments[i + idx] = result.status === "fulfilled" ? result.value : null;
        });
      }

      detailedOrders.forEach((order: any, idx: number) => {
        if (!order) return;
        const shipment = shipments[idx];
        const freight = calculateFreight(order, shipment);
        const logType = shipment?.logistic_type || order?.shipping?.mode || "sem_tipo";
        logisticStats.set(logType, (logisticStats.get(logType) || 0) + 1);

        results.push({
          accountId: account.id,
          accountNickname: account.nickname,
          mlUserId: account.ml_user_id,
          order,
          shipment,
          freight,
        });
      });

      offset += orders.length;

      if (offset >= MAX_OFFSET) {
        console.log(`[Sync] ⚠️ Atingiu ${offset} vendas no período - parando antes do limite`);
        break;
      }
    } catch (error) {
      console.error(`[Sync] Erro ao buscar período:`, error);
      break;
    }
  }

  return results;
}

async function buildSkuCache(
  orders: MeliOrderPayload[],
  userId: string
): Promise<Map<string, SkuCacheEntry>> {
  const skuSet = new Set<string>();

  for (const payload of orders) {
    const rawOrder: any = payload.order ?? {};
    const orderItems: any[] = Array.isArray(rawOrder.order_items) ? rawOrder.order_items : [];

    for (const item of orderItems) {
      const itemData = typeof item?.item === "object" && item?.item !== null ? item.item : {};
      const candidate =
        itemData?.seller_sku ||
        itemData?.sku ||
        item?.seller_sku ||
        item?.sku ||
        null;

      if (candidate) {
        const normalized = truncateString(String(candidate), 255);
        if (normalized) {
          skuSet.add(normalized);
        }
      }
    }
  }

  if (skuSet.size === 0) {
    return new Map();
  }

  const skuList = Array.from(skuSet);
  const skuRecords = await prisma.sKU.findMany({
    where: {
      userId,
      sku: { in: skuList }
    },
    select: {
      sku: true,
      custoUnitario: true,
      tipo: true
    }
  });

  const cache = new Map<string, SkuCacheEntry>();
  for (const record of skuRecords) {
    cache.set(record.sku, {
      custoUnitario: record.custoUnitario !== null ? Number(record.custoUnitario) : null,
      tipo: record.tipo ?? null
    });
  }

  return cache;
}

function extractOrderIdFromPayload(order: MeliOrderPayload): string | null {
  const rawOrder = (order?.order ?? null) as any;
  if (!rawOrder || rawOrder.id === undefined || rawOrder.id === null) {
    return null;
  }
  const id = String(rawOrder.id).trim();
  return id.length === 0 ? null : id;
}

function deduplicateOrders(
  orders: MeliOrderPayload[]
): { uniqueOrders: MeliOrderPayload[]; duplicates: number } {
  const seen = new Set<string>();
  const uniqueOrders: MeliOrderPayload[] = [];
  let duplicates = 0;

  for (const order of orders) {
    const orderId = extractOrderIdFromPayload(order);
    if (!orderId) {
      uniqueOrders.push(order);
      continue;
    }
    if (seen.has(orderId)) {
      duplicates += 1;
      continue;
    }
    seen.add(orderId);
    uniqueOrders.push(order);
  }

  return { uniqueOrders, duplicates };
}

async function saveVendasBatch(
  orders: MeliOrderPayload[],
  userId: string,
  batchSize: number = 100
): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;

  const { uniqueOrders, duplicates } = deduplicateOrders(orders);
  const totalOrders = uniqueOrders.length;

  if (duplicates > 0) {
    console.warn(
      `[Sync] ${duplicates} venda(s) duplicada(s) detectada(s) no retorno do Mercado Livre. Ignorando duplicatas para evitar salvar pedidos repetidos.`
    );
  }

  if (totalOrders === 0) {
    return { saved, errors };
  }

  try {
    const skuCache = await buildSkuCache(uniqueOrders, userId);
    let processedCount = 0;

    for (let i = 0; i < totalOrders; i += batchSize) {
      const batch = uniqueOrders.slice(i, i + batchSize);

      try {
        const preparedData = await Promise.all(
          batch.map(order => prepareVendaData(order, userId, skuCache))
        );

        const validData = preparedData.filter(d => d !== null);

        if (validData.length === 0) {
          errors += batch.length;
          processedCount += batch.length;
          continue;
        }

        const orderIds = validData.map(d => d!.orderId);
        const existingOrders = await prisma.meliVenda.findMany({
          where: { orderId: { in: orderIds } },
          select: { orderId: true }
        });

        const existingOrderIdSet = new Set(existingOrders.map(o => o.orderId));

        const toCreate = validData.filter(d => !existingOrderIdSet.has(d!.orderId));
        const toUpdate = validData.filter(d => existingOrderIdSet.has(d!.orderId));

        if (toCreate.length > 0) {
          try {
            await prisma.meliVenda.createMany({
              data: toCreate.map(d => d!.createData),
              skipDuplicates: true
            });
            saved += toCreate.length;
          } catch (createError) {
            console.error(`[Sync] Erro em batch create:`, createError);
            errors += toCreate.length;
          }
        }

        if (toUpdate.length > 0) {
          try {
            await prisma.$transaction(
              toUpdate.map(d =>
                prisma.meliVenda.update({
                  where: { orderId: d!.orderId },
                  data: { ...d!.updateData, atualizadoEm: new Date() }
                })
              )
            );
            saved += toUpdate.length;
          } catch (updateError) {
            console.error(`[Sync] Erro em batch update:`, updateError);
            errors += toUpdate.length;
          }
        }

      } catch (batchError) {
        console.error(`[Sync] Erro crítico no batch ${i}-${i + batchSize}:`, batchError);
        errors += batch.length;
      }

      processedCount += batch.length;
      const percentage = Math.round((processedCount / totalOrders) * 100);
      try {
        sendProgressToUser(userId, {
          type: "sync_progress",
          message: `Salvando no banco: ${processedCount}/${totalOrders} vendas (${percentage}%)`,
          current: processedCount,
          total: totalOrders,
          fetched: processedCount,
          expected: totalOrders
        });
      } catch (sseError) {
        console.warn(`[Sync] Erro ao enviar progresso SSE (não crítico):`, sseError);
      }
    }
  } catch (error) {
    console.error(`[Sync] Erro crítico em saveVendasBatch:`, error);
    errors = totalOrders - saved;
  }

  return { saved, errors };
}

async function prepareVendaData(
  order: MeliOrderPayload,
  userId: string,
  skuCache: Map<string, SkuCacheEntry>
): Promise<{ orderId: string; createData: any; updateData: any } | null> {
  const extractedOrderId = extractOrderIdFromPayload(order);

  if (!extractedOrderId) {
    console.error(`[Sync] Venda sem ID válido, pulando...`);
    return null;
  }

  const orderId = extractedOrderId;

  try {
    const o: any = order.order ?? {};
    const freight = order.freight;
    const normalizedMlUserId =
      (order as any)?.mlUserId ??
      (order as any)?.ml_user_id ??
      (typeof o?.seller?.id === 'number' ? o.seller.id : null);

    const orderItems: any[] = Array.isArray(o.order_items) ? o.order_items : [];
    const firstItem = orderItems[0] ?? {};
    const orderItem = typeof firstItem === 'object' && firstItem !== null ? firstItem : {};
    const itemData = typeof orderItem?.item === 'object' && orderItem.item !== null ? orderItem.item : {};

    const firstItemTitle =
      itemData?.title ??
      orderItems.find((entry: any) => entry?.item?.title)?.item?.title ??
      o.title ??
      'Pedido';

    const quantity = orderItems.reduce((sum, item) => {
      const qty = toFiniteNumber(item?.quantity) ?? 0;
      return sum + qty;
    }, 0);

    const totalAmount =
      toFiniteNumber(o.total_amount) ??
      orderItems.reduce((acc, item) => {
        const qty = toFiniteNumber(item?.quantity) ?? 0;
        const price = toFiniteNumber(item?.unit_price) ?? 0;
        return acc + qty * price;
      }, 0);

    const buyerName =
      o?.buyer?.nickname ||
      [o?.buyer?.first_name, o?.buyer?.last_name].filter(Boolean).join(' ') ||
      'Comprador';

    const dateString = o.date_closed || o.date_created || o.date_last_updated;

    const tags: string[] = Array.isArray(o.tags)
      ? o.tags.map((t: unknown) => String(t))
      : [];

    const internalTags: string[] = Array.isArray(o.internal_tags)
      ? o.internal_tags.map((t: unknown) => String(t))
      : [];

    const context = (o as any).context;

    const hasAdsInInternal = internalTags.some((t) =>
      t.toLowerCase().includes("ads"),
    );
    const hasAdsInTags = tags.some((t) =>
      t.toLowerCase().includes("ads"),
    );

    const isAdsContext =
      context?.application === "product_ads" ||
      context?.channel === "product_ads" ||
      (typeof context === "string" && context.includes("ads"));

    const isAds = hasAdsInInternal || hasAdsInTags || isAdsContext;

    const shippingStatus = (order.shipment as any)?.status || o?.shipping?.status || undefined;
    const shippingId = (order.shipment as any)?.id?.toString() || o?.shipping?.id?.toString();

    const receiverAddress =
      (order.shipment as any)?.receiver_address ??
      (o?.shipping && typeof o.shipping === 'object' ? (o as any).shipping?.receiver_address : undefined) ??
      undefined;
    const latitude = toFiniteNumber((receiverAddress as any)?.latitude ?? (receiverAddress as any)?.geo?.latitude);
    const longitude = toFiniteNumber((receiverAddress as any)?.longitude ?? (receiverAddress as any)?.geo?.longitude);

    const saleFee = orderItems.reduce((acc, item) => {
      const fee = toFiniteNumber(item?.sale_fee) ?? 0;
      const qty = toFiniteNumber(item?.quantity) ?? 1;
      return acc + fee * qty;
    }, 0);

    const unitario =
      toFiniteNumber(orderItem?.unit_price) ??
      (quantity > 0 && totalAmount !== null ? roundCurrency(totalAmount / quantity) : 0);

    const taxaPlataforma = saleFee > 0 ? -roundCurrency(saleFee) : null;
    const frete = freight.adjustedCost ?? freight.finalCost ?? freight.orderCostFallback ?? 0;

    const skuVendaRaw = itemData?.seller_sku || itemData?.sku || null;
    const skuVenda = skuVendaRaw ? truncateString(String(skuVendaRaw), 255) || null : null;
    let cmv: number | null = null;

    if (skuVenda) {
      const cachedSku = skuCache.get(skuVenda);

      if (cachedSku) {
        if (cachedSku.custoUnitario !== null) {
          cmv = roundCurrency(cachedSku.custoUnitario * quantity);
        }
      }
    }

    const { valor: margemContribuicao, isMargemReal } = calculateMargemContribuicao(
      totalAmount,
      taxaPlataforma,
      frete,
      cmv
    );

    const contaLabel = truncateString(order.accountNickname ?? String(normalizedMlUserId ?? order.accountId), 255);

    const vendaBaseData = {
      dataVenda: dateString ? new Date(dateString) : new Date(),
      status: truncateString(String(o.status ?? 'desconhecido').replaceAll('_', ' '), 100),
      conta: contaLabel,
      valorTotal: new Decimal(totalAmount),
      quantidade: quantity > 0 ? quantity : 1,
      unitario: new Decimal(unitario),
      taxaPlataforma: taxaPlataforma ? new Decimal(taxaPlataforma) : null,
      frete: new Decimal(frete),
      cmv: cmv !== null ? new Decimal(cmv) : null,
      margemContribuicao: new Decimal(margemContribuicao),
      isMargemReal,
      titulo: truncateString(firstItemTitle, 500) || 'Produto sem titulo',
      sku: skuVenda,
      comprador: truncateString(buyerName, 255) || 'Comprador',
      logisticType: truncateString(freight.logisticType, 100) || null,
      envioMode: truncateString(freight.shippingMode, 100) || null,
      shippingStatus: truncateString(shippingStatus, 100) || null,
      shippingId: truncateString(shippingId, 255) || null,
      exposicao: (() => {
        const listingTypeId = (orderItem?.listing_type_id ?? itemData?.listing_type_id) ?? null;
        return mapListingTypeToExposure(listingTypeId);
      })(),
      tipoAnuncio: tags.includes('catalog') ? 'Catalogo' : 'Proprio',
      ads: isAds ? 'ADS' : null,
      plataforma: 'Mercado Livre',
      canal: 'ML',
      tags: truncateJsonData(tags),
      internalTags: truncateJsonData(internalTags),
      rawData: truncateJsonData({
        order: o,
        shipment: order.shipment as any,
        freight: freight
      })
    };

    const geoData = latitude !== null && longitude !== null ? {
      latitude: new Decimal(latitude),
      longitude: new Decimal(longitude)
    } : {};

    const createData = {
      orderId: truncateString(orderId, 255),
      userId: truncateString(userId, 50),
      meliAccountId: truncateString(order.accountId, 25),
      ...vendaBaseData,
      ...geoData
    };

    const updateData = {
      ...vendaBaseData,
      ...geoData
    };

    return { orderId, createData, updateData };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Sync] Erro ao preparar venda ${orderId}:`, errorMsg);
    return null;
  }
}

/**
 * HANDLER PRINCIPAL - SINCRONIZAÇÃO CONTA POR CONTA (sequencial)
 */
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  const cronSecret = req.headers.get('x-cron-secret');

  let requestBody: {
    accountIds?: string[];
    orderIdsByAccount?: Record<string, string[]>;
    quickMode?: boolean;
    fullSync?: boolean;
  } = {};

  try {
    const bodyText = await req.text();
    if (bodyText) {
      requestBody = JSON.parse(bodyText);
    }
  } catch (error) {
    console.error('[Sync] Erro ao parsear body:', error);
  }

  let userId: string;

  // Autenticação via cron OU sessão
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    const accountId = requestBody.accountIds?.[0];
    if (!accountId) {
      return new NextResponse("Missing accountId for cron job", { status: 400 });
    }

    const account = await prisma.meliAccount.findUnique({
      where: { id: accountId },
      select: { userId: true }
    });

    if (!account) {
      return new NextResponse("Account not found", { status: 404 });
    }

    userId = account.userId;
    console.log(`[Sync] Cron job autenticado para userId: ${userId}`);
  } else {
    let session;
    try {
      session = await assertSessionToken(sessionCookie);
    } catch {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    userId = session.sub;
  }

  const fullSync = requestBody.fullSync === true;
  const quickMode = fullSync ? false : requestBody.quickMode === true;
  requestBody.quickMode = quickMode;
  requestBody.fullSync = fullSync;

  console.log(`[Sync] Iniciando sincronização para usuário ${userId}`, {
    accountIds: requestBody.accountIds,
    hasOrderIds: !!requestBody.orderIdsByAccount,
    quickMode,
    fullSync
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  sendProgressToUser(userId, {
    type: "sync_start",
    message: "Conectando ao Mercado Livre...",
    current: 0,
    total: 0,
    fetched: 0,
    expected: 0
  });

  const accountsWhere: any = { userId };
  if (requestBody.accountIds && requestBody.accountIds.length > 0) {
    accountsWhere.id = { in: requestBody.accountIds };
  }

  const accounts = await prisma.meliAccount.findMany({
    where: accountsWhere,
    orderBy: { created_at: "desc" },
  });

  console.log(`[Sync] Encontradas ${accounts.length} conta(s) do Mercado Livre`);

  if (accounts.length === 0) {
    sendProgressToUser(userId, {
      type: "sync_complete",
      message: "Nenhuma conta do MercadoLivre encontrada",
      current: 0,
      total: 0,
      fetched: 0,
      expected: 0
    });

    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      accounts: [] as AccountSummary[],
      orders: [] as MeliOrderPayload[],
      errors: [] as SyncError[],
      totals: { expected: 0, fetched: 0, saved: 0 },
    });
  }

  const errors: SyncError[] = [];
  const summaries: AccountSummary[] = [];
  let totalExpectedOrders = 0;
  let totalFetchedOrders = 0;
  let totalSavedOrders = 0;
  let hasMoreToSync = false;

  // ⚠️ AQUI: CONTA POR CONTA, 100% SEQUENCIAL
  for (let accountIndex = 0; accountIndex < accounts.length; accountIndex++) {
    const account = accounts[accountIndex];
    const summary: AccountSummary = {
      id: account.id,
      nickname: account.nickname,
      ml_user_id: account.ml_user_id,
      expires_at: account.expires_at.toISOString(),
    };
    summaries.push(summary);

    try {
      sendProgressToUser(userId, {
        type: "sync_progress",
        message: `Preparando conta ${account.nickname || account.ml_user_id} (${accountIndex + 1}/${accounts.length})...`,
        current: accountIndex,
        total: accounts.length,
        fetched: totalFetchedOrders,
        expected: totalExpectedOrders,
        accountId: account.id,
        accountNickname: account.nickname || `Conta ${account.ml_user_id}`,
      });

      let current = account;
      try {
        current = await refreshMeliAccountToken(account);
        summary.expires_at = current.expires_at.toISOString();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido ao renovar token.";
        errors.push({ accountId: account.id, mlUserId: account.ml_user_id, message });
        console.error(`[Sync] Erro ao renovar token da conta ${account.id}:`, error);

        sendProgressToUser(userId, {
          type: "sync_warning",
          message: `Erro ao renovar token da conta ${account.nickname || account.ml_user_id}: ${message}. Pulando esta conta...`,
          errorCode: "TOKEN_REFRESH_FAILED"
        });
        continue;
      }

      const headers = { Authorization: `Bearer ${current.access_token}` };

      sendProgressToUser(userId, {
        type: "sync_progress",
        message: `Buscando vendas da conta ${current.nickname || current.ml_user_id}...`,
        current: accountIndex,
        total: accounts.length,
        fetched: totalFetchedOrders,
        expected: totalExpectedOrders,
        accountId: current.id,
        accountNickname: current.nickname || `Conta ${current.ml_user_id}`,
      });

      let allOrders: MeliOrderPayload[] = [];
      let expectedTotal = 0;
      let accountForcedStop = false;

      try {
        const result = await fetchAllOrdersForAccount(
          current,
          headers,
          userId,
          quickMode,
          fullSync,
        );
        allOrders = result.orders;
        expectedTotal = result.expectedTotal;
        accountForcedStop = result.forcedStop;

        console.log(`[Sync] ✅ Conta ${current.ml_user_id}: ${allOrders.length} vendas baixadas de ${expectedTotal} totais`);
      } catch (fetchError) {
        const fetchMsg = fetchError instanceof Error ? fetchError.message : 'Erro ao buscar vendas';
        console.error(`[Sync] ❌ Erro ao buscar vendas da conta ${current.ml_user_id}:`, fetchError);
        errors.push({
          accountId: current.id,
          mlUserId: current.ml_user_id,
          message: `Erro ao buscar vendas: ${fetchMsg}`
        });
        continue;
      }

      totalExpectedOrders += expectedTotal || allOrders.length;
      totalFetchedOrders += allOrders.length;

      if (accountForcedStop || allOrders.length < expectedTotal) {
        hasMoreToSync = true;
      }

      if (allOrders.length === 0) {
        sendProgressToUser(userId, {
          type: "sync_progress",
          message: `Nenhuma venda nova para a conta ${current.nickname || current.ml_user_id}.`,
          current: accountIndex + 1,
          total: accounts.length,
          fetched: totalFetchedOrders,
          expected: totalExpectedOrders,
          accountId: current.id,
          accountNickname: current.nickname || `Conta ${current.ml_user_id}`,
        });
        continue;
      }

      sendProgressToUser(userId, {
        type: "sync_progress",
        message: `Salvando ${allOrders.length} venda(s) da conta ${current.nickname || current.ml_user_id}...`,
        current: accountIndex,
        total: accounts.length,
        fetched: totalFetchedOrders,
        expected: totalExpectedOrders,
        accountId: current.id,
        accountNickname: current.nickname || `Conta ${current.ml_user_id}`,
      });

      try {
        const batchResult = await saveVendasBatch(allOrders, userId, 50);
        totalSavedOrders += batchResult.saved;

        console.log(
          `[Sync] Conta ${current.nickname}: ${batchResult.saved} vendas salvas, ${batchResult.errors} erros`,
        );

        if (batchResult.errors > 0) {
          sendProgressToUser(userId, {
            type: "sync_warning",
            message: `${batchResult.errors} vendas da conta ${current.nickname || current.ml_user_id} não puderam ser salvas`,
            errorCode: "SAVE_ERRORS",
          });
        }
      } catch (saveError) {
        const saveErrorMsg = saveError instanceof Error ? saveError.message : 'Erro desconhecido';
        console.error(`[Sync] Erro ao salvar vendas da conta ${current.id}:`, saveError);
        errors.push({
          accountId: current.id,
          mlUserId: current.ml_user_id,
          message: `Erro ao salvar vendas: ${saveErrorMsg}`
        });

        sendProgressToUser(userId, {
          type: "sync_warning",
          message: `Erro ao salvar vendas da conta ${current.nickname || current.ml_user_id}: ${saveErrorMsg}`,
          errorCode: "SAVE_BATCH_ERROR",
        });
      }

      sendProgressToUser(userId, {
        type: "sync_progress",
        message: `Conta ${current.nickname || current.ml_user_id} concluída.`,
        current: accountIndex + 1,
        total: accounts.length,
        fetched: totalFetchedOrders,
        expected: totalExpectedOrders,
        accountId: current.id,
        accountNickname: current.nickname || `Conta ${current.ml_user_id}`,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro crítico desconhecido';
      console.error(`[Sync] Erro catastrófico ao processar conta ${account.id}:`, error);

      errors.push({ accountId: account.id, mlUserId: account.ml_user_id, message: errorMsg });

      sendProgressToUser(userId, {
        type: "sync_warning",
        message: `Erro crítico na conta ${account.nickname || account.ml_user_id}: ${errorMsg}. Continuando com próxima conta...`,
        errorCode: "CRITICAL_ERROR"
      });
    }
  }

  let mensagemFinal = '';
  if (hasMoreToSync) {
    const percentual = totalExpectedOrders > 0 ? Math.round((totalSavedOrders / totalExpectedOrders) * 100) : 0;
    mensagemFinal = `⚠️ ${totalSavedOrders} de ${totalExpectedOrders} vendas processadas (${percentual}%). Ainda há vendas antigas para sincronizar.`;
  } else if (fullSync) {
    mensagemFinal = `✅ Sincronização completa (FULL). ${totalSavedOrders} vendas processadas.`;
  } else if (quickMode) {
    mensagemFinal = `✅ Vendas recentes sincronizadas. ${totalSavedOrders} vendas processadas.`;
  } else {
    mensagemFinal = `✅ Sincronização concluída. ${totalSavedOrders} vendas processadas.`;
  }

  sendProgressToUser(userId, {
    type: "sync_complete",
    message: mensagemFinal,
    current: totalSavedOrders,
    total: totalExpectedOrders,
    fetched: totalSavedOrders,
    expected: totalExpectedOrders,
    hasMoreToSync
  });

  invalidateVendasCache(userId);
  console.log(`[Cache] Cache de vendas invalidado para usuário ${userId}`);

  // Agora NÃO dispara mais auto-sync interno. Tudo é conta-por-conta e request-por-request.
  setTimeout(() => closeUserConnections(userId), 2000);

  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    accounts: summaries,
    orders: [] as MeliOrderPayload[],
    errors,
    totals: {
      expected: totalExpectedOrders,
      fetched: totalFetchedOrders,
      saved: totalSavedOrders
    },
    hasMoreToSync,
    quickMode,
    autoSyncTriggered: false
  });
}
