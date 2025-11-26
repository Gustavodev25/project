// Frete utilities for frontend

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatarFreteShopee(freteData: any): {
  freteOriginal: number;
  subsidioShopee: number;
  subsidioVendedor: number;
  freteComprador: number;
} {
  const actual_shipping_fee = freteData.actual_shipping_fee || 0;
  const shopee_shipping_rebate = freteData.shopee_shipping_rebate || 0;
  const buyer_paid_shipping_fee = freteData.buyer_paid_shipping_fee || 0;
  const shipping_fee_discount_from_3pl = freteData.shipping_fee_discount_from_3pl || 0;

  const freteOriginal = actual_shipping_fee;
  const subsidioShopee = shopee_shipping_rebate + shipping_fee_discount_from_3pl;
  const subsidioVendedor = Math.max(0, actual_shipping_fee - shopee_shipping_rebate - shipping_fee_discount_from_3pl - buyer_paid_shipping_fee);
  const freteComprador = buyer_paid_shipping_fee;

  return {
    freteOriginal,
    subsidioShopee,
    subsidioVendedor,
    freteComprador,
  };
}

export function detectarSubsidioFrete(freteData: any): {
  temSubsidio: boolean;
  valorSubsidio: number;
  percentualSubsidio: number;
} {
  const resultado = formatarFreteShopee(freteData);
  const totalSubsidio = resultado.subsidioShopee + resultado.subsidioVendedor;

  return {
    temSubsidio: totalSubsidio > 0,
    valorSubsidio: totalSubsidio,
    percentualSubsidio: resultado.freteOriginal > 0
      ? (totalSubsidio / resultado.freteOriginal) * 100
      : 0,
  };
}

export function classifyLogisticType(logisticType: string | undefined): string {
  if (!logisticType) return 'Desconhecido';

  const type = logisticType.toLowerCase();

  if (type.includes('flex') || type === 'self_service') {
    return 'FLEX';
  }
  if (type.includes('drop') || type.includes('agencia') || type === 'xd_drop_off') {
    return 'Agência';
  }
  if (type.includes('coleta')) {
    return 'Coleta';
  }

  return logisticType;
}

export function classifyFrete(logisticTypeOrValue: string | number | undefined): string {
  // Se for um número, classifica pelo valor
  if (typeof logisticTypeOrValue === 'number') {
    if (logisticTypeOrValue === 0) return 'Grátis';
    if (logisticTypeOrValue < 10) return 'Baixo';
    if (logisticTypeOrValue < 20) return 'Médio';
    return 'Alto';
  }

  // Se for string, classifica pelo tipo logístico
  if (!logisticTypeOrValue) return 'Desconhecido';

  const type = logisticTypeOrValue.toLowerCase();

  if (type.includes('flex') || type === 'self_service') {
    return 'FLEX';
  }
  if (type.includes('drop') || type.includes('agencia') || type === 'xd_drop_off') {
    return 'Agência';
  }
  if (type.includes('coleta')) {
    return 'Coleta';
  }

  return logisticTypeOrValue;
}
