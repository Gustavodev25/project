# Configuração de Webhooks do Mercado Livre

Este documento explica como configurar os webhooks do Mercado Livre para sincronização em tempo real de vendas.

## 📋 Resumo

- **Latência:** < 5 segundos (vs 30min-2h com cron jobs)
- **Custo:** Zero (vs custos de polling constante)
- **Confiabilidade:** Alta (com backup de cron 1x/dia)
- **Endpoint:** `https://project-backend-rjoh.onrender.com/api/meli/webhook`

## 🎯 Arquitetura Implementada

```
┌─────────────────────────────────────────────────────────┐
│                   FLUXO DE SINCRONIZAÇÃO                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Venda criada no Mercado Livre                      │
│         │                                               │
│         v                                               │
│  2. ML envia webhook (< 1 segundo)                     │
│         │                                               │
│         v                                               │
│  3. /api/meli/webhook recebe notificação               │
│         │                                               │
│         ├─> Valida application_id                      │
│         ├─> Busca conta no banco                       │
│         └─> Chama /api/meli/vendas/sync                │
│                                                         │
│  4. Venda salva no banco (< 5 segundos total)          │
│         │                                               │
│         v                                               │
│  5. Frontend atualiza automaticamente                   │
│                                                         │
│  🔄 BACKUP: Cron job 1x/dia às 3h                      │
│     └─> Sincroniza vendas caso webhook falhe           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Passo a Passo para Configurar

### Opção 1: Configurar via Dashboard (Recomendado)

1. **Acesse o Developer Portal do Mercado Livre:**
   - Brasil: https://developers.mercadolivre.com.br/
   - Argentina: https://developers.mercadolivre.com.ar/

2. **Faça login** com sua conta de desenvolvedor

3. **Vá em "Minhas aplicações"** e selecione sua aplicação

4. **Configure a URL de notificação:**
   - Procure por "Notification URL" ou "URL de notificações"
   - Cole a URL: `https://project-backend-rjoh.onrender.com/api/meli/webhook`
   - Salve as alterações

5. **Topics subscritos automaticamente:**
   - O ML automaticamente envia notificações de `orders_v2`
   - Nosso webhook filtra e processa apenas este topic

### Opção 2: Configurar via API

```bash
# Obter ACCESS_TOKEN da sua conta de desenvolvedor
# Você pode usar o access_token de qualquer conta conectada com permissões de admin

curl -X PUT "https://api.mercadolibre.com/applications/{APP_ID}" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_url": "https://project-backend-rjoh.onrender.com/api/meli/webhook"
  }'
```

**Substituir:**
- `{APP_ID}`: ID da sua aplicação (encontre em `.env` como `MELI_APP_ID`)
- `{ACCESS_TOKEN}`: Token de acesso de uma conta admin

## ✅ Verificar Configuração

### 1. Testar o endpoint (manual)

```bash
# Endpoint deve responder com status
curl https://project-backend-rjoh.onrender.com/api/meli/webhook

# Resposta esperada:
{
  "service": "Mercado Livre Webhook",
  "status": "active",
  "topics": ["orders_v2"],
  "timestamp": "2025-11-19T..."
}
```

### 2. Testar com venda real

1. Faça uma venda de teste na sua conta ML
2. Verifique os logs do backend (Render):
   ```
   [Webhook] Notificação recebida: { topic: 'orders_v2', ... }
   [Webhook] ✅ Venda 1234567890 sincronizada com sucesso (1234ms)
   ```
3. Verifique se a venda apareceu no sistema em < 5 segundos

### 3. Verificar no banco de dados

```sql
-- Verificar vendas recentes sincronizadas via webhook
SELECT
  "orderId",
  "dataVenda",
  "valorTotal",
  "titulo",
  "atualizadoEm"
FROM "MeliVenda"
WHERE "atualizadoEm" >= NOW() - INTERVAL '10 minutes'
ORDER BY "atualizadoEm" DESC
LIMIT 10;
```

## 🔧 Variáveis de Ambiente Necessárias

Certifique-se de que estas variáveis estejam configuradas no Render:

