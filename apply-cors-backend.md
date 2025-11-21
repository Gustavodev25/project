# Corrigir CORS no Backend (Render)

## Problema
O backend em `https://project-backend-rjoh.onrender.com` está bloqueando requisições do frontend `https://project-livid-tau.vercel.app` por falta de headers CORS.

## Solução

### 1. No repositório backend (project-backend):

Crie o arquivo `src/lib/cors.ts`:

```typescript
import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://project-livid-tau.vercel.app',        // Frontend Vercel
  'https://project-backend-rjoh.onrender.com',   // Backend Render
];

export function getCorsHeaders(origin?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app'))) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (!origin || origin === 'null') {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[0];
  }

  return headers;
}

export function corsResponse(response: Response, origin?: string | null): Response {
  const corsHeaders = getCorsHeaders(origin);
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value as string);
  });

  return newResponse;
}

export function handleCorsPreflightRequest(request: Request): Response | null {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  return null;
}

export function withCors(
  handler: (request: Request, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any): Promise<Response> => {
    const origin = request.headers.get('origin');
    const preflightResponse = handleCorsPreflightRequest(request);
    if (preflightResponse) {
      return preflightResponse;
    }

    try {
      const response = await handler(request, context);
      return corsResponse(response, origin);
    } catch (error) {
      console.error('[CORS] Error in handler:', error);
      const errorResponse = NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
      return corsResponse(errorResponse, origin);
    }
  };
}
```

### 2. Aplicar em todas as rotas do backend

Em cada arquivo de rota (route.ts), importe e use o `withCors`:

```typescript
import { withCors } from "@/lib/cors";

export const GET = withCors(async (req: NextRequest) => {
  // seu código aqui
});

export const POST = withCors(async (req: NextRequest) => {
  // seu código aqui
});
```

### 3. Fazer deploy no Render

```bash
cd ../project-backend
git add src/lib/cors.ts
git add src/app/api/  # todas as rotas modificadas
git commit -m "fix: adicionar suporte a CORS para frontend Vercel"
git push
```

O Render vai fazer o deploy automaticamente.

## Verificação

Após o deploy, teste a URL:
```
https://project-backend-rjoh.onrender.com/api/shopee/vendas
```

E verifique se os headers CORS estão presentes na resposta.
