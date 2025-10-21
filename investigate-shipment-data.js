const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateShipmentData() {
  console.log('=== INVESTIGANDO DADOS DE SHIPMENT ===\n');

  const vendas = await prisma.meliVenda.findMany({
    where: {
      OR: [
        { logisticType: 'Agência' },
        { logisticType: 'Coleta' },
        { logisticType: 'xd_drop_off' },
        { logisticType: 'cross_docking' }
      ],
      unitario: { gte: 79 }
    },
    orderBy: { dataVenda: 'desc' },
    take: 100
  });

  console.log(`Total de vendas Agência/Coleta com unitário >= R$79: ${vendas.length}\n`);

  const problemas = {
    freteZerado: [],
    listCostNull: [],
    shipCostNull: [],
    ambosNull: []
  };

  for (const venda of vendas) {
    const unitario = parseFloat(venda.unitario);
    const frete = parseFloat(venda.frete);
    const freteListCost = venda.freteListCost ? parseFloat(venda.freteListCost) : null;
    const freteFinalCost = venda.freteFinalCost ? parseFloat(venda.freteFinalCost) : null;

    const info = {
      orderId: venda.orderId,
      tipo: venda.logisticType,
      unitario,
      frete,
      listCost: freteListCost,
      shipCost: freteFinalCost
    };

    // Verificar problemas
    if (frete === 0) {
      problemas.freteZerado.push(info);
    }

    if (freteListCost === null || freteListCost === 0) {
      problemas.listCostNull.push(info);
    }

    if (freteFinalCost === null || freteFinalCost === 0) {
      problemas.shipCostNull.push(info);
    }

    if ((freteListCost === null || freteListCost === 0) && (freteFinalCost === null || freteFinalCost === 0)) {
      problemas.ambosNull.push(info);
    }
  }

  console.log('=== ANÁLISE DE PROBLEMAS ===\n');

  console.log(`1️⃣ Vendas com FRETE ZERADO (${problemas.freteZerado.length}):`);
  if (problemas.freteZerado.length > 0) {
    problemas.freteZerado.slice(0, 10).forEach(v => {
      console.log(`   🔴 ${v.orderId} | ${v.tipo} | Unitário: R$ ${v.unitario.toFixed(2)} | ListCost: ${v.listCost?.toFixed(2) ?? 'NULL'} | ShipCost: ${v.shipCost?.toFixed(2) ?? 'NULL'}`);
    });
  } else {
    console.log('   ✅ Nenhuma venda com frete zerado');
  }

  console.log(`\n2️⃣ Vendas com LIST COST null/zero (${problemas.listCostNull.length}):`);
  if (problemas.listCostNull.length > 0) {
    problemas.listCostNull.slice(0, 10).forEach(v => {
      console.log(`   ⚠️ ${v.orderId} | ${v.tipo} | Frete: R$ ${v.frete.toFixed(2)} | ListCost: ${v.listCost ?? 'NULL'}`);
    });
  } else {
    console.log('   ✅ Todas as vendas têm list_cost');
  }

  console.log(`\n3️⃣ Vendas com SHIP COST null/zero (${problemas.shipCostNull.length}):`);
  if (problemas.shipCostNull.length > 0) {
    problemas.shipCostNull.slice(0, 10).forEach(v => {
      console.log(`   ⚠️ ${v.orderId} | ${v.tipo} | Frete: R$ ${v.frete.toFixed(2)} | ShipCost: ${v.shipCost ?? 'NULL'}`);
    });
  } else {
    console.log('   ✅ Todas as vendas têm ship_cost');
  }

  console.log(`\n4️⃣ Vendas com AMBOS null/zero (${problemas.ambosNull.length}):`);
  if (problemas.ambosNull.length > 0) {
    problemas.ambosNull.slice(0, 10).forEach(v => {
      console.log(`   🔴 ${v.orderId} | ${v.tipo} | Frete: R$ ${v.frete.toFixed(2)}`);
    });
  } else {
    console.log('   ✅ Nenhuma venda com ambos null');
  }

  console.log('\n\n=== CONCLUSÃO ===');
  if (problemas.freteZerado.length > 0 || problemas.ambosNull.length > 0) {
    console.log('🔴 ATENÇÃO: Existem vendas com problemas no cálculo de frete!');
    console.log('   Vendas com unitário >= R$79 devem SEMPRE ter frete calculado com base em shipment data.');
  } else {
    console.log('✅ Todas as vendas com unitário >= R$79 têm frete calculado corretamente.');
  }
}

investigateShipmentData()
  .then(() => {
    console.log('\n✅ Investigação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
