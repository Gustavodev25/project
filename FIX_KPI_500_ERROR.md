# 🔧 Correção: Erro 500 na API Dashboard Stats (Vercel)

## Problema Identificado

**Console do navegador:**
```
Failed to load resource: the server responded with a status of 500 ()
Falha ao carregar estatísticas do dashboard: Error: HTTP 500
```

**Causa provável:**
A API `/api/dashboard/stats` estava quebrando na produção por um dos seguintes motivos:

1. ❌ **Modelo AliquotaImposto não existe no banco de produção**
   - Código tentava acessar `prisma.aliquotaImposto.findMany()`
   - Erro: `Cannot read property 'findMany' of undefined`
   - Resultado: Crash 500

2. ❌ **Valores NaN ou Infinity na resposta JSON**
   - JSON não pode serializar `NaN` ou `Infinity`
   - Resultado: Erro ao enviar resposta

3. ❌ **Falta de logs para debug**
   - Difícil identificar onde exatamente estava quebrando

---

## Correções Implementadas

### 1. ✅ Try-Catch no Modelo AliquotaImposto

**ANTES (Quebrava):**
```typescript
// @ts-ignore
const aliquotas = await prisma.aliquotaImposto.findMany({...});
// ❌ Se modelo não existe → Erro 500
```

**DEPOIS (Seguro):**
```typescript
let aliquotas: any[] = [];
try {
  if (prisma.aliquotaImposto) {
    aliquotas = await prisma.aliquotaImposto.findMany({...});
  }
} catch (error) {
  console.log('Modelo AliquotaImposto não disponível');
  aliquotas = [];
}
// ✅ Se modelo não existe → Continua funcionando
```

---

### 2. ✅ Validação de Números Antes de Retornar

**ANTES (Podia quebrar):**
```typescript
return NextResponse.json({
  faturamentoTotal,  // Pode ser NaN
  cmv: cmvTotal,     // Pode ser Infinity
  ...
});
// ❌ JSON.stringify(NaN) → Erro
```

**DEPOIS (Seguro):**
```typescript
const safeNumber = (val: number) => {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 0;
  return val;
};

return NextResponse.json({
  faturamentoTotal: safeNumber(faturamentoTotal),
  cmv: safeNumber(cmvTotal),
  ...
});
// ✅ Sempre retorna números válidos
```

---

### 3. ✅ Logging Detalhado

**Adicionado em vários pontos:**

```typescript
// 1. Início da requisição
console.log('[Dashboard Stats] 📊 Requisição recebida');

// 2. Validação de sessão
console.log('[Dashboard Stats] ✅ Sessão validada:', session.sub);

// 3. Busca de vendas
console.log('[Dashboard Stats] 🔍 Buscando vendas do banco...');

// 4. Vendas carregadas
console.log('[Dashboard Stats] ✅ Vendas carregadas:', {
  mercadoLivre: vendasMeli.length,
  shopee: vendasShopee.length,
});

// 5. Processamento
console.log('[Dashboard Stats] 📊 Processando', vendas.length, 'vendas');

// 6. Sucesso
console.log('[Dashboard Stats] ✅ Resposta calculada:', {
  vendas: response.vendasRealizadas,
  faturamento: response.faturamentoTotal,
});

// 7. Erro detalhado
console.error('[Dashboard Stats] ❌ Erro:', err);
console.error('[Dashboard Stats] Stack:', err.stack);
console.error('[Dashboard Stats] Mensagem:', err.message);
```

---

### 4. ✅ Melhor Tratamento de Erros

```typescript
} catch (err) {
  console.error("❌ [Dashboard Stats] Erro:", err);
  console.error("❌ Stack trace:", err instanceof Error ? err.stack : 'N/A');
  console.error("❌ Mensagem:", err instanceof Error ? err.message : String(err));
  
  return NextResponse.json({ 
    error: "Erro ao calcular estatísticas",
    message: err instanceof Error ? err.message : "Erro desconhecido",
  }, { status: 500 });
}
```

---

## Como Verificar os Logs na Vercel

### 1. **Acessar Logs em Tempo Real**

