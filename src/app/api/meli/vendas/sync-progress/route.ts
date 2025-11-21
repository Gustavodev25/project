import { NextRequest } from "next/server";
import { assertSessionToken } from "@/lib/auth";
import { addConnection, removeConnection } from "@/lib/sse-progress";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = new Set([
  "https://project-livid-tau.vercel.app",
  "https://project-backend-rjoh.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export async function GET(req: NextRequest) {
  console.log("[SSE sync-progress] Nova requisicao recebida");

  const sessionCookie = req.cookies.get("session")?.value;
  console.log("[SSE sync-progress] Session cookie:", sessionCookie ? "presente" : "ausente");

  let session;
  try {
    session = await assertSessionToken(sessionCookie);
    console.log("[SSE sync-progress] Autenticacao bem-sucedida para usuario:", session.sub);
  } catch (error) {
    console.error("[SSE sync-progress] Erro de autenticao:", error);
    return new Response("Unauthorized", { status: 401 });
  }

  const connectionId = `${session.sub}-${Date.now()}`;
  console.log("[SSE sync-progress] ID da conexao:", connectionId);

  const stream = new ReadableStream({
    start(controller) {
      try {
        addConnection(connectionId, controller);
        console.log("[SSE sync-progress] Conexao armazenada");

        const connectEvent = `data: ${JSON.stringify({
          type: "connected",
          message: "Conexao estabelecida para sincronizacao de vendas",
          timestamp: new Date().toISOString(),
        })}\n\n`;

        controller.enqueue(new TextEncoder().encode(connectEvent));
        console.log(`[SSE] OK. Conexao estabelecida para usuario ${session.sub} (${connectionId})`);
      } catch (error) {
        console.error("[SSE sync-progress] Erro ao inicializar stream:", error);
        throw error;
      }
    },

    cancel() {
      removeConnection(connectionId);
      console.log(`[SSE] Conexao cancelada para usuario ${session.sub} (${connectionId})`);
    },
  });

  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      ...(allowOrigin
        ? {
            "Access-Control-Allow-Origin": allowOrigin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
          }
        : {}),
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
