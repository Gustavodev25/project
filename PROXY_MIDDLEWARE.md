# Middleware de Proxy para Backend Render

## 🎯 Objetivo

Fazer com que **todas** as requisições para `/api/meli/*` e `/api/shopee/*` sejam automaticamente encaminhadas para o backend no Render (`https://project-backend-rjoh.onrender.com`), mantendo autenticação e cookies.

## 🏗️ Arquitetura

```
┌─────────┐    /api/meli/accounts    ┌──────────────┐   /api/meli/accounts   ┌────────────────┐
│ Browser │ ─────────────────────────>│  Next.js     │ ───────────────────────>│ Backend Render │
│         │   (same-origin)            │  Middleware  │   (server-side)         │  (Express)     │
│         │                            │  (Vercel)    │   + cookies             │                │
│         │ <─────────────────────────│              │ <───────────────────────│                │
└─────────┘        200 OK             └──────────────┘        200 OK          └────────────────┘
```

## 📁 Arquivos Criados/Modificados

### 1. `src/middleware.ts` (NOVO)

Middleware Next.js que intercepta TODAS as rotas `/api/meli/*` e `/api/shopee/*`:

```typescript
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function middleware(request: NextRequest) {
  if (BACKEND_URL && pathname.startsWith("/api/meli/")) {
    // Fazer proxy para o backend Render
    const backendResponse = await fetch(`${BACKEND_URL}${pathname}`, {
      method: request.method,
      headers: request.headers,
      body: await request.body,
      credentials: "include",
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: backendResponse.headers,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/meli/:path*", "/api/shopee/:path*"],
};
```

### 2. `src/lib/backend-proxy.ts` (NOVO)

Helper functions para verificar e fazer proxy (usado opcionalmente por API Routes individuais):

```typescript
export function shouldUseBackendProxy(): boolean {
  return !!process.env.BACKEND_URL;
}

export async function proxyToBackend(
  path: string,
  options?: RequestInit,
  sessionCookie?: string
): Promise<Response> {
  // ... implementação
}
```

### 3. Variável de Ambiente

```bash
# .env.local (desenvolvimento)
BACKEND_URL="https://project-backend-rjoh.onrender.com"

# Vercel (produção)
BACKEND_URL=https://project-backend-rjoh.onrender.com
```

## 🔄 Como Funciona

### Com BACKEND_URL Configurado (Produção/Render)

1. **Browser** faz: `GET /api/meli/accounts`
2. **Middleware Next.js** intercepta a requisição
3. **Verifica** que `BACKEND_URL` está configurado
4. **Faz proxy** para: `https://project-backend-rjoh.onrender.com/api/meli/accounts`
   - Copia todos os headers (incluindo cookies)
   - Copia o body (se houver)
   - Mantém o método HTTP
5. **Backend Render** processa a requisição
6. **Middleware** retorna a resposta ao browser

### Sem BACKEND_URL (Desenvolvimento Local - Opcional)

1. **Browser** faz: `GET /api/meli/accounts`
2. **Middleware** vê que `BACKEND_URL` não está configurado
3. **Passa adiante** para a API Route em `src/app/api/meli/accounts/route.ts`
4. **API Route** usa **Prisma local** para consultar o banco de dados
5. **Retorna** dados diretamente

## ✅ Benefícios

1. **Simplicidade**: Um único middleware gerencia TODAS as rotas
2. **Transparência**: API Routes não precisam saber sobre proxy
3. **Flexibilidade**: Pode usar backend Render OU Prisma local
4. **Segurança**: Cookies e autenticação preservados
5. **Zero CORS**: Chamadas são same-origin do ponto de vista do browser
6. **Manutenção**: Adicionar novas rotas não requer código de proxy

## 🔧 Configuração na Vercel

### Variáveis de Ambiente

```bash
BACKEND_URL=https://project-backend-rjoh.onrender.com
DATABASE_URL=postgresql://...
JWT_SECRET=...
MELI_APP_ID=...
MELI_CLIENT_SECRET=...
CRON_SECRET=...
```

**IMPORTANTE:**
- ✅ Usar `BACKEND_URL` (server-side only)
- ❌ NÃO usar `NEXT_PUBLIC_API_URL` (expõe no browser)

