import { NextResponse } from 'next/server';

/**
 * Configuração de CORS para permitir frontend Vercel acessar backend Render
 */

const ALLOWED_ORIGINS = [
  // Desenvolvimento local
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',

  // Produção - ATUALIZE ESTAS URLs COM SUAS URLs REAIS
  'https://project-livid-tau.vercel.app',        // Frontend Vercel
  'https://project-backend-rjoh.onrender.com',   // Backend Render

  // Adicione aqui quando tiver as URLs finais:
  // 'https://SEU-APP-FRONTEND.vercel.app',
  // 'https://SEU-APP-BACKEND.onrender.com',
];

export function getCorsHeaders(origin?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 horas
  };

  // Se a origem está na lista permitida, adiciona o header
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app'))) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (!origin || origin === 'null') {
    // Para desenvolvimento local sem origem
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[0];
  }

  return headers;
}

export function corsResponse(response: Response, origin?: string | null): Response {
  const corsHeaders = getCorsHeaders(origin);

  // Criar nova resposta com headers CORS
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  // Adicionar headers CORS
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

/**
 * Wrapper para route handlers com suporte a CORS
 */
export function withCors(
  handler: (request: Request, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any): Promise<Response> => {
    const origin = request.headers.get('origin');

    // Handle preflight
    const preflightResponse = handleCorsPreflightRequest(request);
    if (preflightResponse) {
      return preflightResponse;
    }

    try {
      // Executar handler original
      const response = await handler(request, context);

      // Adicionar headers CORS
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
