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
    return shouldUseExternalBackend() ? process.env.NEXT_PUBLIC_API_URL || "" : "";
  },

  getApiUrl(path: string): string {
    if (!shouldUseExternalBackend()) {
      return path;
    }

    return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
  },

  async fetch(path: string, options?: RequestInit) {
    const url = API_CONFIG.getApiUrl(path);

    return fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  },
};

// Tipos de ambiente / flags
export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
export const hasExternalBackend = shouldUseExternalBackend();
