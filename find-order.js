const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOrder() {
  const searchOrderId = '2000013480988064';

  try {
    console.log(`\n=== Buscando Venda #${searchOrderId} ===\n`);

    // Buscar no Mercado Livre
    const meliVenda = await prisma.meliVenda.findUnique({
      where: { orderId: searchOrderId }
    });

    if (meliVenda) {
      console.log('✅ Encontrada no Mercado Livre!');
      console.log(`  logisticType: ${meliVenda.logisticType}`);
      console.log(`  envioMode: ${meliVenda.envioMode}`);
      return;
    }

    // Buscar no Shopee
    const shopeeVenda = await prisma.shopeeVenda.findUnique({
      where: { orderId: searchOrderId }
    });

    if (shopeeVenda) {
      console.log('✅ Encontrada no Shopee!');
      console.log(`  logisticType: ${shopeeVenda.logisticType}`);
      return;
    }

    console.log('❌ Venda não encontrada em nenhuma plataforma.');
    console.log('\n📋 Listando vendas recentes do Mercado Livre:\n');

    // Listar vendas recentes
    const recentVendas = await prisma.meliVenda.findMany({
      take: 20,
      orderBy: { dataVenda: 'desc' },
      select: {
        orderId: true,
        dataVenda: true,
        logisticType: true,
        envioMode: true,
        status: true,
        valorTotal: true
      }
    });

    console.log('Order ID'.padEnd(20) + ' | ' + 'Data'.padEnd(12) + ' | ' + 'Logística'.padEnd(15) + ' | Status');
    console.log('-'.repeat(80));

    recentVendas.forEach(venda => {
      const date = new Date(venda.dataVenda).toLocaleDateString('pt-BR');
      const logistic = venda.logisticType || venda.envioMode || 'N/A';
      console.log(
        venda.orderId.padEnd(20) + ' | ' +
        date.padEnd(12) + ' | ' +
        logistic.padEnd(15) + ' | ' +
        venda.status
      );
    });

    // Buscar vendas com IDs similares
    console.log(`\n🔍 Buscando vendas com ID similar a "${searchOrderId}":\n`);

    const similarVendas = await prisma.meliVenda.findMany({
      where: {
        orderId: {
          contains: searchOrderId.substring(0, 12) // Buscar pelos primeiros 12 dígitos
        }
      },
      take: 10,
      select: {
        orderId: true,
        dataVenda: true,
        logisticType: true,
        status: true
      }
    });

    if (similarVendas.length > 0) {
      similarVendas.forEach(venda => {
        const date = new Date(venda.dataVenda).toLocaleDateString('pt-BR');
        console.log(`  ${venda.orderId} - ${date} - ${venda.logisticType || 'N/A'}`);
      });
    } else {
      console.log('  Nenhuma venda com ID similar encontrada.');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findOrder();
