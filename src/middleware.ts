import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lista de rotas que devem fazer proxy para o backend
  const apiRoutes = [
    '/api/auth',
    '/api/meli',
    '/api/shopee',
    '/api/dashboard',
    '/api/vendas',
    '/api/sku',
    '/api/accounts',
    '/api/sales',
    '/api/notifications',
  ];

  // Verificar se a rota atual corresponde a alguma rota de API
  const shouldProxy = apiRoutes.some(route => pathname.startsWith(route));

  if (shouldProxy) {
    const backendUrl = process.env.BACKEND_URL || 'https://project-backend-rjoh.onrender.com';

    // Construir a URL completa do backend
    const url = new URL(pathname + request.nextUrl.search, backendUrl);

    // Copiar headers importantes
    const headers = new Headers(request.headers);

    // Fazer a requisição para o backend
    try {
      const response = await fetch(url.toString(), {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.text()
          : undefined,
      });

      // Copiar a resposta do backend
      const data = await response.text();

      return new NextResponse(data, {
        status: response.status,
        headers: response.headers,
      });
    } catch (error) {
      console.error('Erro no proxy para backend:', error);
      return NextResponse.json(
        { error: 'Erro ao comunicar com o backend' },
        { status: 502 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
