const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateFreteAgencyColeta() {
  console.log('=== INVESTIGANDO FRETE DE AGÊNCIA E COLETA ===\n');

  // Buscar vendas com logisticType = 'Agência' ou 'Coleta' com valor unitário >= 79
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
    take: 50
  });

  console.log(`Encontradas ${vendas.length} vendas com Agência/Coleta e unitário >= R$79\n`);

  const problematicas = [];

  for (const venda of vendas) {
    const unitario = parseFloat(venda.unitario);
    const frete = parseFloat(venda.frete);
    const freteAjuste = venda.freteAjuste ? parseFloat(venda.freteAjuste) : null;
    const freteBaseCost = venda.freteBaseCost ? parseFloat(venda.freteBaseCost) : null;
    const freteListCost = venda.freteListCost ? parseFloat(venda.freteListCost) : null;
    const freteFinalCost = venda.freteFinalCost ? parseFloat(venda.freteFinalCost) : null;

    // Se unitário >= 79 e frete é 0, isso é problemático
    if (unitario >= 79 && frete === 0) {
      problematicas.push(venda);

      console.log(`\n🔴 PROBLEMA ENCONTRADO - Order ID: ${venda.orderId}`);
      console.log(`   Tipo: ${venda.logisticType}`);
      console.log(`   Unitário: R$ ${unitario.toFixed(2)}`);
      console.log(`   Quantidade: ${venda.quantidade}`);
      console.log(`   Frete (atual): R$ ${frete.toFixed(2)} ❌ ZERADO`);
      console.log(`   Frete Ajuste: ${freteAjuste !== null ? `R$ ${freteAjuste.toFixed(2)}` : 'NULL'}`);

      // Mostrar dados do shipment que deveriam ser usados
      console.log(`   --- Dados do Shipment (devem ser usados): ---`);
      console.log(`   Base Cost: ${freteBaseCost !== null ? `R$ ${freteBaseCost.toFixed(2)}` : 'NULL'}`);
      console.log(`   List Cost: ${freteListCost !== null ? `R$ ${freteListCost.toFixed(2)}` : 'NULL'}`);
      console.log(`   Final Cost: ${freteFinalCost !== null ? `R$ ${freteFinalCost.toFixed(2)}` : 'NULL'}`);

      // Calcular o que deveria ser
      if (freteListCost !== null && freteFinalCost !== null) {
        const shouldBe = freteListCost - freteFinalCost;
        console.log(`   ✅ Frete CORRETO deveria ser: R$ ${shouldBe.toFixed(2)} (listCost - finalCost)`);
      }

      // Mostrar rawData se disponível
      if (venda.rawData && typeof venda.rawData === 'object') {
        const rawData = venda.rawData;
        if (rawData.freight) {
          console.log(`   --- Raw Freight Data: ---`);
          console.log(JSON.stringify(rawData.freight, null, 2));
        }
      }
    } else if (unitario >= 79) {
      console.log(`\n✅ OK - Order ID: ${venda.orderId}`);
      console.log(`   Tipo: ${venda.logisticType}`);
      console.log(`   Unitário: R$ ${unitario.toFixed(2)}`);
      console.log(`   Frete: R$ ${frete.toFixed(2)} ✅`);
    }
  }

  console.log(`\n\n=== RESUMO ===`);
  console.log(`Total analisado: ${vendas.length}`);
  console.log(`Com problema (frete zerado): ${problematicas.length}`);
  console.log(`Sem problema: ${vendas.length - problematicas.length}`);

  if (problematicas.length > 0) {
    console.log(`\n🔴 VENDAS COM FRETE INCORRETO (zerado quando deveria ter valor):`);
    for (const v of problematicas) {
      console.log(`   - ${v.orderId} | ${v.logisticType} | Unitário: R$ ${parseFloat(v.unitario).toFixed(2)}`);
    }
  }
}

investigateFreteAgencyColeta()
  .then(() => {
    console.log('\n✅ Investigação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
