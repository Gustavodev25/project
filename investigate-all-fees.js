/**
 * Script para investigar TODOS os campos de fee/taxa nas vendas do Mercado Livre
 *
 * Este script busca vendas e mostra TODOS os campos relacionados a taxas
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateAllFees() {
  console.log('🔍 Investigando TODOS os campos de fee/taxa...\n');

  // Buscar vendas com sale_fee não nulo
  const vendas = await prisma.meliVenda.findMany({
    where: {
      taxaPlataforma: {
        not: null
      },
      quantidade: {
        gte: 1
      }
    },
    take: 5,
    orderBy: {
      dataVenda: 'desc'
    }
  });

  console.log(`📊 Encontradas ${vendas.length} vendas com taxa da plataforma\n`);

  for (const venda of vendas) {
    console.log('='.repeat(80));
    console.log(`📦 Pedido: ${venda.orderId}`);
    console.log(`   Quantidade: ${venda.quantidade}`);
    console.log(`   Valor Unitário: R$ ${Number(venda.unitario).toFixed(2)}`);
    console.log(`   Valor Total: R$ ${Number(venda.valorTotal).toFixed(2)}`);
    console.log(`   Taxa no Banco: R$ ${venda.taxaPlataforma ? Number(venda.taxaPlataforma).toFixed(2) : 'N/A'}`);

    if (venda.rawData && typeof venda.rawData === 'object') {
      const rawData = venda.rawData;
      const order = rawData.order;

      if (order) {
        console.log(`\n   📋 FEES NO PEDIDO (order level):`);

        // Listar todos os campos que podem conter fees
        const orderFeeFields = [
          'total_amount',
          'paid_amount',
          'taxes',
          'transaction_details',
          'payments'
        ];

        orderFeeFields.forEach(field => {
          if (order[field]) {
            console.log(`   - ${field}:`, JSON.stringify(order[field], null, 2).substring(0, 200));
          }
        });

        if (order.order_items && Array.isArray(order.order_items)) {
          console.log(`\n   📋 FEES NOS ITEMS (${order.order_items.length} items):`);

          order.order_items.forEach((item, idx) => {
            console.log(`\n   === Item ${idx + 1} ===`);
            console.log(`   - Quantity: ${item.quantity || 'N/A'}`);
            console.log(`   - Unit Price: R$ ${item.unit_price ? Number(item.unit_price).toFixed(2) : 'N/A'}`);
            console.log(`   - Full Unit Price: R$ ${item.full_unit_price ? Number(item.full_unit_price).toFixed(2) : 'N/A'}`);

            // Todos os campos de fee possíveis
            const feeFields = [
              'sale_fee',
              'listing_fee',
              'transaction_fee',
              'shipping_fee',
              'processing_fee',
              'collection_fee',
              'financing_fee',
              'taxes',
              'discounts'
            ];

            console.log(`   \n   💰 FEES detectados:`);
            let totalFees = 0;
            feeFields.forEach(field => {
              if (item[field] !== undefined && item[field] !== null) {
                const value = Number(item[field]);
                console.log(`   - ${field}: R$ ${value.toFixed(2)}`);
                if (typeof item[field] === 'number') {
                  totalFees += value;
                }
              }
            });

            console.log(`   - TOTAL FEES: R$ ${totalFees.toFixed(2)}`);

            // Calcular % sobre o valor total do item
            if (item.unit_price && item.quantity) {
              const itemTotal = Number(item.unit_price) * item.quantity;
              const percentTotal = (totalFees / itemTotal) * 100;
              console.log(`   - % sobre valor do item: ${percentTotal.toFixed(2)}%`);
            }
          });

          // Comparar com a taxa do banco
          const somaAllFees = order.order_items.reduce((acc, item) => {
            const feeFields = ['sale_fee', 'listing_fee', 'transaction_fee', 'shipping_fee', 'processing_fee', 'collection_fee', 'financing_fee'];
            let itemFees = 0;
            feeFields.forEach(field => {
              if (item[field] !== undefined && item[field] !== null) {
                itemFees += Number(item[field]);
              }
            });
            return acc + itemFees;
          }, 0);

          console.log(`\n   💰 SOMA de TODOS os fees: R$ ${somaAllFees.toFixed(2)}`);
          console.log(`   💰 Taxa no banco: R$ ${venda.taxaPlataforma ? Math.abs(Number(venda.taxaPlataforma)).toFixed(2) : 'N/A'}`);

          const taxaEsperada = Math.abs(Number(venda.taxaPlataforma) || 0);
          const diferenca = Math.abs(somaAllFees - taxaEsperada);

          if (diferenca > 0.01) {
            console.log(`   ⚠️  DIVERGÊNCIA: ${diferenca.toFixed(2)}`);

            // Tentar identificar qual campo falta
            const percentAtual = (taxaEsperada / Number(venda.valorTotal)) * 100;
            const percentCompleto = (somaAllFees / Number(venda.valorTotal)) * 100;
            console.log(`   - % atual (banco): ${percentAtual.toFixed(2)}%`);
            console.log(`   - % completo (todos fees): ${percentCompleto.toFixed(2)}%`);
          } else {
            console.log(`   ✅ Taxas conferem`);
          }
        }
      }
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log('\n✅ Investigação concluída!');

  await prisma.$disconnect();
}

investigateAllFees().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
