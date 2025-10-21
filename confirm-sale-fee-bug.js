/**
 * Script para CONFIRMAR o bug do sale_fee
 * Compara vendas do MESMO PRODUTO com diferentes quantidades
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function confirmSaleFeeBug() {
  console.log('🔍 Confirmando bug do sale_fee...\n');

  // Buscar vendas agrupadas por SKU
  const vendas = await prisma.meliVenda.findMany({
    where: {
      taxaPlataforma: {
        not: null
      },
      sku: {
        not: null
      }
    },
    orderBy: {
      dataVenda: 'desc'
    },
    take: 100
  });

  // Agrupar por SKU
  const gruposPorSku = {};
  vendas.forEach(venda => {
    const sku = venda.sku;
    if (!gruposPorSku[sku]) {
      gruposPorSku[sku] = [];
    }
    gruposPorSku[sku].push(venda);
  });

  console.log('📊 Analisando grupos de SKU com múltiplas vendas...\n');

  // Procurar SKUs que tenham vendas com quantidade diferente
  for (const [sku, vendasDoSku] of Object.entries(gruposPorSku)) {
    if (vendasDoSku.length < 2) continue;

    // Verificar se há vendas com quantidade diferente
    const quantidades = [...new Set(vendasDoSku.map(v => v.quantidade))];
    if (quantidades.length < 2) continue;

    console.log('='.repeat(80));
    console.log(`📦 SKU: ${sku}`);
    console.log(`   Vendas encontradas: ${vendasDoSku.length}`);
    console.log(`   Quantidades diferentes: ${quantidades.join(', ')}`);

    // Agrupar por quantidade
    const porQuantidade = {};
    vendasDoSku.forEach(v => {
      const qty = v.quantidade;
      if (!porQuantidade[qty]) {
        porQuantidade[qty] = [];
      }
      porQuantidade[qty].push(v);
    });

    console.log('\n   Comparação por quantidade:\n');

    for (const [qty, vendas] of Object.entries(porQuantidade).sort((a, b) => Number(a[0]) - Number(b[0]))) {
      const venda = vendas[0]; // Pegar primeira venda do grupo

      if (venda.rawData && typeof venda.rawData === 'object') {
        const rawData = venda.rawData;
        const order = rawData.order;
        const item = order?.order_items?.[0];

        if (item && item.sale_fee !== undefined) {
          const saleFee = Number(item.sale_fee);
          const unitPrice = Number(item.unit_price || venda.unitario);
          const quantidade = Number(qty);
          const valorTotal = unitPrice * quantidade;
          const percentual = (saleFee / valorTotal) * 100;

          console.log(`   Quantidade ${qty}:`);
          console.log(`     - Unitário: R$ ${unitPrice.toFixed(2)}`);
          console.log(`     - Valor Total: R$ ${valorTotal.toFixed(2)}`);
          console.log(`     - Sale Fee (API): R$ ${saleFee.toFixed(2)}`);
          console.log(`     - % Taxa: ${percentual.toFixed(2)}%`);

          // Projetar o que deveria ser
          const saleFeeEsperado = saleFee * quantidade;
          const percentualEsperado = (saleFeeEsperado / valorTotal) * 100;

          if (quantidade > 1) {
            console.log(`     - Sale Fee ESPERADO (se mult. qty): R$ ${saleFeeEsperado.toFixed(2)}`);
            console.log(`     - % Taxa ESPERADA: ${percentualEsperado.toFixed(2)}%`);

            if (Math.abs(saleFee - saleFeeEsperado) > 0.01) {
              console.log(`     ⚠️  BUG CONFIRMADO: Sale fee NÃO foi multiplicado pela quantidade!`);
            }
          }
        }
      }
    }

    // Comparar taxa proporcional entre quantidade 1 e outras quantidades
    const vendaQty1 = porQuantidade['1']?.[0];
    const outrasQuantidades = Object.keys(porQuantidade).filter(q => Number(q) > 1);

    if (vendaQty1 && outrasQuantidades.length > 0) {
      console.log(`\n   📊 Análise comparativa com quantidade 1:\n`);

      const item1 = vendaQty1.rawData?.order?.order_items?.[0];
      if (item1 && item1.sale_fee) {
        const saleFeeBase = Number(item1.sale_fee);
        const unitPriceBase = Number(item1.unit_price || vendaQty1.unitario);
        const percentBase = (saleFeeBase / unitPriceBase) * 100;

        console.log(`     Quantidade 1 (BASE):`);
        console.log(`       - Sale Fee: R$ ${saleFeeBase.toFixed(2)}`);
        console.log(`       - % Taxa: ${percentBase.toFixed(2)}%`);

        for (const qty of outrasQuantidades) {
          const vendaQtyN = porQuantidade[qty][0];
          const itemN = vendaQtyN.rawData?.order?.order_items?.[0];

          if (itemN && itemN.sale_fee) {
            const saleFeeN = Number(itemN.sale_fee);
            const quantidade = Number(qty);
            const valorTotalN = Number(itemN.unit_price || vendaQtyN.unitario) * quantidade;
            const percentN = (saleFeeN / valorTotalN) * 100;

            console.log(`\n     Quantidade ${qty}:`);
            console.log(`       - Sale Fee (API): R$ ${saleFeeN.toFixed(2)}`);
            console.log(`       - % Taxa: ${percentN.toFixed(2)}%`);

            // Verificar se é o mesmo ou múltiplo
            const ratio = saleFeeN / saleFeeBase;
            console.log(`       - Razão (fee qty${qty} / fee qty1): ${ratio.toFixed(2)}x`);

            if (Math.abs(ratio - 1) < 0.01) {
              console.log(`       ⚠️  MESMO VALOR! API NÃO multiplicou pela quantidade!`);
            } else if (Math.abs(ratio - quantidade) < 0.01) {
              console.log(`       ✅  Valor proporcional! API multiplicou corretamente.`);
            } else {
              console.log(`       ⚠️  Valor não é proporcional nem fixo!`);
            }
          }
        }
      }
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log('\n✅ Análise concluída!');

  await prisma.$disconnect();
}

confirmSaleFeeBug().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
