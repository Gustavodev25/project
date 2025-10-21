/**
 * Script para TESTAR a correção do sale_fee
 * Mostra o ANTES e DEPOIS da correção
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function roundCurrency(v) {
  const r = Math.round((v + Number.EPSILON) * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

async function testSaleFeeCorrection() {
  console.log('🧪 Testando correção do sale_fee...\n');

  // Buscar vendas com quantidade > 1 e taxa
  const vendas = await prisma.meliVenda.findMany({
    where: {
      quantidade: {
        gt: 1
      },
      taxaPlataforma: {
        not: null
      }
    },
    take: 10,
    orderBy: {
      dataVenda: 'desc'
    }
  });

  console.log(`📊 Testando ${vendas.length} vendas com quantidade > 1\n`);

  let totalErros = 0;
  let totalCorrecoes = 0;

  for (const venda of vendas) {
    if (!venda.rawData || typeof venda.rawData !== 'object') continue;

    const rawData = venda.rawData;
    const order = rawData.order;

    if (!order || !order.order_items || !Array.isArray(order.order_items)) continue;

    console.log('='.repeat(80));
    console.log(`📦 Pedido: ${venda.orderId}`);
    console.log(`   Quantidade: ${venda.quantidade}`);
    console.log(`   Valor Total: R$ ${Number(venda.valorTotal).toFixed(2)}`);

    // ANTES: Código antigo (sem multiplicar pela quantidade)
    const saleFeeAntigo = order.order_items.reduce((acc, item) => {
      const fee = Number(item?.sale_fee) || 0;
      return acc + fee;
    }, 0);

    // DEPOIS: Código corrigido (multiplicando pela quantidade)
    const saleFeeCorrigido = order.order_items.reduce((acc, item) => {
      const fee = Number(item?.sale_fee) || 0;
      const qty = Number(item?.quantity) || 1;
      return acc + (fee * qty);
    }, 0);

    const taxaAntigaCalculada = saleFeeAntigo > 0 ? -roundCurrency(saleFeeAntigo) : null;
    const taxaCorrigidaCalculada = saleFeeCorrigido > 0 ? -roundCurrency(saleFeeCorrigido) : null;
    const taxaNoBanco = venda.taxaPlataforma ? Number(venda.taxaPlataforma) : null;

    console.log(`\n   💰 ANTES (código antigo):`);
    console.log(`      Sale Fee: R$ ${saleFeeAntigo.toFixed(2)}`);
    console.log(`      Taxa Plataforma: R$ ${taxaAntigaCalculada ? taxaAntigaCalculada.toFixed(2) : 'N/A'}`);
    console.log(`      % sobre valor: ${taxaAntigaCalculada ? (Math.abs(taxaAntigaCalculada) / Number(venda.valorTotal) * 100).toFixed(2) : 'N/A'}%`);

    console.log(`\n   ✅ DEPOIS (código corrigido):`);
    console.log(`      Sale Fee: R$ ${saleFeeCorrigido.toFixed(2)}`);
    console.log(`      Taxa Plataforma: R$ ${taxaCorrigidaCalculada ? taxaCorrigidaCalculada.toFixed(2) : 'N/A'}`);
    console.log(`      % sobre valor: ${taxaCorrigidaCalculada ? (Math.abs(taxaCorrigidaCalculada) / Number(venda.valorTotal) * 100).toFixed(2) : 'N/A'}%`);

    console.log(`\n   📊 Taxa no Banco (atual): R$ ${taxaNoBanco ? taxaNoBanco.toFixed(2) : 'N/A'}`);

    // Calcular diferença
    const diferencaAbsoluta = Math.abs((taxaCorrigidaCalculada || 0) - (taxaAntigaCalculada || 0));
    const diferencaPercentual = taxaAntigaCalculada
      ? (diferencaAbsoluta / Math.abs(taxaAntigaCalculada)) * 100
      : 0;

    console.log(`\n   📈 Impacto da Correção:`);
    console.log(`      Diferença: R$ ${diferencaAbsoluta.toFixed(2)}`);
    console.log(`      Aumento: ${diferencaPercentual.toFixed(2)}%`);

    if (Math.abs((taxaNoBanco || 0) - (taxaAntigaCalculada || 0)) < 0.01) {
      console.log(`      ⚠️  Banco está com valor ANTIGO (errado)`);
      totalErros++;
    }

    if (Math.abs((taxaNoBanco || 0) - (taxaCorrigidaCalculada || 0)) < 0.01) {
      console.log(`      ✅ Banco está com valor CORRIGIDO`);
      totalCorrecoes++;
    }

    // Mostrar detalhes dos items
    console.log(`\n   📋 Detalhes dos Items:`);
    order.order_items.forEach((item, idx) => {
      const fee = Number(item?.sale_fee) || 0;
      const qty = Number(item?.quantity) || 1;
      const feeTotal = fee * qty;

      console.log(`      Item ${idx + 1}:`);
      console.log(`        - Quantity: ${qty}`);
      console.log(`        - Sale Fee (unitário): R$ ${fee.toFixed(2)}`);
      console.log(`        - Sale Fee (total): R$ ${feeTotal.toFixed(2)} (${fee.toFixed(2)} × ${qty})`);
    });

    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`\n📊 RESUMO:`);
  console.log(`   Total de vendas testadas: ${vendas.length}`);
  console.log(`   Vendas com valor ANTIGO (errado) no banco: ${totalErros}`);
  console.log(`   Vendas com valor CORRIGIDO no banco: ${totalCorrecoes}`);

  if (totalErros > 0) {
    console.log(`\n⚠️  AÇÃO NECESSÁRIA: Re-sincronizar vendas para aplicar a correção!`);
    console.log(`   Comando: Clique em "Sincronizar Vendas" na interface`);
  } else {
    console.log(`\n✅ Todas as vendas testadas já estão corretas!`);
  }

  console.log('\n✅ Teste concluído!');

  await prisma.$disconnect();
}

testSaleFeeCorrection().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
