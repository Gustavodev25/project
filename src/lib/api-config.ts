/**
 * Configuração centralizada para chamadas de API.
 *
 * Em desenvolvimento/localhost usamos rotas relativas (mesma origem)
 * para compartilhar cookies automaticamente. Em produção usamos
 * o backend configurado (Render).
 */

function isLocalhost(): boolean {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }

  return process.env.NODE_ENV !== "production";
}

function shouldUseExternalBackend(): boolean {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const forceExternal =
    process.env.NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND === "true";

  if (!apiUrl) {
    return false;
  }

  if (forceExternal) {
    return true;
  }

  return !isLocalhost();
}

export const API_CONFIG = {
  get baseURL(): string {
    // SEMPRE usar rotas relativas (Next.js) - NUNCA chamar backend externo diretamente
    return "";
  },

  getApiUrl(path: string): string {
    // SEMPRE usar rotas relativas (Next.js) - NUNCA chamar backend externo diretamente
    return path;
  },

  async fetch(path: string, options?: RequestInit) {
    const url = API_CONFIG.getApiUrl(path);
    const isFormData =
      typeof FormData !== "undefined" && options?.body instanceof FormData;

    const headers = new Headers(options?.headers || {});

    if (!headers.has("Content-Type") && options?.body && !isFormData) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(url, {
      ...options,
      credentials: options?.credentials ?? "include",
      headers,
    });
  },
};

// Tipos de ambiente / flags
export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
export const hasExternalBackend = shouldUseExternalBackend();
