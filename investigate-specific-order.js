const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateSpecificOrder() {
  console.log('=== INVESTIGANDO ORDER 2000013456890510 ===\n');

  const venda = await prisma.meliVenda.findUnique({
    where: { orderId: '2000013456890510' }
  });

  if (!venda) {
    console.log('❌ Venda não encontrada');
    return;
  }

  console.log('📦 INFORMAÇÕES DA VENDA:');
  console.log(`Order ID: ${venda.orderId}`);
  console.log(`Tipo Logístico: ${venda.logisticType}`);
  console.log(`Unitário: R$ ${parseFloat(venda.unitario).toFixed(2)}`);
  console.log(`Quantidade: ${venda.quantidade}`);
  console.log(`Valor Total: R$ ${parseFloat(venda.valorTotal).toFixed(2)}`);
  console.log(`Frete (salvo): R$ ${parseFloat(venda.frete).toFixed(2)}`);

  if (venda.rawData && typeof venda.rawData === 'object') {
    console.log('\n📄 RAW DATA COMPLETO:');
    console.log(JSON.stringify(venda.rawData, null, 2));
  }
}

investigateSpecificOrder()
  .then(() => {
    console.log('\n✅ Investigação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
