/**
 * Cron Jobs - Migrado para Webhooks + Vercel Cron
 *
 * NOTA IMPORTANTE:
 * Este arquivo anteriormente continha cron jobs locais usando node-cron,
 * mas foi DESCONTINUADO em favor de uma arquitetura mais moderna:
 *
 * 1. WEBHOOKS (Real-time):
 *    - Endpoint: /api/meli/webhook
 *    - Recebe notificações do Mercado Livre em < 5 segundos
 *    - Sincroniza vendas automaticamente quando ocorrem
 *
 * 2. VERCEL CRON (Backup):
 *    - Configurado em vercel.json
 *    - meli-sync: 1x por dia às 3h (backup caso webhook falhe)
 *    - refresh-tokens: A cada 30min (essencial para manter tokens válidos)
 *    - recovery-meli: A cada 6h (recuperar contas marcadas como inválidas)
 *
 * MOTIVOS DA MUDANÇA:
 * - ❌ node-cron não funciona em ambientes serverless (Vercel)
 * - ❌ Requer servidor persistente (custos elevados)
 * - ❌ Latência de 10min-2h vs < 5s com webhooks
 * - ✅ Webhooks: sincronização instantânea, zero custo extra
 * - ✅ Vercel Cron: backup confiável, gerenciado pela plataforma
 *
 * CONFIGURAÇÃO DOS WEBHOOKS NO MERCADO LIVRE:
 *
 * 1. Acesse: https://developers.mercadolivre.com.br/
 * 2. Vá em "Minhas aplicações" → Selecione sua app
 * 3. Configure "Notification URL":
 *    https://project-backend-rjoh.onrender.com/api/meli/webhook
 * 4. Salve e teste enviando uma notificação
 *
 * OU via API:
 *
 * curl -X PUT https://api.mercadolibre.com/applications/{APP_ID} \
 *   -H "Authorization: Bearer {ACCESS_TOKEN}" \
 *   -d '{"notification_url": "https://project-backend-rjoh.onrender.com/api/meli/webhook"}'
 *
 * MONITORAMENTO:
 * - Logs do webhook: Acompanhe em /api/meli/webhook
 * - Cron backup: Verifica se há vendas perdidas 1x por dia
 * - Se webhook estiver funcionando, o cron não encontrará novas vendas
 */

// DEPRECATED: node-cron foi removido
// Manter este arquivo para referência histórica e documentação

export async function startCronJobs() {
  console.warn(
    "⚠️ [DEPRECATED] startCronJobs() foi descontinuado.\n" +
    "Agora usamos:\n" +
    "  1. Webhooks do Mercado Livre (/api/meli/webhook) para sincronização real-time\n" +
    "  2. Vercel Cron (vercel.json) para backup e tarefas periódicas\n" +
    "Este método não faz nada e será removido em versões futuras."
  );

  return {
    stop: () => {
      console.log("ℹ️ Nenhum cron job local para parar (agora usa Vercel Cron)");
    }
  };
}
