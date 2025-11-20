/**
 * Server Startup - Inicialização do Servidor
 *
 * NOTA: Cron jobs locais foram DESCONTINUADOS
 *
 * Agora usamos:
 * 1. Webhooks do Mercado Livre (/api/meli/webhook) para sincronização real-time
 * 2. Vercel Cron (vercel.json) para tarefas periódicas
 *
 * Veja src/lib/cron.ts para mais detalhes sobre a migração.
 */

let serverInitialized = false;

export async function initializeServer() {
  // Inicialização do servidor (se necessário no futuro)
  if (!serverInitialized) {
    try {
      // Aqui você pode adicionar outras inicializações necessárias
      // Ex: conectar ao banco de dados, cache, etc.

      serverInitialized = true;

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Servidor inicializado (webhooks: /api/meli/webhook)");
        console.log("ℹ️  Cron jobs locais descontinuados - agora usa Vercel Cron + Webhooks");
      }
    } catch (err) {
      console.error("[SERVER] Falha ao inicializar servidor:", err);
    }
  }
}
