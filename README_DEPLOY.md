# ContaZoom - Documentação de Deploy

## 📋 Visão Geral do Projeto

ContaZoom é uma aplicação Next.js full-stack que integra com múltiplos marketplaces (Mercado Livre, Shopee, Bling) para gerenciamento de vendas.

## 🏗️ Arquitetura de Deploy

### Estratégia: Backend e Frontend Separados

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Usuário acessa https://SEU-APP.vercel.app                 │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Frontend (Vercel)                                          │
│  - Serve apenas UI (componentes React)                     │
│  - Redireciona /api/* para backend via vercel.json         │
│  - Variáveis: NEXT_PUBLIC_API_URL, FORCE_EXTERNAL_BACKEND  │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Todas as chamadas /api/*
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Backend (Render)                                           │
│  - Executa todas as rotas API                              │
│  - Conecta ao database (PostgreSQL)                        │
│  - Executa cron jobs                                        │
│  - Integra com marketplaces                                │
│  - CORS configurado para aceitar frontend Vercel           │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │   PostgreSQL  │
              │   (Render)    │
              └───────────────┘
```

## 📁 Estrutura de Repositórios

### 1. Repositório Backend (Render)
**URL:** `https://github.com/Gustavodev25/project-backend.git`

**Contém:**
- ✅ Código completo do projeto (frontend + backend)
- ✅ Todas as rotas `/api/*`
- ✅ Configurações de database
- ✅ Cron jobs
- ✅ Integrações com marketplaces

**Variáveis de ambiente necessárias:**
- `DATABASE_URL`
- `JWT_SECRET`
- `MELI_*`, `SHOPEE_*`, `BLING_*`
- `CRON_SECRET`
- ❌ **NÃO** adicionar `NEXT_PUBLIC_API_URL`

### 2. Repositório Frontend (Vercel)
**URL:** `https://github.com/Gustavodev25/project.git`

**Contém:**
- ✅ Código completo do projeto (frontend + backend)
- ✅ `vercel.json` configurado para redirecionar API
- ⚠️ Rotas `/api/*` são redirecionadas para o Render

**Variáveis de ambiente necessárias:**
- `NEXT_PUBLIC_API_URL=https://SEU-APP-BACKEND.onrender.com`
- `NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true`
- `NODE_ENV=production`
- ❌ **NÃO** adicionar secrets do backend

## 🚀 Guias de Deploy

### Início Rápido
📘 [QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md) - Siga este guia primeiro!

### Guias Detalhados
1. 🔧 [DEPLOY_RENDER_BACKEND.md](./DEPLOY_RENDER_BACKEND.md) - Deploy do backend no Render
2. 🌐 [DEPLOY_VERCEL_FRONTEND.md](./DEPLOY_VERCEL_FRONTEND.md) - Deploy do frontend na Vercel

### Configuração Específica
📄 [BACKEND_RENDER_CONFIG.md](./BACKEND_RENDER_CONFIG.md) - Detalhes de configuração do backend

## 🔧 Scripts Úteis

### Verificar Ambiente
```bash
# Verificar ambiente de desenvolvimento
npm run verify:env

# Verificar ambiente de produção
npm run verify:env:prod
```

### Desenvolvimento Local
```bash
# Iniciar servidor local
npm run dev

# Iniciar com HTTPS
npm run dev:https
```

### Build e Deploy
```bash
# Build local para testar
npm run build

# Iniciar produção local
npm start
```

## 📝 Arquivos Importantes

### `.env.local` (Desenvolvimento)
```bash
# Não commitar este arquivo!
DATABASE_URL=...
JWT_SECRET=...
NEXT_PUBLIC_API_URL=  # Vazio em dev local
NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=false
```

### `.env.example` (Template)
Use este arquivo como referência para criar seu `.env.local`

### `vercel.json` (Redirecionamento de API)
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://SEU-BACKEND.onrender.com/api/:path*"
    }
  ]
}
```

### `src/lib/cors.ts` (Configuração CORS)
Lista de origens permitidas que podem acessar o backend:
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',  // Dev local
  'https://SEU-APP.vercel.app',  // Frontend produção
  'https://SEU-BACKEND.onrender.com',  // Backend produção
];
```

## 🔐 Segurança

### Cookies
Em produção, os cookies devem usar:
```typescript
{
  httpOnly: true,
  secure: true,        // HTTPS obrigatório
  sameSite: "none",    // Cross-origin (Vercel → Render)
  path: "/",
}
```

### CORS
O backend valida a origem de cada requisição:
- ✅ Permite origins em `ALLOWED_ORIGINS`
- ✅ Permite `*.vercel.app` (preview deployments)
- ❌ Bloqueia outras origens

### Secrets
- Nunca commite arquivos `.env` ou `.env.local`
- Use `openssl rand -hex 32` para gerar secrets
- Guarde secrets no vault (1Password, etc.)

## 🔄 Fluxo de Deploy

### 1. Desenvolvimento Local
```bash
git add .
git commit -m "feat: nova funcionalidade"
```

### 2. Deploy para Backend (Render)
```bash
git push backend main
# Render faz build e deploy automaticamente
```

### 3. Deploy para Frontend (Vercel)
```bash
git push frontend main
# Vercel faz build e deploy automaticamente
```

### 4. Verificar
- ✅ Abrir frontend: `https://SEU-APP.vercel.app`
- ✅ Testar login
- ✅ Verificar console (F12) - sem erros CORS
- ✅ Verificar logs do Render

## 📊 Monitoramento

### Render
- **Logs:** Dashboard → Logs
- **Métricas:** Dashboard → Metrics
- **Alertas:** Settings → Alerts

### Vercel
- **Logs:** Deployments → Function Logs
- **Analytics:** Dashboard → Analytics
- **Speed Insights:** Dashboard → Speed Insights

## 🐛 Troubleshooting

### CORS Error
```
Access to fetch at '...' has been blocked by CORS policy
```
**Solução:**
1. Verifique `ALLOWED_ORIGINS` em [cors.ts](src/lib/cors.ts#L7)
2. Adicione URL da Vercel se estiver faltando
3. Push para backend: `git push backend main`

### 404 em /api/*
```
GET https://SEU-APP.vercel.app/api/auth/me → 404
```
**Solução:**
1. Verifique [vercel.json](vercel.json#L2)
2. Confirme URL do backend está correta
3. Redeploy na Vercel

### Cookies não funcionam
```
Login funciona mas sessão não persiste
```
**Solução:**
1. Verifique configuração de cookies em [login/route.ts](src/app/api/auth/login/route.ts#L109)
2. Deve ser: `secure: true`, `sameSite: "none"`
3. Push para backend: `git push backend main`

### Build falha
```
Error: Failed to compile
```
**Solução:**
1. Teste localmente: `npm run build`
2. Veja erro específico
3. Corrija erros de TypeScript/ESLint
4. Push novamente

## 📚 Estrutura de Pastas

```
project/
├── src/
│   ├── app/
│   │   ├── api/              ← Rotas API (executam no Render)
│   │   │   ├── auth/
│   │   │   ├── meli/
│   │   │   ├── shopee/
│   │   │   ├── bling/
│   │   │   └── cron/
│   │   ├── components/       ← Componentes React (renderizam na Vercel)
│   │   ├── dashboard/
│   │   ├── login/
│   │   └── ...
│   ├── lib/
│   │   ├── cors.ts          ← Configuração CORS
│   │   ├── api-config.ts    ← Configuração de API
│   │   └── prisma.ts
│   └── hooks/
├── prisma/
│   └── schema.prisma
├── scripts/
│   ├── dev-local.mjs
│   └── verify-env.mjs       ← Script de verificação
├── .env.local               ← Variáveis locais (não commitar)
├── .env.example             ← Template de variáveis
├── vercel.json              ← Config Vercel (rewrite de API)
├── package.json
└── README_DEPLOY.md         ← Este arquivo
```

## 🎯 Checklist de Deploy

### Antes do Deploy
- [ ] Código commitado no git
- [ ] `.env.local` configurado
- [ ] `npm run verify:env` passou
- [ ] `npm run build` funciona localmente
- [ ] URLs de produção definidas

### Deploy Backend (Render)
- [ ] Repositório conectado
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] Variáveis de ambiente configuradas
- [ ] Database PostgreSQL criado e conectado
- [ ] Deploy realizado com sucesso
- [ ] URL anotada: `https://_____.onrender.com`

### Deploy Frontend (Vercel)
- [ ] Repositório conectado
- [ ] `vercel.json` com URL correta do backend
- [ ] `NEXT_PUBLIC_API_URL` configurado
- [ ] `NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true`
- [ ] Deploy realizado com sucesso
- [ ] URL anotada: `https://_____.vercel.app`

### Conexão Backend ↔ Frontend
- [ ] URL Vercel adicionada em `ALLOWED_ORIGINS` (backend)
- [ ] `REDIRECT_ORIGIN` atualizado (backend)
- [ ] Redeploy do backend feito
- [ ] Login testado e funcionando
- [ ] Sem erros CORS
- [ ] Sessão persiste após refresh

## 🆘 Suporte

### Documentação
- Next.js: https://nextjs.org/docs
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
- Prisma: https://www.prisma.io/docs

### Logs
```bash
# Ver logs do Render
# Dashboard → Logs

# Ver logs da Vercel
# Deployments → Function Logs
```

### Verificar Variáveis
```bash
# Localmente
npm run verify:env

# Para produção
npm run verify:env:prod
```

---

**Criado em:** 2025-11-18
**Última atualização:** 2025-11-18
