const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateRawShipment() {
  console.log('=== INVESTIGANDO RAW SHIPMENT DATA ===\n');

  // Buscar a venda com problema
  const vendaProblem = await prisma.meliVenda.findUnique({
    where: { orderId: '2000013456890510' }
  });

  if (vendaProblem) {
    console.log('🔴 VENDA COM PROBLEMA (frete zerado):');
    console.log(`Order ID: ${vendaProblem.orderId}`);
    console.log(`Tipo: ${vendaProblem.logisticType}`);
    console.log(`Unitário: R$ ${parseFloat(vendaProblem.unitario).toFixed(2)}`);
    console.log(`Frete: R$ ${parseFloat(vendaProblem.frete).toFixed(2)}`);
    console.log(`\nDados armazenados:`);
    console.log(`  freteListCost: ${vendaProblem.freteListCost}`);
    console.log(`  freteFinalCost: ${vendaProblem.freteFinalCost}`);
    console.log(`  freteBaseCost: ${vendaProblem.freteBaseCost}`);

    if (vendaProblem.rawData && typeof vendaProblem.rawData === 'object') {
      console.log(`\n📦 RAW DATA - FREIGHT:`)
      console.log(JSON.stringify(vendaProblem.rawData.freight, null, 2));
    }
  }

  // Buscar uma venda OK para comparar
  console.log('\n\n=================================\n');
  const vendaOk = await prisma.meliVenda.findFirst({
    where: {
      logisticType: 'Coleta',
      unitario: { gte: 79 },
      frete: { not: 0 }
    }
  });

  if (vendaOk) {
    console.log('✅ VENDA OK (frete calculado):');
    console.log(`Order ID: ${vendaOk.orderId}`);
    console.log(`Tipo: ${vendaOk.logisticType}`);
    console.log(`Unitário: R$ ${parseFloat(vendaOk.unitario).toFixed(2)}`);
    console.log(`Frete: R$ ${parseFloat(vendaOk.frete).toFixed(2)}`);
    console.log(`\nDados armazenados:`);
    console.log(`  freteListCost: ${vendaOk.freteListCost}`);
    console.log(`  freteFinalCost: ${vendaOk.freteFinalCost}`);
    console.log(`  freteBaseCost: ${vendaOk.freteBaseCost}`);

    if (vendaOk.rawData && typeof vendaOk.rawData === 'object') {
      console.log(`\n📦 RAW DATA - FREIGHT:`);
      console.log(JSON.stringify(vendaOk.rawData.freight, null, 2));
    }
  }

  // Verificar de onde vem o frete quando listCost/shipCost são null
  console.log('\n\n=================================');
  console.log('📊 ANÁLISE: De onde vem o frete?');
  console.log('=================================\n');

  const vendas = await prisma.meliVenda.findMany({
    where: {
      OR: [
        { logisticType: 'Agência' },
        { logisticType: 'Coleta' }
      ],
      unitario: { gte: 79 },
      frete: { not: 0 }
    },
    take: 5
  });

  for (const v of vendas) {
    console.log(`\nOrder: ${v.orderId}`);
    console.log(`  Frete: R$ ${parseFloat(v.frete).toFixed(2)}`);

    if (v.rawData && typeof v.rawData === 'object' && v.rawData.freight) {
      const f = v.rawData.freight;
      console.log(`  Raw Freight Data:`);
      console.log(`    logisticType: ${f.logisticType}`);
      console.log(`    baseCost: ${f.baseCost}`);
      console.log(`    listCost: ${f.listCost}`);
      console.log(`    shipmentCost: ${f.shipmentCost}`);
      console.log(`    finalCost: ${f.finalCost}`);
      console.log(`    adjustedCost: ${f.adjustedCost}`);
      console.log(`    chargedCost: ${f.chargedCost}`);

      // Verificar se o frete armazenado é igual a algum desses valores
      const frete = parseFloat(v.frete);
      if (f.adjustedCost && Math.abs(frete - f.adjustedCost) < 0.01) {
        console.log(`  ✅ Frete vem de: adjustedCost`);
      } else if (f.finalCost && Math.abs(frete - f.finalCost) < 0.01) {
        console.log(`  ✅ Frete vem de: finalCost`);
      } else if (f.chargedCost && Math.abs(frete - f.chargedCost) < 0.01) {
        console.log(`  ✅ Frete vem de: chargedCost`);
      } else {
        console.log(`  ⚠️ Frete não bate com nenhum valor do rawData`);
      }
    }
  }
}

investigateRawShipment()
  .then(() => {
    console.log('\n\n✅ Investigação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
