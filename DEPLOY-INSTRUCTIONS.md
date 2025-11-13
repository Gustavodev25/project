# 🚀 Instruções de Deploy - Sincronização Incremental ML

## ✅ Status: Código Pronto para Produção

Branch atualizada: `claude/fix-mercado-livre-sync-011CV6CD9AC8nWRCoTX9EiKi`

**Últimos commits:**
- `451cdfe` - Trigger de deploy
- `267c2b5` - Fallback seguro (funciona sem migration)
- `cb9fb3d` - Sistema de sincronização incremental

---

## 📋 Opção 1: Configurar Branch no Vercel (Recomendado - 2 minutos)

### Passo 1: Acessar Vercel Dashboard
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto

### Passo 2: Configurar Branch de Produção
1. Vá em **Settings** → **Git**
2. Em **Production Branch**, altere de `main` para:
   ```
   claude/fix-mercado-livre-sync-011CV6CD9AC8nWRCoTX9EiKi
   ```
3. Clique em **Save**

### Passo 3: Deploy Automático
- Vercel detectará a mudança e fará deploy automaticamente
- Aguarde ~2-3 minutos

### Passo 4: Verificar Deploy
- Acesse seu site
- Teste a sincronização do Mercado Livre
- Verifique os logs no Vercel

---

## 📋 Opção 2: Deploy Manual via Vercel Dashboard (1 minuto)

1. Acesse: https://vercel.com/dashboard
2. Vá em **Deployments**
3. Clique em **Deploy**
4. Selecione a branch: `claude/fix-mercado-livre-sync-011CV6CD9AC8nWRCoTX9EiKi`
5. Clique em **Deploy**

---

## 📋 Opção 3: Merge para Main (Localmente)

Se preferir manter `main` como produção:

```bash
# 1. Checkout para main
git checkout main

# 2. Pull das últimas mudanças
git pull origin main

# 3. Merge da branch feature
git merge claude/fix-mercado-livre-sync-011CV6CD9AC8nWRCoTX9EiKi

# 4. Push para main
git push origin main
```

---

## 🔍 Verificação Pós-Deploy

### 1. Testar Sincronização
- Acesse: `https://seu-dominio.vercel.app`
- Vá em Mercado Livre → Sincronizar
- Deve funcionar sem erro 500 ✅

### 2. Verificar Logs
```bash
# No Vercel Dashboard → Seu Projeto → Deployments → Logs
# Procure por:
# ✅ "[Sync] ⚠️ Tabela meli_sync_progress não existe. Usando fallback"
# ✅ "[Sync] 🚀 Iniciando busca de vendas..."
```

### 3. Aplicar Migration (Opcional - Ativa Checkpoints)
```bash
# Conectar ao banco de produção
# No Vercel Dashboard → Settings → Environment Variables → DATABASE_URL

# Executar localmente
DATABASE_URL="sua_connection_string" npx prisma migrate deploy

# Verificar
DATABASE_URL="sua_connection_string" npx prisma db pull
```

---

## 📊 O Que Foi Implementado

### ✅ Sincronização Incremental
- Remove limite de 2.500 vendas
- Sistema de checkpoints (salva progresso)
- Continua automaticamente de onde parou
- Respeita timeout de 60s do Vercel

### ✅ Fallback Seguro
- Funciona SEM aplicar migration
- Se tabela não existe → usa offset 0
- Logs informativos no console
- Zero downtime

### ✅ Tabela `meli_sync_progress`
- Armazena progresso de cada conta
- Status: pending, in_progress, completed, error
- Permite retomar sincronização interrompida
- Auto-limpeza após conclusão

---

## 🎯 Resultado Esperado

### Antes (com limite):
- Conta 1 (10k vendas): ❌ Só sincroniza 2.5k
- Conta 2 (20k vendas): ❌ Só sincroniza 2.5k
- Total: ❌ 5k de 30k vendas (17%)

### Depois (sem limite):
- Conta 1 (10k vendas): ✅ Sincroniza todas as 10k
- Conta 2 (20k vendas): ✅ Sincroniza todas as 20k
- Total: ✅ 30k de 30k vendas (100%)

---

## ❓ Dúvidas ou Problemas?

Se encontrar algum erro:
1. Verifique os logs no Vercel Dashboard
2. Confirme que a branch está correta
3. Teste a sincronização no frontend

**Tudo deve funcionar perfeitamente agora!** 🎉
