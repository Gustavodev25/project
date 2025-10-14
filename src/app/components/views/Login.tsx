"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "./ui/toaster";
import { useAuthContext } from "@/contexts/AuthContext";

// Usando o sistema de inputs padronizado

// Substitua APENAS estes dois componentes:

const EyeOpen = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
  </svg>
);

const EyeClosed = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" />
    <path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87" />
    <path d="M3 3l18 18" />
  </svg>
);

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { checkAuth, isAuthenticated, isLoading: authLoading } = useAuthContext();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.replace(redirect);
    }
  }, [authLoading, isAuthenticated, router, searchParams]);

  // Mostrar mensagem de erro se houver
  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    
    if (error === "session_expired") {
      toast({
        variant: "error",
        title: "Sessão expirada",
        description: message || "Sua sessão expirou. Faça login novamente.",
      });
    }
  }, [searchParams, toast]);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  const validate = (): string | null => {
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return "Email inválido";
    if (!senha) return "Informe a senha";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      toast({ variant: "error", title: "Corrija os campos", description: v });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Importante para incluir cookies
        body: JSON.stringify({ email: normalizedEmail, senha }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || "Falha no login";
        toast({ variant: "error", title: "Erro no login", description: msg });
        return;
      }

      // Login bem-sucedido - a API fará o redirecionamento automático
      console.log("✅ Login realizado com sucesso - redirecionamento automático pela API");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro inesperado no login.";
      toast({ variant: "error", title: "Erro", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Formulário */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              Entrar
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="email"
                className="input-label"
              >
                Email
                <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                className="input-label"
              >
                Senha
                <span className="required">*</span>
              </label>
              <div className="relative">
                <input
                  id="senha"
                  name="senha"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input-base"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 p-2"
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPw ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 mx-auto"
                  viewBox="0 0 24 24"
                  aria-label="Entrando"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth={4}
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Ainda não tem conta?{" "}
            <Link
              href="/register"
              className="text-black font-medium hover:underline underline-offset-2"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>

      {/* Lateral visual simples */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
        }}
      />
    </div>
  );
}
