/**
 * Helper para fazer chamadas ao backend externo (Render)
 * Usado pelas API Routes do Next.js para fazer proxy das requisições
 */

const BACKEND_URL = process.env.BACKEND_URL;

/**
 * Verifica se deve usar o backend externo (Render) ao invés de Prisma local
 */
export function shouldUseBackendProxy(): boolean {
  return !!BACKEND_URL;
}

/**
 * Faz uma chamada ao backend externo e retorna a Response
 *
 * @param path - Caminho da API (ex: "/api/meli/accounts")
 * @param options - Opções do fetch
 * @param sessionCookie - Cookie de sessão para autenticação
 */
export async function proxyToBackend(
  path: string,
  options?: RequestInit,
  sessionCookie?: string
): Promise<Response> {
  if (!BACKEND_URL) {
    throw new Error("BACKEND_URL não configurado");
  }

  const url = `${BACKEND_URL}${path}`;

  const headers = new Headers(options?.headers || {});

  // Adicionar cookie de sessão se fornecido
  if (sessionCookie) {
    headers.set("Cookie", `session=${sessionCookie}`);
  }

  // Adicionar Content-Type se houver body e não for FormData
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  if (!headers.has("Content-Type") && options?.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  console.log(`[Backend Proxy] ${options?.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  console.log(`[Backend Proxy] ${response.status} ${response.statusText}`);

  return response;
}

/**
 * Faz uma chamada ao backend e retorna JSON
 */
export async function proxyToBackendJSON<T = any>(
  path: string,
  options?: RequestInit,
  sessionCookie?: string
): Promise<T> {
  const response = await proxyToBackend(path, options, sessionCookie);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend error ${response.status}: ${errorText}`);
  }

  return response.json();
}
