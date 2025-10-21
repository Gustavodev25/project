const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchOrderFromAllAccounts() {
  const orderId = '2000013480988064';

  try {
    console.log(`\n=== Buscando Venda #${orderId} em todas as contas ===\n`);

    // Buscar todas as contas do Mercado Livre
    const accounts = await prisma.meliAccount.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });

    if (accounts.length === 0) {
      console.log('❌ Nenhuma conta do Mercado Livre encontrada.');
      return;
    }

    console.log(`📋 Encontradas ${accounts.length} conta(s):\n`);
    accounts.forEach((acc, idx) => {
      const expired = new Date(acc.expires_at) < new Date() ? '🔴 EXPIRADO' : '✅ ATIVO';
      console.log(`  ${idx + 1}. ${acc.nickname || acc.ml_user_id} - ${expired}`);
    });

    const MELI_API_BASE = 'https://api.mercadolibre.com';

    // Tentar buscar com cada conta
    for (const account of accounts) {
      console.log(`\n🔍 Tentando com conta: ${account.nickname || account.ml_user_id}...`);

      const headers = {
        'Authorization': `Bearer ${account.access_token}`
      };

      try {
        const orderResponse = await fetch(`${MELI_API_BASE}/orders/${orderId}`, {
          headers
        });

        if (orderResponse.status === 403) {
          console.log(`   ❌ 403 - Venda não pertence a esta conta`);
          continue;
        }

        if (!orderResponse.ok) {
          console.log(`   ❌ Erro ${orderResponse.status}: ${orderResponse.statusText}`);
          continue;
        }

        const order = await orderResponse.json();
        console.log(`   ✅ VENDA ENCONTRADA NESTA CONTA!`);

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
          console.log(`  ⭐ mode: ${order.shipping.mode}`);
          console.log(`  ⭐ logistic_type: ${order.shipping.logistic_type || 'N/A'}`);
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
            console.log(`  ⭐⭐⭐ logistic_type: ${shipment.logistic_type || 'N/A'}`);
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
            }

            // Analisar o tipo de logística
            console.log(`\n🔍 ANÁLISE DO TIPO DE LOGÍSTICA:`);
            const logisticTypeFromShipment = shipment.logistic_type;
            const logisticTypeFromOrder = order.shipping?.mode;
            const finalLogisticType = logisticTypeFromShipment || logisticTypeFromOrder;

            console.log(`  Origem: ${logisticTypeFromShipment ? 'shipment.logistic_type' : 'order.shipping.mode'}`);
            console.log(`  Valor: "${finalLogisticType}"`);

            if (finalLogisticType === 'cross_docking') {
              console.log(`\n  🎯 ✅ CONFIRMADO: Esta venda É do tipo CROSS_DOCKING (Coleta)!`);
            } else if (finalLogisticType === 'xd_drop_off') {
              console.log(`\n  ✅ Esta venda é do tipo XD_DROP_OFF (Agência)`);
            } else if (finalLogisticType === 'self_service') {
              console.log(`\n  ✅ Esta venda é do tipo SELF_SERVICE (FLEX)`);
            } else if (finalLogisticType === 'drop_off') {
              console.log(`\n  ✅ Esta venda é do tipo DROP_OFF (Correios)`);
            } else if (finalLogisticType === 'fulfillment') {
              console.log(`\n  ✅ Esta venda é do tipo FULFILLMENT (FULL)`);
            } else {
              console.log(`\n  ⚠️ Tipo desconhecido: "${finalLogisticType}"`);
            }

            // Mostrar conversão
            const conversions = {
              'cross_docking': 'Coleta',
              'xd_drop_off': 'Agência',
              'self_service': 'FLEX',
              'drop_off': 'Correios',
              'fulfillment': 'FULL'
            };
            const converted = conversions[finalLogisticType] || finalLogisticType;
            console.log(`  Será convertido e salvo como: "${converted}"`);

          } else {
            console.log(`❌ Erro ao buscar shipment: ${shipmentResponse.status}`);
          }
        } else {
          console.log(`\n⚠️ Esta venda não tem shipping_id`);
        }

        // Encontrou, não precisa continuar
        return;

      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
        continue;
      }
    }

    console.log(`\n❌ Venda não encontrada em nenhuma conta disponível.`);
    console.log(`   Possíveis causas:`);
    console.log(`   - A venda pertence a uma conta não conectada`);
    console.log(`   - O ID da venda está incorreto`);
    console.log(`   - A venda foi cancelada ou removida`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fetchOrderFromAllAccounts();
