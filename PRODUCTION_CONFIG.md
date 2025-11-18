# 🔧 Configurações de Produção

Use este arquivo para anotar suas URLs e configurações de produção.

## 📋 URLs de Produção

### Backend (Render)
```
URL: https://_____________________.onrender.com
Status: [ ] Deployado [ ] Em andamento [ ] Não iniciado
```

### Frontend (Vercel)
```
URL: https://_____________________.vercel.app
Status: [ ] Deployado [ ] Em andamento [ ] Não iniciado
```

### Database (Render PostgreSQL)
```
Host: _____________________
Database: _____________________
Status: [ ] Criado [ ] Conectado
```

## 🔐 Secrets de Produção

### JWT & Cron
```bash
# Gerar com: openssl rand -hex 32

JWT_SECRET=_________________________________
CRON_SECRET=_________________________________
```

### Mercado Livre
```bash
MELI_APP_ID=_________________________________
MELI_CLIENT_SECRET=_________________________________
```

### Shopee
```bash
SHOPEE_PARTNER_ID=_________________________________
SHOPEE_PARTNER_KEY=_________________________________
```

### Bling
```bash
BLING_CLIENT_ID=_________________________________
BLING_CLIENT_SECRET=_________________________________
```

## 🌐 Variáveis de Ambiente

### Render (Backend)

**⚠️ NÃO incluir:**
- ❌ `NEXT_PUBLIC_API_URL`
- ❌ `NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND`

**✅ Incluir:**

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Auth
JWT_SECRET=

# Mercado Livre
MELI_APP_ID=
MELI_CLIENT_SECRET=
MELI_REDIRECT_URI=https://_____.onrender.com/api/meli/callback
MELI_REDIRECT_ORIGIN=https://_____.vercel.app
MELI_AUTH_BASE=https://auth.mercadolibre.com
MELI_API_BASE=https://api.mercadolibre.com

# Shopee
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
SHOPEE_REDIRECT_URI=https://_____.onrender.com/api/shopee/callback
SHOPEE_REDIRECT_ORIGIN=https://_____.vercel.app
SHOPEE_API_BASE=https://partner.shopeemobile.com

# Bling
BLING_CLIENT_ID=
BLING_CLIENT_SECRET=
BLING_REDIRECT_URI=https://_____.onrender.com/api/bling/callback
BLING_TIPO_INTEGRACAO=API
BLING_ID_LOJA=

# Cron
CRON_SECRET=

# Node
NODE_ENV=production
```

### Vercel (Frontend)

**⚠️ APENAS 3 variáveis:**

```bash
NEXT_PUBLIC_API_URL=https://_____.onrender.com
NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true
NODE_ENV=production
```

## 📝 Checklist de Configuração

### Passo 1: Backend (Render)
- [ ] 1. Criar Web Service no Render
- [ ] 2. Conectar repositório `project-backend`
- [ ] 3. Configurar build command: `npm install && npm run build`
- [ ] 4. Configurar start command: `npm start`
- [ ] 5. Criar PostgreSQL no Render
- [ ] 6. Copiar DATABASE_URL
- [ ] 7. Adicionar TODAS as variáveis de ambiente acima
- [ ] 8. Deploy
- [ ] 9. Anotar URL final: `https://_____.onrender.com`
- [ ] 10. Testar: `curl https://_____.onrender.com/api/health`

### Passo 2: Frontend (Vercel)
- [ ] 1. Importar projeto na Vercel
- [ ] 2. Conectar repositório `project`
- [ ] 3. Adicionar 3 variáveis de ambiente acima
- [ ] 4. Deploy
- [ ] 5. Anotar URL final: `https://_____.vercel.app`
- [ ] 6. Abrir no navegador

### Passo 3: Conectar Backend ↔ Frontend
- [ ] 1. Editar `src/lib/cors.ts` no backend
- [ ] 2. Adicionar URL da Vercel em `ALLOWED_ORIGINS`
- [ ] 3. Git push para backend
- [ ] 4. No Render, atualizar variáveis:
  - [ ] `MELI_REDIRECT_ORIGIN=https://_____.vercel.app`
  - [ ] `SHOPEE_REDIRECT_ORIGIN=https://_____.vercel.app`
