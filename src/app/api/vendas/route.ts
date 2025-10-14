import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

function roundCurrency(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

type JsonRecord = Record<string, unknown>;

type OrderItem = {
  item?: {
    listing_type_id?: string | null;
  } | null;
};

type RawDataWithOrder = JsonRecord & {
  order?: JsonRecord;
  freight?: JsonRecord;
  shipment?: JsonRecord | null;
};

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  let session;
  try {
    session = assertSessionToken(sessionCookie);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Buscar vendas do Mercado Livre
    const vendasMeli = await prisma.meliVenda.findMany({
      where: { userId: session.sub },
      orderBy: { dataVenda: "desc" },
      include: {
        meliAccount: {
          select: { nickname: true, ml_user_id: true },
        },
      },
    });

    // Buscar vendas do Shopee
    const vendasShopee = await prisma.shopeeVenda.findMany({
      where: { userId: session.sub },
      orderBy: { dataVenda: "desc" },
    });

    // Buscar SKUs únicos para cálculo de CMV
    const skusUnicos = Array.from(
      new Set([
        ...vendasMeli.map((v) => v.sku).filter(Boolean) as string[],
        ...vendasShopee.map((v) => v.sku).filter(Boolean) as string[],
      ]),
    );

    const skuCustos = await prisma.sKU.findMany({
      where: {
        userId: session.sub,
        sku: { in: skusUnicos },
      },
      select: {
        sku: true,
        custoUnitario: true,
      },
    });

    const mapaCustos = new Map(
      skuCustos.map((sku) => [sku.sku, Number(sku.custoUnitario)]),
    );

    // Formatar vendas do Mercado Livre
    const vendasMeliFormatted = vendasMeli.map((venda) => {
      let cmv: number | null = null;
      if (venda.sku && mapaCustos.has(venda.sku)) {
        const custoUnitario = mapaCustos.get(venda.sku)!;
        cmv = roundCurrency(custoUnitario * venda.quantidade);
      }

      const valorTotal = Number(venda.valorTotal);
      const taxaPlataforma = venda.taxaPlataforma
        ? Number(venda.taxaPlataforma)
        : 0;
      const frete = Number(venda.frete);

      let margemContribuicao: number;
      let isMargemReal: boolean;
      if (cmv !== null && cmv > 0) {
        margemContribuicao = roundCurrency(
          valorTotal + taxaPlataforma + frete - cmv,
        );
        isMargemReal = true;
      } else {
        margemContribuicao = roundCurrency(valorTotal + taxaPlataforma + frete);
        isMargemReal = false;
      }

      const rawData =
        venda.rawData && typeof venda.rawData === "object"
          ? (venda.rawData as RawDataWithOrder)
          : null;

      const freightData =
        rawData && rawData.freight && typeof rawData.freight === "object"
          ? (rawData.freight as JsonRecord)
          : {};

      const shipmentData =
        rawData && rawData.shipment && typeof rawData.shipment === "object"
          ? (rawData.shipment as JsonRecord)
          : null;

      const receiverAddress =
        shipmentData &&
        typeof (shipmentData as JsonRecord).receiver_address === "object"
          ? ((shipmentData as JsonRecord).receiver_address as JsonRecord)
          : null;

      const rawOrder =
        rawData && rawData.order && typeof rawData.order === "object"
          ? (rawData.order as JsonRecord)
          : null;

      let orderItems: OrderItem[] = [];
      if (rawOrder && "order_items" in rawOrder) {
        const maybeItems = (rawOrder as { order_items?: unknown }).order_items;
        if (Array.isArray(maybeItems)) {
          orderItems = maybeItems.filter(
            (entry): entry is OrderItem =>
              typeof entry === "object" && entry !== null,
          );
        }
      }

      const firstOrderItem = orderItems[0] ?? null;
      const listingTypeId =
        firstOrderItem && typeof firstOrderItem === "object"
          ? ((firstOrderItem.item?.listing_type_id as string | undefined) ??
            null)
          : null;

      return {
        id: venda.orderId,
        dataVenda: venda.dataVenda.toISOString(),
        status: venda.status,
        conta: venda.conta,
        valorTotal,
        quantidade: venda.quantidade,
        unitario: Number(venda.unitario),
        taxaPlataforma: venda.taxaPlataforma
          ? Number(venda.taxaPlataforma)
          : null,
        frete,
        freteAjuste: venda.freteAjuste ? Number(venda.freteAjuste) : null,
        cmv,
        margemContribuicao,
        isMargemReal,
        titulo: venda.titulo,
        sku: venda.sku,
        comprador: venda.comprador,
        logisticType: venda.logisticType,
        envioMode: venda.envioMode,
        shippingStatus: venda.shippingStatus,
        shippingId: venda.shippingId,
        exposicao: venda.exposicao,
        tipoAnuncio: venda.tipoAnuncio,
        ads: venda.ads,
        plataforma: venda.plataforma,
        canal: venda.canal,
        tags: venda.tags,
        internalTags: venda.internalTags,
        latitude:
          venda.latitude !== null && venda.latitude !== undefined
            ? Number(venda.latitude)
            : null,
        longitude:
          venda.longitude !== null && venda.longitude !== undefined
            ? Number(venda.longitude)
            : null,
        raw: {
          listing_type_id: listingTypeId,
          tags: venda.tags,
          internal_tags: venda.internalTags,
        },
        preco: valorTotal,
        shipping: freightData,
        shipment: shipmentData,
        receiverAddress,
        sincronizadoEm: venda.sincronizadoEm.toISOString(),
      };
    });

    // Formatar vendas do Shopee
    const vendasShopeeFormatted = vendasShopee.map((venda) => {
      let cmv: number | null = null;
      if (venda.sku && mapaCustos.has(venda.sku)) {
        const custoUnitario = mapaCustos.get(venda.sku)!;
        cmv = roundCurrency(custoUnitario * venda.quantidade);
      }

      const valorTotal = Number(venda.valorTotal);
      const taxaPlataforma = venda.taxaPlataforma
        ? Number(venda.taxaPlataforma)
        : 0;
      const frete = Number(venda.frete);

      let margemContribuicao: number;
      let isMargemReal: boolean;
      if (cmv !== null && cmv > 0) {
        margemContribuicao = roundCurrency(
          valorTotal + taxaPlataforma + frete - cmv,
        );
        isMargemReal = true;
      } else {
        margemContribuicao = roundCurrency(valorTotal + taxaPlataforma + frete);
        isMargemReal = false;
      }

      return {
        id: venda.orderId,
        dataVenda: venda.dataVenda.toISOString(),
        status: venda.status,
        conta: venda.conta,
        valorTotal,
        quantidade: venda.quantidade,
        unitario: Number(venda.unitario),
        taxaPlataforma: venda.taxaPlataforma
          ? Number(venda.taxaPlataforma)
          : null,
        frete,
        freteAjuste: venda.freteAjuste ? Number(venda.freteAjuste) : null,
        cmv,
        margemContribuicao,
        isMargemReal,
        titulo: venda.titulo,
        sku: venda.sku,
        comprador: venda.comprador,
        logisticType: venda.logisticType,
        envioMode: venda.envioMode,
        shippingStatus: venda.shippingStatus,
        shippingId: venda.shippingId,
        exposicao: venda.exposicao,
        tipoAnuncio: venda.tipoAnuncio,
        ads: venda.ads,
        plataforma: venda.plataforma,
        canal: venda.canal,
        tags: venda.tags,
        internalTags: venda.internalTags,
        latitude: null,
        longitude: null,
        raw: {
          listing_type_id: null,
          tags: venda.tags,
          internal_tags: venda.internalTags,
        },
        preco: valorTotal,
        shipping: {},
        shipment: null,
        receiverAddress: null,
        sincronizadoEm: venda.sincronizadoEm.toISOString(),
      };
    });

    // Combinar e ordenar todas as vendas por data
    const todasVendas = [...vendasMeliFormatted, ...vendasShopeeFormatted].sort(
      (a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime()
    );

    // Buscar última sincronização geral
    const ultimaSyncMeli = vendasMeli.length > 0 ? vendasMeli[0].sincronizadoEm : null;
    const ultimaSyncShopee = vendasShopee.length > 0 ? vendasShopee[0].sincronizadoEm : null;
    
    let ultimaSyncGeral = null;
    if (ultimaSyncMeli && ultimaSyncShopee) {
      ultimaSyncGeral = ultimaSyncMeli > ultimaSyncShopee ? ultimaSyncMeli : ultimaSyncShopee;
    } else if (ultimaSyncMeli) {
      ultimaSyncGeral = ultimaSyncMeli;
    } else if (ultimaSyncShopee) {
      ultimaSyncGeral = ultimaSyncShopee;
    }

    return NextResponse.json({
      vendas: todasVendas,
      total: todasVendas.length,
      lastSync: ultimaSyncGeral?.toISOString() || null,
    });
  } catch (error) {
    console.error("Erro ao buscar vendas gerais:", error);
    return new NextResponse("Erro interno do servidor", { status: 500 });
  }
}
