/**
 * Script de Teste - Sincronização de Vendas do Mercado Livre
 *
 * Este script testa a nova sincronização otimizada com:
 * - SAFE_BATCH_SIZE aumentado (2000 quick / 5000 background)
 * - quickMode desativado por padrão
 * - Busca histórica desbloqueada
 *
 * USO:
 * node test-sync.js [accountId] [mode]
 *
 * EXEMPLOS:
 * node test-sync.js                    # Testa todas as contas (quickMode=false)
 * node test-sync.js 12345              # Testa conta específica (quickMode=false)
 * node test-sync.js 12345 full         # Testa conta com fullSync=true
 * node test-sync.js 12345 quick        # Testa conta com quickMode=true
 */

const BACKEND_URL = process.env.BACKEND_URL || "https://project-backend-rjoh.onrender.com";
const CRON_SECRET = process.env.CRON_SECRET || "your-cron-secret";

async function testSync(accountId = null, mode = "background") {
  const startTime = Date.now();

  console.log("🚀 Iniciando teste de sincronização...\n");

  // Configurar body da requisição
  const body = {};

  if (accountId) {
    body.accountIds = [accountId];
    console.log(`📋 Conta: ${accountId}`);
  } else {
    console.log("📋 Contas: TODAS");
  }

  // Configurar modo
  if (mode === "full") {
    body.fullSync = true;
    body.quickMode = false;
    console.log("⚙️  Modo: FULL SYNC (todas as vendas desde 2000)");
  } else if (mode === "quick") {
    body.fullSync = false;
    body.quickMode = true;
    console.log("⚙️  Modo: QUICK (até 2000 vendas recentes)");
  } else {
    body.fullSync = false;
    body.quickMode = false;
    console.log("⚙️  Modo: BACKGROUND (até 5000 vendas)");
  }

  console.log("");

  try {
    console.log(`🌐 Chamando: ${BACKEND_URL}/api/meli/vendas/sync\n`);

    const response = await fetch(`${BACKEND_URL}/api/meli/vendas/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET
      },
      body: JSON.stringify(body)
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`❌ Erro HTTP ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Resposta: ${errorText.substring(0, 500)}...\n`);
      return false;
    }

    const result = await response.json();

    console.log("✅ Sincronização concluída!\n");
    console.log("📊 RESULTADOS:");
    console.log(`   Duração: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);

    if (result.summary) {
      console.log(`   Total de vendas: ${result.summary.totalOrders || 0}`);
      console.log(`   Vendas salvas: ${result.summary.totalSaved || 0}`);
      console.log(`   Erros: ${result.summary.totalErrors || 0}`);
    }

    if (result.accounts) {
      console.log(`\n   Contas processadas: ${result.accounts.length}`);
      result.accounts.forEach(account => {
        console.log(`\n   Conta: ${account.nickname || account.accountId}`);
        console.log(`   - Vendas encontradas: ${account.fetched || 0}`);
        console.log(`   - Vendas salvas: ${account.saved || 0}`);
        console.log(`   - Status: ${account.status || "OK"}`);
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 TESTE CONCLUÍDO COM SUCESSO!");
    console.log("=".repeat(60) + "\n");

    return true;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ ERRO após ${duration}ms:\n`);
    console.error(error);
    console.log("");
    return false;
  }
}

// Parse argumentos
const args = process.argv.slice(2);
const accountId = args[0] && args[0] !== "full" && args[0] !== "quick" ? args[0] : null;
const mode = args[1] || (args[0] === "full" || args[0] === "quick" ? args[0] : "background");

// Executar teste
testSync(accountId, mode)
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Erro fatal:", error);
    process.exit(1);
  });
