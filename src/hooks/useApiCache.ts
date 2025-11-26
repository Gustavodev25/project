"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseCachedApiOptions {
  cacheTime?: number; // Tempo em ms para manter cache válido (padrão: 5 minutos)
  staleTime?: number; // Tempo em ms para considerar dados stale (padrão: 30 segundos)
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

const cache = new Map<string, CacheEntry<any>>();

export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedApiOptions = {}
) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutos
    staleTime = 30 * 1000, // 30 segundos
    refetchOnMount = true,
    refetchOnWindowFocus = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);

  // Atualizar ref do fetcher
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      const cached = cache.get(key);
      const now = Date.now();

      // Se tem cache válido e não é refresh forçado, usar cache
      if (cached && !forceRefresh && now - cached.timestamp < cacheTime) {
        setData(cached.data);
        setIsLoading(false);
        setError(null);

        // Se está stale mas ainda no cacheTime, refetch em background
        if (now - cached.timestamp > staleTime) {
          // Refetch silencioso sem loading state
          try {
            const freshData = await fetcherRef.current();
            if (isMountedRef.current) {
              cache.set(key, { data: freshData, timestamp: Date.now() });
              setData(freshData);
            }
          } catch (err) {
            // Erro silencioso, mantém dados cached
            console.error("Background refetch error:", err);
          }
        }
        return;
      }

      // Buscar dados frescos
      setIsLoading(true);
      setError(null);

      try {
        const freshData = await fetcherRef.current();
        if (isMountedRef.current) {
          cache.set(key, { data: freshData, timestamp: Date.now() });
          setData(freshData);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error("Erro ao buscar dados"));
          // Se tem cache, mesmo expirado, usar como fallback
          if (cached) {
            setData(cached.data);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [key, cacheTime, staleTime]
  );

  // Fetch inicial
  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  // Refetch em foco da janela
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchData, refetchOnWindowFocus]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    (newData: T | ((prevData: T | null) => T)) => {
      const updatedData = typeof newData === "function" ? newData(data) : newData;
      cache.set(key, { data: updatedData, timestamp: Date.now() });
      setData(updatedData);
    },
    [key, data]
  );

  const revalidate = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const clearCache = useCallback(() => {
    cache.delete(key);
  }, [key]);

  return {
    data,
    isLoading,
    error,
    mutate,
    revalidate,
    clearCache,
  };
}

// Função para limpar todo o cache
export function clearAllCache() {
  cache.clear();
}

// Função para limpar cache de uma chave específica
export function clearCacheKey(key: string) {
  cache.delete(key);
}

// Função para invalidar múltiplas chaves que começam com um prefixo
export function invalidateCachePrefix(prefix: string) {
  const keysToDelete: string[] = [];
  cache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => cache.delete(key));
}
