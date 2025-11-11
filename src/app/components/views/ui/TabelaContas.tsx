"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { EmptyState } from "./CardsContas";
import { useToast } from "./toaster";

interface TabelaContasProps {
  platform: string;
  isLoading?: boolean;
  refreshKey?: number;
}

type TableAccount = {
  id: string;
  conta: string;
  status: "Ativa" | "Inativa" | "Pausada" | string;
  accessToken: string;
  refreshToken: string;
};

/** Sempre usa a mesma origem do MELI_REDIRECT_URI (ex.: https://xxxx.ngrok-free.app) */
const AUTH_ORIGIN =
  process.env.NEXT_PUBLIC_MELI_REDIRECT_ORIGIN ||
  (typeof window !== "undefined" ? window.location.origin : "");

// Garantir que sempre tenha protocolo HTTPS para ngrok
const getAuthOrigin = () => {
  const origin = AUTH_ORIGIN;
  if (origin && !origin.startsWith("http")) {
    return `https://${origin}`;
  }
  return origin;
};

// Componente para revelar tokens com blur
function TokenReveal({ token, label }: { token: string; label: string }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const { toast } = useToast();

  const toggleReveal = () => {
    setIsRevealed(!isRevealed);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(token);
      toast({
        variant: "success",
        title: "Token copiado!",
        description: `${label} copiado para a área de transferência.`,
        duration: 2000,
      });
    } catch (err) {
      console.error("Erro ao copiar:", err);
      toast({
        variant: "error",
        title: "Erro ao copiar",
        description: "Não foi possível copiar o token.",
        duration: 3000,
      });
    }
  };

  return (
    <div className="relative group">
      <div
        className={`text-element text-gray-900 font-mono text-xs cursor-pointer transition-all duration-300 ${
          isRevealed ? "select-text" : "filter blur-sm select-none"
        }`}
        title={
          isRevealed
            ? `${token} (clique para copiar)`
            : `Clique para revelar ${label}`
        }
        onClick={isRevealed ? copyToClipboard : toggleReveal}
      >
        {isRevealed ? token : "•".repeat(Math.min(token.length, 20))}
      </div>

      {/* Ícone de ação */}
      <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <svg
          className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-pointer"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          onClick={isRevealed ? copyToClipboard : toggleReveal}
        >
          {isRevealed ? (
            // Ícone de copiar
            <>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </>
          ) : (
            // Ícone de olho aberto
            <>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

function TabelaContasSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Access Token
              </th>
              <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Refresh Token
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(3)].map((_, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-12" />
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TabelaContas({
  platform,
  isLoading = false,
  refreshKey = 0,
}: TabelaContasProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [dados, setDados] = useState<TableAccount[]>([]);
  const [refreshingTokens, setRefreshingTokens] = useState<Set<string>>(
    new Set(),
  );
  const [deletingAccounts, setDeletingAccounts] = useState<Set<string>>(
    new Set(),
  );
  const [isUpdatingNames, setIsUpdatingNames] = useState(false);
  const { toast } = useToast();

  const emptyStateIcons = [
    <svg
      key="icon-clipboard"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>,
    <svg
      key="icon-chart"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <rect x="7" y="13" width="3" height="5" rx="1" />
      <rect x="12" y="9" width="3" height="9" rx="1" />
      <rect x="17" y="5" width="3" height="13" rx="1" />
    </svg>,
    <svg
      key="icon-plug"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1v7" />
      <path d="M9 8h6" />
      <path d="M8 12h8" />
      <path d="M10 16v5" />
      <path d="M14 16v5" />
      <path d="M7 3v4" />
      <path d="M17 3v4" />
    </svg>,
  ];

  const handleRefreshToken = async (accountId: string) => {
    setRefreshingTokens((prev) => new Set(prev).add(accountId));

    try {
      let endpoint = "";
      if (platform === "Mercado Livre") {
        endpoint = "/api/meli/refresh-token";
      } else if (platform === "Shopee") {
        endpoint = "/api/shopee/refresh-token";
      } else if (platform === "Bling") {
        endpoint = "/api/bling/refresh-token";
      } else {
        throw new Error("Plataforma desconhecida para renovação");
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accountId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Verificar se precisa reconectar a conta
        if (data.requiresReconnection) {
          toast({
            variant: "error",
            title: "Reconexão necessária",
            description: data.error || "É necessário reconectar esta conta. Clique em 'Conectar' para reautenticar.",
            duration: 8000,
          });
        } else if (data.retryable) {
          toast({
            variant: "warning",
            title: "Erro temporário",
            description: data.error || "Erro temporário. O sistema tentará novamente automaticamente.",
            duration: 5000,
          });
        } else {
          throw new Error(data.error || "Erro ao renovar token");
        }
        return;
      }

      toast({
        variant: "success",
        title: "Token renovado!",
        description: "O token foi renovado com sucesso. A conta está ativa novamente.",
        duration: 4000,
      });

      // Recarregar dados
      await loadData();
    } catch (error) {
      console.error("Erro ao renovar token:", error);
      toast({
        variant: "error",
        title: "Erro ao renovar token",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível renovar o token. Tente novamente ou reconecte a conta.",
        duration: 5000,
      });
    } finally {
      setRefreshingTokens((prev) => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  };

  const handleUpdateShopNames = async () => {
    if (platform !== "Shopee") return;

    setIsUpdatingNames(true);
    try {
      const res = await fetch("/api/shopee/update-shop-names", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao atualizar nomes");
      }

      toast({
        variant: "success",
        title: "Nomes atualizados!",
        description: `${data.results.updated} conta(s) atualizada(s) com sucesso.`,
        duration: 4000,
      });

      // Recarregar dados
      await loadData();
    } catch (error) {
      console.error("Erro ao atualizar nomes:", error);
      toast({
        variant: "error",
        title: "Erro ao atualizar nomes",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar os nomes das lojas.",
        duration: 5000,
      });
    } finally {
      setIsUpdatingNames(false);
    }
  };

  const handleDeleteAccount = async (account: TableAccount) => {
    if (platform !== "Mercado Livre") {
      toast({
        variant: "warning",
        title: "Exclusão não disponível",
        description: `Ainda não é possível excluir contas da plataforma ${platform} por aqui.`,
        duration: 5000,
      });
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Tem certeza que deseja excluir a conta ${account.conta}? Essa ação removerá também os dados sincronizados dessa conta.`,
      );
      if (!confirmed) {
        return;
      }
    }

    setDeletingAccounts((prev) => {
      const next = new Set(prev);
      next.add(account.id);
      return next;
    });

    try {
      const res = await fetch(`/api/meli/accounts/${account.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      let payload: { success?: boolean; error?: string } | null = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.error || "Erro ao excluir conta");
      }

      toast({
        variant: "success",
        title: "Conta excluída",
        description: `A conta ${account.conta} foi removida com sucesso.`,
        duration: 4000,
      });

      await loadData();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      toast({
        variant: "error",
        title: "Erro ao excluir conta",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir esta conta. Tente novamente.",
        duration: 5000,
      });
    } finally {
      setDeletingAccounts((prev) => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
    }
  };

  const handleConnectAccount = () => {
    if (platform === "Mercado Livre") {
      const url = `${getAuthOrigin()}/api/meli/auth`;
      window.location.href = url;
      return;
    }
    if (platform === "Bling") {
      const url = `${getAuthOrigin()}/api/bling/auth`;
      window.location.href = url;
      return;
    }
    if (platform === "Shopee") {
      if (typeof window === "undefined") return;

      const popupUrl = "/api/shopee/auth?popup=1";
      const popupWidth = 520;
      const popupHeight = 720;
      const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
      const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
      const viewportWidth =
        window.innerWidth ??
        window.document.documentElement.clientWidth ??
        screen.width;
      const viewportHeight =
        window.innerHeight ??
        window.document.documentElement.clientHeight ??
        screen.height;
      const systemZoom =
        viewportWidth / (window.screen?.availWidth || viewportWidth);
      const left =
        dualScreenLeft + (viewportWidth - popupWidth) / (2 * systemZoom);
      const top =
        dualScreenTop + (viewportHeight - popupHeight) / (2 * systemZoom);

      const popupFeatures = [
        "scrollbars=yes",
        `width=${popupWidth}`,
        `height=${popupHeight}`,
        `top=${Math.max(top, 0)}`,
        `left=${Math.max(left, 0)}`,
      ].join(",");

      const popup = window.open(popupUrl, "shopee_connect", popupFeatures);

      if (!popup) {
        toast({
          variant: "warning",
          title: "Permita pop-ups para conectar a Shopee",
          description: "Habilite pop-ups temporariamente e tente novamente.",
          duration: 6000,
        });
        window.location.href = "/api/shopee/auth";
        return;
      }

      try {
        popup.focus();
      } catch {
        // Ignora possiveis erros de foco em navegadores restritos
      }
      return;
    }
    toast({
      variant: "warning",
      title: "Integração não disponível",
      description: `Integração com ${platform} ainda não disponível.`,
    });
  };

  // Carrega dados quando a plataforma mudar
  useEffect(() => {
    setIsTableLoading(true);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, refreshKey]);

  async function loadData() {
    try {
      if (platform === "Mercado Livre") {
        const res = await fetch("/api/meli/accounts", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Erro ao listar contas ML");
        const rows: Array<{
          id: string;
          nickname: string | null;
          expires_at: string;
          ml_user_id: number;
          access_token: string;
          refresh_token: string;
        }> = await res.json();
        const now = Date.now();
        setDados(
          rows.map((r) => ({
            id: r.id,
            conta: r.nickname ?? String(r.ml_user_id),
            status:
              new Date(r.expires_at).getTime() > now ? "Ativa" : "Inativa",
            accessToken: r.access_token,
            refreshToken: r.refresh_token,
          })),
        );
        return;
      }

      if (platform === "Shopee") {
        const res = await fetch("/api/shopee/accounts", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Erro ao listar contas Shopee");
        const rows: Array<{
          id: string;
          shop_id: string;
          shop_name: string | null;
          expires_at: string;
          access_token: string;
          refresh_token: string;
        }> = await res.json();
        const now = Date.now();
        setDados(
          rows.map((r) => ({
            id: r.id,
            conta: r.shop_name || r.shop_id,
            status:
              new Date(r.expires_at).getTime() > now ? "Ativa" : "Inativa",
            accessToken: r.access_token,
            refreshToken: r.refresh_token,
          })),
        );
        return;
      }

      if (platform === "Bling") {
        const res = await fetch("/api/bling/accounts", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Erro ao listar contas Bling");
        const rows: Array<{
          id: string;
          bling_user_id: string | null;
          account_name: string | null;
          expires_at: string;
          access_token: string;
          refresh_token: string;
        }> = await res.json();
        const now = Date.now();
        setDados(
          rows.map((r) => ({
            id: r.id,
            conta: r.account_name || r.bling_user_id || "Conta Bling",
            status:
              new Date(r.expires_at).getTime() > now ? "Ativa" : "Inativa",
            accessToken: r.access_token,
            refreshToken: r.refresh_token,
          })),
        );
        return;
      }

      setDados([]);
    } catch {
      setDados([]);
    } finally {
      setIsTableLoading(false);
    }
  }

  // Animações
  useEffect(() => {
    if (!isTableLoading && !isLoading && tableRef.current) {
      const rows = tableRef.current.querySelectorAll(".table-row");
      const texts = tableRef.current.querySelectorAll(".text-element");

      gsap.set(rows, { opacity: 0, y: 20, scale: 0.95 });
      gsap.set(texts, { filter: "blur(8px)", opacity: 0 });

      gsap.to(rows, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      });
      gsap.to(texts, {
        filter: "blur(0px)",
        opacity: 1,
        duration: 0.8,
        stagger: 0.05,
        ease: "power2.out",
        delay: 0.2,
      });
    }
  }, [isTableLoading, isLoading, dados]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ativa":
        return "bg-green-100 text-green-800";
      case "Inativa":
        return "bg-red-100 text-red-800";
      case "Pausada":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading || isTableLoading) return <TabelaContasSkeleton />;

  if (dados.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <EmptyState
          title="Nenhuma conta conectada"
          description={`Conecte sua primeira conta ${platform} e visualize seus resultados aqui.`}
          icons={emptyStateIcons}
          action={{ label: "Conectar conta", onClick: handleConnectAccount }}
          className="w-full min-h-[320px]"
        />
      </div>
    );
  }

  return (
    <div
      ref={tableRef}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Access Token
              </th>
              <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Refresh Token
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dados.map((item) => (
              <tr
                key={item.id}
                className="table-row hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-element text-sm font-medium text-gray-900">
                    {item.conta}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-element inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-2 sm:px-3 py-4 whitespace-nowrap">
                  <TokenReveal token={item.accessToken} label="Access Token" />
                </td>
                <td className="px-2 sm:px-3 py-4 whitespace-nowrap">
                  <TokenReveal
                    token={item.refreshToken}
                    label="Refresh Token"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    {item.status === "Inativa" && (
                      <button
                        onClick={() => handleRefreshToken(item.id)}
                        disabled={refreshingTokens.has(item.id)}
                        className="text-element text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Renovar token"
                      >
                        {refreshingTokens.has(item.id) ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Renovando...
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                            </svg>
                            Renovar
                          </>
                        )}
                      </button>
                    )}
                    <button className="text-element text-orange-600 hover:text-orange-900">
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(item)}
                      disabled={deletingAccounts.has(item.id)}
                      className={`text-element text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1`}
                    >
                      {deletingAccounts.has(item.id) ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Excluindo...
                        </>
                      ) : (
                        "Excluir"
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleConnectAccount}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 text-sm font-medium py-2 px-3 rounded transition-colors duration-200 flex items-center gap-2"
          >
            Conectar conta
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icons-tabler-outline icon-tabler-users-plus"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M5 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
              <path d="M3 21v-2a4 4 0 0 1 4 -4h4c.96 0 1.84 .338 2.53 .901" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              <path d="M16 19h6" />
              <path d="M19 16v6" />
            </svg>
          </button>

          {platform === "Shopee" && (
            <button
              onClick={handleUpdateShopNames}
              disabled={isUpdatingNames}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-sm font-medium py-2 px-3 rounded transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Atualizar nomes das lojas"
            >
              {isUpdatingNames ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Atualizando...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  Atualizar nomes
                </>
              )}
            </button>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{dados.length}</span>
          <span className="ml-1">conta(s) conectada(s)</span>
        </div>
      </div>
    </div>
  );
}
