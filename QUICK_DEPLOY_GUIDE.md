# 🚀 Guia Rápido de Deploy

## Visão Geral

Você vai fazer deploy do seu projeto em **2 repositórios separados**:

- **Backend (Render)**: `https://github.com/Gustavodev25/project-backend.git`
  - Contém TODO o código (API + Frontend)
  - Executa as rotas de API, database, cron jobs

- **Frontend (Vercel)**: `https://github.com/Gustavodev25/project.git`
  - Contém TODO o código (API + Frontend)
  - Apenas serve o frontend e redireciona `/api/*` para o Render
  - Não executa as API routes localmente

## Passo a Passo

### 1️⃣ Preparar o código

```bash
# Atualizar URLs no cors.ts
# Edite: src/lib/cors.ts
# Adicione suas URLs reais de produção em ALLOWED_ORIGINS

# Verificar se tudo está correto
node scripts/verify-env.mjs development
```

### 2️⃣ Deploy do Backend (Render)

1. **Push para o repositório backend:**
```bash
# Certifique-se de estar no diretório do projeto
cd "c:\Users\de\Desktop\Zero Holding\project"

# Adicionar remote do backend se ainda não existe
git remote add backend https://github.com/Gustavodev25/project-backend.git

# Fazer push
git push backend main
```

2. **Configurar no Render:**
   - Vá para https://dashboard.render.com
   - Clique em "New +" → "Web Service"
   - Conecte `project-backend`
   - Configure:
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
   - Adicione as variáveis de ambiente (veja `.env.local`)
   - ⚠️ **NÃO adicione** `NEXT_PUBLIC_API_URL` no Render
   - Clique em "Create Web Service"

3. **Anote a URL do Render:**
   ```
   https://SEU-APP-BACKEND.onrender.com
   ```

### 3️⃣ Deploy do Frontend (Vercel)

1. **Atualizar `vercel.json` com a URL do Render:**
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://SEU-APP-BACKEND.onrender.com/api/:path*"
    }
  ],
  ...
}
```

2. **Push para o repositório frontend:**
```bash
# Adicionar remote do frontend se ainda não existe
git remote add frontend https://github.com/Gustavodev25/project.git

# Fazer push
git push frontend main
```

3. **Configurar na Vercel:**
   - Vá para https://vercel.com/dashboard
   - Clique em "Add New..." → "Project"
   - Importe `project`
   - Adicione variáveis de ambiente:
     ```
     NEXT_PUBLIC_API_URL=https://SEU-APP-BACKEND.onrender.com
     NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true
     NODE_ENV=production
     ```
   - Clique em "Deploy"

4. **Anote a URL da Vercel:**
   ```
   https://SEU-APP-FRONTEND.vercel.app
   ```

### 4️⃣ Conectar Backend ↔ Frontend

1. **Atualizar CORS no backend:**
   - Edite `src/lib/cors.ts` no repositório backend
   - Adicione a URL da Vercel em `ALLOWED_ORIGINS`
   - Faça push:
```bash
git push backend main
```

2. **Atualizar variáveis de ambiente no Render:**
   - Dashboard do Render → Environment
   - Atualize:
     ```
     MELI_REDIRECT_ORIGIN=https://SEU-APP-FRONTEND.vercel.app
     SHOPEE_REDIRECT_ORIGIN=https://SEU-APP-FRONTEND.vercel.app
     ```
   - Clique em "Save Changes" (vai fazer redeploy automático)

### 5️⃣ Testar

1. Abra o frontend: `https://SEU-APP-FRONTEND.vercel.app`
2. Tente fazer login
3. Verifique o console do navegador (F12) - não deve ter erros de CORS

## Checklist Final

- [ ] Backend deployado no Render
- [ ] Frontend deployado na Vercel
- [ ] `vercel.json` configurado com URL correta do Render
- [ ] `NEXT_PUBLIC_API_URL` configurado na Vercel
- [ ] `NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true` na Vercel
- [ ] URL da Vercel adicionada em `ALLOWED_ORIGINS` (backend)
- [ ] `REDIRECT_ORIGIN` atualizado para URL da Vercel (backend)
- [ ] Login funcionando sem erros de CORS
- [ ] Sessão persiste após refresh

## Comandos Git Úteis

```bash
# Ver remotes configurados
git remote -v

# Adicionar remote backend
git remote add backend https://github.com/Gustavodev25/project-backend.git

# Adicionar remote frontend
git remote add frontend https://github.com/Gustavodev25/project.git

# Push para backend
git push backend main

# Push para frontend
git push frontend main

# Push para ambos
git push backend main && git push frontend main
```

## Estrutura de Remotes Recomendada

```bash
origin   → https://github.com/Gustavodev25/project.git (frontend)
backend  → https://github.com/Gustavodev25/project-backend.git
```

## Variáveis de Ambiente

### Backend (Render) - TODAS as variáveis
```bash
DATABASE_URL=...
JWT_SECRET=...
MELI_APP_ID=...
MELI_CLIENT_SECRET=...
MELI_REDIRECT_URI=https://SEU-APP-BACKEND.onrender.com/api/meli/callback
MELI_REDIRECT_ORIGIN=https://SEU-APP-FRONTEND.vercel.app
SHOPEE_PARTNER_ID=...
SHOPEE_PARTNER_KEY=...
SHOPEE_REDIRECT_URI=https://SEU-APP-BACKEND.onrender.com/api/shopee/callback
SHOPEE_REDIRECT_ORIGIN=https://SEU-APP-FRONTEND.vercel.app
BLING_CLIENT_ID=...
BLING_REDIRECT_URI=https://SEU-APP-BACKEND.onrender.com/api/bling/callback
CRON_SECRET=...
NODE_ENV=production
```

### Frontend (Vercel) - APENAS 3 variáveis
```bash
NEXT_PUBLIC_API_URL=https://SEU-APP-BACKEND.onrender.com
NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true
NODE_ENV=production
```

## Guias Detalhados

- [Deploy Backend (Render)](./DEPLOY_RENDER_BACKEND.md)
- [Deploy Frontend (Vercel)](./DEPLOY_VERCEL_FRONTEND.md)
- [Configuração de Backend](./BACKEND_RENDER_CONFIG.md)

## Troubleshooting

### CORS Error
```
Access to fetch has been blocked by CORS
```
→ Verifique `ALLOWED_ORIGINS` no backend e faça redeploy

### 404 em /api/*
```
GET https://vercel.app/api/auth/me → 404
```
→ Verifique `vercel.json` e faça redeploy na Vercel

### Cookies não funcionam
```
Login funciona mas sessão não persiste
```
→ Verifique configuração de cookies: `sameSite: "none"`, `secure: true`

### Build falha
```
Error: Failed to compile
```
→ Teste localmente: `npm run build`

## Suporte

- **Render Logs:** Dashboard → Logs
- **Vercel Logs:** Deployments → Function Logs
- **Verificar ambiente:** `node scripts/verify-env.mjs production`
