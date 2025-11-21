# Correção do Erro 401 (Unauthorized) na Vercel

## 🔴 Problema Identificado

Ao acessar a aplicação na Vercel, o console do navegador mostrava erros 401:

```
GET https://project-backend-rjoh.onrender.com/api/meli/accounts 401 (Unauthorized)
```

## 🔍 Causa Raiz

O arquivo `src/lib/api-config.ts` continha lógica condicional que:

1. Verificava se estava em localhost ou produção
2. Em produção, usava `NEXT_PUBLIC_API_URL` do ambiente Vercel
3. Fazia chamadas **DIRETAS** do browser para o backend externo (Render)
4. Essas chamadas falhavam com 401 porque:
   - O backend externo espera cookies de sessão do Express
   - Chamadas cross-origin do browser não incluíam esses cookies
   - Configuração CORS não estava permitindo `credentials: include`

## ✅ Solução Implementada

**Modificação em `src/lib/api-config.ts`:**

```typescript
export const API_CONFIG = {
  get baseURL(): string {
    // SEMPRE usar rotas relativas (Next.js) - NUNCA chamar backend externo diretamente
    return "";
  },

  getApiUrl(path: string): string {
    // SEMPRE usar rotas relativas (Next.js) - NUNCA chamar backend externo diretamente
    return path;
  },

  // ... resto do código
};
```

### O que mudou:

1. **Removida toda lógica condicional** de ambiente
2. **SEMPRE usa rotas relativas** (`/api/meli/accounts`)
3. **NUNCA chama backend externo** diretamente do browser
4. **Todas as chamadas passam** pelas API Routes do Next.js
5. **Next.js faz chamadas server-side** ao backend externo usando variáveis de ambiente

## 🏗️ Arquitetura Correta

```
Browser → Next.js API Routes → Backend Externo (Render)
         (rotas relativas)   (chamadas server-side)
```

### Fluxo de uma requisição:

1. **Browser chama**: `GET /api/meli/accounts`
2. **Next.js recebe** via API Route em `src/app/api/meli/accounts/route.ts`
3. **Next.js usa** `BACKEND_URL` (server-side) para chamar Render
4. **Backend responde** para Next.js
5. **Next.js retorna** dados ao browser

## 🚫 Arquitetura Incorreta (Antiga)

```
Browser → Backend Externo (Render)
         (chamada direta cross-origin)
         ❌ ERRO 401: Sem cookies de sessão
```

## 📋 Variáveis de Ambiente

### Na Vercel (produção):
```bash
# Next.js usa isso para chamar o backend (server-side)
BACKEND_URL="https://project-backend-rjoh.onrender.com"

# ❌ NÃO usar NEXT_PUBLIC_API_URL
# Variáveis NEXT_PUBLIC_* são expostas ao browser
# e causariam chamadas diretas (401)
```

### No código:
```typescript
// ✅ CORRETO: Server-side no Next.js
const backendUrl = process.env.BACKEND_URL;

// ❌ ERRADO: Exposto ao browser
const backendUrl = process.env.NEXT_PUBLIC_API_URL;
```

## 🧪 Como Testar

1. Acesse a URL da Vercel após o deploy
2. Abra o DevTools (F12) → Console
3. Verifique que **NÃO aparecem erros 401**
4. Verifique que as chamadas são para:
   - `https://project-livid-tau.vercel.app/api/meli/accounts` ✅
   - **NÃO** `https://project-backend-rjoh.onrender.com/api/meli/accounts` ❌

## 🎯 Benefícios

1. **Sem erros CORS**: Todas as chamadas são same-origin
2. **Autenticação funcionando**: Next.js gerencia sessões corretamente
3. **Segurança**: Variáveis sensíveis nunca expostas ao browser
4. **Consistência**: Mesmo código funciona em dev e produção

## 📝 Commit

```bash
git commit -m "fix: forçar uso exclusivo de rotas Next.js sem chamadas externas"
```

## 🔗 Arquivos Relacionados

- [src/lib/api-config.ts](src/lib/api-config.ts) - Configuração de API corrigida
- [src/hooks/useVendas.ts](src/hooks/useVendas.ts) - Hook que usa API_CONFIG
- [src/app/api/meli/accounts/route.ts](src/app/api/meli/accounts/route.ts) - API Route Next.js

## ⚠️ Importante

**NUNCA** faça chamadas diretas do browser para o backend externo:

```typescript
// ❌ ERRADO
fetch("https://project-backend-rjoh.onrender.com/api/...");

// ✅ CORRETO
fetch("/api/..."); // Next.js route que chama o backend server-side
```
