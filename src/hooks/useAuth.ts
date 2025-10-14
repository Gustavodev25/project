"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Cache simples para auth (apenas para esta sessão)
let authCache: { user: User | null; timestamp: number } | null = null;
const AUTH_CACHE_TIME = 2 * 60 * 1000; // 2 minutos

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const router = useRouter();
  const isMountedRef = useRef(true);

  // Verificar se o usuário está autenticado
  const checkAuth = useCallback(async () => {
    // Verificar cache primeiro
    if (authCache && Date.now() - authCache.timestamp < AUTH_CACHE_TIME) {
      if (isMountedRef.current) {
        setAuthState({
          user: authCache.user,
          isLoading: false,
          isAuthenticated: authCache.user !== null,
        });
      }
      return;
    }

    // Garantir que está em estado de loading
    if (isMountedRef.current) {
      setAuthState(prev => ({ ...prev, isLoading: true }));
    }

    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store", // Evitar cache do navegador
      });

      if (response.ok) {
        const user = await response.json();
        authCache = { user, timestamp: Date.now() };
        if (isMountedRef.current) {
          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
        }
      } else {
        authCache = { user: null, timestamp: Date.now() };
        if (isMountedRef.current) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      authCache = { user: null, timestamp: Date.now() };
      if (isMountedRef.current) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    }
  }, []);

  // Fazer logout
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      authCache = null; // Limpar cache
      if (isMountedRef.current) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
      router.push("/login");
    }
  }, [router]);

  // Verificar autenticação ao montar o componente
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    ...authState,
    checkAuth,
    logout,
  };
}
