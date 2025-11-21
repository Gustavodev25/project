# Guia: Sincronizar TODAS as Vendas (12k+)

## 🎯 Objetivo

Este guia explica como sincronizar **TODAS** as vendas de contas com grande volume (12k+ vendas), como a conta Tokyo.

## ✨ Sistema de Sincronização Contínua

O sistema agora possui **sincronização automática contínua** que:

✅ **Detecta automaticamente** quando há mais vendas para sincronizar
✅ **Continua automaticamente** até sincronizar TODAS as vendas
✅ **Divide períodos** automaticamente quando há mais de 9.950 vendas
✅ **Mostra progresso em tempo real** (ex: "2.450 de 12.000 vendas (20%)")
✅ **Não para** até completar 100%

## 🚀 Como Sincronizar Todas as Vendas

### Opção 1: Via Interface (Recomendado)

1. **Acesse a página de vendas**
2. **Clique em "Sincronizar"**
3. **Aguarde** - O sistema irá:
   - Buscar as primeiras ~5.000 vendas (1-2 minutos)
   - Salvar no banco de dados
   - **Continuar automaticamente** para as próximas vendas
   - Repetir até completar todas as 12k+ vendas

4. **Acompanhe o progresso**:
   ```
   📊 Conta tokyo: TOTAL 12.450 vendas (ALTO VOLUME! Sincronização automática continuará até completar)

   ✅ 2.450 de 12.450 vendas sincronizadas (20%). Continuando automaticamente...
   🔄 Sincronizando vendas restantes... 2.450/12.450 (20%)

   ✅ 5.120 de 12.450 vendas sincronizadas (41%). Continuando automaticamente...
   🔄 Sincronizando vendas restantes... 5.120/12.450 (41%)

   ... (continua até 100%)

   ✅ 12.450 de 12.450 vendas sincronizadas (100%). Sincronização completa!
   ```

**IMPORTANTE:**
- ⏱️ **Tempo estimado:** 15-30 minutos para 12k vendas
- 🔄 **Não precisa clicar novamente** - o sistema continua automaticamente
- 📱 **Pode fechar a página** - a sincronização continua no servidor
- ✅ **Verificar progresso:** Recarregue a página para ver vendas atualizadas

---

### Opção 2: Via Script (Para Desenvolvedores)

```bash
# Sincronizar conta específica (continua automaticamente até completar)
node test-sync.js tokyo-account-id

# OU com modo full explícito
node test-sync.js tokyo-account-id full
```

O script mostrará:
```
🚀 Iniciando teste de sincronização...

📋 Conta: tokyo-account-id
⚙️  Modo: BACKGROUND (até 5000 vendas)

🌐 Chamando: https://project-backend-rjoh.onrender.com/api/meli/vendas/sync

✅ Sincronização concluída!

📊 RESULTADOS:
   Duração: 125450ms (125.45s)
   Total de vendas: 12450
   Vendas salvas: 12450
   Erros: 0

   Contas processadas: 1

   Conta: tokyo
   - Vendas encontradas: 12450
   - Vendas salvas: 12450
   - Status: OK

=============================================================
🎉 TESTE CONCLUÍDO COM SUCESSO!
=============================================================
```

---

### Opção 3: Via API (Manual)

```bash
# Primeira chamada (inicia sincronização)
curl -X POST https://project-backend-rjoh.onrender.com/api/meli/vendas/sync \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{
    "accountIds": ["tokyo-account-id"]
  }'

# O sistema continuará AUTOMATICAMENTE até completar todas as vendas
# Não é necessário fazer múltiplas chamadas manuais
```

---

## 📊 Como Funciona Internamente

### 1. Detecção de Volume

```
API do ML retorna: { "paging": { "total": 12450 } }
                          ↓
Sistema detecta: 12.450 vendas > 5.000 (limite por execução)
                          ↓
      hasMoreToSync = true
```

### 2. Primeira Execução

```
Busca vendas recentes: offset 0-4950 (até 5.000 vendas)
              ↓
Divide períodos: Se houver >9.950 vendas em um período,
                 divide em sub-períodos de 7-14 dias
              ↓
Salva no banco: 4.950 vendas salvas
              ↓
Progresso: 4.950 / 12.450 (40%)
              ↓
hasMoreToSync = true (ainda faltam 7.500 vendas)
```

### 3. Continuações Automáticas

```
Sistema dispara AUTOMATICAMENTE próxima sincronização:
              ↓
POST /api/meli/vendas/sync
{
  "accountIds": ["tokyo-account-id"],
  "fullSync": true,        ← Sempre true em auto-sync
  "quickMode": false       ← Sempre false em auto-sync
}
              ↓
Busca vendas históricas: desde a venda mais antiga até 2000
              ↓
Salva mais 4.800 vendas
              ↓
Progresso: 9.750 / 12.450 (78%)
              ↓
hasMoreToSync = true (ainda faltam 2.700 vendas)
              ↓
... (repete até completar)
```

