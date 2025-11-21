import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Se BACKEND_URL estiver configurado, fazer proxy para todas as rotas /api/meli/* e /api/shopee/*
  if (BACKEND_URL && (pathname.startsWith("/api/meli/") || pathname.startsWith("/api/shopee/"))) {
    console.log(`[Middleware Proxy] ${request.method} ${pathname} → ${BACKEND_URL}${pathname}`);

    try {
      // Construir URL completa do backend
      const backendUrl = new URL(pathname, BACKEND_URL);

      // Copiar query params
      request.nextUrl.searchParams.forEach((value, key) => {
        backendUrl.searchParams.append(key, value);
      });

      // Preparar headers
      const headers = new Headers();

      // Copiar headers importantes
      const headersToForward = [
        "authorization",
        "content-type",
        "cookie",
        "user-agent",
        "accept",
        "accept-encoding",
        "accept-language",
      ];

      headersToForward.forEach((headerName) => {
        const value = request.headers.get(headerName);
        if (value) {
          headers.set(headerName, value);
        }
      });

      // Preparar body se houver
      let body: BodyInit | undefined;
      if (request.method !== "GET" && request.method !== "HEAD") {
        try {
          const contentType = request.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const jsonBody = await request.json();
            body = JSON.stringify(jsonBody);
          } else if (contentType?.includes("multipart/form-data")) {
            body = await request.formData();
          } else {
            body = await request.text();
          }
        } catch (error) {
          console.error("[Middleware Proxy] Erro ao ler body:", error);
        }
      }

      // Fazer chamada ao backend
      const backendResponse = await fetch(backendUrl.toString(), {
        method: request.method,
        headers,
        body,
        credentials: "include",
      });

      console.log(`[Middleware Proxy] Backend respondeu: ${backendResponse.status} ${backendResponse.statusText}`);

      // Preparar response headers
      const responseHeaders = new Headers();

      // Copiar headers da resposta do backend
      backendResponse.headers.forEach((value, key) => {
        // Não copiar headers que o Next.js gerencia automaticamente
        if (!["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      });

      // Adicionar CORS headers
      responseHeaders.set("Access-Control-Allow-Origin", request.headers.get("origin") || "*");
      responseHeaders.set("Access-Control-Allow-Credentials", "true");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");

      // Se for OPTIONS (preflight), retornar 204
      if (request.method === "OPTIONS") {
        return new NextResponse(null, {
          status: 204,
          headers: responseHeaders,
        });
      }

      // Copiar body da resposta
      const responseBody = await backendResponse.arrayBuffer();

      return new NextResponse(responseBody, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
      console.error("[Middleware Proxy] Erro ao fazer proxy:", error);
      return NextResponse.json(
        {
          error: "Erro ao comunicar com o backend",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 502 }
      );
    }
  }

  // Para outras rotas, continuar normalmente
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/meli/:path*",
    "/api/shopee/:path*",
  ],
};