```env
# Mercado Livre API
MELI_APP_ID=seu_app_id                    # ID da aplicação ML
MELI_CLIENT_ID=seu_client_id              # Client ID (igual ao APP_ID)
MELI_CLIENT_SECRET=seu_client_secret      # Client Secret

# Segurança
CRON_SECRET=seu_secret_aleatorio          # Para autenticar cron jobs

# Database
DATABASE_URL=postgresql://...             # URL do PostgreSQL
```

## 📊 Monitoramento

### Logs do Webhook (Render)

Os logs do webhook aparecem automaticamente no console do Render:

```
[Webhook] Notificação recebida: { topic: 'orders_v2', resource: '/orders/123' }
[Webhook] ✅ Conta encontrada: tokyo (user: user@email.com)
[Webhook] ✅ Venda 123 sincronizada com sucesso (852ms)
```

### Logs de Erro

Em caso de erro, o webhook ainda responde 200 OK para evitar retries excessivos:

```
[Webhook] ⚠️ Conta ML 12345 não encontrada ou inválida no sistema
[Webhook] ❌ Erro ao sincronizar venda 123: timeout
```

### Dashboard de Métricas (Futuro)

Planejado para implementação futura:
- Total de webhooks recebidos hoje
- Taxa de sucesso/falha
- Latência média
- Vendas sincronizadas via webhook vs cron

## 🔄 Cron Jobs de Backup

Os seguintes cron jobs continuam ativos como backup:

| Cron | Frequência | Função |
|------|-----------|--------|
| `meli-sync` | 1x/dia às 3h | Sincronizar vendas que o webhook perdeu |
| `refresh-tokens` | A cada 30min | Renovar tokens ML antes de expirar |
| `recovery-meli` | A cada 6h | Recuperar contas marcadas como inválidas |

**Configuração:** Ver `vercel.json` → `crons`

## 🐛 Troubleshooting

### Webhook não está recebendo notificações

1. **Verificar URL configurada no ML:**
   ```bash
   curl https://api.mercadolibre.com/applications/{APP_ID} \
     -H "Authorization: Bearer {ACCESS_TOKEN}"
   ```
   Deve retornar: `"notification_url": "https://project-backend-rjoh.onrender.com/api/meli/webhook"`

2. **Verificar se o Render está online:**
   - Acesse: https://project-backend-rjoh.onrender.com/api/meli/webhook
   - Deve responder com status 200

3. **Verificar logs do Render:**
   - Acesse dashboard do Render
   - Vá em "Logs"
   - Procure por `[Webhook]`

### Webhook recebe notificação mas não sincroniza

1. **Verificar CRON_SECRET:**
   - O webhook usa `CRON_SECRET` para autenticar na rota de sincronização
   - Verifique se está configurado no Render

2. **Verificar se a conta ML está no sistema:**
   ```sql
   SELECT * FROM "MeliAccount" WHERE ml_user_id = 12345;
   ```

3. **Verificar se a conta não está marcada como inválida:**
   ```sql
   UPDATE "MeliAccount" SET "isInvalid" = false WHERE ml_user_id = 12345;
   ```

### Muitas notificações duplicadas

O ML pode enviar múltiplas notificações para o mesmo pedido (ex: criação, pagamento, envio).
Nosso sistema usa `upsert` então não há problema - a venda será atualizada ao invés de duplicada.

### Webhook demora muito (> 30s timeout)

1. **Verificar se há muitas vendas sendo sincronizadas:**
   - O webhook sincroniza apenas 1 venda por notificação
   - Se demorar > 30s, pode ser problema de rede ou banco

2. **Verificar cold start do Render:**
   - Render free tier tem cold start de ~30s
   - Considere upgrade para plano pago se necessário

## 📚 Referências

- [Documentação Oficial - Notifications](https://developers.mercadolibre.com.ar/en_us/real-time-notifications)
- [API Reference - Orders](https://developers.mercadolibre.com.ar/en_us/orders-management)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Render Background Workers](https://render.com/docs/background-workers)

## 🎉 Pronto!

Após configurar os webhooks, seu sistema estará sincronizando vendas em tempo real (< 5 segundos) automaticamente!

Para qualquer dúvida ou problema, verifique os logs do Render ou abra uma issue.
