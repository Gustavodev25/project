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

const MELI_API_BASE =
  process.env.MELI_API_BASE?.replace(/\/$/, "") ||
  "https://api.mercadolibre.com";
const PAGE_LIMIT = 50;
const MAX_OFFSET = 5000; // Limite de 5.000 vendas por conta para melhor performance

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


// Função para debug - identificar qual campo está causando o problema
function debugFieldLengths(data: any, orderId: string) {
  const fieldLengths: { [key: string]: number } = {};
  
  // Verificar todos os campos de string
  const stringFields = [
    'orderId', 'userId', 'meliAccountId', 'status', 'conta', 'titulo', 'sku', 
    'comprador', 'logisticType', 'envioMode', 'shippingStatus', 'shippingId',
    'exposicao', 'tipoAnuncio', 'ads', 'plataforma', 'canal'
  ];
  
  stringFields.forEach(field => {
    if (data[field] && typeof data[field] === 'string') {
      fieldLengths[field] = data[field].length;
    }
  });
  
  // Log apenas se algum campo for muito longo
  const longFields = Object.entries(fieldLengths).filter(([_, length]) => length > 100);
  if (longFields.length > 0) {
    console.log(`[DEBUG] Venda ${orderId} - Campos longos:`, longFields);
  }
  
  return fieldLengths;
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
  quantity: number | null,           // << novo parâmetro
  baseCost: number | null,
  listCost: number | null,
  shipmentCost: number | null
): { adjustedCost: number | null; adjustmentSource: string | null } {
  if (!logisticType) return { adjustedCost: null, adjustmentSource: null };

  // order_cost total = unitário * quantidade  (equivalente ao SQL)
  const orderCost = unitPrice !== null && quantity ? unitPrice * quantity : null;

  const freteAdjust = calcularFreteAdjust({
    shipment_logistic_type: logisticType,
    base_cost: baseCost,
    shipment_list_cost: listCost,
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
    quantity,   // << antes estava fixo 1
    baseCost,
    listCost,
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
 * 
 * @param valorTotal - Valor total da venda (POSITIVO)
 * @param taxaPlataforma - Taxa da plataforma (JÁ DEVE VIR NEGATIVA)
 * @param frete - Valor do frete (pode ser + ou -)
 * @param cmv - Custo da Mercadoria Vendida (POSITIVO)
 * @returns Margem de contribuição e se é margem real ou receita líquida
 */
function calculateMargemContribuicao(
  valorTotal: number,
  taxaPlataforma: number | null,
  frete: number,
  cmv: number | null
): { valor: number; isMargemReal: boolean } {
  // Valores base (taxa já vem negativa, frete pode ser + ou -)
  const taxa = taxaPlataforma || 0;
  
  // Se temos CMV, calculamos a margem de contribuição real
  // Fórmula: Margem = Valor Total + Taxa Plataforma + Frete - CMV
  if (cmv !== null && cmv !== undefined && cmv > 0) {
    const margemContribuicao = valorTotal + taxa + frete - cmv;
    return {
      valor: roundCurrency(margemContribuicao),
      isMargemReal: true
    };
  }
  
  // Se não temos CMV, retornamos a receita líquida
  // Receita Líquida = Valor Total + Taxa Plataforma + Frete
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

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Se sucesso ou erro não-retryable, retorna imediatamente
      if (response.ok || !isRetryableError(response.status)) {
        return response;
      }

      // Erro retryable - tentar novamente
      lastError = new Error(`HTTP ${response.status}`);

      // Calcular delay com exponential backoff
      const baseDelay = 1000; // 1 segundo
      const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s
      const jitter = Math.random() * 1000; // até 1s de jitter
      const totalDelay = delay + jitter;

      console.warn(
        `[Retry] Erro ${response.status} em ${url.substring(0, 100)}... ` +
        `Tentativa ${attempt + 1}/${maxRetries}. Aguardando ${Math.round(totalDelay)}ms`
      );

      // Enviar aviso via SSE
      if (userId) {
        sendProgressToUser(userId, {
          type: "sync_warning",
          message: `Erro temporário ${response.status} da API do Mercado Livre. Tentando novamente (${attempt + 1}/${maxRetries})...`,
          errorCode: response.status.toString()
        });
      }

      // Aguardar antes de tentar novamente
      await sleep(totalDelay);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Se não for erro de rede, não tenta novamente
      if (attempt === maxRetries - 1) {
        throw lastError;
      }

      const baseDelay = 1000;
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const totalDelay = delay + jitter;

      console.warn(
        `[Retry] Erro de rede em ${url.substring(0, 100)}... ` +
        `Tentativa ${attempt + 1}/${maxRetries}. Aguardando ${Math.round(totalDelay)}ms`
      );

      await sleep(totalDelay);
    }
  }

  throw lastError || new Error('Falha após múltiplas tentativas');
}

async function fetchOrdersForAccount(
  account: MeliAccount,
  userId: string,
  specificOrderIds?: string[] // IDs específicos para buscar
): Promise<OrdersFetchResult> {
  const results: MeliOrderPayload[] = [];
  const headers = { Authorization: `Bearer ${account.access_token}` };

  // Se houver IDs específicos, buscar apenas esses pedidos
  if (specificOrderIds && specificOrderIds.length > 0) {
    console.log(`[Sync] Buscando ${specificOrderIds.length} pedidos específicos para conta ${account.ml_user_id}`);

    const detailedOrders = await Promise.all(
      specificOrderIds.map(async (orderId) => {
        try {
          const res = await fetchWithRetry(`${MELI_API_BASE}/orders/${orderId}`, { headers }, 3, userId);
          if (!res.ok) return null;
          return await res.json();
        } catch (error) {
          console.error(`[Sync] Erro ao buscar pedido específico ${orderId}:`, error);
          return null;
        }
      })
    );

    const shipments = await Promise.all(
      detailedOrders.map(async (order: any) => {
        const shippingId = order?.shipping?.id;
        if (!shippingId) return null;
        try {
          const res = await fetchWithRetry(`${MELI_API_BASE}/shipments/${shippingId}`, { headers }, 3, userId);
          if (!res.ok) return null;
          return await res.json();
        } catch (error) {
          console.error(`[Sync] Erro ao buscar envio ${shippingId}:`, error);
          return null;
        }
      })
    );

    detailedOrders.forEach((order: any, idx: number) => {
      if (!order) return;
      const shipment = shipments[idx] ?? undefined;
      const freight = calculateFreight(order, shipment);
      results.push({
        accountId: account.id,
        accountNickname: account.nickname,
        mlUserId: account.ml_user_id,
        order,
        shipment,
        freight,
      });
    });

    return { orders: results, expectedTotal: specificOrderIds.length };
  }

  // Verificar se já existem vendas no banco para esta conta
  const existingVendasCount = await prisma.meliVenda.count({
    where: { meliAccountId: account.id }
  });
  
  const isFirstSync = existingVendasCount === 0;
  
  // Determinar período de busca
  const now = new Date();
  let dateFrom: Date;
  
  if (isFirstSync) {
    // PRIMEIRA SINCRONIZAÇÃO: buscar TODO o histórico desde 2024-01-01
    dateFrom = new Date("2024-01-01T00:00:00.000Z");
    console.log(`[Sync] 🚀 PRIMEIRA SINCRONIZAÇÃO - Buscando TODAS as vendas desde ${dateFrom.toISOString()}`);
  } else {
    // SINCRONIZAÇÃO INCREMENTAL: buscar apenas últimas 48 horas
    dateFrom = new Date(now.getTime() - (48 * 60 * 60 * 1000));
    console.log(`[Sync] 📊 Sincronização incremental - Buscando vendas das últimas 48h (${existingVendasCount} vendas já existem)`);
  }
  
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let expectedTotal = 0;

  // Contador de tipos de logística para debug
  const logisticStats = new Map<string, number>();

  while (offset < total && offset < MAX_OFFSET) {
    const limit = PAGE_LIMIT;
    // Usar endpoint /orders/search com filtro de data
    const url = new URL(`${MELI_API_BASE}/orders/search`);
    url.searchParams.set("seller", account.ml_user_id.toString());
    url.searchParams.set("sort", "date_desc");
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());
    // Filtrar vendas do período determinado
    url.searchParams.set("order.date_created.from", dateFrom.toISOString());
    url.searchParams.set("order.date_created.to", now.toISOString());

    const response = await fetchWithRetry(url.toString(), { headers }, 3, userId);
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

    const [detailedOrders, shipments] = await Promise.all([
      Promise.all(
        orders.map(async (order: any) => {
          const id = order?.id;
          if (!id) return order;
          try {
            const res = await fetchWithRetry(`${MELI_API_BASE}/orders/${id}`, { headers }, 3, userId);
            if (!res.ok) {
              // Aviso já foi enviado pelo fetchWithRetry
              return order;
            }
            const det = await res.json();
            return { ...order, ...det };
          } catch (error) {
            console.error(`[Sync] Erro ao buscar detalhes do pedido ${id}:`, error);
            return order;
          }
        }),
      ),
      Promise.all(
        orders.map(async (order: any) => {
          const shippingId = order?.shipping?.id;
          if (!shippingId) return null;
          try {
            const res = await fetchWithRetry(`${MELI_API_BASE}/shipments/${shippingId}`, { headers }, 3, userId);
            if (!res.ok) {
              // Aviso já foi enviado pelo fetchWithRetry
              return null;
            }
            return await res.json();
          } catch (error) {
            console.error(`[Sync] Erro ao buscar detalhes do envio ${shippingId}:`, error);
            return null;
          }
        }),
      ),
    ]);

    detailedOrders.forEach((order: any, idx: number) => {
      const shipment = shipments[idx] ?? undefined;
      const freight = calculateFreight(order, shipment);

      // Debug: Log vendas com cross_docking e contar tipos de logística
      const logisticTypeRaw = shipment?.logistic_type || order?.shipping?.mode || 'sem_tipo';
      const count = logisticStats.get(logisticTypeRaw) || 0;
      logisticStats.set(logisticTypeRaw, count + 1);

      if (logisticTypeRaw === 'cross_docking') {
        console.log(`[DEBUG CROSS_DOCKING] Encontrada venda com cross_docking!`);
        console.log(`  Order ID: ${order?.id}`);
        console.log(`  logistic_type (shipment): ${shipment?.logistic_type}`);
        console.log(`  shipping.mode (order): ${order?.shipping?.mode}`);
        console.log(`  Convertido para: ${freight.logisticType}`);
      }

      results.push({
        accountId: account.id,
        accountNickname: account.nickname,
        mlUserId: account.ml_user_id,
        order,
        shipment,
        freight,
      });
    });

    const fetched = orders.length;
    offset += fetched;
    
    // Debug: log para verificar paginação
    const periodLabel = isFirstSync ? "desde 2024-01-01" : "últimas 48h";
    console.log(`[meli][vendas] Conta ${account.ml_user_id}: página ${Math.floor(offset/limit) + 1}, offset: ${offset}, total: ${total}, fetched: ${fetched} (${periodLabel})`);
    
    // Debug: verificar se as vendas estão sendo processadas
    if (fetched > 0) {
      console.log(`[DEBUG] Processando ${fetched} pedidos da conta ${account.ml_user_id} (${periodLabel})`);
    }
    
    // Enviar progresso em tempo real via SSE
    if (fetched > 0) {
      sendProgressToUser(userId, {
        type: "sync_progress",
        message: `Conta ${account.nickname || account.ml_user_id}: página ${Math.floor(offset/limit)}, offset: ${offset}, total: ${total}, fetched: ${fetched}`,
        current: offset,
        total: total,
        accountId: account.id,
        accountNickname: account.nickname,
        page: Math.floor(offset/limit),
        offset: offset,
        fetched: fetched,
        expected: total
      });
    }
    
    // Parar apenas se não há mais vendas ou atingiu o total
    if (fetched === 0 || offset >= total) break;
  }

  // Avisar se atingiu o limite máximo de offset
  if (offset >= MAX_OFFSET && total > MAX_OFFSET) {
    const vendasRestantes = total - MAX_OFFSET;
    console.log(`[meli][vendas] AVISO: Limite de ${MAX_OFFSET} vendas por conta atingido. ${vendasRestantes} vendas não foram sincronizadas.`);

    sendProgressToUser(userId, {
      type: "sync_warning",
      message: `Limite de 5.000 vendas por conta atingido. Sincronizadas ${MAX_OFFSET} de ${total} vendas disponíveis. As vendas mais recentes foram priorizadas.`,
      errorCode: "MAX_OFFSET_REACHED"
    });
  }

  // Log de estatísticas de tipos de logística
  console.log(`[SYNC STATS] Conta ${account.ml_user_id} - Tipos de logística encontrados:`);
  const sortedStats = Array.from(logisticStats.entries()).sort((a, b) => b[1] - a[1]);
  sortedStats.forEach(([type, count]) => {
    console.log(`  ${type}: ${count} vendas`);
  });

  if (!logisticStats.has('cross_docking')) {
    console.log(`[SYNC INFO] ⚠️ Nenhuma venda com cross_docking (Coleta) foi encontrada na API do Mercado Livre para esta conta.`);
  }

  return { orders: results, expectedTotal };
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

// Função para salvar vendas em lotes
async function saveVendasBatch(
  orders: MeliOrderPayload[],
  userId: string,
  batchSize: number = 10
): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;
  const skuCache = await buildSkuCache(orders, userId);

  // Processar em lotes
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize);
    
    // Processar lote
    const batchPromises = batch.map(async (order, batchIndex) => {
      try {
        await saveVendaToDatabase(order, userId, skuCache);
        saved++;
        
        // Enviar progresso em tempo real após cada venda salva
        const currentProgress = i + batchIndex + 1;
        sendProgressToUser(userId, {
          type: "sync_progress",
          message: `Salvando no banco de dados: ${currentProgress} de ${orders.length} vendas`,
          current: currentProgress,
          total: orders.length,
          fetched: currentProgress,
          expected: orders.length
        });
        
        return { success: true, orderId: order.order.id };
      } catch (error) {
        errors++;
        console.error(`Erro ao salvar venda ${order.order.id}:`, error);
        return { success: false, orderId: order.order.id, error };
      }
    });
    
    await Promise.all(batchPromises);
    
    // Pequena pausa entre lotes para não sobrecarregar o banco
    if (i + batchSize < orders.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return { saved, errors };
}

