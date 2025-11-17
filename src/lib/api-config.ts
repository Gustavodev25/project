/**
 * Configuração centralizada para chamadas de API
 *
 * Em desenvolvimento: usa localhost:3000
 * Em produção: usa o backend no Render
 */

export const API_CONFIG = {
  // URL base da API
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',

  // Se há URL de API configurada, use-a; caso contrário, usa caminho relativo
  getApiUrl: (path: string): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // Se tem URL configurada (Render), usa ela
    if (apiUrl) {
      return `${apiUrl}${path}`;
    }

    // Senão, usa caminho relativo (mesma origem)
    return path;
  },

  // Helper para fazer requisições
  async fetch(path: string, options?: RequestInit) {
    const url = API_CONFIG.getApiUrl(path);

    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  },
};

// Tipos de ambiente
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const hasExternalBackend = !!process.env.NEXT_PUBLIC_API_URL;
