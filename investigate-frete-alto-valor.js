const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateFreteAltoValor() {
  console.log('=== INVESTIGANDO VENDAS COM SHIPMENT COSTS ALTO (>R$79) ===\n');

  // Buscar vendas onde o custo do frete (freteListCost, freteBaseCost, etc) é > 79
  const vendas = await prisma.meliVenda.findMany({
    where: {
      OR: [
        { logisticType: 'Agência' },
        { logisticType: 'Coleta' },
        { logisticType: 'xd_drop_off' },
        { logisticType: 'cross_docking' }
      ]
    },
    orderBy: { dataVenda: 'desc' },
    take: 200
  });

  console.log(`Total de vendas Agência/Coleta encontradas: ${vendas.length}\n`);

  const problematicas = [];
  const comFreteAlto = [];

  for (const venda of vendas) {
    const unitario = parseFloat(venda.unitario);
    const frete = parseFloat(venda.frete);
    const freteAjuste = venda.freteAjuste ? parseFloat(venda.freteAjuste) : null;
    const freteBaseCost = venda.freteBaseCost ? parseFloat(venda.freteBaseCost) : null;
    const freteListCost = venda.freteListCost ? parseFloat(venda.freteListCost) : null;
    const freteFinalCost = venda.freteFinalCost ? parseFloat(venda.freteFinalCost) : null;

    // Verificar se algum dos custos de frete é > 79
    const custoFreteAlto = (freteBaseCost && Math.abs(freteBaseCost) > 79) ||
                          (freteListCost && Math.abs(freteListCost) > 79) ||
                          (freteFinalCost && Math.abs(freteFinalCost) > 79);

    if (custoFreteAlto) {
      comFreteAlto.push(venda);

      // Se o custo do frete é alto mas o frete final está zerado, isso é problemático
      if (frete === 0) {
        problematicas.push(venda);

        console.log(`\n🔴 PROBLEMA - Order ID: ${venda.orderId}`);
        console.log(`   Tipo: ${venda.logisticType}`);
        console.log(`   Unitário produto: R$ ${unitario.toFixed(2)}`);
        console.log(`   Frete (valor final): R$ ${frete.toFixed(2)} ❌ ZERADO`);
        console.log(`   --- Custos do Shipment (ALTOS): ---`);
        console.log(`   Base Cost: ${freteBaseCost !== null ? `R$ ${freteBaseCost.toFixed(2)}` : 'NULL'}`);
        console.log(`   List Cost: ${freteListCost !== null ? `R$ ${freteListCost.toFixed(2)}` : 'NULL'}`);
        console.log(`   Final Cost: ${freteFinalCost !== null ? `R$ ${freteFinalCost.toFixed(2)}` : 'NULL'}`);

        if (freteListCost !== null && freteFinalCost !== null) {
          const shouldBe = freteListCost - freteFinalCost;
          console.log(`   ✅ Frete CORRETO deveria ser: R$ ${shouldBe.toFixed(2)}`);
        }
      } else {
        console.log(`\n✅ OK - Order ID: ${venda.orderId}`);
        console.log(`   Tipo: ${venda.logisticType}`);
        console.log(`   Unitário: R$ ${unitario.toFixed(2)}`);
        console.log(`   Shipment Costs: Base=${freteBaseCost?.toFixed(2)} | List=${freteListCost?.toFixed(2)} | Final=${freteFinalCost?.toFixed(2)}`);
        console.log(`   Frete (valor final): R$ ${frete.toFixed(2)} ✅`);
      }
    }
  }

  console.log(`\n\n=== RESUMO ===`);
  console.log(`Total analisado: ${vendas.length}`);
  console.log(`Com shipment cost > R$79: ${comFreteAlto.length}`);
  console.log(`Com problema (frete zerado com shipment alto): ${problematicas.length}`);

  if (problematicas.length > 0) {
    console.log(`\n🔴 VENDAS COM PROBLEMA:`);
    for (const v of problematicas) {
      const listCost = v.freteListCost ? parseFloat(v.freteListCost) : 0;
      console.log(`   - ${v.orderId} | ${v.logisticType} | List Cost: R$ ${listCost.toFixed(2)}`);
    }
  }
}

investigateFreteAltoValor()
  .then(() => {
    console.log('\n✅ Investigação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
