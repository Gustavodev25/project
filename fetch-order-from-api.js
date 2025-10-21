const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchOrderFromAPI() {
  const orderId = '2000013480988064';

  try {
    console.log(`\n=== Buscando Venda #${orderId} da API do Mercado Livre ===\n`);

    // Buscar uma conta ativa do Mercado Livre
    const account = await prisma.meliAccount.findFirst({
      where: {
        expires_at: {
          gt: new Date()
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!account) {
      console.log('❌ Nenhuma conta do Mercado Livre encontrada ou token expirado.');
      console.log('   Por favor, conecte uma conta primeiro.');
      return;
    }

    console.log(`✅ Usando conta: ${account.nickname || account.ml_user_id}`);
    console.log(`   Token expira em: ${account.expires_at}`);

    // Buscar o pedido da API
    const MELI_API_BASE = 'https://api.mercadolibre.com';
    const headers = {
      'Authorization': `Bearer ${account.access_token}`
    };

    console.log(`\n🔍 Buscando order #${orderId}...`);

    const orderResponse = await fetch(`${MELI_API_BASE}/orders/${orderId}`, {
      headers
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.log(`❌ Erro ao buscar order: ${orderResponse.status} ${orderResponse.statusText}`);
      console.log(`   Resposta: ${errorText}`);
      return;
    }

    const order = await orderResponse.json();
    console.log(`✅ Order encontrado!`);

    // Dados básicos
    console.log(`\n📋 Dados Básicos:`);
    console.log(`  ID: ${order.id}`);
    console.log(`  Status: ${order.status}`);
    console.log(`  Date Created: ${order.date_created}`);
    console.log(`  Total Amount: R$ ${order.total_amount}`);
    console.log(`  Buyer: ${order.buyer?.nickname || 'N/A'}`);

    // Dados de shipping do order
    console.log(`\n🚚 Dados de Shipping (order.shipping):`);
    if (order.shipping) {
      console.log(`  ID: ${order.shipping.id}`);
      console.log(`  mode: ${order.shipping.mode}`);
      console.log(`  logistic_type: ${order.shipping.logistic_type || 'N/A'}`);
      console.log(`  cost: ${order.shipping.cost}`);
      console.log(`  status: ${order.shipping.status}`);
    } else {
      console.log(`  ⚠️ Sem dados de shipping`);
    }

    // Buscar o shipment se existir
    const shippingId = order.shipping?.id;
    if (shippingId) {
      console.log(`\n🔍 Buscando shipment #${shippingId}...`);

      const shipmentResponse = await fetch(`${MELI_API_BASE}/shipments/${shippingId}`, {
        headers
      });

      if (shipmentResponse.ok) {
        const shipment = await shipmentResponse.json();
        console.log(`✅ Shipment encontrado!`);

        console.log(`\n📦 Dados do Shipment:`);
        console.log(`  ID: ${shipment.id}`);
        console.log(`  ⭐ logistic_type: ${shipment.logistic_type || 'N/A'}`);
        console.log(`  status: ${shipment.status}`);
        console.log(`  substatus: ${shipment.substatus}`);
        console.log(`  shipping_mode: ${shipment.shipping_mode || 'N/A'}`);
        console.log(`  type: ${shipment.type || 'N/A'}`);

        console.log(`\n💰 Custos:`);
        console.log(`  base_cost: ${shipment.base_cost}`);
        console.log(`  cost: ${shipment.cost}`);

        if (shipment.shipping_option) {
          console.log(`\n  📋 Shipping Option:`);
          console.log(`    cost: ${shipment.shipping_option.cost}`);
          console.log(`    list_cost: ${shipment.shipping_option.list_cost}`);
          console.log(`    name: ${shipment.shipping_option.name}`);
          console.log(`    shipping_method_id: ${shipment.shipping_option.shipping_method_id}`);
        }

        // Analisar o tipo de logística
        console.log(`\n🔍 ANÁLISE DO TIPO DE LOGÍSTICA:`);
        const logisticType = shipment.logistic_type || order.shipping?.mode;
        console.log(`  Tipo detectado: "${logisticType}"`);

        if (logisticType === 'cross_docking') {
          console.log(`  ✅ Esta venda É do tipo CROSS_DOCKING (Coleta)!`);
        } else if (logisticType === 'xd_drop_off') {
          console.log(`  ✅ Esta venda é do tipo XD_DROP_OFF (Agência)`);
        } else if (logisticType === 'self_service') {
          console.log(`  ✅ Esta venda é do tipo SELF_SERVICE (FLEX)`);
        } else if (logisticType === 'drop_off') {
          console.log(`  ✅ Esta venda é do tipo DROP_OFF (Correios)`);
        } else if (logisticType === 'fulfillment') {
          console.log(`  ✅ Esta venda é do tipo FULFILLMENT (FULL)`);
        } else {
          console.log(`  ⚠️ Tipo desconhecido ou não mapeado: "${logisticType}"`);
        }

        // Mostrar conversão
        const conversions = {
          'cross_docking': 'Coleta',
          'xd_drop_off': 'Agência',
          'self_service': 'FLEX',
          'drop_off': 'Correios',
          'fulfillment': 'FULL'
        };
        const converted = conversions[logisticType] || logisticType;
        console.log(`  Será salvo no banco como: "${converted}"`);

        console.log(`\n📄 JSON Completo do Shipment:`);
        console.log(JSON.stringify(shipment, null, 2));

      } else {
        console.log(`❌ Erro ao buscar shipment: ${shipmentResponse.status}`);
      }
    } else {
      console.log(`\n⚠️ Esta venda não tem shipping_id`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fetchOrderFromAPI();
