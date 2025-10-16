// lib/frete.ts

export type FreteAdjustParams = {
  shipment_logistic_type: string | null;
  base_cost?: number | null;
  shipment_list_cost?: number | null;
  shipment_cost?: number | null;
  order_cost?: number | null; // total do pedido (ou unit * qty)
  quantity?: number | null;
};

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function round2(v: number): number {
  const r = Math.round((v + Number.EPSILON) * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}
function normalizeLogisticType(lt: string | null): string {
  if (!lt) return "";
  const t = lt.toLowerCase();
  if (t === "agência" || t === "agencia") return "xd_drop_off";
  return t;
}

/**
 * Réplica fiel do SQL:
 * - self_service:
 *    - se round(base_cost - shipment_list_cost,2) == 0:
 *         unitário < 79 → 15.90 ; caso contrário → 1.59
 *      senão: diff (base_cost - shipment_list_cost)
 * - não self_service e unitário >= 79 e tipo ∈ {drop_off, xd_drop_off, fulfillment, cross_docking}:
 *      (shipment_list_cost - shipment_cost)
 * - unitário < 79:
 *      0
 * - caso contrário:
 *      999
 * Depois multiplica por:
 *   +1 se self_service; -1 caso contrário.
 */
export function calcularFreteAdjust(params: FreteAdjustParams): number {
  const lt = normalizeLogisticType(params.shipment_logistic_type || "");
  const baseCost = toNum(params.base_cost) ?? 0;
  const listCost = toNum(params.shipment_list_cost) ?? 0;
  const shipCost = toNum(params.shipment_cost) ?? 0;

  // unitário = COALESCE(order_cost, 0) / NULLIF(quantity, 0)
  const qtyRaw = toNum(params.quantity);
  const denom = qtyRaw && qtyRaw !== 0 ? qtyRaw : null;
  const numer = toNum(params.order_cost) ?? 0;
  const unitario = denom ? numer / denom : null; // se denom null → null (igual ao SQL)

  const isSelfServiceOrFlex = lt === "self_service" || lt === "flex";
  const multiplier = isSelfServiceOrFlex ? 1 : -1;

  // 1) SELF_SERVICE (now also FLEX)
  if (isSelfServiceOrFlex) {
    const diffRoundedEqZero = round2(baseCost - listCost) === 0;
    let base: number;
    if (diffRoundedEqZero) {
      base = unitario !== null && unitario < 79 ? 15.9 : 1.59;
    } else {
      base = baseCost - listCost;
    }
    return round2(base * multiplier);
  }

  // 2) NÃO SELF_SERVICE, tipos elegíveis
  const tiposElegiveis = new Set(["drop_off", "xd_drop_off", "fulfillment", "cross_docking"]);
  if (tiposElegiveis.has(lt)) {
    const base = listCost - shipCost;
    
    if (unitario !== null && unitario > 79) {
      // For items > 79, it must always be negative.
      return round2(Math.abs(base) * -1);
    } else {
      // For items <= 79, use the standard calculation.
      return round2(base * multiplier);
    }
  }

  // 3) unitário < 79 (agora apenas para tipos não elegíveis)
  if (unitario !== null && unitario < 79) {
    return round2(0 * multiplier); // fica 0
  }

  // 4) ELSE 999
  return round2(999 * multiplier); // sentinel igual ao SQL
}

/* utilidades já existentes... */
export function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  } catch {
    return `R$ ${Number(value || 0).toFixed(2)}`;
  }
}
export function classifyFrete(value: number): { className: string; displayValue: string } {
  const displayValue = formatCurrency(value || 0);
  if (value > 0) return { className: "frete-positivo", displayValue };
  if (value < 0) return { className: "frete-negativo", displayValue };
  return { className: "frete-neutro", displayValue };
}

// Tipos para dados de frete do Shopee
export interface ShopeeFreteData {
  actual_shipping_fee?: number;
  shopee_shipping_rebate?: number;
  buyer_paid_shipping_fee?: number;
  shipping_fee_discount_from_3pl?: number;
  reverse_shipping_fee?: number;
  productSubtotal?: number;
  totalTaxas?: number;
  rendaLiquida?: number;
}

