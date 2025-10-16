import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";
import { Decimal } from "@prisma/client/runtime/library";
import {
  getShopeeOrderList,
  getShopeeOrderDetail,
  getShopeeEscrowDetail,
  refreshShopeeAccountToken
} from "@/lib/shopee";
import { sendProgressToUser, closeUserConnections } from "@/lib/sse-progress";
import { invalidateVendasCache } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutos de tempo de execução máximo (limite do plano hobby)

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

// Função auxiliar para executar operações com retry automático de token
async function executeWithTokenRetry<T>(
  accountRef: { id: string; shop_id: string; access_token: string; refresh_token: string; expires_at: Date },
  operation: (accessToken: string) => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation(accountRef.access_token);
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Verificar se o erro é de token inválido
      if (errorMessage.includes('invalid_access_token') || errorMessage.includes('invalid_acceess_token')) {
        if (attempt < maxRetries) {
          console.log(`[Shopee Sync] Token inválido detectado. Tentando renovar (tentativa ${attempt + 1}/${maxRetries})...`);
          
          try {
            // Forçar renovação do token
            const refreshed = await refreshShopeeAccountToken(accountRef, true);
            accountRef.access_token = refreshed.access_token;
            accountRef.refresh_token = refreshed.refresh_token;
            accountRef.expires_at = refreshed.expires_at;
            
            console.log(`[Shopee Sync] Token renovado com sucesso. Tentando operação novamente...`);
            // Continuar para próxima tentativa com o novo token
          } catch (refreshError) {
            console.error(`[Shopee Sync] Falha ao renovar token:`, refreshError);
            throw new Error(`Falha ao renovar token: ${refreshError instanceof Error ? refreshError.message : 'Erro desconhecido'}`);
          }
        } else {
          throw new Error(`Token inválido após ${maxRetries} tentativas de renovação`);
        }
      } else {
        // Outros erros não relacionados a token, lançar imediatamente
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Operação falhou após tentativas');
}

async function fetchAndEnrichShopeeOrders(
  account: { id: string; shop_id: string; access_token: string; refresh_token: string; expires_at: Date },
  from: Date,
  to: Date,
) {
  const partnerId = process.env.SHOPEE_PARTNER_ID!;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY!;

  const orderSnList: string[] = [];
  let cursor: string | undefined = undefined;
  do {
    const listResult = await executeWithTokenRetry(account, async (accessToken) => {
      return await getShopeeOrderList({
        partnerId,
        partnerKey,
        accessToken,
        shopId: account.shop_id,
        createTimeFrom: epochSeconds(from),
        createTimeTo: epochSeconds(to),
        pageSize: 100,
        cursor,
      });
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
    const detailsResult = await executeWithTokenRetry(account, async (accessToken) => {
      return await getShopeeOrderDetail({
        partnerId,
        partnerKey,
        accessToken,
        shopId: account.shop_id,
        orderSnList: batchSnList.join(','),
      });
    });
    detailedOrders.push(...detailsResult.order_list);
  }

  const enrichedOrders: any[] = [];
  const BATCH_SIZE = 50; // Aumentado de 25 para 50 para melhor performance

  for (let i = 0; i < detailedOrders.length; i += BATCH_SIZE) {
    const batch = detailedOrders.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (order) => {
      try {
        const escrowResult = await executeWithTokenRetry(account, async (accessToken) => {
          return await getShopeeEscrowDetail({
            partnerId,
            partnerKey,
            accessToken,
            shopId: account.shop_id,
            orderSn: order.order_sn,
          });
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
    // Delay removido para aumentar velocidade
  }

  return enrichedOrders;
}

async function fetchAllShopeeOrdersSince(account: { id: string; shop_id: string; access_token: string; refresh_token: string; expires_at: Date }, since: Date) {
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
  const session = await assertSessionToken(req.cookies.get("session")?.value);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const userId = session.sub;

  // Ler body para verificar se há contas específicas para sincronizar
  let accountIds: string[] | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    accountIds = body.accountIds;
  } catch {
    // Se falhar ao parsear o body, continuar sem filtro de contas
  }

  try {
    console.log(`[Shopee Sync] Iniciando sincronização para usuário ${userId}`);
    if (accountIds && accountIds.length > 0) {
      console.log(`[Shopee Sync] Sincronizando apenas contas específicas: ${accountIds.join(", ")}`);
    }

    // Dar um delay para garantir que o SSE está conectado
    await new Promise(resolve => setTimeout(resolve, 500));

    // Enviar evento de início da sincronização
    sendProgressToUser(userId, {
      type: "sync_start",
      message: accountIds && accountIds.length > 0 
        ? `Iniciando sincronização de ${accountIds.length} conta(s) do Shopee...`
        : "Iniciando sincronização de vendas do Shopee...",
      current: 0,
      total: 0,
      fetched: 0,
      expected: 0
    });

    // Filtrar por contas específicas se fornecido
    const whereClause: any = { userId: session.sub, expires_at: { gt: new Date() } };
    if (accountIds && accountIds.length > 0) {
      whereClause.id = { in: accountIds };
    }

    const contasAtivas = await prisma.shopeeAccount.findMany({
      where: whereClause,
    });

    console.log(`[Shopee Sync] Encontradas ${contasAtivas.length} conta(s) do Shopee`);

    if (contasAtivas.length === 0) {
      sendProgressToUser(userId, {
        type: "sync_complete",
        message: "Nenhuma conta do Shopee encontrada",
        current: 0,
        total: 0,
        fetched: 0,
        expected: 0
      });
      return NextResponse.json({ message: "Nenhuma conta Shopee ativa encontrada." }, { status: 404 });
    }

    // Verificar e renovar tokens preventivamente antes de iniciar a sincronização
    console.log(`[Shopee Sync] Verificando validade dos tokens...`);
    sendProgressToUser(userId, {
      type: "sync_progress",
      message: "Verificando tokens de acesso...",
      current: 0,
      total: 0,
      fetched: 0,
      expected: 0
    });

    const contasAtualizadas = [];
    for (let i = 0; i < contasAtivas.length; i++) {
      const conta = contasAtivas[i];
      try {
        // Tentar renovar o token (só renovará se estiver expirado ou próximo da expiração)
        const refreshedAccount = await refreshShopeeAccountToken(conta, false);
        contasAtualizadas.push({
          ...conta,
          access_token: refreshedAccount.access_token,
          refresh_token: refreshedAccount.refresh_token,
          expires_at: refreshedAccount.expires_at,
        });
        console.log(`[Shopee Sync] Token da conta ${conta.shop_id} verificado/renovado com sucesso`);
      } catch (error) {
        console.error(`[Shopee Sync] Falha ao renovar token da conta ${conta.shop_id}:`, error);
        sendProgressToUser(userId, {
          type: "sync_error",
          message: `Falha ao renovar token da conta ${conta.shop_id}. Reconecte a conta.`,
          errorCode: "TOKEN_REFRESH_FAILED"
        });
        // Não incluir essa conta na sincronização
      }
    }

    if (contasAtualizadas.length === 0) {
      sendProgressToUser(userId, {
        type: "sync_error",
        message: "Nenhuma conta com token válido. Reconecte suas contas.",
        errorCode: "NO_VALID_ACCOUNTS"
      });
      return NextResponse.json({ 
        message: "Nenhuma conta Shopee com token válido encontrada. Reconecte suas contas." 
      }, { status: 400 });
    }

    const summaries: AccountSummary[] = contasAtualizadas.map((c) => ({ id: c.id, shop_id: c.shop_id }));
    const allOrdersPayload: ShopeeOrderPayload[] = [];
    const errors: SyncError[] = [];
    let totalSaved = 0;

    for (let accountIndex = 0; accountIndex < contasAtualizadas.length; accountIndex++) {
      const conta = contasAtualizadas[accountIndex];
      
      // Enviar progresso: processando conta
      sendProgressToUser(userId, {
        type: "sync_progress",
        message: `Processando conta ${accountIndex + 1}/${contasAtualizadas.length}: Loja ${conta.shop_id}`,
        current: accountIndex,
        total: contasAtualizadas.length,
        fetched: totalSaved,
        expected: allOrdersPayload.length,
        accountId: conta.id,
        accountNickname: `Loja ${conta.shop_id}`
      });

      try {
        // Buscar vendas existentes para filtrar duplicatas
        const existingOrderIds = await prisma.shopeeVenda.findMany({
          where: { shopeeAccountId: conta.id },
          select: { orderId: true }
        });
        const existingIds = new Set(existingOrderIds.map(v => v.orderId));
        console.log(`[Shopee Sync] Conta ${conta.shop_id}: ${existingIds.size} vendas já existem no banco`);

        const ultimaVenda = await prisma.shopeeVenda.findFirst({
          where: { shopeeAccountId: conta.id },
          orderBy: { dataVenda: "desc" },
          select: { dataVenda: true },
        });

        const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        const since = ultimaVenda ? new Date(ultimaVenda.dataVenda.getTime() - 24 * 60 * 60 * 1000) : sixMonthsAgo;

        console.log(`[Shopee Sync] Conta ${conta.shop_id}: buscando desde ${since.toISOString()}`);

        const ordersFromAccount = await fetchAllShopeeOrdersSince(
          { 
            id: conta.id, 
            shop_id: conta.shop_id, 
            access_token: conta.access_token,
            refresh_token: conta.refresh_token,
            expires_at: conta.expires_at
          },
          since
        );

        // Filtrar vendas que já existem no banco
        const newOrders = ordersFromAccount.filter((order: any) => {
          const orderId = String(order.order_sn || "");
          return !existingIds.has(orderId);
        });
        
        const skippedCount = ordersFromAccount.length - newOrders.length;
        console.log(`[Shopee Sync] Conta ${conta.shop_id}: ${ordersFromAccount.length} vendas encontradas, ${newOrders.length} novas, ${skippedCount} puladas`);

        // Enviar progresso de vendas encontradas
        sendProgressToUser(userId, {
          type: "sync_progress",
          message: `Conta ${conta.shop_id}: ${newOrders.length} novas de ${ordersFromAccount.length} vendas (${skippedCount} já sincronizadas)`,
          current: accountIndex,
          total: contasAtivas.length,
          fetched: totalSaved,
          expected: allOrdersPayload.length + newOrders.length
        });

        // Se não há vendas novas, pular processamento
        if (newOrders.length === 0) {
          console.log(`[Shopee Sync] Conta ${conta.shop_id}: Todas as vendas já existem, pulando...`);
          continue;
        }

        // Preparar dados em lote para inserção mais rápida
        const vendaRecords = [];
        
        for (const order of newOrders) {
          allOrdersPayload.push({ accountId: conta.id, shopId: conta.shop_id, order });

          // Mapeamento dos dados
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
          // Convenção: POSITIVO = receita de frete, NEGATIVO = custo de frete
          // Fórmula invertida: Pago pelo Comprador + Subsídio - Custo Real
          const custoLiquidoFrete = (buyerPaidShippingFee + shopeeShippingRebate) - (actualShippingFee + reverseShippingFee);
          
          // Usar o custo líquido do frete como valor principal
          const frete = roundCurrency(custoLiquidoFrete);
          
          const margem = roundCurrency(totalAmount - taxaPlataforma - frete);

          const titulo = truncateString(itemList?.[0]?.item_name, 500) || "Pedido";
          
          // Extrair SKU: tentar todos os campos possíveis em ordem de prioridade
          let skuRaw = null;
          if (itemList && itemList.length > 0) {
            const firstItem = itemList[0];
            // Ordem de prioridade: item_sku > model_sku > variation_sku
            skuRaw = firstItem.item_sku || 
                     firstItem.model_sku || 
                     firstItem.variation_sku || 
                     null;
            
            // Log para debug (será removido depois)
            if (!skuRaw) {
              console.log(`[Shopee Sync] Pedido ${orderSn} sem SKU. Item:`, {
                item_sku: firstItem.item_sku,
                model_sku: firstItem.model_sku,
                variation_sku: firstItem.variation_sku,
                item_id: firstItem.item_id,
                model_id: firstItem.model_id
              });
            }
          }
          
          // Salvar o SKU diretamente na venda (igual ao Mercado Livre)
          // A tabela SKU é usada apenas para buscar o CMV, mas não impede o SKU de ser exibido
          const sku = skuRaw ? truncateString(String(skuRaw), 255) : null;
          
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

          // Adicionar ao batch ao invés de salvar individualmente
          vendaRecords.push({
            ...dataToSave,
            orderId: orderSn,
            userId: session.sub,
            shopeeAccountId: conta.id,
          });
        }

        // Batch upsert - muito mais rápido que queries individuais
        console.log(`[Shopee Sync] Salvando ${vendaRecords.length} vendas em lote...`);
        const SAVE_BATCH_SIZE = 100;
        for (let i = 0; i < vendaRecords.length; i += SAVE_BATCH_SIZE) {
          const batch = vendaRecords.slice(i, i + SAVE_BATCH_SIZE);
          await Promise.all(
            batch.map(async (record) => {
              await prisma.shopeeVenda.upsert({
                where: { orderId: record.orderId },
                update: {
                  dataVenda: record.dataVenda,
                  status: record.status,
                  conta: record.conta,
                  valorTotal: record.valorTotal,
                  quantidade: record.quantidade,
                  unitario: record.unitario,
                  taxaPlataforma: record.taxaPlataforma,
                  frete: record.frete,
                  margemContribuicao: record.margemContribuicao,
                  isMargemReal: record.isMargemReal,
                  titulo: record.titulo,
                  sku: record.sku,
                  comprador: record.comprador,
                  shippingId: record.shippingId,
                  shippingStatus: record.shippingStatus,
                  plataforma: record.plataforma,
                  canal: record.canal,
                  rawData: record.rawData,
                  paymentDetails: record.paymentDetails,
                  shipmentDetails: record.shipmentDetails,
                  atualizadoEm: record.atualizadoEm,
                },
                create: record,
              });
            })
          );
          totalSaved += batch.length;
          
          // Enviar progresso durante salvamento em lote
          sendProgressToUser(userId, {
            type: "sync_progress",
            message: `Salvando vendas: ${totalSaved}/${vendaRecords.length}`,
            current: accountIndex,
            total: contasAtualizadas.length,
            fetched: totalSaved,
            expected: allOrdersPayload.length
          });
        }

      } catch (error) {
        console.error(`[shopee][sync] Erro na conta ${conta.id}:`, error);
        errors.push({ accountId: conta.id, shopId: conta.shop_id, message: error instanceof Error ? error.message : "Erro desconhecido" });
        
        // Enviar erro via SSE
        sendProgressToUser(userId, {
          type: "sync_error",
          message: `Erro ao processar conta ${conta.shop_id}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          errorCode: "SHOPEE_SYNC_ERROR"
        });
      }
    }

    // Enviar evento de conclusão da sincronização
    sendProgressToUser(userId, {
      type: "sync_complete",
      message: `Sincronização concluída! ${totalSaved} vendas processadas`,
      current: totalSaved,
      total: allOrdersPayload.length,
      fetched: totalSaved,
      expected: allOrdersPayload.length
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
      orders: allOrdersPayload.length,
      saved: totalSaved,
      errors,
      totals: {
        expected: allOrdersPayload.length,
        fetched: allOrdersPayload.length,
        saved: totalSaved
      }
    });

  } catch (error) {
    console.error("Erro fatal ao sincronizar vendas Shopee:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
