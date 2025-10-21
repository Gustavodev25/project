const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogisticTypes() {
  try {
    // Buscar todos os logisticType únicos
    const vendas = await prisma.meliVenda.findMany({
      select: {
        logisticType: true,
        envioMode: true,
        orderId: true,
      },
      where: {
        logisticType: {
          not: null
        }
      }
    });

    // Agrupar por logisticType
    const grouped = vendas.reduce((acc, venda) => {
      const type = venda.logisticType || 'null';
      if (!acc[type]) {
        acc[type] = { count: 0, envioModes: new Set(), orderIds: [] };
      }
      acc[type].count++;
      if (venda.envioMode) {
        acc[type].envioModes.add(venda.envioMode);
      }
      // Guardar apenas os primeiros 3 orderIds como exemplo
      if (acc[type].orderIds.length < 3) {
        acc[type].orderIds.push(venda.orderId);
      }
      return acc;
    }, {});

    console.log('\n=== Tipos de Logística no Banco ===\n');
    Object.entries(grouped)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([type, data]) => {
        console.log(`${type}:`);
        console.log(`  Total: ${data.count}`);
        console.log(`  Modos de envio: ${Array.from(data.envioModes).join(', ') || 'nenhum'}`);
        console.log(`  Exemplos de IDs: ${data.orderIds.join(', ')}`);
        console.log('');
      });

    // Buscar vendas sem logisticType
    const semLogisticType = await prisma.meliVenda.count({
      where: {
        logisticType: null
      }
    });

    console.log(`\nVendas SEM logisticType: ${semLogisticType}`);

    // Buscar se há vendas com rawData contendo cross_docking
    const vendasComCrossDocking = await prisma.meliVenda.findMany({
      where: {
        OR: [
          {
            rawData: {
              path: ['shipment', 'logistic_type'],
              string_contains: 'cross_docking'
            }
          },
          {
            rawData: {
              path: ['order', 'shipping', 'mode'],
              string_contains: 'cross_docking'
            }
          }
        ]
      },
      select: {
        orderId: true,
        logisticType: true,
        envioMode: true,
        rawData: true
      }
    });

    console.log(`\n=== Vendas com cross_docking no rawData ===`);
    console.log(`Total encontrado: ${vendasComCrossDocking.length}`);

    if (vendasComCrossDocking.length > 0) {
      console.log('\nExemplos:');
      vendasComCrossDocking.slice(0, 3).forEach(venda => {
        const shipment = venda.rawData?.shipment || {};
        const order = venda.rawData?.order || {};
        console.log(`\nOrder ID: ${venda.orderId}`);
        console.log(`  logisticType salvo: ${venda.logisticType}`);
        console.log(`  envioMode salvo: ${venda.envioMode}`);
        console.log(`  shipment.logistic_type: ${shipment.logistic_type}`);
        console.log(`  order.shipping.mode: ${order.shipping?.mode}`);
      });
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogisticTypes();