/**
 * Detecta automaticamente se o frete está subsidiado baseado na lógica do Shopee
 */
export function detectarSubsidioFrete(freteData: ShopeeFreteData): {
  isSubsidized: boolean;
  subsidioDetectado: number;
  custoLiquidoFrete: number;
  tipoSubsidio: string;
} {
  const {
    actual_shipping_fee = 0,
    shopee_shipping_rebate = 0,
    buyer_paid_shipping_fee = 0,
    shipping_fee_discount_from_3pl = 0,
    reverse_shipping_fee = 0,
    productSubtotal = 0,
    totalTaxas = 0,
    rendaLiquida = 0
  } = freteData;

  // Calcular custo implícito do frete
  const impliedCustoFrete = productSubtotal - totalTaxas - rendaLiquida;
  
  // Detecção automática de subsídio
  // Se não há shopee_shipping_rebate explícito mas o custo implícito é ~0,
  // significa que a Shopee subsidiou a diferença entre o custo real e o que o comprador pagou
  let subsidioDetectado = shopee_shipping_rebate;
  if (actual_shipping_fee && !shopee_shipping_rebate && Math.abs(impliedCustoFrete) < 0.01) {
    // Subsídio = custo real - o que o comprador pagou
    subsidioDetectado = actual_shipping_fee - buyer_paid_shipping_fee;
  }

  // Calcular custo líquido do frete
  // Convenção: POSITIVO = receita de frete, NEGATIVO = custo de frete
  // - actual_shipping_fee: custo real que o vendedor paga (positivo = custo, então invertemos)
  // - buyer_paid_shipping_fee: valor que o comprador pagou (positivo = receita, mantemos positivo)
  // - subsidioDetectado: subsídio da Shopee (reduz o custo, então somamos)
  // Fórmula invertida: Pago pelo Comprador + Subsídio + Desconto 3PL - Custo Real
  const custoLiquidoFrete = (buyer_paid_shipping_fee + subsidioDetectado + shipping_fee_discount_from_3pl) - 
    (actual_shipping_fee + reverse_shipping_fee);

  // Determinar tipo de subsídio
  let tipoSubsidio = "Nenhum";
  if (subsidioDetectado > 0) {
    tipoSubsidio = "Shopee";
  } else if (buyer_paid_shipping_fee > 0) {
    tipoSubsidio = "Comprador";
  } else if (shipping_fee_discount_from_3pl > 0) {
    tipoSubsidio = "3PL";
  }

  const isSubsidized = subsidioDetectado > 0 || buyer_paid_shipping_fee > 0 || shipping_fee_discount_from_3pl > 0;

  return {
    isSubsidized,
    subsidioDetectado,
    custoLiquidoFrete,
    tipoSubsidio
  };
}

/**
 * Formata dados de frete para exibição na interface
 */
export function formatarFreteShopee(freteData: ShopeeFreteData): {
  valorPrincipal: string;
  className: string;
  mensagemEspecial?: string;
  detalhes: {
    custoReal: number;
    subsidioShopee: number;
    pagoComprador: number;
    custoLiquido: number;
  };
} {
  const { isSubsidized, subsidioDetectado, custoLiquidoFrete, tipoSubsidio } = detectarSubsidioFrete(freteData);
  
  const valorPrincipal = formatCurrency(custoLiquidoFrete);
  const className = custoLiquidoFrete > 0 ? "frete-positivo" : 
                   custoLiquidoFrete < 0 ? "frete-negativo" : "frete-neutro";
  
  let mensagemEspecial: string | undefined;
  if (isSubsidized && Math.abs(custoLiquidoFrete) < 0.01) {
    mensagemEspecial = "O frete foi zerado ou totalmente subsidiado pela Shopee/Comprador.";
  }

  return {
    valorPrincipal,
    className,
    mensagemEspecial,
    detalhes: {
      custoReal: freteData.actual_shipping_fee || 0,
      subsidioShopee: subsidioDetectado,
      pagoComprador: freteData.buyer_paid_shipping_fee || 0,
      custoLiquido: custoLiquidoFrete
    }
  };
}