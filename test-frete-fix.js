// Importar a função diretamente (precisa compilar TypeScript primeiro ou usar ts-node)
const { calcularFreteAdjust } = require('./src/lib/frete.ts');

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
console.log('RESUMO DOS TESTES:');
console.log('Se todos passaram, a correção está funcionando corretamente!');
