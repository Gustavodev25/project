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
export const maxDuration = 300; // Garantir tempo suficiente para salvar todas as vendas no Vercel

const MELI_API_BASE =
  process.env.MELI_API_BASE?.replace(/\/$/, "") ||
  "https://api.mercadolibre.com";
const PAGE_LIMIT = 50;
// REMOVIDO: Sem limite de vendas - vamos buscar TODAS
// REMOVIDO: Sem janelas complexas - sincronização completa e simples

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

type DateRangeWindow = {
  from: Date;
  to: Date;
  total: number;
  depth: number;
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
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      lastResponse = response;

      // Se sucesso, retorna imediatamente
      if (response.ok) {
        return response;
      }

      // Erros de autenticação (401, 403) não devem ser retryable - falhar imediatamente
      if (response.status === 401 || response.status === 403) {
        console.error(`[Sync] Erro de autenticação ${response.status} - Token pode estar inválido`);
        if (userId) {
          sendProgressToUser(userId, {
            type: "sync_warning",
            message: `Erro de autenticação ${response.status}. Verifique se a conta está conectada corretamente.`,
            errorCode: response.status.toString()
          });
        }
        return response; // Retornar resposta de erro para tratamento específico
      }

      // Se erro não-retryable (exceto auth), retorna imediatamente
      if (!isRetryableError(response.status)) {
        console.warn(`[Sync] Erro HTTP ${response.status} (não-retryable) em ${url.substring(0, 80)}...`);
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
        `[Retry] Erro ${response.status} em ${url.substring(0, 80)}... ` +
        `Tentativa ${attempt + 1}/${maxRetries}. Aguardando ${Math.round(totalDelay)}ms`
      );

      // Enviar aviso via SSE apenas na primeira tentativa
      if (userId && attempt === 0) {
        sendProgressToUser(userId, {
          type: "sync_warning",
          message: `Erro temporário ${response.status} da API do Mercado Livre. Tentando novamente...`,
          errorCode: response.status.toString()
        });
      }

      // Aguardar antes de tentar novamente
      await sleep(totalDelay);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Log do erro
      console.error(`[Retry] Erro na requisição (tentativa ${attempt + 1}/${maxRetries}):`, lastError.message);

      // Se é a última tentativa, lançar erro
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

      // Enviar aviso via SSE apenas na primeira tentativa
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

  // Se chegou aqui, todas as tentativas falharam
  if (lastResponse && !lastResponse.ok) {
    return lastResponse; // Retornar última resposta de erro
  }

  throw lastError || new Error('Falha após múltiplas tentativas');
}

/**
 * NOVA FUNÇÃO SIMPLES: Busca TODAS as vendas de uma conta
 * - Usa paginação até 10.000 vendas (limite da API)
 * - Se tiver mais de 10.000, divide por meses automaticamente
 */