async function saveVendaToDatabase(
  order: MeliOrderPayload,
  userId: string,
  skuCache: Map<string, SkuCacheEntry>
): Promise<boolean> {
  // Log simples sem debug detalhado
  console.log(`[DEBUG] Salvando venda ${order.order.id} para userId: ${userId}`);
  try {
    const o: any = order.order ?? {};
    const freight = order.freight;

    const orderItems: any[] = Array.isArray(o.order_items) ? o.order_items : [];
    const firstItem = orderItems[0] ?? {};
    const orderItem = typeof firstItem === "object" && firstItem !== null ? firstItem : {};
    const itemData = typeof orderItem?.item === "object" && orderItem.item !== null
      ? orderItem.item
      : {};

    const firstItemTitle =
      itemData?.title ??
      orderItems.find((entry: any) => entry?.item?.title)?.item?.title ??
      o.title ??
      "Pedido";

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
      [o?.buyer?.first_name, o?.buyer?.last_name]
        .filter(Boolean)
        .join(" ") ||
      "Comprador";

    const dateString = o.date_closed || o.date_created || o.date_last_updated;

    const tags: string[] = Array.isArray(o.tags)
      ? o.tags.map((t: unknown) => String(t))
      : [];
    const internalTags: string[] = Array.isArray(o.internal_tags)
      ? o.internal_tags.map((t: unknown) => String(t))
      : [];

    const shippingStatus = (order.shipment as any)?.status || o?.shipping?.status || undefined;
    const shippingId = (order.shipment as any)?.id?.toString() || o?.shipping?.id?.toString();

    // Coordenadas de entrega (latitude/longitude) do endereço do destinatário, quando disponível
    const receiverAddress =
      (order.shipment as any)?.receiver_address ??
      (o?.shipping && typeof o.shipping === 'object' ? (o as any).shipping?.receiver_address : undefined) ??
      undefined;
    const latitude = toFiniteNumber((receiverAddress as any)?.latitude ?? (receiverAddress as any)?.geo?.latitude);
    const longitude = toFiniteNumber((receiverAddress as any)?.longitude ?? (receiverAddress as any)?.geo?.longitude);

    // CORREÇÃO: sale_fee vem POR UNIDADE da API, então precisa multiplicar pela quantidade
    const saleFee = orderItems.reduce((acc, item) => {
      const fee = toFiniteNumber(item?.sale_fee) ?? 0;
      const qty = toFiniteNumber(item?.quantity) ?? 1;
      return acc + (fee * qty);
    }, 0);

    const unitario = toFiniteNumber(orderItem?.unit_price) ??
      (quantity > 0 && totalAmount !== null ? roundCurrency(totalAmount / quantity) : 0);

    // Taxa da plataforma: convertemos para NEGATIVO (é um custo)
    const taxaPlataforma = saleFee > 0 ? -roundCurrency(saleFee) : null;
    const frete = freight.adjustedCost ?? freight.finalCost ?? freight.orderCostFallback ?? 0;

    // Buscar o SKU para obter o custo unitário e calcular o CMV
    const skuVendaRaw = itemData?.seller_sku || itemData?.sku || null;
    const skuVenda = skuVendaRaw ? truncateString(String(skuVendaRaw), 255) || null : null;
    let cmv: number | null = null;
    
    if (skuVenda) {
      const cachedSku = skuCache.get(skuVenda);

      if (cachedSku) {
        if (cachedSku.custoUnitario !== null) {
          cmv = roundCurrency(cachedSku.custoUnitario * quantity);
        }
      } else {
        try {
          const skuData = await prisma.sKU.findFirst({
            where: {
              userId,
              sku: skuVenda
            },
            select: {
              custoUnitario: true,
              tipo: true
            }
          });

          const custoUnitarioValue = skuData?.custoUnitario !== null && skuData?.custoUnitario !== undefined
            ? Number(skuData.custoUnitario)
            : null;

          if (custoUnitarioValue !== null) {
            cmv = roundCurrency(custoUnitarioValue * quantity);
          }

          skuCache.set(skuVenda, {
            custoUnitario: custoUnitarioValue,
            tipo: skuData?.tipo ?? null
          });
        } catch (error) {
          console.error(`[DEBUG] Erro ao buscar SKU ${skuVenda}:`, error);
          skuCache.set(skuVenda, { custoUnitario: null, tipo: null });
        }
      }
    }

    const { valor: margemContribuicao, isMargemReal } = calculateMargemContribuicao(
      totalAmount,
      taxaPlataforma,
      frete,
      cmv
    );

    // Verificar se a venda já existe
    const existingVenda = await prisma.meliVenda.findUnique({
      where: { orderId: String(o.id) }
    });

    if (existingVenda) {
      // Atualizar venda existente
      try {
        await prisma.meliVenda.update({
          where: { orderId: String(o.id) },
          data: {
            dataVenda: dateString ? new Date(dateString) : new Date(),
            status: truncateString(String(o.status ?? "desconhecido").replaceAll("_", " "), 100),
            conta: truncateString(order.accountNickname ?? String(order.mlUserId), 255),
            valorTotal: new Decimal(totalAmount),
            quantidade: quantity > 0 ? quantity : 1,
            unitario: new Decimal(unitario),
            taxaPlataforma: taxaPlataforma ? new Decimal(taxaPlataforma) : null,
            frete: new Decimal(frete),
            cmv: cmv !== null ? new Decimal(cmv) : null,
            margemContribuicao: new Decimal(margemContribuicao),
            isMargemReal,
            titulo: truncateString(firstItemTitle, 500) || "Produto sem título",
            sku: skuVenda,
            comprador: truncateString(buyerName, 255) || "Comprador",
            logisticType: truncateString(freight.logisticType, 100) || null,
            envioMode: truncateString(freight.shippingMode, 100) || null,
            shippingStatus: truncateString(shippingStatus, 100) || null,
            shippingId: truncateString(shippingId, 255) || null,
            latitude: latitude !== null ? new Decimal(latitude) : null,
            longitude: longitude !== null ? new Decimal(longitude) : null,
            exposicao: (() => {
              const listingTypeId = (orderItem?.listing_type_id ?? itemData?.listing_type_id) ?? null;
              return mapListingTypeToExposure(listingTypeId);
            })(),
            tipoAnuncio: tags.includes("catalog") ? "Catálogo" : "Próprio",
            ads: internalTags.includes("ads") ? "ADS" : null,
            plataforma: "Mercado Livre",
            canal: "ML",
            tags: truncateJsonData(tags),
            internalTags: truncateJsonData(internalTags),
            rawData: truncateJsonData({
              order: o,
              shipment: order.shipment as any,
              freight: freight
            }),
            atualizadoEm: new Date(),
          }
        });
      } catch (err) {
        const msg = (err as any)?.message ? String((err as any).message) : String(err);
        if (msg.includes("Unknown argument `latitude`") || msg.includes("Unknown argument `longitude`")) {
          await prisma.meliVenda.update({
            where: { orderId: String(o.id) },
            data: {
              dataVenda: dateString ? new Date(dateString) : new Date(),
              status: truncateString(String(o.status ?? "desconhecido").replaceAll("_", " "), 100),
              conta: truncateString(order.accountNickname ?? String(order.mlUserId), 255),
              valorTotal: new Decimal(totalAmount),
              quantidade: quantity > 0 ? quantity : 1,
              unitario: new Decimal(unitario),
              taxaPlataforma: taxaPlataforma ? new Decimal(taxaPlataforma) : null,
              frete: new Decimal(frete),
              cmv: cmv !== null ? new Decimal(cmv) : null,
              margemContribuicao: new Decimal(margemContribuicao),
              isMargemReal,
              titulo: truncateString(firstItemTitle, 500) || "Produto sem título",
              sku: skuVenda,
              comprador: truncateString(buyerName, 255) || "Comprador",
              logisticType: truncateString(freight.logisticType, 100) || null,
              envioMode: truncateString(freight.shippingMode, 100) || null,
              shippingStatus: truncateString(shippingStatus, 100) || null,
              shippingId: truncateString(shippingId, 255) || null,
              exposicao: (() => {
                const listingTypeId = (orderItem?.listing_type_id ?? itemData?.listing_type_id) ?? null;
                return mapListingTypeToExposure(listingTypeId);
              })(),
              tipoAnuncio: tags.includes("catalog") ? "Catálogo" : "Próprio",
              ads: internalTags.includes("ads") ? "ADS" : null,
              plataforma: "Mercado Livre",
              canal: "ML",
              tags: truncateJsonData(tags),
              internalTags: truncateJsonData(internalTags),
              rawData: truncateJsonData({
                order: o,
                shipment: order.shipment as any,
                freight: freight
              }),
              atualizadoEm: new Date(),
            }
          });
        } else {
          throw err;
        }
      }
      console.log(`[DEBUG] Venda ${o.id} atualizada com sucesso`);
    } else {
      // Debug para identificar campos longos
      const debugData = {
        orderId: String(o.id),
        userId,
        meliAccountId: order.accountId,
        status: String(o.status ?? "desconhecido").replaceAll("_", " "),
        conta: order.accountNickname ?? String(order.mlUserId),
        titulo: firstItemTitle,
        sku: itemData?.seller_sku || itemData?.sku,
        comprador: buyerName,
        logisticType: freight.logisticType,
        envioMode: freight.shippingMode,
        shippingStatus,
        shippingId,
        exposicao: (() => {
          const listingTypeId = (orderItem?.listing_type_id ?? itemData?.listing_type_id) ?? null;
          return mapListingTypeToExposure(listingTypeId);
        })(),
        tipoAnuncio: tags.includes("catalog") ? "Catálogo" : "Próprio",
        ads: internalTags.includes("ads") ? "ADS" : null,
        plataforma: "Mercado Livre",
        canal: "ML"
      };
      
      debugFieldLengths(debugData, String(o.id));
      
      // Criar nova venda
      try {
        await prisma.meliVenda.create({
          data: {
            orderId: truncateString(String(o.id), 255),
            userId: truncateString(userId, 50),
            meliAccountId: truncateString(order.accountId, 25),
            dataVenda: dateString ? new Date(dateString) : new Date(),
            status: truncateString(String(o.status ?? "desconhecido").replaceAll("_", " "), 100),
            conta: truncateString(order.accountNickname ?? String(order.mlUserId), 255),
            valorTotal: new Decimal(totalAmount),
            quantidade: quantity > 0 ? quantity : 1,
            unitario: new Decimal(unitario),
            taxaPlataforma: taxaPlataforma ? new Decimal(taxaPlataforma) : null,
            frete: new Decimal(frete),
            cmv: cmv !== null ? new Decimal(cmv) : null,
            margemContribuicao: new Decimal(margemContribuicao),
            isMargemReal,
            titulo: truncateString(firstItemTitle, 500) || "Produto sem título",
            sku: skuVenda,
            comprador: truncateString(buyerName, 255) || "Comprador",
            logisticType: truncateString(freight.logisticType, 100) || null,
            envioMode: truncateString(freight.shippingMode, 100) || null,
            shippingStatus: truncateString(shippingStatus, 100) || null,
            shippingId: truncateString(shippingId, 255) || null,
            exposicao: (() => {
              const listingTypeId = (orderItem?.listing_type_id ?? itemData?.listing_type_id) ?? null;
              return mapListingTypeToExposure(listingTypeId);
            })(),
            tipoAnuncio: tags.includes("catalog") ? "Catálogo" : "Próprio",
            ads: internalTags.includes("ads") ? "ADS" : null,
            plataforma: "Mercado Livre",
            canal: "ML",
            tags: truncateJsonData(tags),
            internalTags: truncateJsonData(internalTags),
            rawData: truncateJsonData({
              order: o,
              shipment: order.shipment as any,
              freight: freight
            }),
          }
        });
      } catch (err) {
        const msg = (err as any)?.message ? String((err as any).message) : String(err);
        if (msg.includes("Unknown argument `latitude`") || msg.includes("Unknown argument `longitude`")) {
          await prisma.meliVenda.create({
            data: {
              orderId: truncateString(String(o.id), 255),
              userId: truncateString(userId, 50),
              meliAccountId: truncateString(order.accountId, 25),
              dataVenda: dateString ? new Date(dateString) : new Date(),
              status: truncateString(String(o.status ?? "desconhecido").replaceAll("_", " "), 100),
              conta: truncateString(order.accountNickname ?? String(order.mlUserId), 255),
              valorTotal: new Decimal(totalAmount),
              quantidade: quantity > 0 ? quantity : 1,
              unitario: new Decimal(unitario),
              taxaPlataforma: taxaPlataforma ? new Decimal(taxaPlataforma) : null,
              frete: new Decimal(frete),
              cmv: cmv !== null ? new Decimal(cmv) : null,
              margemContribuicao: new Decimal(margemContribuicao),
              isMargemReal,
              titulo: truncateString(firstItemTitle, 500) || "Produto sem título",
              sku: skuVenda,
              comprador: truncateString(buyerName, 255) || "Comprador",
              logisticType: truncateString(freight.logisticType, 100) || null,
              envioMode: truncateString(freight.shippingMode, 100) || null,
              shippingStatus: truncateString(shippingStatus, 100) || null,
              shippingId: truncateString(shippingId, 255) || null,
              exposicao: (() => {
                const listingTypeId = (orderItem?.listing_type_id ?? itemData?.listing_type_id) ?? null;
                return mapListingTypeToExposure(listingTypeId);
              })(),
              tipoAnuncio: tags.includes("catalog") ? "Catálogo" : "Próprio",
              ads: internalTags.includes("ads") ? "ADS" : null,
              plataforma: "Mercado Livre",
              canal: "ML",
              tags: truncateJsonData(tags),
              internalTags: truncateJsonData(internalTags),
              rawData: truncateJsonData({
                order: o,
                shipment: order.shipment as any,
                freight: freight
              }),
            }
          });
        } else {
          throw err;
        }
      }
      console.log(`[DEBUG] Venda ${o.id} criada com sucesso`);
    }

    return true;
  } catch (error) {
    console.error(`Erro ao salvar venda ${(order.order as any)?.id}:`, error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  let session;
  try {
    session = await assertSessionToken(sessionCookie);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = session.sub;
  
  // Ler body para obter contas selecionadas e IDs de vendas verificadas
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
    console.error('[Sync] Erro ao parsear body:', error);
  }

  console.log(`[Sync] Iniciando sincronização para usuário ${userId}`, {
    accountIds: requestBody.accountIds,
    hasOrderIds: !!requestBody.orderIdsByAccount
  });

  // Dar um delay para garantir que o SSE está conectado
  await new Promise(resolve => setTimeout(resolve, 500));

  // Enviar evento de início da sincronização
  sendProgressToUser(userId, {
    type: "sync_start",
    message: "Conectando ao Mercado Livre...",
    current: 0,
    total: 0,
    fetched: 0,
    expected: 0
  });

  // Buscar contas - filtrar por IDs se fornecidos
  const accountsWhere: any = { userId: session.sub };
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

  const orders: MeliOrderPayload[] = [];
  const errors: SyncError[] = [];
  const summaries: AccountSummary[] = [];
  let totalExpectedOrders = 0;
  let totalFetchedOrders = 0;
  let totalSavedOrders = 0;
  
  // Preparar steps para cada conta
  const steps = accounts.map(acc => ({
    accountId: acc.id,
    accountName: acc.nickname || `Conta ${acc.ml_user_id}`,
    currentStep: 'pending' as 'pending' | 'fetching' | 'saving' | 'completed' | 'error',
    progress: 0,
    fetched: 0,
    expected: 0,
    error: undefined as string | undefined
  }));

  for (let accountIndex = 0; accountIndex < accounts.length; accountIndex++) {
    const account = accounts[accountIndex];
    const summary: AccountSummary = {
      id: account.id,
      nickname: account.nickname,
      ml_user_id: account.ml_user_id,
      expires_at: account.expires_at.toISOString(),
    };
    summaries.push(summary);

    // Atualizar step para fetching
    steps[accountIndex].currentStep = 'fetching';
    
    // Enviar progresso: processando conta
    sendProgressToUser(userId, {
      type: "sync_progress",
      message: `Buscando vendas da conta ${account.nickname || account.ml_user_id}...`,
      current: accountIndex,
      total: accounts.length,
      fetched: totalFetchedOrders,
      expected: totalExpectedOrders,
      accountId: account.id,
      accountNickname: account.nickname || `Conta ${account.ml_user_id}`,
      steps: steps
    });

    let current = account;
    try {
      current = await refreshMeliAccountToken(account);
      summary.expires_at = current.expires_at.toISOString();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao renovar token.";
      errors.push({ accountId: account.id, mlUserId: account.ml_user_id, message });
      console.error(`[meli][vendas] Erro ao renovar token da conta ${account.id}:`, error);
      
      // Enviar erro via SSE
      sendProgressToUser(userId, {
        type: "sync_error",
        message: `Erro ao renovar token da conta ${account.nickname || account.ml_user_id}`,
        errorCode: "TOKEN_REFRESH_FAILED"
      });
      continue;
    }

    try {
      // Obter IDs específicos para esta conta, se fornecidos
      const specificOrderIds = requestBody.orderIdsByAccount?.[account.id];
      
      const { orders: accountOrders, expectedTotal } = await fetchOrdersForAccount(
        current, 
        userId,
        specificOrderIds
      );
      
      const accountExpected = expectedTotal || accountOrders.length;
      totalExpectedOrders += accountExpected;
      totalFetchedOrders += accountOrders.length;
      orders.push(...accountOrders);
      
      steps[accountIndex].expected = accountExpected;
      steps[accountIndex].fetched = accountOrders.length;
      steps[accountIndex].progress = accountOrders.length > 0 ? 50 : 100; // 50% após fetch

      console.log(`[Sync] Conta ${account.nickname}: ${accountOrders.length} vendas encontradas`);
      
      // Atualizar step para saving
      steps[accountIndex].currentStep = 'saving';
      sendProgressToUser(userId, {
        type: "sync_progress",
        message: `Salvando vendas da conta ${account.nickname || account.ml_user_id}...`,
        current: accountIndex,
        total: accounts.length,
        fetched: totalFetchedOrders,
        expected: totalExpectedOrders,
        accountId: account.id,
        accountNickname: account.nickname || `Conta ${account.ml_user_id}`,
        steps: steps
      });

      // Salvar vendas no banco de dados em lotes
      if (accountOrders.length > 0) {
        const batchResult = await saveVendasBatch(accountOrders, session.sub, 10);
        totalSavedOrders += batchResult.saved;
        
        console.log(`[Sync] Conta ${account.nickname}: ${batchResult.saved} vendas salvas`);
        
        if (batchResult.errors > 0) {
          console.warn(`[meli][vendas] ${batchResult.errors} vendas falharam ao salvar para conta ${current.id}`);
        }
      }
      
      // Marcar como concluída
      steps[accountIndex].currentStep = 'completed';
      steps[accountIndex].progress = 100;
      sendProgressToUser(userId, {
        type: "sync_progress",
        message: `Conta ${account.nickname || account.ml_user_id} concluída!`,
        current: accountIndex + 1,
        total: accounts.length,
        fetched: totalFetchedOrders,
        expected: totalExpectedOrders,
        accountId: account.id,
        accountNickname: account.nickname || `Conta ${account.ml_user_id}`,
        steps: steps
      });
    } catch (error) {
      steps[accountIndex].currentStep = 'error';
      steps[accountIndex].error = error instanceof Error ? error.message : 'Erro desconhecido';
      const message = error instanceof Error ? error.message : "Erro desconhecido ao buscar pedidos.";
      errors.push({ accountId: current.id, mlUserId: current.ml_user_id, message });
      console.error(`[meli][vendas] Erro ao buscar pedidos da conta ${current.id}:`, error);
      
      // Enviar erro via SSE
      sendProgressToUser(userId, {
        type: "sync_progress",
        message: `Erro na conta ${current.nickname || current.ml_user_id}`,
        current: accountIndex + 1,
        total: accounts.length,
        fetched: totalFetchedOrders,
        expected: totalExpectedOrders,
        accountId: current.id,
        accountNickname: current.nickname || `Conta ${current.ml_user_id}`,
        steps: steps
      });
    }
  }

  // Enviar evento de conclusão da sincronização
  sendProgressToUser(userId, {
    type: "sync_complete",
    message: `Sincronização concluída! ${totalSavedOrders} vendas processadas de ${totalExpectedOrders} esperadas`,
    current: totalSavedOrders,
    total: totalExpectedOrders,
    fetched: totalSavedOrders,
    expected: totalExpectedOrders
  });

  // Invalidar cache de vendas após sincronização
  invalidateVendasCache(userId);
  console.log(`[Cache] Cache de vendas invalidado para usuário ${userId}`);

  // Fechar conexões SSE após um pequeno delay
  setTimeout(() => {
    closeUserConnections(userId);
  }, 2000);

  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    accounts: summaries,
    orders,
    errors,
    totals: { 
      expected: totalExpectedOrders, 
      fetched: totalFetchedOrders,
      saved: totalSavedOrders
    },
  });
}
