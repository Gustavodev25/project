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
const MAX_OFFSET = 10000; // Limite máximo da API do Mercado Livre

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

async function fetchOrdersForAccount(
  account: MeliAccount,
  userId: string,
): Promise<OrdersFetchResult> {
  const results: MeliOrderPayload[] = [];
  const headers = { Authorization: `Bearer ${account.access_token}` };

  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let expectedTotal = 0;

  while (offset < total && offset < MAX_OFFSET) {
    const limit = PAGE_LIMIT;
    // Usar endpoint /orders/search com filtro de data desde janeiro de 2024
    const url = new URL(`${MELI_API_BASE}/orders/search`);
    url.searchParams.set("seller", account.ml_user_id.toString());
    url.searchParams.set("sort", "date_desc");
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());
    // Filtrar vendas desde janeiro de 2024 até hoje
    url.searchParams.set("order.date_created.from", "2024-01-01T00:00:00.000Z");
    url.searchParams.set("order.date_created.to", new Date().toISOString());

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

    const [detailedOrders, shipments] = await Promise.all([
      Promise.all(
        orders.map(async (order: any) => {
          const id = order?.id;
          if (!id) return order;
          try {
            const res = await fetch(`${MELI_API_BASE}/orders/${id}`, { headers });
            if (!res.ok) {
              // Enviar aviso de erro HTTP via SSE
              sendProgressToUser(userId, {
                type: "sync_warning",
                message: `Erro ${res.status} ao buscar detalhes do pedido ${id}`,
                errorCode: res.status.toString()
              });
              return order;
            }
            const det = await res.json();
            return { ...order, ...det };
          } catch {
            return order;
          }
        }),
      ),
      Promise.all(
        orders.map(async (order: any) => {
          const shippingId = order?.shipping?.id;
          if (!shippingId) return null;
          try {
            const res = await fetch(`${MELI_API_BASE}/shipments/${shippingId}`, { headers });
            if (!res.ok) {
              // Enviar aviso de erro HTTP via SSE
              sendProgressToUser(userId, {
                type: "sync_warning",
                message: `Erro ${res.status} ao buscar detalhes do envio ${shippingId}`,
                errorCode: res.status.toString()
              });
              return null;
            }
            return await res.json();
          } catch {
            return null;
          }
        }),
      ),
    ]);

    detailedOrders.forEach((order: any, idx: number) => {
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

    const fetched = orders.length;
    offset += fetched;
    
    // Debug: log para verificar paginação
    console.log(`[meli][vendas] Conta ${account.ml_user_id}: página ${Math.floor(offset/limit) + 1}, offset: ${offset}, total: ${total}, fetched: ${fetched} (período: 2024-01-01 até hoje)`);
    
    // Debug: verificar se as vendas estão sendo processadas
    if (fetched > 0) {
      console.log(`[DEBUG] Processando ${fetched} pedidos da conta ${account.ml_user_id} desde janeiro de 2024`);
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
    console.log(`[meli][vendas] AVISO: Limite de ${MAX_OFFSET} vendas atingido. ${vendasRestantes} vendas não foram sincronizadas.`);
    
    sendProgressToUser(userId, {
      type: "sync_warning",
      message: `Limite da API atingido: sincronizadas ${MAX_OFFSET} das ${total} vendas. Para sincronizar todas, use filtros de data mais específicos.`,
      errorCode: "MAX_OFFSET_REACHED"
    });
  }

  return { orders: results, expectedTotal };
}

// Função para salvar vendas em lotes
async function saveVendasBatch(
  orders: MeliOrderPayload[],
  userId: string,
  batchSize: number = 10
): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;
  
  // Processar em lotes
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize);
    
    // Enviar progresso do lote atual
    sendProgressToUser(userId, {
      type: "sync_progress",
      message: `Salvando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(orders.length / batchSize)} (${batch.length} vendas)`,
      current: i + batch.length,
      total: orders.length,
      fetched: saved,
      expected: orders.length
    });
    
    // Processar lote
    const batchPromises = batch.map(async (order) => {
      try {
        await saveVendaToDatabase(order, userId);
        saved++;
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
  userId: string
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

    const saleFee = orderItems.reduce((acc, item) => acc + (toFiniteNumber(item?.sale_fee) ?? 0), 0);

    const unitario = toFiniteNumber(orderItem?.unit_price) ??
      (quantity > 0 && totalAmount !== null ? roundCurrency(totalAmount / quantity) : 0);

    // Taxa da plataforma: convertemos para NEGATIVO (é um custo)
    const taxaPlataforma = saleFee > 0 ? -roundCurrency(saleFee) : null;
    const frete = freight.adjustedCost ?? freight.finalCost ?? freight.orderCostFallback ?? 0;

    // Buscar o SKU para obter o custo unitário e calcular o CMV
    const skuVenda = itemData?.seller_sku || itemData?.sku || null;
    let cmv: number | null = null;
    
    if (skuVenda) {
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
        
        if (skuData) {
          // CMV = custo unitário * quantidade
          cmv = roundCurrency(Number(skuData.custoUnitario) * quantity);
        }
      } catch (error) {
        console.error(`[DEBUG] Erro ao buscar SKU ${skuVenda}:`, error);
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
          // freteBaseCost: freight.baseCost ? new Decimal(freight.baseCost) : null,
          // freteListCost: freight.listCost ? new Decimal(freight.listCost) : null,
          // freteFinalCost: freight.finalCost ? new Decimal(freight.finalCost) : null,
          // freteAdjustment: freight.adjustedCost ? new Decimal(freight.adjustedCost) : null,
          // freteCalculation: freight,
          cmv: cmv !== null ? new Decimal(cmv) : null,
          margemContribuicao: new Decimal(margemContribuicao),
          isMargemReal,
          titulo: truncateString(firstItemTitle, 500) || "Produto sem título",
          sku: truncateString(itemData?.seller_sku || itemData?.sku, 255) || null,
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
              titulo: truncateString(firstItemTitle, 500) || "Produto sem t��tulo",
              sku: truncateString(itemData?.seller_sku || itemData?.sku, 255) || null,
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
          if (listingTypeId === "gold_pro") return "Premium";
          if (listingTypeId === "gold_special") return "Clássico";
          return null;
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
          // freteBaseCost: freight.baseCost ? new Decimal(freight.baseCost) : null,
          // freteListCost: freight.listCost ? new Decimal(freight.listCost) : null,
          // freteFinalCost: freight.finalCost ? new Decimal(freight.finalCost) : null,
          // freteAdjustment: freight.adjustedCost ? new Decimal(freight.adjustedCost) : null,
          // freteCalculation: freight,
          cmv: cmv !== null ? new Decimal(cmv) : null,
          margemContribuicao: new Decimal(margemContribuicao),
          isMargemReal,
          titulo: truncateString(firstItemTitle, 500) || "Produto sem título",
          sku: truncateString(itemData?.seller_sku || itemData?.sku, 255) || null,
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
              titulo: truncateString(firstItemTitle, 500) || "Produto sem t��tulo",
              sku: truncateString(itemData?.seller_sku || itemData?.sku, 255) || null,
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

  console.log(`[Sync] Iniciando sincronização para usuário ${userId}`);

  // Dar um delay para garantir que o SSE está conectado
  await new Promise(resolve => setTimeout(resolve, 500));

  // Enviar evento de início da sincronização
  sendProgressToUser(userId, {
    type: "sync_start",
    message: "Iniciando sincronização de vendas do MercadoLivre...",
    current: 0,
    total: 0,
    fetched: 0,
    expected: 0
  });

  const accounts = await prisma.meliAccount.findMany({
    where: { userId: session.sub },
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

  for (let accountIndex = 0; accountIndex < accounts.length; accountIndex++) {
    const account = accounts[accountIndex];
    const summary: AccountSummary = {
      id: account.id,
      nickname: account.nickname,
      ml_user_id: account.ml_user_id,
      expires_at: account.expires_at.toISOString(),
    };
    summaries.push(summary);

    // Enviar progresso: processando conta
    sendProgressToUser(userId, {
      type: "sync_progress",
      message: `Processando conta ${accountIndex + 1}/${accounts.length}: ${account.nickname || account.ml_user_id}`,
      current: accountIndex,
      total: accounts.length,
      fetched: totalFetchedOrders,
      expected: totalExpectedOrders,
      accountId: account.id,
      accountNickname: account.nickname || `Conta ${account.ml_user_id}`
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
      const { orders: accountOrders, expectedTotal } = await fetchOrdersForAccount(current, userId);
      const accountExpected = expectedTotal || accountOrders.length;
      totalExpectedOrders += accountExpected;
      totalFetchedOrders += accountOrders.length;
      orders.push(...accountOrders);

      console.log(`[Sync] Conta ${account.nickname}: ${accountOrders.length} vendas encontradas`);

      // Salvar vendas no banco de dados em lotes
      if (accountOrders.length > 0) {
        const batchResult = await saveVendasBatch(accountOrders, session.sub, 10);
        totalSavedOrders += batchResult.saved;
        
        console.log(`[Sync] Conta ${account.nickname}: ${batchResult.saved} vendas salvas`);
        
        if (batchResult.errors > 0) {
          console.warn(`[meli][vendas] ${batchResult.errors} vendas falharam ao salvar para conta ${current.id}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao buscar pedidos.";
      errors.push({ accountId: current.id, mlUserId: current.ml_user_id, message });
      console.error(`[meli][vendas] Erro ao buscar pedidos da conta ${current.id}:`, error);
      
      // Enviar erro via SSE
      sendProgressToUser(userId, {
        type: "sync_error",
        message: `Erro ao buscar vendas da conta ${current.nickname || current.ml_user_id}: ${message}`,
        errorCode: "FETCH_ORDERS_FAILED"
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
