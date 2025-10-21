const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function identifyAffectedOrders() {
  console.log('=== IDENTIFICANDO VENDAS AFETADAS PELA CORREÇÃO ===\n');

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
    orderBy: { dataVenda: 'desc' }
  });

  console.log(`Total de vendas Agência/Coleta com unitário >= R$79: ${vendas.length}\n`);

  const affected = [];

  for (const venda of vendas) {
    if (!venda.rawData || typeof venda.rawData !== 'object' || !venda.rawData.freight) {
      continue;
    }

    const freight = venda.rawData.freight;
    const listCost = freight.listCost ?? 0;
    const baseCost = freight.baseCost ?? 0;
    const frete = parseFloat(venda.frete);

    // Verifica se é um caso onde listCost é 0/null mas baseCost tem valor
    // Nesse caso, a correção vai usar baseCost como fallback
    if ((listCost === null || listCost === 0) && baseCost !== null && baseCost !== 0) {
      affected.push({
        orderId: venda.orderId,
        tipo: venda.logisticType,
        unitario: parseFloat(venda.unitario),
        freteAtual: frete,
        listCost,
        baseCost,
        freteNovo: -baseCost  // Será -baseCost após correção
      });
    }
  }

  console.log(`\n📊 VENDAS QUE SERÃO AFETADAS PELA CORREÇÃO: ${affected.length}\n`);

  if (affected.length > 0) {
    console.log('Lista de vendas que terão o frete recalculado:\n');
    affected.slice(0, 20).forEach(v => {
      console.log(`Order ID: ${v.orderId}`);
      console.log(`  Tipo: ${v.tipo}`);
      console.log(`  Unitário: R$ ${v.unitario.toFixed(2)}`);
      console.log(`  Frete Atual: R$ ${v.freteAtual.toFixed(2)}`);
      console.log(`  Frete Novo (estimado): R$ ${v.freteNovo.toFixed(2)}`);
      console.log(`  baseCost usado: R$ ${v.baseCost.toFixed(2)}`);
      console.log('');
    });

    if (affected.length > 20) {
      console.log(`... e mais ${affected.length - 20} vendas\n`);
    }
  } else {
    console.log('✅ Nenhuma venda será afetada pela correção.');
    console.log('Isso significa que as vendas atuais já estão corretas ou não há casos');
    console.log('onde listCost está zerado mas baseCost tem valor.\n');
  }

  console.log('\n=== PRÓXIMOS PASSOS ===');
  if (affected.length > 0) {
    console.log('Para aplicar a correção, você precisa ressincronizar essas vendas.');
    console.log('Isso pode ser feito através do modal de sincronização no sistema.');
  } else {
    console.log('A correção está implementada e funcionará para futuras vendas.');
    console.log('Não é necessário ressincronizar vendas existentes.');
  }
}

identifyAffectedOrders()
  .then(() => {
    console.log('\n✅ Análise concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
