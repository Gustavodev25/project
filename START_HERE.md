# 🚀 START HERE - Guia de Deploy para Produção

## 📌 O que foi configurado

Seu projeto está pronto para deploy com a seguinte arquitetura:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  👤 Usuário                                             │
│      ↓                                                  │
│  🌐 Frontend (Vercel)                                   │
│      ↓ /api/*                                           │
│  🔧 Backend (Render)                                    │
│      ↓                                                  │
│  🗄️  PostgreSQL (Render)                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 📁 Arquivos Criados

### Guias de Deploy
1. 🚀 **[QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md)** ← **COMECE AQUI!**
2. 🔧 **[DEPLOY_RENDER_BACKEND.md](./DEPLOY_RENDER_BACKEND.md)** - Detalhes do backend
3. 🌐 **[DEPLOY_VERCEL_FRONTEND.md](./DEPLOY_VERCEL_FRONTEND.md)** - Detalhes do frontend
4. 📄 **[README_DEPLOY.md](./README_DEPLOY.md)** - Documentação completa

### Configuração
5. ⚙️ **[PRODUCTION_CONFIG.md](./PRODUCTION_CONFIG.md)** - Template para anotar suas URLs
6. 🔀 **[SETUP_GIT_REMOTES.md](./SETUP_GIT_REMOTES.md)** - Como configurar Git
7. 📋 **[.env.example](./.env.example)** - Template de variáveis de ambiente

### Scripts
8. ✅ **[scripts/verify-env.mjs](./scripts/verify-env.mjs)** - Verificar ambiente
9. 🚢 **[scripts/push-to-production.ps1](./scripts/push-to-production.ps1)** - Deploy automático (Windows)
10. 🚢 **[scripts/push-to-production.sh](./scripts/push-to-production.sh)** - Deploy automático (Linux/Mac)

### Configurações Atualizadas
11. 📦 **[package.json](./package.json)** - Novos comandos npm
12. 🔒 **[src/lib/cors.ts](./src/lib/cors.ts)** - CORS configurado
13. 🔄 **[vercel.json](./vercel.json)** - Redirecionamento de API

## 🎯 Passo a Passo Rápido

### 1️⃣ Configurar Git Remotes (5 min)

```bash
# Adicionar repositório backend (Render)
git remote add backend https://github.com/Gustavodev25/project-backend.git

# Adicionar repositório frontend (Vercel)
git remote add frontend https://github.com/Gustavodev25/project.git

# Verificar
git remote -v
```

📘 **Guia completo:** [SETUP_GIT_REMOTES.md](./SETUP_GIT_REMOTES.md)

### 2️⃣ Deploy do Backend no Render (15 min)

1. Acesse https://dashboard.render.com
2. Crie "New Web Service"
3. Conecte `project-backend` do GitHub
4. Configure:
   - Build: `npm install && npm run build`
   - Start: `npm start`
5. Adicione variáveis de ambiente (sem `NEXT_PUBLIC_*`)
6. Deploy!

📘 **Guia completo:** [DEPLOY_RENDER_BACKEND.md](./DEPLOY_RENDER_BACKEND.md)

### 3️⃣ Deploy do Frontend na Vercel (10 min)

1. Acesse https://vercel.com/dashboard
2. Import project
3. Conecte `project` do GitHub
4. Adicione APENAS 3 variáveis:
   ```
   NEXT_PUBLIC_API_URL=https://SEU-BACKEND.onrender.com
   NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true
   NODE_ENV=production
   ```
5. Deploy!

📘 **Guia completo:** [DEPLOY_VERCEL_FRONTEND.md](./DEPLOY_VERCEL_FRONTEND.md)

### 4️⃣ Conectar Frontend ↔ Backend (5 min)

1. Edite [src/lib/cors.ts](./src/lib/cors.ts):
   ```typescript
   const ALLOWED_ORIGINS = [
     'https://SEU-FRONTEND.vercel.app',  // Adicione aqui
     // ...
   ];
   ```

2. Atualize variáveis no Render:
   ```
   MELI_REDIRECT_ORIGIN=https://SEU-FRONTEND.vercel.app
   SHOPEE_REDIRECT_ORIGIN=https://SEU-FRONTEND.vercel.app
   ```

3. Push para backend:
   ```bash
   git push backend main
   ```

### 5️⃣ Testar (2 min)

1. Abra `https://SEU-FRONTEND.vercel.app`
2. Faça login
3. Verifique console (F12) - sem erros CORS ✅

## 💻 Comandos Úteis

### Verificar ambiente
```bash
npm run verify:env          # Desenvolvimento
npm run verify:env:prod     # Produção
```

### Deploy
```bash
npm run deploy:backend      # Backend apenas
npm run deploy:frontend     # Frontend apenas
npm run deploy:all          # Ambos
```

### Deploy automático (Windows)
```powershell
.\scripts\push-to-production.ps1 "sua mensagem de commit"
```

### Deploy automático (Linux/Mac)
```bash
chmod +x scripts/push-to-production.sh
./scripts/push-to-production.sh "sua mensagem de commit"
```

## 📚 Documentação

### 🎯 Essencial (leia primeiro)
- **[QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md)** - Passo a passo simplificado
- **[SETUP_GIT_REMOTES.md](./SETUP_GIT_REMOTES.md)** - Configurar Git

### 📖 Detalhada (quando precisar)
- **[DEPLOY_RENDER_BACKEND.md](./DEPLOY_RENDER_BACKEND.md)** - Backend completo
- **[DEPLOY_VERCEL_FRONTEND.md](./DEPLOY_VERCEL_FRONTEND.md)** - Frontend completo
- **[README_DEPLOY.md](./README_DEPLOY.md)** - Documentação completa

### 📝 Referência
- **[PRODUCTION_CONFIG.md](./PRODUCTION_CONFIG.md)** - Template de configuração
- **[.env.example](./.env.example)** - Variáveis de ambiente

## 🔐 Variáveis de Ambiente

### Backend (Render) - TODAS as variáveis
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
MELI_*=...
SHOPEE_*=...
BLING_*=...
CRON_SECRET=...
NODE_ENV=production
```

⚠️ **NÃO adicione:** `NEXT_PUBLIC_API_URL` ou `NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND`

### Frontend (Vercel) - APENAS 3 variáveis
```bash
NEXT_PUBLIC_API_URL=https://SEU-BACKEND.onrender.com
NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true
NODE_ENV=production
```

⚠️ **NÃO adicione:** Nenhum secret do backend

## ✅ Checklist Completo

### Preparação
- [ ] Git remotes configurados (`backend` e `frontend`)
- [ ] `.env.local` configurado localmente
- [ ] `npm run verify:env` passou
- [ ] `npm run build` funciona

### Backend (Render)
- [ ] Web Service criado
- [ ] PostgreSQL criado e conectado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy concluído
- [ ] URL anotada: `https://_____.onrender.com`

### Frontend (Vercel)
- [ ] Projeto importado
- [ ] 3 variáveis de ambiente configuradas
- [ ] `vercel.json` atualizado com URL do backend
- [ ] Deploy concluído
- [ ] URL anotada: `https://_____.vercel.app`

### Conexão
- [ ] URL Vercel em `ALLOWED_ORIGINS` (backend)
- [ ] `REDIRECT_ORIGIN` atualizado (backend)
- [ ] Push para backend feito
- [ ] Login testado e funcionando
- [ ] Console sem erros CORS
- [ ] Sessão persiste

### Integração
- [ ] Callback URLs atualizadas no Mercado Livre
- [ ] Callback URLs atualizadas no Shopee
- [ ] Callback URLs atualizadas no Bling
- [ ] Sincronização de vendas testada

## 🐛 Problemas Comuns

### CORS Error
→ Verifique `ALLOWED_ORIGINS` em [cors.ts](./src/lib/cors.ts#L7)

### 404 em /api/*
→ Verifique [vercel.json](./vercel.json#L2) tem URL correta

### Cookies não funcionam
→ Deve ser `secure: true`, `sameSite: "none"`

### Build falha
→ Teste localmente: `npm run build`

📘 **Troubleshooting completo:** [README_DEPLOY.md](./README_DEPLOY.md#-troubleshooting)

## 📊 Monitoramento

### Render
- Dashboard: https://dashboard.render.com
- Logs em tempo real
- Métricas de CPU/Memory

### Vercel
- Dashboard: https://vercel.com/dashboard
- Function Logs
- Analytics automático

## 🎯 Próximos Passos

1. **Leia:** [QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md)
2. **Configure:** Git remotes (5 min)
3. **Deploy:** Backend no Render (15 min)
4. **Deploy:** Frontend na Vercel (10 min)
5. **Conecte:** Frontend ↔ Backend (5 min)
6. **Teste:** Login e funcionalidades

**Tempo total estimado:** ~35-45 minutos

## 🆘 Precisa de Ajuda?

### Logs
```bash
# Render: Dashboard → Logs
# Vercel: Deployments → Function Logs
```

### Verificar Configuração
```bash
npm run verify:env:prod
```

### Documentação
- Next.js: https://nextjs.org/docs
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs

---

## 🚀 Comece Agora!

1. **Primeiro:** Configure os remotes Git
   ```bash
   git remote add backend https://github.com/Gustavodev25/project-backend.git
   git remote add frontend https://github.com/Gustavodev25/project.git
   ```

2. **Depois:** Siga o [QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md)

3. **Anote:** URLs e configs no [PRODUCTION_CONFIG.md](./PRODUCTION_CONFIG.md)

**Boa sorte com o deploy! 🎉**
