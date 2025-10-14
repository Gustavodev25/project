# 🔄 Melhorias na Renovação de Tokens MELI

## Problema Identificado
O sistema estava marcando contas como inválidas muito rapidamente quando o refresh token falhava, impedindo tentativas futuras de renovação sem reconexão manual.

## Soluções Implementadas

### 1. **Renovação Inteligente (`smartRefreshMeliAccountToken`)**
- ✅ Tenta múltiplas estratégias de renovação
- ✅ Backoff exponencial entre tentativas (1s, 2s, 4s, max 5s)
- ✅ Primeira tentativa normal, subsequentes com `forceRefresh=true`
- ✅ Para apenas quando detecta token realmente inválido

### 2. **Novos Endpoints**

#### `/api/meli/force-refresh` (POST)
- Renovação forçada com até 5 tentativas
- Limpa marcação de inválida em caso de sucesso
- Ideal para tentar renovar contas marcadas como inválidas

#### `/api/accounts/clear-invalid` (POST)
- Remove marcação de inválida de qualquer conta
- Suporta MELI, Shopee e Bling
- Útil para resetar status após reconexão

#### `/api/test/meli-refresh` (GET)
- Testa renovação de todas as contas MELI do usuário
- Relatório detalhado de sucessos/falhas
- Tempo de execução por conta

### 3. **Melhorias na Lógica Existente**

#### `src/lib/meli.ts`
- ✅ Função `_refreshMeliAccountToken` mais inteligente
- ✅ Parâmetro `forceRefresh` para contornar marcações de inválida
- ✅ Tratamento melhorado de erros específicos

#### `src/app/api/meli/vendas/check/route.ts`
- ✅ Usa `smartRefreshMeliAccountToken` em vez da função básica
- ✅ Logs mais informativos sobre sucessos/falhas

#### `src/app/api/meli/refresh-token/route.ts`
- ✅ Usa renovação inteligente com 3 tentativas
- ✅ Melhor tratamento de erros

## Como Usar

### Para Renovar Contas Marcadas como Inválidas:
```bash
curl -X POST http://localhost:3000/api/meli/force-refresh \
  -H "Content-Type: application/json" \
  -d '{"accountId": "cmgmbp4ik000buf305ezeyd27"}'
```

### Para Limpar Marcação de Inválida:
```bash
curl -X POST http://localhost:3000/api/accounts/clear-invalid \
  -H "Content-Type: application/json" \
  -d '{"accountId": "cmgmbp4ik000buf305ezeyd27", "platform": "meli"}'
```

### Para Testar Todas as Contas:
```bash
curl http://localhost:3000/api/test/meli-refresh
```

## Benefícios

1. **🔄 Renovação Automática**: Sistema tenta renovar tokens automaticamente sem intervenção manual
2. **⏱️ Retry Inteligente**: Backoff exponencial evita sobrecarga da API
3. **🎯 Detecção Precisa**: Só marca como inválida quando realmente necessário
4. **🛠️ Ferramentas de Debug**: Endpoints para testar e limpar status
5. **📊 Monitoramento**: Logs detalhados para acompanhar o processo

## Próximos Passos

1. Testar com contas reais que estão marcadas como inválidas
2. Monitorar logs para verificar eficácia
3. Aplicar mesma lógica para Shopee e Bling se necessário
4. Considerar implementar renovação automática via cron job
