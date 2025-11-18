# Deploy Frontend na Vercel

Este guia explica como fazer deploy do frontend na Vercel usando o repositório `https://github.com/Gustavodev25/project.git`

## 1. Preparação do Repositório Frontend

O repositório frontend deve conter **TODO o código** (mesma estrutura do backend).

### Por que o código é o mesmo?

- Next.js permite tanto frontend quanto backend
- No Render: usamos tudo (API routes + frontend)
- Na Vercel: usamos apenas o frontend (API routes são desabilitadas via config)

### Estrutura do repositório frontend:
```
project/
├── src/
│   ├── app/
│   │   ├── api/          ← Será IGNORADO pela Vercel
│   │   ├── components/   ← Usado pela Vercel
│   │   └── ...
│   ├── lib/
│   ├── hooks/
│   └── ...
├── package.json
└── vercel.json           ← Configuração para redirecionar API
```

## 2. Criar arquivo vercel.json

Este arquivo garante que todas as chamadas `/api/*` sejam redirecionadas para o backend no Render:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://SEU-APP.onrender.com/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**⚠️ IMPORTANTE:** Substitua `SEU-APP.onrender.com` pela URL real do seu backend no Render!

## 3. Configuração na Vercel

### 3.1 Importar Projeto

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique em **"Add New..."** → **"Project"**
3. Importe o repositório: `https://github.com/Gustavodev25/project.git`

### 3.2 Configurações do Projeto

```yaml
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build (deixe padrão)
Output Directory: .next (deixe padrão)
Install Command: npm install (deixe padrão)
```

## 4. Variáveis de Ambiente na Vercel

Adicione em **Settings** → **Environment Variables**:

### ✅ Variáveis necessárias:

```bash
# URL do backend no Render (OBRIGATÓRIO)
NEXT_PUBLIC_API_URL=https://SEU-APP.onrender.com

# Força usar backend externo (OBRIGATÓRIO em produção)
NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true

# Node.js
NODE_ENV=production
```

### ⚠️ NÃO adicione na Vercel:
```bash
# ❌ Estas são apenas para o backend (Render):
DATABASE_URL
JWT_SECRET
MELI_CLIENT_SECRET
SHOPEE_PARTNER_KEY
BLING_CLIENT_SECRET
CRON_SECRET
```

## 5. Deploy

1. Faça commit do `vercel.json`:
```bash
cd project
git add vercel.json
git commit -m "feat: configurar Vercel para usar backend Render"
git push origin main
```

2. A Vercel fará deploy automaticamente
3. Aguarde o build completar (2-5 minutos)
4. Anote a URL final: `https://SEU-APP.vercel.app`

## 6. Atualizar Backend com URL da Vercel

Agora que tem a URL da Vercel, volte ao Render e atualize:

### 6.1 No código (cors.ts)

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://SEU-APP.vercel.app',  // ← Adicione aqui
  // ...
];
```

### 6.2 Variáveis de ambiente no Render

Atualize as variáveis de `REDIRECT_ORIGIN`:

```bash
MELI_REDIRECT_ORIGIN=https://SEU-APP.vercel.app
SHOPEE_REDIRECT_ORIGIN=https://SEU-APP.vercel.app
```

### 6.3 Fazer deploy atualizado

```bash
cd project-backend
git add src/lib/cors.ts
git commit -m "feat: adicionar URL da Vercel em CORS"
git push origin main
```

## 7. Testar Integração

### 7.1 Abra o site da Vercel

```
https://SEU-APP.vercel.app
```

### 7.2 Verifique o Console do Navegador

Não deve haver erros de CORS. Se houver:

```
Access to fetch at 'https://SEU-APP.onrender.com/api/...' from origin 'https://SEU-APP.vercel.app' has been blocked by CORS
```

→ Volte ao backend e verifique `ALLOWED_ORIGINS`

### 7.3 Teste o Login

1. Acesse `/login`
2. Faça login
3. Verifique se redireciona corretamente

## 8. Preview Deployments (Opcional)

Cada PR cria um preview deployment. Para permitir CORS neles:

### Opção 1: Wildcard na Vercel
```typescript
const ALLOWED_ORIGINS = [
  'https://SEU-APP.vercel.app',
];

// No getCorsHeaders:
if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app'))) {
  // ...
}
```

### Opção 2: Adicionar variável de ambiente
```bash
NEXT_PUBLIC_VERCEL_URL=SEU-APP.vercel.app
```

E usar no código:
```typescript
const vercelDomain = process.env.NEXT_PUBLIC_VERCEL_URL;
if (origin?.includes(vercelDomain)) {
  // Permitir
}
```

## 9. Problemas Comuns

### CORS errors

**Sintoma:**
```
No 'Access-Control-Allow-Origin' header is present
```

**Solução:**
1. Verifique `ALLOWED_ORIGINS` no backend
2. Verifique se `origin.endsWith('.vercel.app')` está presente
3. Veja logs do Render para confirmar origem recebida

### API retorna 404

**Sintoma:**
```
GET https://SEU-APP.vercel.app/api/auth/me → 404
```

**Causa:** `vercel.json` não está configurado ou está incorreto

**Solução:**
1. Verifique se `vercel.json` existe no repositório
2. Confirme que URL do backend está correta
3. Faça redeploy: **Deployments** → **⋯** → **Redeploy**

### Cookies não funcionam

**Sintoma:** Login funciona mas não mantém sessão

**Solução:**
Verifique configuração de cookies no backend:

```typescript
res.cookies.set("session", token, {
  httpOnly: true,
  secure: true,        // ← Deve ser true em produção
  sameSite: "none",    // ← Deve ser "none" para cross-origin
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
});
```

### Build falha

**Sintoma:**
```
Error: Failed to compile
```

**Solução:**
1. Teste build localmente: `npm run build`
2. Verifique logs na Vercel
3. Corrija erros de TypeScript/ESLint

## 10. Custom Domain (Opcional)

1. **Settings** → **Domains**
2. Adicione seu domínio
3. Configure DNS conforme instruções
4. Atualize variáveis de ambiente:
   - `NEXT_PUBLIC_API_URL` (se mudar)
   - Backend: adicione domínio em `ALLOWED_ORIGINS`
   - Marketplaces: atualize `REDIRECT_ORIGIN`

## 11. Monitoramento

- **Analytics:** Vercel Analytics (gratuito)
- **Logs:** **Deployments** → **Functions**
- **Speed Insights:** Configure em **Settings**

## 12. Checklist Final

- [ ] `vercel.json` criado com URL correta do backend
- [ ] `NEXT_PUBLIC_API_URL` configurado na Vercel
- [ ] `NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true` na Vercel
- [ ] URL da Vercel adicionada em `ALLOWED_ORIGINS` no backend
- [ ] `REDIRECT_ORIGIN` atualizado para URL da Vercel
- [ ] Deploy testado: login funciona, sem erros CORS
- [ ] Cookies funcionando (sessão persiste)

---

**Pronto!** Seu frontend está na Vercel e backend no Render. 🚀

Para dúvidas, veja os logs:
- **Vercel:** Deployments → Function Logs
- **Render:** Dashboard → Logs
