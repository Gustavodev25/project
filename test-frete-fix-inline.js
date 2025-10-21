// Copia inline da função atualizada para teste
function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round2(v) {
  const r = Math.round((v + Number.EPSILON) * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

function normalizeLogisticType(lt) {
  if (!lt) return "";
  const t = lt.toLowerCase();
  if (t === "agência" || t === "agencia") return "xd_drop_off";
  return t;
}

function calcularFreteAdjust(params) {
  const lt = normalizeLogisticType(params.shipment_logistic_type || "");
  const baseCost = toNum(params.base_cost) ?? 0;
  const listCost = toNum(params.shipment_list_cost) ?? 0;
  const shipCost = toNum(params.shipment_cost) ?? 0;

  const qtyRaw = toNum(params.quantity);
  const denom = qtyRaw && qtyRaw !== 0 ? qtyRaw : null;
  const numer = toNum(params.order_cost) ?? 0;
  const unitario = denom ? numer / denom : null;

  const isSelfServiceOrFlex = lt === "self_service" || lt === "flex";
  const multiplier = isSelfServiceOrFlex ? 1 : -1;

  // SELF_SERVICE
  if (isSelfServiceOrFlex) {
    const diffRoundedEqZero = round2(baseCost - listCost) === 0;
    let base;
    if (diffRoundedEqZero) {
      base = unitario !== null && unitario < 79 ? 15.9 : 1.59;
    } else {
      base = baseCost - listCost;
    }
    return round2(base * multiplier);
  }

  // CROSS_DOCKING (Coleta) - COM CORREÇÃO
  if (lt === "cross_docking") {
    if (unitario !== null && unitario < 79) {
      return 0;
    }
    // Prioriza listCost, mas usa baseCost como fallback se listCost for 0/null
    let effectiveListCost = listCost;
    if ((listCost === null || listCost === 0) && baseCost !== null && baseCost !== 0) {
      console.log(`[FRETE] Coleta: usando baseCost (${baseCost}) como fallback pois listCost é ${listCost}`);
      effectiveListCost = baseCost;
    }
    const base = effectiveListCost - shipCost;
    return round2(base * -1);
  }

  // Outros tipos elegíveis (drop_off, xd_drop_off, fulfillment) - COM CORREÇÃO
  const tiposElegiveis = new Set(["drop_off", "xd_drop_off", "fulfillment"]);
  if (tiposElegiveis.has(lt)) {
    // Prioriza listCost, mas usa baseCost como fallback se listCost for 0/null
    let effectiveListCost = listCost;
    if ((listCost === null || listCost === 0) && baseCost !== null && baseCost !== 0) {
      console.log(`[FRETE] ${lt}: usando baseCost (${baseCost}) como fallback pois listCost é ${listCost}`);
      effectiveListCost = baseCost;
    }
    const base = effectiveListCost - shipCost;
    if (unitario !== null && unitario > 79) {
      return round2(Math.abs(base) * -1);
    } else {
      return round2(base * multiplier);
    }
  }

  // unitário < 79 (tipos não elegíveis)
  if (unitario !== null && unitario < 79) {
    return round2(0 * multiplier);
  }

  return round2(999 * multiplier);
}

console.log('=== TESTANDO CORREÇÃO DE FRETE PARA AGÊNCIA/COLETA ===\n');

// Teste 1: Coleta com listCost válido (cenário atual OK)
console.log('TESTE 1: Coleta com listCost válido');
const result1 = calcularFreteAdjust({
  shipment_logistic_type: 'cross_docking',
  base_cost: 177.8,
  shipment_list_cost: 71.12,
  shipment_cost: null,
  order_cost: 261.7,
  quantity: 2
});
console.log(`Resultado: R$ ${result1.toFixed(2)}`);
console.log(`Esperado: R$ -71.12`);
console.log(`Status: ${Math.abs(result1 - (-71.12)) < 0.01 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

// Teste 2: Coleta com listCost zerado mas baseCost válido (cenário problemático)
console.log('TESTE 2: Coleta com listCost=0 mas baseCost válido');
const result2 = calcularFreteAdjust({
  shipment_logistic_type: 'cross_docking',
  base_cost: 50.00,
  shipment_list_cost: 0,
  shipment_cost: null,
  order_cost: 298,
  quantity: 2
});
console.log(`Resultado: R$ ${result2.toFixed(2)}`);
console.log(`Esperado: R$ -50.00 (usa baseCost como fallback)`);
console.log(`Status: ${Math.abs(result2 - (-50.00)) < 0.01 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

// Teste 3: Agência com listCost zerado mas baseCost válido
console.log('TESTE 3: Agência (xd_drop_off) com listCost=0 mas baseCost válido');
const result3 = calcularFreteAdjust({
  shipment_logistic_type: 'xd_drop_off',
  base_cost: 40.00,
  shipment_list_cost: 0,
  shipment_cost: null,
  order_cost: 250,
  quantity: 2
});
console.log(`Resultado: R$ ${result3.toFixed(2)}`);
console.log(`Esperado: R$ -40.00 (usa baseCost como fallback)`);
console.log(`Status: ${Math.abs(result3 - (-40.00)) < 0.01 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

// Teste 4: Agência com listCost válido (cenário atual OK)
console.log('TESTE 4: Agência com listCost válido');
const result4 = calcularFreteAdjust({
  shipment_logistic_type: 'agencia',
  base_cost: 50.00,
  shipment_list_cost: 39.83,
  shipment_cost: null,
  order_cost: 218,
  quantity: 2
});
console.log(`Resultado: R$ ${result4.toFixed(2)}`);
console.log(`Esperado: R$ -39.83`);
console.log(`Status: ${Math.abs(result4 - (-39.83)) < 0.01 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

// Teste 5: Coleta com TODOS os custos zerados (não há dados disponíveis)
console.log('TESTE 5: Coleta com TODOS os custos zerados');
const result5 = calcularFreteAdjust({
  shipment_logistic_type: 'cross_docking',
  base_cost: 0,
  shipment_list_cost: 0,
  shipment_cost: null,
  order_cost: 298,
  quantity: 2
});
console.log(`Resultado: R$ ${result5.toFixed(2)}`);
console.log(`Esperado: R$ 0.00 (não há dados de frete)`);
console.log(`Status: ${result5 === 0 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

// Teste 6: Coleta com unitário < 79 (deve zerar)
console.log('TESTE 6: Coleta com unitário < R$ 79 (deve zerar)');
const result6 = calcularFreteAdjust({
  shipment_logistic_type: 'cross_docking',
  base_cost: 30.00,
  shipment_list_cost: 25.00,
  shipment_cost: null,
  order_cost: 150,  // 75 por unidade (< 79)
  quantity: 2
});
console.log(`Resultado: R$ ${result6.toFixed(2)}`);
console.log(`Esperado: R$ 0.00 (unitário < 79)`);
console.log(`Status: ${result6 === 0 ? '✅ PASSOU' : '❌ FALHOU'}\n`);

console.log('=================================');
console.log('RESUMO: Se todos os testes passaram, a correção está OK!');
