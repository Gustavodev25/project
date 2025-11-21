// Script de diagnóstico para verificar vendas no banco de dados
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkVendas() {
  try {
    console.log('🔍 Verificando vendas no banco de dados...\n');

    // 1. Contar total de vendas
    const totalVendas = await prisma.meliVenda.count();
    console.log(`📊 Total de vendas no banco: ${totalVendas}`);

    if (totalVendas === 0) {
      console.log('\n❌ Nenhuma venda encontrada no banco de dados!');
      console.log('\n🔍 Verificando contas conectadas...\n');

      const contas = await prisma.meliAccount.findMany({
        select: {
          id: true,
          nickname: true,
          ml_user_id: true,
          expires_at: true,
          created_at: true,
          userId: true
        }
      });

      console.log(`📊 Total de contas Mercado Livre: ${contas.length}`);

      if (contas.length > 0) {
        console.log('\n✅ Contas encontradas:');
        contas.forEach((conta, index) => {
          console.log(`\n  Conta ${index + 1}:`);
          console.log(`    ID: ${conta.id}`);
          console.log(`    Nickname: ${conta.nickname || 'N/A'}`);
          console.log(`    ML User ID: ${conta.ml_user_id}`);
          console.log(`    User ID: ${conta.userId}`);
          console.log(`    Expira em: ${conta.expires_at}`);
          console.log(`    Criada em: ${conta.created_at}`);
        });

        console.log('\n⚠️ DIAGNÓSTICO: Você tem contas conectadas mas nenhuma venda sincronizada.');
        console.log('   Possíveis causas:');
        console.log('   1. Nunca executou a sincronização');
        console.log('   2. Erro durante a sincronização (verifique logs)');
        console.log('   3. As contas não têm vendas no período configurado');
      } else {
        console.log('\n❌ Nenhuma conta do Mercado Livre conectada!');
        console.log('   Você precisa conectar uma conta primeiro.');
      }
    } else {
      console.log('\n✅ Vendas encontradas! Mostrando detalhes...\n');

      // Agrupar por usuário
      const vendasPorUsuario = await prisma.meliVenda.groupBy({
        by: ['userId'],
        _count: {
          orderId: true
        }
      });

      console.log('📊 Vendas por usuário:');
      for (const grupo of vendasPorUsuario) {
        const user = await prisma.user.findUnique({
          where: { id: grupo.userId },
          select: { email: true, name: true }
        });
        console.log(`  - User: ${user?.name || user?.email || grupo.userId}`);
        console.log(`    Total de vendas: ${grupo._count.orderId}`);
      }

      // Mostrar últimas 5 vendas
      console.log('\n📦 Últimas 5 vendas sincronizadas:');
      const ultimasVendas = await prisma.meliVenda.findMany({
        take: 5,
        orderBy: { sincronizadoEm: 'desc' },
        select: {
          orderId: true,
          dataVenda: true,
          titulo: true,
          valorTotal: true,
          status: true,
          conta: true,
          userId: true,
          sincronizadoEm: true
        }
      });

      ultimasVendas.forEach((venda, index) => {
        console.log(`\n  ${index + 1}. Order ID: ${venda.orderId}`);
        console.log(`     Título: ${venda.titulo}`);
        console.log(`     Valor: R$ ${venda.valorTotal}`);
        console.log(`     Status: ${venda.status}`);
        console.log(`     Conta: ${venda.conta}`);
        console.log(`     User ID: ${venda.userId}`);
        console.log(`     Data da venda: ${venda.dataVenda}`);
        console.log(`     Sincronizado em: ${venda.sincronizadoEm}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Erro ao verificar vendas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVendas();