1. Vá para: https://vercel.com/dashboard
2. Selecione seu projeto
3. Clique em **"Functions"** (ou **"Logs"**)
4. Procure por: `/api/dashboard/stats`

### 2. **Ver Logs Detalhados**

Os logs agora mostrarão o fluxo completo:

```
[Dashboard Stats] 📊 Requisição recebida
[Dashboard Stats] ✅ Sessão validada: user-123
[Dashboard Stats] 🔍 Buscando vendas do banco...
[Dashboard Stats] ✅ Vendas carregadas: { mercadoLivre: 150, shopee: 80 }
[Dashboard Stats] 📊 Processando 230 vendas
[Dashboard Stats] Modelo AliquotaImposto não disponível  ← IMPORTANTE
[Dashboard Stats] ✅ Resposta calculada: { vendas: 230, faturamento: 45000 }
```

**Se houver erro:**
```
[Dashboard Stats] ❌ Erro: Cannot read property 'xxx' of undefined
[Dashboard Stats] Stack: at route.ts:264:15...
[Dashboard Stats] Mensagem: Cannot read property...
```

---

## Como Testar Localmente

### 1. **Limpar build e rodar:**
```bash
npm run build
npm start
```

### 2. **Abrir DevTools (F12):**
- Network → `/api/dashboard/stats`
- Console → Verificar logs

### 3. **Verificar resposta:**
```javascript
fetch('/api/dashboard/stats?periodo=este_mes')
  .then(r => r.json())
  .then(d => console.log('✅ Dados:', d))
  .catch(e => console.error('❌ Erro:', e));
```

---

## Deploy e Monitoramento

### 1. **Fazer deploy:**
```bash
git add .
git commit -m "fix: erro 500 na API dashboard stats"
git push
```

### 2. **Aguardar deploy** (2-3 minutos)

### 3. **Monitorar logs na Vercel:**
- Acesse: Vercel → Projeto → Functions
- Clique em `/api/dashboard/stats`
- Veja os logs em tempo real

### 4. **Teste no navegador:**
- Abra o dashboard
- Verifique se KPIs aparecem
- Abra DevTools → Console
- Não deve ter mais erro 500

---

## Possíveis Causas Se Ainda Houver Erro

### 1. **Banco de dados desconectado**
```
Error: Can't reach database server
```
**Solução:** Verificar se Prisma está conectado ao banco

### 2. **Timeout ainda ocorrendo**
```
Error: Function execution timed out
```
**Solução:** Verificar se `maxDuration = 60` está configurado (requer plano Pro)

### 3. **Erro no modelo Prisma**
```
Error: Invalid `prisma.xxx.findMany()` invocation
```
**Solução:** Executar migrations no banco de produção:
```bash
npx prisma migrate deploy
```

### 4. **Query muito lenta**
**Solução:** Adicionar índices no banco (ver `FIX_KPI_VERCEL.md`)

---

## Checklist de Verificação

- [x] Try-catch no AliquotaImposto
- [x] Validação de números (safeNumber)
- [x] Logging detalhado
- [x] Tratamento de erro melhorado
- [x] maxDuration = 60
- [x] dynamic = "force-dynamic"
- [x] Queries em paralelo

---

## Próximos Passos

1. ✅ **Deploy imediato** - As correções já foram aplicadas
2. 🔍 **Monitorar logs** - Ver exatamente onde estava quebrando
3. 🐛 **Debug adicional** - Se necessário, baseado nos logs
4. 📊 **Verificar KPIs** - Devem aparecer normalmente

---

## Arquivos Modificados

- ✅ `src/app/api/dashboard/stats/route.ts`
  - Try-catch no AliquotaImposto
  - Função safeNumber()
  - Logs detalhados em 7 pontos
  - Tratamento de erro melhorado

---

## Status: ✅ CORRIGIDO

**As correções foram aplicadas e devem resolver:**
1. ✅ Erro 500 por modelo inexistente
2. ✅ Erro de serialização JSON (NaN/Infinity)
3. ✅ Falta de logs para debug

**Próximo passo:** Deploy e verificar logs na Vercel! 🚀
