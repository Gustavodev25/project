# 🔍 Debugging Sincronização no Vercel

## Problema Atual
A sincronização está retornando apenas 2-3 vendas ao invés de todas.

## Como Verificar os Logs

### 1. Acessar Logs do Vercel

1. Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Clique em "Logs" ou "Runtime Logs"
4. Filtre por "Function Logs"

### 2. Procurar por Logs de Sincronização

Procure por estas mensagens no log:

```
[Sync] 🚀 Iniciando busca completa de vendas
[Sync] 📊 Total: X vendas encontradas
[Sync] 📄 Página X: Y vendas
[Sync] Debug - offset atual: X
[Sync] ✅ Conta X: Y vendas baixadas de Z totais
[Sync] 📥 Iniciando salvamento de X vendas
[Sync] ✅ Salvamento concluído
```

### 3. Identificar o Problema

#### Cenário A: Parou na Busca
Se você ver:
```
[Sync] 📄 Página 1: 50 vendas
```
E depois **nada mais**, significa que a função `fetchAllOrdersForAccount` está travando.

**Solução**: Problema de timeout ou erro na API do ML.

#### Cenário B: Parou no Salvamento
Se você ver:
```
[Sync] ✅ Conta X: 1000 vendas baixadas
[Sync] 📥 Iniciando salvamento de 1000 vendas
```
E depois **nada mais**, significa que o `saveVendasBatch` está travando.

**Solução**: Problema de timeout no banco de dados ou memória.

#### Cenário C: Erro Explícito
Se você ver:
```
[Sync] ❌ Erro ao buscar vendas: [mensagem]
```

**Solução**: O erro está sendo mostrado - verificar a mensagem.

### 4. Configurações para Verificar no Vercel

#### Verificar Timeout
- Vá em "Settings" → "Functions"
- Verifique se `maxDuration` está configurado
- No plano Pro: até 300 segundos (5 minutos)
- No plano Hobby: até 10 segundos ⚠️

**Se você está no plano Hobby**, esse é o problema! A sincronização precisa de mais tempo.

#### Verificar Memória
- Verifique a memória alocada para a função
- Padrão: 1024 MB
- Recomendado: 3008 MB (se disponível)

### 5. Soluções Possíveis

#### Solução 1: Upgrade para Vercel Pro
Se está no plano Hobby e precisa de mais de 10 segundos:
- Upgrade para Pro ($20/mês)
- Permite até 300 segundos (5 minutos)

#### Solução 2: Processar em Background
Modificar para processar em segundo plano:
- Função retorna imediatamente
- Sincronização continua via cron job
- Progresso via SSE

#### Solução 3: Reduzir Tamanho dos Lotes
Editar `saveVendasBatch` para lotes menores:
```typescript
const batchResult = await saveVendasBatch(fetchedOrders, session.sub, 5); // Era 10
```

#### Solução 4: Usar Banco de Dados Mais Rápido
Se o banco está lento:
- Migrar para Vercel Postgres
- Ou usar Neon com conexão otimizada

### 6. Teste Rápido

Execute uma sincronização e verifique:

1. Quanto tempo leva até aparecer a primeira mensagem
2. Quantas páginas são processadas
3. Onde exatamente para

## Logs Específicos Adicionados

O código agora tem logs detalhados:

```typescript
// Início da busca
console.log(`[Sync] 🚀 Buscando TODAS as vendas da conta...`);

// Cada página
console.log(`[Sync] 📄 Página ${page + 1}: ${orders.length} vendas`);

// Debug de offset
console.log(`[Sync] Debug - offset atual: ${offset}`);

// Fim da busca
console.log(`[Sync] ✅ Conta X: Y vendas baixadas de Z totais`);

// Início do salvamento
console.log(`[Sync] 📥 Iniciando salvamento de X vendas no banco...`);

// Fim do salvamento
console.log(`[Sync] ✅ Salvamento concluído`);
```

## Próximos Passos

1. Faça o redeploy no Vercel (ele detecta o push automaticamente)
2. Execute uma sincronização
3. Vá nos logs e procure por essas mensagens
4. Me envie o último log que apareceu antes de parar

Isso ajudará a identificar exatamente onde está travando!