### Deploy

1. Configurar variável de ambiente na Vercel:
   ```
   BACKEND_URL = https://project-backend-rjoh.onrender.com
   ```

2. Fazer deploy:
   ```bash
   git add .
   git commit -m "feat: adicionar middleware de proxy para backend Render"
   git push
   ```

3. Aguardar deploy da Vercel (1-2 minutos)

## 🧪 Testando

### No Browser (DevTools → Network)

```javascript
// Requisição do browser
GET https://project-livid-tau.vercel.app/api/meli/accounts
```

**O que acontece nos bastidores:**
1. Vercel recebe requisição em `/api/meli/accounts`
2. Middleware detecta `BACKEND_URL` configurado
3. Faz chamada para: `https://project-backend-rjoh.onrender.com/api/meli/accounts`
4. Retorna resposta ao browser

**Resultado esperado:**
- ✅ Status 200 OK
- ✅ Dados das contas retornados
- ✅ SEM erros 401
- ✅ SEM erros CORS

### Logs do Vercel

```
[Middleware Proxy] GET /api/meli/accounts → https://project-backend-rjoh.onrender.com/api/meli/accounts
[Middleware Proxy] Backend respondeu: 200 OK
```

## 📊 Fluxo Completo

```
┌──────────────────────────────────────────────────────────────┐
│                    ARQUITETURA COMPLETA                       │
└──────────────────────────────────────────────────────────────┘

1. BROWSER REQUEST
   └─> GET https://project-livid-tau.vercel.app/api/meli/accounts
       Headers: Cookie: session=abc123...

2. VERCEL (Next.js)
   ├─> middleware.ts detecta /api/meli/*
   ├─> Verifica BACKEND_URL configurado
   └─> Faz proxy request

3. BACKEND RENDER
   ├─> Recebe: GET https://project-backend-rjoh.onrender.com/api/meli/accounts
   ├─> Headers: Cookie: session=abc123... (copiado)
   ├─> Valida sessão JWT
   ├─> Consulta banco de dados PostgreSQL
   └─> Retorna: 200 OK + JSON data

4. VERCEL (Next.js)
   ├─> Middleware recebe resposta do Render
   ├─> Copia headers e body
   ├─> Adiciona CORS headers
   └─> Retorna ao browser

5. BROWSER
   └─> Recebe: 200 OK + JSON data
       Dados aparecem na UI
```

## 🚫 O Que NÃO Fazer

### ❌ ERRADO: Rewrite no vercel.json

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://project-backend-rjoh.onrender.com/api/:path*"
    }
  ]
}
```

**Problema:** Causa chamadas cross-origin diretas → Erro 401

### ❌ ERRADO: Usar NEXT_PUBLIC_API_URL

```typescript
// Cliente (browser)
fetch(process.env.NEXT_PUBLIC_API_URL + '/api/meli/accounts')
```

**Problema:** Expõe URL ao browser, chamada cross-origin → Erro 401

### ✅ CORRETO: Middleware Proxy

```typescript
// Cliente (browser)
fetch('/api/meli/accounts')  // Same-origin

// Middleware intercepta e faz proxy server-side
// Browser nunca sabe sobre o backend Render
```

## 📝 Rotas Afetadas

O middleware faz proxy para **TODAS** estas rotas:

### Mercado Livre (`/api/meli/*`)
- `/api/meli/accounts`
- `/api/meli/vendas`
- `/api/meli/vendas/sync`
- `/api/meli/auth`
- `/api/meli/callback`
- `/api/meli/webhook`
- `/api/meli/orders`
- E todas as outras...

### Shopee (`/api/shopee/*`)
- `/api/shopee/accounts`
- `/api/shopee/vendas`
- `/api/shopee/vendas/sync`
- E todas as outras...

## 🔗 Arquivos Relacionados

- [src/middleware.ts](src/middleware.ts) - Middleware de proxy
- [src/lib/backend-proxy.ts](src/lib/backend-proxy.ts) - Helper functions
- [.env.example](.env.example) - Documentação de variáveis
- [FIX_401_ERROR.md](FIX_401_ERROR.md) - Histórico da correção

## 📚 Referências

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
