# 🚀 COMO PROMOVER PARA PRODUÇÃO (30 SEGUNDOS)

## ⚡ SOLUÇÃO RÁPIDA - Via Vercel Dashboard

### Passo 1: Acessar Deployments
1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá na aba **"Deployments"**

### Passo 2: Promover Deploy
1. Encontre o deploy mais recente da branch:
   ```
   claude/fix-mercado-livre-sync-011CV6CD9AC8nWRCoTX9EiKi
   ```
2. Clique nos **3 pontinhos (...)** ao lado do deploy
3. Clique em **"Promote to Production"**
4. Confirme

### Passo 3: Aguardar (10 segundos)
✅ Pronto! O deploy agora está em produção!

---

## 🔄 ALTERNATIVA - Via Git (Se preferir)

### Opção A: Execute o script automático
```bash
bash MAKE-PRODUCTION.sh
```

### Opção B: Manualmente
```bash
# 1. Checkout para main
git checkout main

# 2. Pull das últimas mudanças
git pull origin main

# 3. Merge da branch feature
git merge claude/fix-mercado-livre-sync-011CV6CD9AC8nWRCoTX9EiKi

# 4. Push para produção
git push origin main
```

---

## ✅ Verificar que Está em Produção

1. Acesse: https://vercel.com/dashboard
2. Vá em **"Deployments"**
3. O deploy no topo deve ter a tag **"Production"** 🟢

---

## 🎯 Depois de Promover

Teste a sincronização:
1. Acesse seu site
2. Vá em Mercado Livre → Sincronizar
3. Deve funcionar sem erro 500 ✅
4. Logs mostrarão: "Sincronização incremental..." ✅

---

**🚀 RECOMENDAÇÃO: Use a solução rápida (via Dashboard) - leva 30 segundos!**
