# Deploy Backend no Render

Este guia explica como fazer deploy do backend no Render usando o repositório `https://github.com/Gustavodev25/project-backend.git`

## 1. Preparação do Repositório Backend

O repositório backend deve conter **TODO o código**, incluindo as rotas API e componentes frontend (Next.js completo).

### Estrutura do repositório backend:
```
project-backend/
├── src/
│   ├── app/
│   │   ├── api/          ← Todas as rotas API
│   │   ├── components/   ← Componentes React
│   │   └── ...
│   ├── lib/
│   ├── hooks/
│   └── ...
├── prisma/
├── package.json
├── .env (não commitar!)
└── ...
```

## 2. Configuração no Render

### 2.1 Criar Web Service

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte o repositório: `https://github.com/Gustavodev25/project-backend.git`

### 2.2 Configurações do Service

```yaml
Name: project-backend
Region: Oregon (US West)
Branch: main
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

### 2.3 Plano

- **Free** (para testes) ou **Starter** ($7/mês para produção)
- ⚠️ Free tier tem cold start (pode demorar 30s-1min na primeira requisição)

## 3. Variáveis de Ambiente no Render

Adicione as seguintes variáveis em **Environment** → **Environment Variables**:

### ⚠️ IMPORTANTE: NÃO defina estas variáveis:
```bash
# ❌ NÃO adicione no Render (apenas para desenvolvimento local):
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND
```

### ✅ Variáveis necessárias no Render:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# JWT
JWT_SECRET=sua_chave_secreta_aqui

# Mercado Livre
MELI_APP_ID=seu_app_id
MELI_CLIENT_SECRET=seu_client_secret
MELI_REDIRECT_URI=https://SEU-APP.onrender.com/api/meli/callback
MELI_REDIRECT_ORIGIN=https://SEU-APP.vercel.app
MELI_AUTH_BASE=https://auth.mercadolibre.com
MELI_API_BASE=https://api.mercadolibre.com

# Shopee
SHOPEE_PARTNER_ID=seu_partner_id
SHOPEE_PARTNER_KEY=sua_partner_key
SHOPEE_REDIRECT_URI=https://SEU-APP.onrender.com/api/shopee/callback
SHOPEE_REDIRECT_ORIGIN=https://SEU-APP.vercel.app
SHOPEE_API_BASE=https://partner.shopeemobile.com

# Bling
BLING_CLIENT_ID=seu_client_id
BLING_CLIENT_SECRET=seu_client_secret
BLING_REDIRECT_URI=https://SEU-APP.onrender.com/api/bling/callback
BLING_TIPO_INTEGRACAO=API
BLING_ID_LOJA=

# Cron
CRON_SECRET=sua_chave_cron_secreta

# Node.js
NODE_ENV=production
```

## 4. Atualizar URLs no Código

Antes de fazer deploy, atualize a lista de origens permitidas em `src/lib/cors.ts`:

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://SEU-APP.vercel.app',                    // ← Frontend Vercel
  'https://SEU-APP.onrender.com',                  // ← Backend Render
  // Adicione preview URLs da Vercel se necessário:
  // 'https://project-git-*.vercel.app',
];
```

## 5. Deploy

1. Faça commit e push das alterações:
```bash
cd project-backend
git add .
git commit -m "feat: configurar para deploy no Render"
git push origin main
```

2. O Render fará deploy automaticamente
3. Aguarde o build completar (5-10 minutos)
4. Anote a URL final: `https://SEU-APP.onrender.com`

## 6. Verificar Deploy

Teste os endpoints principais:

```bash
# Health check
curl https://SEU-APP.onrender.com/api/health

# Verificar se API está respondendo
curl https://SEU-APP.onrender.com/api/auth/me
# Esperado: 401 Unauthorized (ok, não está autenticado)
```

## 7. Configurar Database

Se usar PostgreSQL do Render:

1. Crie um PostgreSQL no Render
2. Copie a **External Database URL**
3. Adicione como variável `DATABASE_URL`
4. O Prisma rodará `prisma generate` automaticamente no build

## 8. Problemas Comuns

### Build falha

```bash
# Adicione postinstall no package.json:
"scripts": {
  "postinstall": "prisma generate"
}
```

### CORS errors

- Verifique se a URL do Vercel está em `ALLOWED_ORIGINS`
- Certifique-se que `origin.endsWith('.vercel.app')` está no código

### Cold start (Free tier)

- Primeira requisição pode demorar 30s-1min
- Use plano Starter para evitar cold starts

## 9. Monitoramento

- Logs: **Dashboard** → **Logs**
- Métricas: **Dashboard** → **Metrics**
- Configure alertas em **Settings** → **Alerts**

## 10. Custom Domain (Opcional)

1. **Settings** → **Custom Domain**
2. Adicione seu domínio
3. Configure DNS conforme instruções
4. Atualize `ALLOWED_ORIGINS` e variáveis de callback

---

**Próximo passo:** Siga o guia [DEPLOY_VERCEL_FRONTEND.md](./DEPLOY_VERCEL_FRONTEND.md) para configurar o frontend.