- [ ] 5. Aguardar redeploy
- [ ] 6. Testar login no frontend
- [ ] 7. Verificar console (F12) - sem erros CORS

### Passo 4: Configurar Marketplaces
- [ ] 1. Atualizar callback URLs no Mercado Livre
  - URL: `https://_____.onrender.com/api/meli/callback`
- [ ] 2. Atualizar callback URLs no Shopee
  - URL: `https://_____.onrender.com/api/shopee/callback`
- [ ] 3. Atualizar callback URLs no Bling
  - URL: `https://_____.onrender.com/api/bling/callback`

## 🧪 Testes de Produção

### 1. Backend Health
```bash
curl https://_____.onrender.com/api/health
# Esperado: 200 OK
```

### 2. Login
- [ ] Abrir: `https://_____.vercel.app/login`
- [ ] Fazer login com credenciais válidas
- [ ] Verificar redirecionamento para dashboard
- [ ] Fazer refresh - sessão deve persistir

### 3. CORS
- [ ] Abrir: `https://_____.vercel.app`
- [ ] Abrir console (F12)
- [ ] Não deve haver erros de CORS
- [ ] Verificar Network tab - requisições /api/* devem retornar 200

### 4. Integração Mercado Livre
- [ ] Conectar conta do Mercado Livre
- [ ] Verificar se callback funciona
- [ ] Testar sincronização de vendas

### 5. Cron Jobs
- [ ] Verificar logs do Render
- [ ] Deve mostrar execução dos cron jobs
- [ ] Sincronização automática deve funcionar

## 📊 Monitoramento

### Render Dashboard
```
URL: https://dashboard.render.com/web/[seu-service-id]

Verificar:
- [ ] Service está "Live"
- [ ] Sem erros recentes nos logs
- [ ] Métricas de CPU/Memory normais
- [ ] Database conectado
```

### Vercel Dashboard
```
URL: https://vercel.com/[seu-user]/project

Verificar:
- [ ] Deploy foi "Ready"
- [ ] Sem erros de build
- [ ] Function logs sem erros
- [ ] Analytics funcionando
```

## 🚨 Problemas Comuns

### Cold Start (Render Free Tier)
**Sintoma:** Primeira requisição demora 30s-1min

**Solução:**
- Upgrade para plano Starter ($7/mês)
- Ou aceitar cold start em free tier

### CORS Blocked
**Sintoma:** `Access to fetch has been blocked by CORS`

**Solução:**
1. Verificar `ALLOWED_ORIGINS` em `src/lib/cors.ts`
2. Adicionar URL da Vercel
3. Git push e aguardar redeploy

### 404 em /api/*
**Sintoma:** Chamadas para `/api/*` retornam 404

**Solução:**
1. Verificar `vercel.json` existe
2. Confirmar URL do backend está correta
3. Redeploy na Vercel

### Session Lost
**Sintoma:** Login funciona mas sessão não persiste

**Solução:**
1. Verificar cookies: `secure: true`, `sameSite: "none"`
2. Verificar HTTPS (não HTTP)
3. Verificar domínio não está em blocklist do navegador

## 📞 Suporte

### Logs
```bash
# Render
Dashboard → Logs → Selecionar serviço

# Vercel
Deployments → Selecionar deploy → View Function Logs
```

### Comandos Úteis
```bash
# Verificar variáveis localmente
npm run verify:env

# Verificar para produção
npm run verify:env:prod

# Testar build local
npm run build
```

### Links Úteis
- [Quick Deploy Guide](./QUICK_DEPLOY_GUIDE.md)
- [Render Backend Guide](./DEPLOY_RENDER_BACKEND.md)
- [Vercel Frontend Guide](./DEPLOY_VERCEL_FRONTEND.md)
- [Main README](./README_DEPLOY.md)

---

**Última atualização:** 2025-11-18

**Status atual:**
- [ ] Configuração em andamento
- [ ] Backend deployado
- [ ] Frontend deployado
- [ ] Conexão funcionando
- [ ] Testes concluídos
- [ ] Produção ao vivo ✨
