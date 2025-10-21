/**
 * Script para investigar a estrutura do sale_fee nas vendas do Mercado Livre
 *
 * Este script busca vendas com quantity > 1 e mostra:
 * - Estrutura completa do sale_fee
 * - Relação entre sale_fee, unit_price e quantity
 * - Se sale_fee é por unidade ou total
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateSaleFee() {
  console.log('🔍 Investigando estrutura do sale_fee...\n');

  // Buscar vendas com quantidade > 1
  const vendas = await prisma.meliVenda.findMany({
    where: {
      quantidade: {
        gt: 1
      }
    },
    take: 10,
    orderBy: {
      dataVenda: 'desc'
    }
  });

  console.log(`📊 Encontradas ${vendas.length} vendas com quantidade > 1\n`);

  for (const venda of vendas) {
    console.log('='.repeat(80));
    console.log(`📦 Pedido: ${venda.orderId}`);
    console.log(`   Quantidade: ${venda.quantidade}`);
    console.log(`   Valor Unitário: R$ ${Number(venda.unitario).toFixed(2)}`);
    console.log(`   Valor Total: R$ ${Number(venda.valorTotal).toFixed(2)}`);
    console.log(`   Taxa Plataforma: R$ ${venda.taxaPlataforma ? Number(venda.taxaPlataforma).toFixed(2) : 'N/A'}`);

    if (venda.rawData && typeof venda.rawData === 'object') {
      const rawData = venda.rawData;
      const order = rawData.order;

      if (order && order.order_items && Array.isArray(order.order_items)) {
        console.log(`\n   📋 Items do pedido (${order.order_items.length}):`);

        order.order_items.forEach((item, idx) => {
          console.log(`\n   Item ${idx + 1}:`);
          console.log(`   - Quantity: ${item.quantity || 'N/A'}`);
          console.log(`   - Unit Price: R$ ${item.unit_price ? Number(item.unit_price).toFixed(2) : 'N/A'}`);
          console.log(`   - Sale Fee: R$ ${item.sale_fee ? Number(item.sale_fee).toFixed(2) : 'N/A'}`);

          // Calcular o que seria se fosse por unidade vs total
          if (item.sale_fee && item.quantity) {
            const saleFeePerUnit = Number(item.sale_fee) / item.quantity;
            const saleFeeTotal = Number(item.sale_fee);

            console.log(`   - Se for POR UNIDADE: cada unidade custa R$ ${saleFeePerUnit.toFixed(2)} de taxa`);
            console.log(`   - Se for TOTAL: taxa total de R$ ${saleFeeTotal.toFixed(2)} para ${item.quantity} unidades`);

            // Verificar qual faz mais sentido (taxa geralmente é ~10-15% do preço)
            if (item.unit_price) {
              const percentPerUnit = (saleFeePerUnit / Number(item.unit_price)) * 100;
              const percentTotal = (saleFeeTotal / (Number(item.unit_price) * item.quantity)) * 100;

              console.log(`   - % se for POR UNIDADE: ${percentPerUnit.toFixed(2)}%`);
              console.log(`   - % se for TOTAL: ${percentTotal.toFixed(2)}%`);
            }
          }
        });

        // Calcular soma total de sale_fee
        const totalSaleFee = order.order_items.reduce((acc, item) => {
          return acc + (Number(item.sale_fee) || 0);
        }, 0);

        console.log(`\n   💰 Soma de sale_fee (código atual): R$ ${totalSaleFee.toFixed(2)}`);
        console.log(`   💰 Taxa no banco (taxaPlataforma): R$ ${venda.taxaPlataforma ? Math.abs(Number(venda.taxaPlataforma)).toFixed(2) : 'N/A'}`);

        // Verificar se está correto
        const taxaEsperada = Math.abs(Number(venda.taxaPlataforma) || 0);
        const diferenca = Math.abs(totalSaleFee - taxaEsperada);

        if (diferenca > 0.01) {
          console.log(`   ⚠️  DIVERGÊNCIA detectada: ${diferenca.toFixed(2)}`);
        } else {
          console.log(`   ✅ Taxa confere com a soma dos sale_fee`);
        }
      }
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log('\n✅ Investigação concluída!');

  await prisma.$disconnect();
}

investigateSaleFee().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
