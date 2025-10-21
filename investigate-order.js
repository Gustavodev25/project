const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateOrder() {
  const orderId = '2000013480988064';

  try {
    console.log(`\n=== Investigando Venda #${orderId} ===\n`);

    const venda = await prisma.meliVenda.findUnique({
      where: { orderId }
    });

    if (!venda) {
      console.log('❌ Venda não encontrada no banco de dados.');
      return;
    }

    console.log('📋 Dados Básicos:');
    console.log(`  Order ID: ${venda.orderId}`);
    console.log(`  Data da Venda: ${venda.dataVenda}`);
    console.log(`  Status: ${venda.status}`);
    console.log(`  Conta: ${venda.conta}`);
    console.log(`  Valor Total: R$ ${venda.valorTotal}`);
    console.log(`  Quantidade: ${venda.quantidade}`);
    console.log(`  Frete: R$ ${venda.frete}`);

    console.log('\n🚚 Dados de Logística:');
    console.log(`  logisticType (salvo): ${venda.logisticType}`);
    console.log(`  envioMode (salvo): ${venda.envioMode}`);
    console.log(`  shippingStatus: ${venda.shippingStatus}`);
    console.log(`  shippingId: ${venda.shippingId}`);

    if (venda.rawData) {
      const rawData = venda.rawData;

      console.log('\n📦 Dados do Shipment (rawData.shipment):');
      if (rawData.shipment) {
        const shipment = rawData.shipment;
        console.log(`  logistic_type: ${shipment.logistic_type}`);
        console.log(`  status: ${shipment.status}`);
        console.log(`  substatus: ${shipment.substatus}`);
        console.log(`  shipping_mode: ${shipment.shipping_mode}`);
        console.log(`  type: ${shipment.type}`);
        console.log(`  base_cost: ${shipment.base_cost}`);
        console.log(`  cost: ${shipment.cost}`);

        if (shipment.shipping_option) {
          console.log('\n  shipping_option:');
          console.log(`    cost: ${shipment.shipping_option.cost}`);
          console.log(`    list_cost: ${shipment.shipping_option.list_cost}`);
          console.log(`    name: ${shipment.shipping_option.name}`);
          console.log(`    shipping_method_id: ${shipment.shipping_option.shipping_method_id}`);
        }
      } else {
        console.log('  ⚠️ Sem dados de shipment no rawData');
      }

      console.log('\n📋 Dados do Order (rawData.order):');
      if (rawData.order) {
        const order = rawData.order;
        if (order.shipping) {
          console.log(`  shipping.mode: ${order.shipping.mode}`);
          console.log(`  shipping.logistic_type: ${order.shipping.logistic_type}`);
          console.log(`  shipping.cost: ${order.shipping.cost}`);
          console.log(`  shipping.id: ${order.shipping.id}`);
        } else {
          console.log('  ⚠️ Sem dados de shipping no order');
        }
      } else {
        console.log('  ⚠️ Sem dados de order no rawData');
      }

      console.log('\n🔧 Dados do Freight (rawData.freight):');
      if (rawData.freight) {
        const freight = rawData.freight;
        console.log(`  logisticType: ${freight.logisticType}`);
        console.log(`  logisticTypeSource: ${freight.logisticTypeSource}`);
        console.log(`  shippingMode: ${freight.shippingMode}`);
        console.log(`  baseCost: ${freight.baseCost}`);
        console.log(`  listCost: ${freight.listCost}`);
        console.log(`  shipmentCost: ${freight.shipmentCost}`);
        console.log(`  finalCost: ${freight.finalCost}`);
        console.log(`  adjustedCost: ${freight.adjustedCost}`);
        console.log(`  adjustmentSource: ${freight.adjustmentSource}`);
      } else {
        console.log('  ⚠️ Sem dados de freight no rawData');
      }

      // Mostrar JSON completo do shipment para análise
      if (rawData.shipment) {
        console.log('\n📄 JSON Completo do Shipment:');
        console.log(JSON.stringify(rawData.shipment, null, 2));
      }
    } else {
      console.log('\n⚠️ Esta venda não possui rawData (JSON completo)');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateOrder();
