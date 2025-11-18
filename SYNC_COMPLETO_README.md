# Sincronização Completa do Mercado Livre

## Como Garantir que TODAS as Vendas Sejam Sincronizadas

### ✅ Modo Full Sync Já Implementado

O sistema já possui um modo `fullSync` que busca **TODAS** as vendas sem deixar nenhuma para trás. Aqui está como usar:

### 1. Usando o Full Sync

Para sincronizar TODAS as vendas (incluindo histórico completo desde 2000), faça uma requisição POST para:

```javascript
POST /api/meli/vendas/sync

Body:
{
  "accountIds": ["ID_DA_CONTA"],  // ou deixe vazio para sincronizar todas
  "fullSync": true                 // IMPORTANTE: ativa o modo completo
}
```

### 2. O que o Full Sync Faz

Quando `fullSync: true` é ativado:

- ✅ **SEM limite de tempo** - Roda até sincronizar tudo
- ✅ **SEM limite de vendas** - Busca até 9.950 vendas por período
- ✅ **Busca desde 2000** - Histórico completo (vs 2010 no modo normal)
- ✅ **Divisão inteligente de períodos** - Divide automaticamente quando necessário
- ✅ **Sincronização recursiva** - Continua até pegar todas

### 3. Como Funciona a Divisão de Períodos

O sistema detecta automaticamente quando um período tem mais de 9.950 vendas (limite da API do ML) e divide em sub-períodos menores:

| Volume de Vendas | Tamanho do Sub-Período |
|------------------|------------------------|
| > 100.000 vendas | 3 dias                 |
| 50k - 100k vendas| 5 dias                 |
| 30k - 50k vendas | 7 dias                 |
| 10k - 30k vendas | 14 dias                |

### 4. Exemplo de Uso Completo

#### Via Frontend (JavaScript/TypeScript):

```typescript
// Sincronizar TODAS as vendas de uma conta específica
const response = await fetch('/api/meli/vendas/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    accountIds: ['conta-id-123'],
    fullSync: true  // Modo completo ativado
  })
});

const result = await response.json();
console.log('Vendas sincronizadas:', result.summary.saved);
```

#### Via Curl:

```bash
curl -X POST http://localhost:3000/api/meli/vendas/sync \
  -H "Content-Type: application/json" \
  -d '{
    "accountIds": ["conta-id-123"],
    "fullSync": true
  }'
```

### 5. Monitoramento do Progresso

Durante a sincronização, o sistema envia eventos SSE (Server-Sent Events) com:

- Número de vendas baixadas
- Período atual sendo processado
- Porcentagem de conclusão
- Mensagens de aviso se houver problemas

### 6. Modo Quick vs Full Sync

| Característica | Quick Mode | Full Sync |
|----------------|------------|-----------|
| Limite de tempo | 30 segundos | Sem limite |
| Vendas recentes | 500-1.500 | Até 9.950 |
| Histórico | Desde 2010 | Desde 2000 |
| Uso recomendado | Atualização diária | Sync inicial completo |

### 7. Exemplo para Conta com 50k+ Vendas

```typescript
// Primeira execução - busca TODAS as vendas históricas
await fetch('/api/meli/vendas/sync', {
  method: 'POST',
  body: JSON.stringify({
    fullSync: true  // Vai buscar todas as 50k vendas
  })
});

// Próximas execuções - apenas atualizar vendas recentes
await fetch('/api/meli/vendas/sync', {
  method: 'POST',
  body: JSON.stringify({
    quickMode: true  // Rápido, apenas vendas novas
  })
});
```

### 8. Garantias do Sistema

O código implementa várias garantias para não perder vendas:

1. **Detecção automática de volume** - Verifica quantas vendas existem antes de buscar
2. **Divisão recursiva** - Sub-períodos são divididos novamente se necessário
3. **Retry automático** - 3 tentativas com backoff exponencial em caso de erro
4. **Continuação automática** - Próximas syncs continuam de onde parou
5. **Deduplicação** - Vendas duplicadas são ignoradas automaticamente

### 9. Logs de Depuração

Durante a execução, veja os logs para acompanhar:

```
[Sync] 🚀 Iniciando busca - Modo: FULL SYNC (buscar TODAS as vendas)
[Sync] 📊 Período 2024-01-01 a 2024-01-31: 15.000 vendas
[Sync] 🔄 Dividindo em sub-períodos de 7 dias para processar 15.000 vendas
[Sync] 📆 Buscando sub-período 1: 2024-01-01 a 2024-01-07
[Sync] ✅ Sub-período 1: 3.500 vendas baixadas (total: 3.500/15.000 = 23%)
...
[Sync] 🎉 Período completo: 15.000 vendas baixadas de 15.000 totais (3 sub-períodos)
```

### 10. Solução de Problemas

**Se ainda estiver faltando vendas após o Full Sync:**

1. Verifique os logs do console para ver onde parou
2. Execute novamente - o sistema continua de onde parou
3. Verifique se há erros de autenticação (token expirado)
4. Confirme que `fullSync: true` está sendo enviado no body

**Timeout no Vercel:**

- O Full Sync foi projetado para rodar localmente ou em ambientes sem limite de tempo
- No Vercel (60s limite), use `quickMode: true` e execute múltiplas vezes
- Considere usar um cron job para sincronizações automáticas

---

## Resumo

✅ O sistema **JÁ ESTÁ PRONTO** para sincronizar TODAS as vendas
✅ Use `fullSync: true` para garantir sincronização completa
✅ Sistema divide períodos automaticamente quando > 9.950 vendas
✅ Continuação automática em próximas execuções
✅ Nenhuma venda ficará para trás!

**Basta usar o parâmetro `fullSync: true` na requisição! 🎉**