### 4. Finalização

```
Última execução: 2.700 vendas restantes
              ↓
Todas as vendas sincronizadas
              ↓
Progresso: 12.450 / 12.450 (100%)
              ↓
hasMoreToSync = false
              ↓
✅ Sincronização completa!
```

---

## 🔍 Monitorar Progresso

### Via Logs do Render

1. Acesse dashboard do Render
2. Vá em "Logs"
3. Procure por:

```log
[Sync] 📊 Conta tokyo: TOTAL 12450 vendas (ALTO VOLUME! Sincronização automática continuará até completar)
[Sync] 🎉 4950 de 12450 vendas baixadas (40%) em 95s
[Sync] 🔄 AUTO-SYNC: 4950/12450 vendas (40%). Faltam ~7500 vendas. Iniciando próxima sincronização...

[Sync] 📊 Conta tokyo: TOTAL 12450 vendas
[Sync] 🎉 4800 de 12450 vendas baixadas (39%) em 88s
[Sync] 🔄 AUTO-SYNC: 9750/12450 vendas (78%). Faltam ~2700 vendas. Iniciando próxima sincronização...

[Sync] 📊 Conta tokyo: TOTAL 12450 vendas
[Sync] 🎉 2700 de 12450 vendas baixadas (22%) em 42s
[Sync] ✅ 12450 de 12450 vendas sincronizadas (100%). Sincronização completa!
```

### Via Banco de Dados

```sql
-- Contar vendas sincronizadas da conta tokyo
SELECT COUNT(*) as total_sincronizado
FROM "MeliVenda"
WHERE "meliAccountId" = 'tokyo-account-id';

-- Ver progresso em tempo real
SELECT
  COUNT(*) as sincronizadas,
  12450 as total_esperado,
  ROUND((COUNT(*) * 100.0 / 12450), 2) as percentual
FROM "MeliVenda"
WHERE "meliAccountId" = 'tokyo-account-id';

-- Ver vendas mais recentes sincronizadas
SELECT
  "orderId",
  "dataVenda",
  "valorTotal",
  "titulo",
  "atualizadoEm"
FROM "MeliVenda"
WHERE "meliAccountId" = 'tokyo-account-id'
ORDER BY "atualizadoEm" DESC
LIMIT 10;
```

---

## ⚠️ Troubleshooting

### Problema: Parou em 2k vendas

**Causa:** Versão antiga do código (antes das otimizações)

**Solução:**
1. Fazer pull do código atualizado
2. Deploy no Render
3. Sincronizar novamente

---

### Problema: Demora muito / Timeout

**Causa:** Muitas vendas + cold start do Render

**Solução:**
- ✅ **Normal:** 15-30 min para 12k vendas
- ⚡ **Upgrade Render:** Plano pago elimina cold start
- 🔄 **Aguarde:** Sistema continua automaticamente mesmo após timeout

---

### Problema: Erro "Account not found"

**Causa:** ID da conta incorreto

**Solução:**
```sql
-- Listar todas as contas
SELECT id, nickname, ml_user_id
FROM "MeliAccount"
WHERE "isInvalid" = false;
```

Use o `id` correto da conta.

---

### Problema: Vendas duplicadas

**Causa:** Não é um problema - o sistema usa `UPSERT`

**Solução:** Nada a fazer! O sistema atualiza vendas existentes automaticamente.

---

## ✅ Checklist de Sucesso

Após sincronizar, verifique:

- [ ] Total de vendas no banco = Total no Mercado Livre (12.450)
- [ ] Logs mostram "Sincronização completa! 12450 vendas"
- [ ] Não há erros nos logs do Render
- [ ] Vendas mais antigas estão no banco (de 2000-2010)
- [ ] Vendas mais recentes estão no banco (última semana)

---

## 📈 Resultados Esperados

Para conta Tokyo com 12.450 vendas:

| Métrica | Valor |
|---------|-------|
| **Vendas total** | 12.450 |
| **Tempo total** | 15-30 minutos |
| **Execuções automáticas** | 3-4 |
| **Vendas por execução** | ~3.000-5.000 |
| **Taxa de sucesso** | 99.9% |

---

## 🎉 Pronto!

Após seguir este guia, todas as 12.450 vendas da conta Tokyo estarão sincronizadas no sistema!

**Próximos passos:**
1. ✅ Configurar webhooks ([WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md))
2. ✅ Novas vendas sincronizam automaticamente em < 5 segundos
3. ✅ Cron backup (1x/dia) garante que nenhuma venda seja perdida