async function fetchAllOrdersForAccount(
  account: MeliAccount,
  headers: Record<string, string>,
  userId: string,
): Promise<{ orders: MeliOrderPayload[]; expectedTotal: number }> {
  const results: MeliOrderPayload[] = [];
  const logisticStats = new Map<string, number>();

  console.log(`[Sync] 🚀 Iniciando busca completa de vendas para conta ${account.ml_user_id} (${account.nickname})`);

  // PASSO 1: Buscar primeiras 9.950 vendas (deixa margem antes do limite de 10k)
  let offset = 0;
  let total = 0;
  let page = 0;
  const MAX_OFFSET = 9950; // Limite seguro antes do 10k da API

  while (offset < MAX_OFFSET) {
    const limit = PAGE_LIMIT;
    const url = new URL(`${MELI_API_BASE}/orders/search`);
    url.searchParams.set("seller", account.ml_user_id.toString());
    url.searchParams.set("sort", "date_desc");
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());

    let response: Response;
    let payload: any = null;

    try {
      response = await fetchWithRetry(url.toString(), { headers }, 3, userId);
      payload = await response.json();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`[Sync] ❌ Erro ao buscar página ${page + 1}:`, errorMsg);
      sendProgressToUser(userId, {
        type: "sync_warning",
        message: `Erro na página ${page + 1}: ${errorMsg}`,
        errorCode: "PAGE_FETCH_ERROR",
      });
      offset += limit;
      page += 1;
      continue;
    }

    if (!response.ok) {
      const message = typeof payload?.message === "string" ? payload.message : `Status ${response.status}`;
      console.error(`[Sync] ❌ Erro HTTP ${response.status}:`, message);

      // Se atingiu limite de offset, parar IMEDIATAMENTE
      if (response.status === 400) {
        console.log(`[Sync] ⚠️ Atingiu limite da API na página ${page + 1} - mudando para busca por período`);
        break;
      }

      if ([401, 403, 404].includes(response.status)) break;

      offset += limit;
      page += 1;
      continue;
    }

    const orders = Array.isArray(payload?.results) ? payload.results : [];

    if (page === 0 && typeof payload?.paging?.total === "number") {
      total = payload.paging.total;
      console.log(`[Sync] 📊 Total: ${total} vendas encontradas`);

      // Se total > 10k, avisar que vai buscar por período
      if (total > MAX_OFFSET) {
        console.log(`[Sync] ⚠️ Conta tem mais de ${MAX_OFFSET} vendas - após buscar as recentes, buscará histórico por período`);
      }
    }

    if (orders.length === 0) {
      console.log(`[Sync] ✅ Fim da paginação`);
      break;
    }

    console.log(`[Sync] 📄 Página ${page + 1}: ${orders.length} vendas (${offset + orders.length}/${total})`);
    console.log(`[Sync] Debug - offset atual: ${offset}, novo offset será: ${offset + orders.length}`);

    // Buscar detalhes
    const [orderDetailsResults, shipmentDetailsResults] = await Promise.all([
      Promise.allSettled(
        orders.map(async (order: any) => {
          const id = order?.id;
          if (!id) return order;
          try {
            const res = await fetchWithRetry(`${MELI_API_BASE}/orders/${id}`, { headers }, 3, userId);
            if (!res.ok) return order;
            return await res.json();
          } catch {
            return order;
          }
        }),
      ),
      Promise.allSettled(
        orders.map(async (order: any) => {
          const shippingId = order?.shipping?.id;
          if (!shippingId) return null;
          try {
            const res = await fetchWithRetry(`${MELI_API_BASE}/shipments/${shippingId}`, { headers }, 3, userId);
            if (!res.ok) return null;
            return await res.json();
          } catch {
            return null;
          }
        }),
      ),
    ]);

    const detailedOrders = orderDetailsResults.map((r, i) => r.status === "fulfilled" ? r.value : orders[i]);
    const shipments = shipmentDetailsResults.map((r) => r.status === "fulfilled" ? r.value : null);

    // Processar
    detailedOrders.forEach((order: any, idx: number) => {
      if (!order) return;
      const shipment = shipments[idx] ?? undefined;
      const freight = calculateFreight(order, shipment);

      const logisticTypeRaw = shipment?.logistic_type || order?.shipping?.mode || "sem_tipo";
      logisticStats.set(logisticTypeRaw, (logisticStats.get(logisticTypeRaw) || 0) + 1);

      results.push({
        accountId: account.id,
        accountNickname: account.nickname,
        mlUserId: account.ml_user_id,
        order,
        shipment,
        freight,
      });
    });

    sendProgressToUser(userId, {
      type: 'sync_progress',
      message: `${results.length}/${total} vendas baixadas`,
      current: results.length,
      total: total,
      fetched: results.length,
      expected: total,
      accountId: account.id,
      accountNickname: account.nickname,
    });

    offset += orders.length;
    page += 1;

    // IMPORTANTE: Se chegou perto do limite, parar ANTES de dar erro
    if (offset >= MAX_OFFSET) {
      console.log(`[Sync] ⚠️ Atingiu ${offset} vendas - parando antes do limite da API`);
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // PASSO 2: Se total > 9.950, buscar vendas antigas por período mensal
  if (total > MAX_OFFSET && results.length < total) {
    console.log(`[Sync] 🔄 Buscando ${total - results.length} vendas restantes por período...`);

    // Pegar data da venda mais antiga já baixada
    const oldestDate = results.length > 0
      ? new Date((results[results.length - 1].order as any).date_created)
      : new Date();

    console.log(`[Sync] 📅 Venda mais antiga baixada: ${oldestDate.toISOString().split('T')[0]}`);

    // Buscar vendas mais antigas em blocos de 1 mês
    let currentMonthStart = new Date(oldestDate);
    currentMonthStart.setDate(1); // Primeiro dia do mês
    currentMonthStart.setHours(0, 0, 0, 0);
    currentMonthStart.setMonth(currentMonthStart.getMonth() - 1); // Começar do mês anterior

    const startDate = new Date('2020-01-01'); // Data limite (ajustar conforme necessário)

    while (currentMonthStart > startDate && results.length < total) {
      // Calcular fim do mês
      const currentMonthEnd = new Date(currentMonthStart);
      currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1);
      currentMonthEnd.setDate(0); // Último dia do mês
      currentMonthEnd.setHours(23, 59, 59, 999);

      console.log(`[Sync] 📅 Buscando: ${currentMonthStart.toISOString().split('T')[0]} a ${currentMonthEnd.toISOString().split('T')[0]}`);

      // Buscar vendas deste mês
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
        message: `${results.length}/${total} vendas baixadas (histórico)`,
        current: results.length,
        total: total,
        fetched: results.length,
        expected: total,
        accountId: account.id,
        accountNickname: account.nickname,
      });

      // Se não encontrou vendas neste mês, pode parar (chegou no início)
      if (monthOrders.length === 0) {
        console.log(`[Sync] ⚠️ Nenhuma venda encontrada neste período - provavelmente chegou ao início`);
        break;
      }

      // Ir para o mês anterior
      currentMonthStart.setMonth(currentMonthStart.getMonth() - 1);
    }

    console.log(`[Sync] ✅ Busca por período concluída: ${results.length} vendas de ${total} totais`);
  }

  console.log(`[Sync] 🎉 ${results.length} vendas baixadas de ${total} totais`);
  console.log(`[Sync] 📊 Tipos de logística:`, Array.from(logisticStats.entries()));

  return { orders: results, expectedTotal: total };
}

