import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";
import {
  getShopeeOrderList,
  getShopeeOrderDetail,
  getShopeeEscrowDetail
} from "@/lib/shopee";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 minutos de tempo de execução máximo

// Tipos auxiliares
type SyncError = { accountId: string; shopId: string; message: string; };
type AccountSummary = { id: string; shop_id: string; };
type ShopeeOrderPayload = { accountId: string; shopId: string; order: any; };

// Funções utilitárias
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function roundCurrency(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function truncateString(str: string | null | undefined, maxLength: number): string {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

function epochSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

async function fetchAndEnrichShopeeOrders(
  account: { id: string; shop_id: string; access_token: string },
  from: Date,
  to: Date,
) {
  const partnerId = process.env.SHOPEE_PARTNER_ID!;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY!;

  const orderSnList: string[] = [];
  let cursor: string | undefined = undefined;
  do {
    const listResult = await getShopeeOrderList({
      partnerId,
      partnerKey,
      accessToken: account.access_token,
      shopId: account.shop_id,
      createTimeFrom: epochSeconds(from),
      createTimeTo: epochSeconds(to),
      pageSize: 100,
      cursor,
    });
    listResult.order_list.forEach(order => orderSnList.push(order.order_sn));
    cursor = listResult.more ? listResult.next_cursor : undefined;
  } while (cursor);

  if (orderSnList.length === 0) {
    return [];
  }

  const detailedOrders: any[] = [];
  for (let i = 0; i < orderSnList.length; i += 50) {
    const batchSnList = orderSnList.slice(i, i + 50);
    const detailsResult = await getShopeeOrderDetail({
      partnerId,
      partnerKey,
      accessToken: account.access_token,
      shopId: account.shop_id,
      orderSnList: batchSnList.join(','),
    });
    detailedOrders.push(...detailsResult.order_list);
  }

  const enrichedOrders: any[] = [];
  const BATCH_SIZE = 25;

  for (let i = 0; i < detailedOrders.length; i += BATCH_SIZE) {
    const batch = detailedOrders.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (order) => {
      try {
        const escrowResult = await getShopeeEscrowDetail({
          partnerId,
          partnerKey,
          accessToken: account.access_token,
          shopId: account.shop_id,
          orderSn: order.order_sn,
        });
        order.escrow_details = escrowResult.escrow_detail;
        return order;
      } catch (err) {
        console.warn(`[Shopee Sync] Falha ao buscar escrow para ${order.order_sn}:`, err);
        order.escrow_details = {};
        return order;
      }
    });

    const results = await Promise.allSettled(promises);
    results.forEach(res => {
      if (res.status === 'fulfilled') {
        enrichedOrders.push(res.value);
      }
    });

    if (i + BATCH_SIZE < detailedOrders.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return enrichedOrders;
}

async function fetchAllShopeeOrdersSince(account: { id: string; shop_id: string; access_token: string }, since: Date) {
  const allOrders: any[] = [];
  const now = new Date();
  const MAX_WINDOW_DAYS = 15;

  let windowStart = since;

  while (windowStart < now) {
    const windowEnd = new Date(Math.min(
      windowStart.getTime() + MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      now.getTime()
    ));

    console.log(`[Shopee Sync] Buscando janela: ${windowStart.toISOString()} -> ${windowEnd.toISOString()}`);

    try {
      const windowOrders = await fetchAndEnrichShopeeOrders(account, windowStart, windowEnd);
      allOrders.push(...windowOrders);
      console.log(`[Shopee Sync] ${windowOrders.length} pedidos encontrados na janela.`);
    } catch (error) {
      console.error(`[Shopee Sync] Erro ao buscar janela para conta ${account.shop_id}:`, error);
    }

    windowStart = new Date(windowEnd.getTime() + 1);
  }

  return allOrders;
}


export async function POST(req: NextRequest) {
  const session = assertSessionToken(req.cookies.get("session")?.value);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const contasAtivas = await prisma.shopeeAccount.findMany({
      where: { userId: session.sub, expires_at: { gt: new Date() } },
    });

    if (contasAtivas.length === 0) {
      return NextResponse.json({ message: "Nenhuma conta Shopee ativa encontrada." }, { status: 404 });
    }

    const summaries: AccountSummary[] = contasAtivas.map((c) => ({ id: c.id, shop_id: c.shop_id }));
    const allOrdersPayload: ShopeeOrderPayload[] = [];
    const errors: SyncError[] = [];
    let totalSaved = 0;

    for (const conta of contasAtivas) {
      try {
        const ultimaVenda = await prisma.shopeeVenda.findFirst({
          where: { shopeeAccountId: conta.id },
          orderBy: { dataVenda: "desc" },
          select: { dataVenda: true },
        });

        const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        const since = ultimaVenda ? new Date(ultimaVenda.dataVenda.getTime() - 24 * 60 * 60 * 1000) : sixMonthsAgo;

        console.log(`[Shopee Sync] Conta ${conta.shop_id}: buscando desde ${since.toISOString()}`);

        const ordersFromAccount = await fetchAllShopeeOrdersSince(
          { id: conta.id, shop_id: conta.shop_id, access_token: conta.access_token },
          since
        );

        console.log(`[Shopee Sync] Conta ${conta.shop_id}: ${ordersFromAccount.length} vendas encontradas. Salvando...`);

        for (const order of ordersFromAccount) {
          allOrdersPayload.push({ accountId: conta.id, shopId: conta.shop_id, order });

          // Mapeamento e persistência no banco de dados
          const orderSn: string = String(order.order_sn);
          const dataVenda = new Date((toFiniteNumber(order.create_time) ?? 0) * 1000);
          const status: string = String(order.order_status ?? "DESCONHECIDO");
          const itemList: any[] = Array.isArray(order.item_list) ? order.item_list : [];
          const quantidade = itemList.reduce((acc, it) => acc + (toFiniteNumber(it?.model_quantity_purchased) ?? 0), 0);
          const totalAmount = toFiniteNumber(order.total_amount) ?? 0;
          
          const unitario = quantidade > 0
            ? roundCurrency(totalAmount / quantidade)
            : (toFiniteNumber(itemList?.[0]?.model_original_price) ?? 0);

          const incomeDetails = order.escrow_details?.order_income || {};
          const commissionFee = toFiniteNumber(incomeDetails.commission_fee) ?? 0;
          const serviceFee = toFiniteNumber(incomeDetails.service_fee) ?? 0;
          const taxaPlataforma = roundCurrency(commissionFee + serviceFee);
          
          // Dados específicos do frete da Shopee
          const actualShippingFee = toFiniteNumber(incomeDetails.actual_shipping_fee) ?? 0;
          const reverseShippingFee = toFiniteNumber(incomeDetails.reverse_shipping_fee) ?? 0;
          let shopeeShippingRebate = toFiniteNumber(incomeDetails.shopee_shipping_rebate) ?? 0;
          const buyerPaidShippingFee = toFiniteNumber(incomeDetails.buyer_paid_shipping_fee) ?? 0;
          const shippingFeeDiscountFrom3pl = toFiniteNumber(incomeDetails.shipping_fee_discount_from_3pl) ?? 0;
          
          // Lógica de subsídio automático
          // Se existe actual_shipping_fee mas NÃO existe shopee_shipping_rebate
          // E o custo implícito do frete é praticamente zero (< 0.01)
          // Então o sistema assume que o frete foi subsidiado
          if (actualShippingFee > 0 && shopeeShippingRebate === 0) {
            const custoImplicitoFrete = actualShippingFee - buyerPaidShippingFee;
            if (custoImplicitoFrete < 0.01) {
              // Criar automaticamente o shopee_shipping_rebate
              shopeeShippingRebate = actualShippingFee - buyerPaidShippingFee;
            }
          }
          
          // Cálculo do Frete Líquido
          // custoLiquidoFrete = (actual_shipping_fee + reverse_shipping_fee) - (shopee_shipping_rebate + buyer_paid_shipping_fee)
          const custoLiquidoFrete = (actualShippingFee + reverseShippingFee) - (shopeeShippingRebate + buyerPaidShippingFee);
          
          // Usar o custo líquido do frete como valor principal
          const frete = roundCurrency(custoLiquidoFrete);
          
          const margem = roundCurrency(totalAmount - taxaPlataforma - frete);

          const titulo = truncateString(itemList?.[0]?.item_name, 500) || "Pedido";
          const skuRaw = truncateString(itemList?.[0]?.item_sku ?? itemList?.[0]?.model_sku, 255);
          
          // Verificar se o SKU existe no banco de dados para este usuário
          let sku = null;
          if (skuRaw) {
            const skuExists = await prisma.sKU.findFirst({
              where: { 
                sku: skuRaw,
                userId: session.sub
              }
            });
            sku = skuExists ? skuRaw : null;
          }
          
          const comprador = truncateString(order.buyer_username, 255) || "Comprador";
          const trackingNumber = truncateString(order.package_list?.[0]?.tracking_number, 255) || null;
          
          // Campos específicos do frete da Shopee
          const packageInfo = order.package_list?.[0] || {};
          const parcelWeight = toFiniteNumber(packageInfo.parcel_chargeable_weight_gram) || 0;
          const shippingCarrier = truncateString(packageInfo.shipping_carrier || order.shipping_carrier, 100) || null;
          const logisticsStatus = truncateString(packageInfo.logistics_status, 100) || null;

          const dataToSave = {
            dataVenda,
            status,
            conta: conta.shop_id,
            valorTotal: new Decimal(totalAmount),
            quantidade: quantidade || 1,
            unitario: new Decimal(unitario),
            taxaPlataforma: new Decimal(taxaPlataforma),
            frete: new Decimal(frete), // Custo líquido do frete (considerando subsídios)
            margemContribuicao: new Decimal(margem),
            isMargemReal: false,
            titulo,
            sku,
            comprador,
            shippingId: trackingNumber,
            shippingStatus: shippingCarrier, // Usando o valor extraído do package_list
            plataforma: "Shopee",
            canal: "SP",
            rawData: order,
            paymentDetails: order.escrow_details || {},
            shipmentDetails: {
              // Dados do package_list
              parcel_chargeable_weight_gram: parcelWeight,
              shipping_carrier: shippingCarrier,
              logistics_status: logisticsStatus,
              
              // Dados específicos do frete da Shopee
              actual_shipping_fee: actualShippingFee,
              reverse_shipping_fee: reverseShippingFee,
              shopee_shipping_rebate: shopeeShippingRebate,
              buyer_paid_shipping_fee: buyerPaidShippingFee,
              shipping_fee_discount_from_3pl: shippingFeeDiscountFrom3pl,
              
              // Cálculo do frete líquido
              custo_liquido_frete: custoLiquidoFrete,
              custo_implicito_frete: actualShippingFee - buyerPaidShippingFee,
              subsidio_automatico_aplicado: shopeeShippingRebate > 0 && incomeDetails.shopee_shipping_rebate === 0,
              
              // Dados originais completos
              ...order.package_list
            },
            atualizadoEm: new Date(),
          };

          const existing = await prisma.shopeeVenda.findUnique({ where: { orderId: orderSn } });
          if (existing) {
            await prisma.shopeeVenda.update({ where: { orderId: orderSn }, data: dataToSave });
          } else {
            await prisma.shopeeVenda.create({
              data: {
                ...dataToSave,
                orderId: orderSn,
                userId: session.sub,
                shopeeAccountId: conta.id,
              }
            });
          }
          totalSaved++;
        }

      } catch (error) {
        console.error(`[shopee][sync] Erro na conta ${conta.id}:`, error);
        errors.push({ accountId: conta.id, shopId: conta.shop_id, message: error instanceof Error ? error.message : "Erro desconhecido" });
      }
    }

    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      accounts: summaries,
      orders: allOrdersPayload.length,
      saved: totalSaved,
      errors,
    });

  } catch (error) {
    console.error("Erro fatal ao sincronizar vendas Shopee:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