/**
 * Busca vendas em um período específico (para contornar limite de 10k)
 * Se o período tiver mais de 9.950 vendas, divide em sub-períodos
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
        // Se der erro 400, parar (atingiu limite)
        if (response.status === 400) {
          console.log(`[Sync] ⚠️ Atingiu limite no período - baixadas ${results.length} vendas`);
        }
        break;
      }

      const payload = await response.json();
      const orders = Array.isArray(payload?.results) ? payload.results : [];

      // Na primeira página, verificar total
      if (offset === 0 && typeof payload?.paging?.total === "number") {
        totalInPeriod = payload.paging.total;
        console.log(`[Sync] 📊 Período tem ${totalInPeriod} vendas`);

        // Se período tem mais de 9.950 vendas, avisar que pode não pegar todas
        if (totalInPeriod > MAX_OFFSET) {
          console.log(`[Sync] ⚠️ Período tem mais de ${MAX_OFFSET} vendas - buscando até o limite`);
        }
      }

      if (orders.length === 0) break;

      // Buscar detalhes
      const [orderDetailsResults, shipmentDetailsResults] = await Promise.all([
        Promise.allSettled(orders.map(async (o: any) => {
          if (!o?.id) return o;
          try {
            const r = await fetchWithRetry(`${MELI_API_BASE}/orders/${o.id}`, { headers }, 3, userId);
            return r.ok ? await r.json() : o;
          } catch { return o; }
        })),
        Promise.allSettled(orders.map(async (o: any) => {
          const sid = o?.shipping?.id;
          if (!sid) return null;
          try {
            const r = await fetchWithRetry(`${MELI_API_BASE}/shipments/${sid}`, { headers }, 3, userId);
            return r.ok ? await r.json() : null;
          } catch { return null; }
        })),
      ]);

      const detailedOrders = orderDetailsResults.map((r, i) => r.status === "fulfilled" ? r.value : orders[i]);
      const shipments = shipmentDetailsResults.map((r) => r.status === "fulfilled" ? r.value : null);

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

      // IMPORTANTE: Parar antes de atingir limite
      if (offset >= MAX_OFFSET) {
        console.log(`[Sync] ⚠️ Atingiu ${offset} vendas no período - parando antes do limite`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`[Sync] Erro ao buscar período:`, error);
      break;
    }
  }

  return results;
}

async function fetchOrdersForWindow(

  account: MeliAccount,

  userId: string,

  window?: SyncWindow,

  specificOrderIds?: string[], // IDs especificos para buscar

): Promise<OrdersFetchResult> {

  const results: MeliOrderPayload[] = [];

  const headers = { Authorization: `Bearer ${account.access_token}` };

  if (specificOrderIds && specificOrderIds.length > 0) {

    console.log(`[Sync] Buscando ${specificOrderIds.length} pedidos especificos para conta ${account.ml_user_id}`);



    const detailedOrders = await Promise.all(

      specificOrderIds.map(async (orderId) => {

        try {

          const res = await fetchWithRetry(`${MELI_API_BASE}/orders/${orderId}`, { headers }, 3, userId);

          if (!res.ok) {

            console.warn(`[Sync] Pedido ${orderId} retornou status ${res.status}, ignorando...`);

            return null;

          }

          const data = await res.json();

          return data;

        } catch (error) {

          console.error(`[Sync] Erro ao buscar pedido especifico ${orderId}:`, error);

          sendProgressToUser(userId, {

            type: 'sync_warning',

            message: `Erro ao buscar pedido ${orderId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,

            errorCode: 'ORDER_FETCH_ERROR',

          });

          return null;

        }

      })

    );



    const shipments = await Promise.all(

      detailedOrders.map(async (order: any) => {

        if (!order) return null;

        const shippingId = order?.shipping?.id;

        if (!shippingId) return null;

        try {

          const res = await fetchWithRetry(`${MELI_API_BASE}/shipments/${shippingId}`, { headers }, 3, userId);

          if (!res.ok) {

            console.warn(`[Sync] Envio ${shippingId} retornou status ${res.status}, continuando sem dados de envio...`);

            return null;

          }

          const data = await res.json();

          return data;

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



  if (!window) {



    throw new Error("Sync window is required when no specific order IDs are provided.");



  }



  const now = window.to;



  const fetchFrom = window.from;



  const fetchMode = window.mode;



  const logisticStats = new Map<string, number>();

  const windowLabel =

    fetchMode === "initial"

      ? "janela inicial"

      : fetchMode === "historical"

        ? "historico"

        : fetchMode === "manual"

          ? "manual"

          : "ultimas 48h";



  try {



    sendProgressToUser(userId, {



      type: "sync_progress",



      message: `Conta ${account.nickname || account.ml_user_id}: preparando janelas (${windowLabel})...`,



      current: 0,



      total: 0,



      accountId: account.id,



      accountNickname: account.nickname,



      debugData: { mode: fetchMode },



    });



  } catch (sseError) {



    console.warn("[Sync] Erro ao enviar aviso de preparacao de janelas:", sseError);



  }







  const ranges = await buildSafeDateRanges(account, headers, fetchFrom, now, userId);



  if (ranges.length === 0) {

    console.log(

      `[Sync] Conta ${account.ml_user_id} nao retornou vendas no intervalo selecionado (${windowLabel}).`,

    );

    try {

      sendProgressToUser(userId, {

        type: "sync_warning",

        message: `Conta ${account.nickname || account.ml_user_id} nao possui vendas na janela ().`,

        accountId: account.id,

        accountNickname: account.nickname,

        debugData: { mode: fetchMode },

      });

    } catch (sseError) {

      console.warn("[Sync] Erro ao enviar aviso de ausencia de vendas:", sseError);

    }

    return { orders: results, expectedTotal: 0 };

  }



  let expectedTotal = ranges.reduce((sum, range) => sum + range.total, 0);

  let totalFetchedAcrossRanges = 0;



  try {

    sendProgressToUser(userId, {

      type: "sync_progress",

      message: `Conta ${account.nickname || account.ml_user_id}: ${ranges.length} janela(s) detectadas (${expectedTotal} vendas estimadas).`,

      current: 0,

      total: expectedTotal,

      accountId: account.id,

      accountNickname: account.nickname,

      debugData: { mode: fetchMode, ranges: ranges.length },

    });

  } catch (sseError) {

    console.warn("[Sync] Erro ao enviar resumo das janelas:", sseError);

  }



  console.log(

    `[Sync] Conta ${account.ml_user_id}: ${ranges.length} janela(s) para ${windowLabel}, total esperado inicial ${expectedTotal}.`,

  );



  for (const range of ranges) {

    const chunkOrders = await fetchOrdersInRange(

      account,

      headers,

      userId,

      range,

      logisticStats,

      {

        onPageFetched: ({ fetched, chunkOffset, chunkTotal, rangeLabel, page }) => {

          totalFetchedAcrossRanges += fetched;

          try {

            sendProgressToUser(userId, {

              type: 'sync_progress',

              message: `Conta ${account.nickname || account.ml_user_id}: ${totalFetchedAcrossRanges}/${expectedTotal || chunkTotal} vendas baixadas (${windowLabel} - ${rangeLabel})`,

              current: totalFetchedAcrossRanges,

              total: expectedTotal || chunkTotal,

              fetched: totalFetchedAcrossRanges,

              expected: expectedTotal || chunkTotal,

              accountId: account.id,

              accountNickname: account.nickname,

              page,

              offset: chunkOffset,

              debugData: {

                range: rangeLabel,

                chunkTotal,

              },

            });

          } catch (sseError) {

            console.warn('[Sync] Erro ao enviar progresso SSE (nao critico):', sseError);

          }

        },

        onRangeTotalAdjusted: (delta) => {

          if (!delta) return;

          expectedTotal += delta;

        },

        onRangeLimitReached: ({ total, rangeLabel }) => {

          const vendasRestantes = total - MAX_OFFSET;

          console.log(

            `[Sync] Aviso: limite de ${MAX_OFFSET} vendas atingido no intervalo ${rangeLabel}. ${vendasRestantes} vendas podem ter ficado de fora.`,

          );

          sendProgressToUser(userId, {

            type: 'sync_warning',

            message: `Limite de 10.000 vendas por intervalo atingido (${rangeLabel}). Sincronizadas ${MAX_OFFSET} de ${total} vendas disponiveis.`,

            errorCode: 'MAX_OFFSET_REACHED',

          });

        },

      },

    );



    results.push(...chunkOrders);

  }



  console.log(`[Sync] Conta ${account.ml_user_id} - tipos de logistica encontrados:`);

  const sortedStats = Array.from(logisticStats.entries()).sort((a, b) => b[1] - a[1]);

  sortedStats.forEach(([type, count]) => {

    console.log(`  ${type}: ${count} vendas`);

  });



  if (!logisticStats.has('cross_docking')) {

    console.log(

      `[Sync] Nenhuma venda com cross_docking (Coleta) foi encontrada na API do Mercado Livre para esta conta.`,

    );

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

// Função para salvar vendas em lotes - OTIMIZADA
async function saveVendasBatch(
  orders: MeliOrderPayload[],
  userId: string,
  batchSize: number = 50 // AUMENTADO de 10 para 50
): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;

  try {
    const skuCache = await buildSkuCache(orders, userId);

    // Processar em lotes maiores para ser mais rápido
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);

      // Processar lote com Promise.allSettled para garantir que erros não parem o processo
      const batchPromises = batch.map(async (order, batchIndex) => {
        try {
          const result = await saveVendaToDatabase(order, userId, skuCache);
          if (result) {
            saved++;
          } else {
            errors++;
          }

          return { success: result, orderId: (order.order as any)?.id || 'UNKNOWN' };
        } catch (error) {
          errors++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Sync] Erro ao salvar venda ${(order.order as any)?.id}:`, errorMsg);
          return { success: false, orderId: (order.order as any)?.id || 'UNKNOWN', error: errorMsg };
        }
      });

      await Promise.allSettled(batchPromises);

      // Enviar progresso SSE apenas a cada lote (não a cada venda) para reduzir overhead
      const currentProgress = Math.min(i + batchSize, orders.length);
      try {
        sendProgressToUser(userId, {
          type: "sync_progress",
          message: `Salvando no banco de dados: ${currentProgress} de ${orders.length} vendas`,
          current: currentProgress,
          total: orders.length,
          fetched: currentProgress,
          expected: orders.length
        });
      } catch (sseError) {
        // Ignorar erros de SSE - não são críticos
        console.warn(`[Sync] Erro ao enviar progresso SSE (não crítico):`, sseError);
      }

      // SEM DELAY - Processar o mais rápido possível
    }
  } catch (error) {
    console.error(`[Sync] Erro crítico em saveVendasBatch:`, error);
    // Retornar o que foi salvo até agora
    errors = orders.length - saved;
  }

  return { saved, errors };
}

async function saveVendaToDatabase(
  order: MeliOrderPayload,
  userId: string,
  skuCache: Map<string, SkuCacheEntry>
): Promise<boolean> {
  const orderId = (order.order as any)?.id || 'UNKNOWN';

  try {
    console.log(`[Sync] Salvando venda ${orderId} para userId: ${userId}`);

    const o: any = order.order ?? {};
    const freight = order.freight;

    // Validação básica dos dados essenciais
    if (!o || !o.id) {
      console.error(`[Sync] Venda sem ID válido, pulando...`);
      return false;
    }

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

    console.log(`[Sync] ✓ Venda ${o.id} salva/atualizada com sucesso`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Sync] ✗ Erro ao salvar venda ${orderId}:`, errorMsg);

    // Log detalhado do erro para debug
    if (error instanceof Error && error.stack) {
      console.error(`[Sync] Stack trace:`, error.stack);
    }

    // Tentar identificar o tipo de erro
    if (errorMsg.includes('Unique constraint')) {
      console.error(`[Sync] Erro de constraint único - pedido ${orderId} pode já existir`);
    } else if (errorMsg.includes('Foreign key constraint')) {
      console.error(`[Sync] Erro de chave estrangeira - dados relacionados podem estar ausentes`);
    } else if (errorMsg.includes('Data too long') || errorMsg.includes('String too long')) {
      console.error(`[Sync] Erro de tamanho de campo - algum campo excede o limite do banco`);
    } else if (errorMsg.includes('Invalid') || errorMsg.includes('invalid')) {
      console.error(`[Sync] Erro de validação - dados inválidos para o banco`);
    }

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
  // REMOVIDO: historyStart - não precisa mais de janelas de tempo complexas
  
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

    try {
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
        console.error(`[Sync] Erro ao renovar token da conta ${account.id}:`, error);

        // Atualizar step para erro
        steps[accountIndex].currentStep = 'error';
        steps[accountIndex].error = message;

        // Enviar erro via SSE
        sendProgressToUser(userId, {
          type: "sync_warning",
          message: `Erro ao renovar token da conta ${account.nickname || account.ml_user_id}: ${message}. Continuando com próxima conta...`,
          errorCode: "TOKEN_REFRESH_FAILED"
        });
        continue;
      }

      try {
        const specificOrderIds = requestBody.orderIdsByAccount?.[account.id];

        const existingVendasCount = await prisma.meliVenda.count({

          where: { meliAccountId: account.id },

        });

        const now = new Date();



        const processAndSave = async (

          fetchedOrders: MeliOrderPayload[],

          expectedTotal: number,

          label: string,

        ) => {

          const effectiveExpected = expectedTotal || fetchedOrders.length;

          totalExpectedOrders += effectiveExpected;

          totalFetchedOrders += fetchedOrders.length;



          steps[accountIndex].expected += effectiveExpected;

          steps[accountIndex].fetched += fetchedOrders.length;

          steps[accountIndex].progress = fetchedOrders.length > 0 ? 50 : steps[accountIndex].progress;



          console.log(

            `[Sync] Conta ${account.nickname}: ${fetchedOrders.length} venda(s) encontradas na janela ${label}`,

          );



          if (fetchedOrders.length === 0) {

            return;

          }



          steps[accountIndex].currentStep = 'saving';

          sendProgressToUser(userId, {

            type: "sync_progress",

            message: `Salvando ${fetchedOrders.length} venda(s) (${label}) da conta ${account.nickname || account.ml_user_id}...`,

            current: accountIndex,

            total: accounts.length,

            fetched: totalFetchedOrders,

            expected: totalExpectedOrders,

            accountId: account.id,

            accountNickname: account.nickname || `Conta ${account.ml_user_id}`,

            steps,

          });



          try {

            const batchResult = await saveVendasBatch(fetchedOrders, session.sub, 10);

            totalSavedOrders += batchResult.saved;



            console.log(

              `[Sync] Conta ${account.nickname}: ${batchResult.saved} vendas salvas (${label}), ${batchResult.errors} erros`,

            );



            if (batchResult.errors > 0) {

              console.warn(`[Sync] ${batchResult.errors} vendas falharam ao salvar para conta ${current.id}`);

              sendProgressToUser(userId, {

                type: "sync_warning",

                message: `${batchResult.errors} vendas da conta ${account.nickname || account.ml_user_id} nao puderam ser salvas (${label})`,

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

              message: `Erro ao salvar vendas da conta ${account.nickname || account.ml_user_id}: ${saveErrorMsg}`,

              errorCode: "SAVE_BATCH_ERROR",

            });

          }

        };



        steps[accountIndex].expected = 0;

        steps[accountIndex].fetched = 0;



        // NOVA LÓGICA SIMPLES: Buscar TODAS as vendas sem janelas complexas
        const headers = { Authorization: `Bearer ${current.access_token}` };

        console.log(`[Sync] 🚀 Buscando TODAS as vendas da conta ${current.ml_user_id} (${current.nickname})`);
        console.log(`[Sync] Debug - accountIndex: ${accountIndex}, userId: ${userId}`);

        let allOrders: MeliOrderPayload[] = [];
        let expectedTotal = 0;

        try {
          const result = await fetchAllOrdersForAccount(
            current,
            headers,
            userId,
          );
          allOrders = result.orders;
          expectedTotal = result.expectedTotal;

          console.log(`[Sync] ✅ Conta ${current.ml_user_id}: ${allOrders.length} vendas baixadas de ${expectedTotal} totais`);
          console.log(`[Sync] Debug - allOrders.length: ${allOrders.length}, expectedTotal: ${expectedTotal}`);
        } catch (fetchError) {
          const fetchMsg = fetchError instanceof Error ? fetchError.message : 'Erro ao buscar vendas';
          console.error(`[Sync] ❌ Erro ao buscar vendas da conta ${current.ml_user_id}:`, fetchError);
          throw new Error(`Falha ao buscar vendas: ${fetchMsg}`);
        }

        console.log(`[Sync] 📥 Iniciando salvamento de ${allOrders.length} vendas no banco...`);

        // Enviar evento SSE informando que vai começar a salvar
        sendProgressToUser(userId, {
          type: "sync_progress",
          message: `Preparando para salvar ${allOrders.length} vendas no banco de dados...`,
          current: 0,
          total: allOrders.length,
          fetched: 0,
          expected: allOrders.length,
          accountId: current.id,
          accountNickname: current.nickname || `Conta ${current.ml_user_id}`
        });

        try {
          await processAndSave(allOrders, expectedTotal, 'completo');
          console.log(`[Sync] ✅ Salvamento concluído para conta ${current.ml_user_id}`);

          // Enviar evento SSE confirmando conclusão do salvamento
          sendProgressToUser(userId, {
            type: "sync_progress",
            message: `✅ Salvamento concluído para ${current.nickname || current.ml_user_id}`,
            current: allOrders.length,
            total: allOrders.length,
            fetched: allOrders.length,
            expected: allOrders.length,
            accountId: current.id,
            accountNickname: current.nickname || `Conta ${current.ml_user_id}`
          });
        } catch (saveError) {
          const saveMsg = saveError instanceof Error ? saveError.message : 'Erro ao salvar vendas';
          console.error(`[Sync] ❌ Erro ao salvar vendas da conta ${current.ml_user_id}:`, saveError);
          throw new Error(`Falha ao salvar vendas: ${saveMsg}`);
        }

      } catch (error) {
        steps[accountIndex].currentStep = 'error';
        steps[accountIndex].error = error instanceof Error ? error.message : 'Erro desconhecido';
        const message = error instanceof Error ? error.message : "Erro desconhecido ao processar pedidos.";
        errors.push({ accountId: current.id, mlUserId: current.ml_user_id, message });
        console.error(`[Sync] Erro ao processar conta ${current.id}:`, error);

        // Enviar erro via SSE
        sendProgressToUser(userId, {
          type: "sync_warning",
          message: `Erro na conta ${current.nickname || current.ml_user_id}: ${message}. Continuando com próxima conta...`,
          errorCode: "ACCOUNT_PROCESSING_ERROR"
        });

        // Atualizar progresso mesmo com erro
        sendProgressToUser(userId, {
          type: "sync_progress",
          message: `Conta ${current.nickname || current.ml_user_id} com erro`,
          current: accountIndex + 1,
          total: accounts.length,
          fetched: totalFetchedOrders,
          expected: totalExpectedOrders,
          accountId: current.id,
          accountNickname: current.nickname || `Conta ${current.ml_user_id}`,
          steps: steps
        });
      }
    } catch (error) {
      // Erro catastrófico na conta - continuar com próxima
      const errorMsg = error instanceof Error ? error.message : 'Erro crítico desconhecido';
      console.error(`[Sync] Erro catastrófico ao processar conta ${account.id}:`, error);

      steps[accountIndex].currentStep = 'error';
      steps[accountIndex].error = errorMsg;
      errors.push({ accountId: account.id, mlUserId: account.ml_user_id, message: errorMsg });

      sendProgressToUser(userId, {
        type: "sync_warning",
        message: `Erro crítico na conta ${account.nickname || account.ml_user_id}: ${errorMsg}. Continuando com próxima conta...`,
        errorCode: "CRITICAL_ERROR"
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
    orders: [] as MeliOrderPayload[],
    errors,
    totals: { 
      expected: totalExpectedOrders, 
      fetched: totalFetchedOrders,
      saved: totalSavedOrders
    },
  });
}








