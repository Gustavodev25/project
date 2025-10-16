"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Sidebar from "../views/ui/Sidebar";
import Topbar from "../views/ui/Topbar";
import TabelaVendas from "../views/ui/TabelaVendas";
import { useVendas } from "@/hooks/useVendas";
import FiltrosVendas, {
  FiltroStatus,
  FiltroPeriodo,
  ColunasVisiveis,
} from "../views/ui/FiltrosVendas";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";
import { useToast } from "./ui/toaster";
import { isStatusCancelado, isStatusPago } from "@/lib/vendasStatus";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

// useLayoutEffect no browser; fallback para useEffect no SSR
const useIsoLayout =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface HeaderVendasShopeeProps {
  vendas?: any[];
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
  onSyncOrders: (accountIds?: string[]) => void;
  contasConectadas?: any[];
}

const HeaderVendasShopee = ({
  vendas = [],
  lastSyncedAt = null,
  isSyncing = false,
  onSyncOrders,
  contasConectadas = [],
}: HeaderVendasShopeeProps) => {
  const router = useRouter();
  const toast = useToast();
  const hasBeenSynced = lastSyncedAt !== null;
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);
  const [showSyncDropdown, setShowSyncDropdown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  // Estados para sincronização automática
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(false);
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para seleção de contas
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [newOrdersByAccount, setNewOrdersByAccount] = useState<Record<string, number>>({});

  // Dropdowns
  const infoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showInfoDropdown,
    onClose: () => setShowInfoDropdown(false),
    preferredPosition: "bottom-left",
    offset: 8,
    minDistanceFromEdge: 16,
  });

  const syncDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showSyncDropdown,
    onClose: () => {
      setShowSyncDropdown(false);
    },
    preferredPosition: "bottom-right",
    offset: 8,
    minDistanceFromEdge: 16,
  });

  const handleCheckNewOrders = async (silent = false) => {
    if (isChecking) return;
    try {
      setIsChecking(true);
      const res = await fetch("/api/shopee/vendas/check", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Erro ${res.status}`);
      }
      const result = await res.json();
      const newCount = result.totals?.new || 0;
      setNewOrdersCount(newCount);
      
      // Armazenar contagem por conta
      if (result.newOrdersByAccount) {
        setNewOrdersByAccount(result.newOrdersByAccount);
      }
      
      if (silent && newCount > 0) {
        setCheckResult(result);
      } else if (!silent) {
        setCheckResult(result);
      }
    } catch (error) {
      console.error("Erro ao verificar vendas:", error);
      if (!silent) {
        setCheckResult({
          errors: [{ message: "Erro ao verificar vendas. Tente novamente." }],
          newOrders: [],
          totals: { new: 0 },
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Configurações (compartilhada)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings/auto-sync", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setAutoSyncEnabled(data.autoSyncEnabled);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Notificações
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await fetch("/api/notifications", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const newOrdersNotification = data.notifications.find(
            (n: any) => n.type === "new_orders" && !n.isRead,
          );
          if (newOrdersNotification) {
            setNewOrdersCount(newOrdersNotification.newOrdersCount);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
      }
    };
    loadNotifications();
  }, []);

  const handleToggleAutoSync = async () => {
    const newValue = !autoSyncEnabled;
    try {
      const res = await fetch("/api/settings/auto-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: newValue }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          `Erro ao atualizar configurações: ${errorData.error || res.statusText}`,
        );
      }
      await res.json();
      setAutoSyncEnabled(newValue);
      if (newValue) {
        handleCheckNewOrders(true);
      } else {
        setNewOrdersCount(0);
      }
    } catch (error) {
      console.error("Erro ao alternar auto-sync:", error);
      toast.toast({
        variant: "error",
        title: "Erro ao atualizar configurações",
        description: `Erro ao atualizar configurações: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }. Tente novamente.`,
      });
    }
  };

  const handleConfirmSync = async () => {
    setShowSyncDropdown(false);
    setCheckResult(null);
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        credentials: "include",
      });
      setNewOrdersCount(0);
    } catch (error) {
      console.error("Erro ao marcar notificações:", error);
    }
    // Passar contas selecionadas para sincronização (se houver)
    const accountsToSync = selectedAccountIds.length > 0 ? selectedAccountIds : undefined;
    onSyncOrders(accountsToSync);
  };

  const handleCancelSync = () => {
    setShowSyncDropdown(false);
    setCheckResult(null);
    setSelectedAccountIds([]);
  };
  
  // Função para alternar seleção de conta
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };
  
  // Função para selecionar/desselecionar todas
  const toggleSelectAll = () => {
    if (selectedAccountIds.length === contasConectadas.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(contasConectadas.map(c => c.id));
    }
  };

  useEffect(() => {
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
      autoSyncIntervalRef.current = null;
    }
    if (autoSyncEnabled) {
      autoSyncIntervalRef.current = setInterval(() => {
        handleCheckNewOrders(true);
      }, 600000);
    }
    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
        autoSyncIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSyncEnabled]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="text-left">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">
            Vendas Shopee
          </h1>
          {/* Botão para Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Dashboard
          </button>
          <div className="relative">
            <button
              ref={infoDropdown.triggerRef}
              onClick={() => setShowInfoDropdown(!showInfoDropdown)}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 group ${
                showInfoDropdown
                  ? "bg-gray-200 ring-2 ring-gray-300 scale-105"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              title="Informações da sincronização"
            >
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
                className="text-gray-600 group-hover:text-gray-800 transition-transform duration-200 group-hover:scale-110"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </button>

            {infoDropdown.isVisible && (
              <div
                ref={infoDropdown.dropdownRef}
                className={`smart-dropdown w-64 ${
                  infoDropdown.isOpen ? "dropdown-enter" : "dropdown-exit"
                }`}
                style={infoDropdown.position}
              >
                <div className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Vendas encontradas:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {vendas?.length || 0}
                      </span>
                    </div>

                    {lastSyncedAt && (
                      <div className="pt-2 border-t border-gray-100/80">
                        <p className="text-xs text-gray-600 mb-1">Última sincronização:</p>
                        <p className="text-xs font-medium text-gray-800">
                          {formatDate(lastSyncedAt)} às {new Date(lastSyncedAt).toLocaleTimeString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-600 text-left">
          Gerencie e acompanhe suas vendas na plataforma da Shopee.
        </p>
      </div>

      {/* Botão de Sincronização com Dropdown */}
      <div className="relative">
        <button
          ref={syncDropdown.triggerRef}
          onClick={() => setShowSyncDropdown(!showSyncDropdown)}
          className={`inline-flex items-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            showSyncDropdown
              ? "text-gray-900 bg-gray-50 border-gray-400 ring-2 ring-gray-200"
              : "text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          }`}
          disabled={isSyncing}
        >
          <div className="flex items-center relative">
            {isSyncing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-700"></div>
            ) : (
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
                className="icon icon-tabler icons-tabler-outline icon-tabler-shopping-bag"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
                <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
              </svg>
            )}
            {newOrdersCount > 0 && !isSyncing && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
                {newOrdersCount > 99 ? "99+" : newOrdersCount}
              </span>
            )}
          </div>
          <span>{isSyncing ? "Sincronizando..." : "Sincronizar vendas"}</span>
          {contasConectadas.length > 0 && (
            <div className="flex items-center -space-x-1">
              {contasConectadas.slice(0, 3).map((conta) => {
                const label = conta.nickname || conta.shop_id || conta.merchant_id || conta.id;
                const title = conta.nickname || `Conta ${label}`;
                const initial = (String(label || "?").charAt(0) || "?").toUpperCase();
                return (
                  <div
                    key={conta.id || label}
                    className="relative bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-semibold w-6 h-6"
                    title={title}
                  >
                    <span>{initial}</span>
                  </div>
                );
              })}
              {contasConectadas.length > 3 && (
                <div className="relative bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-semibold w-6 h-6 ml-1">
                  <span>+{contasConectadas.length - 3}</span>
                </div>
              )}
            </div>
          )}
        </button>

        {syncDropdown.isVisible && (
          <div
            ref={syncDropdown.dropdownRef}
            className={`smart-dropdown w-80 ${
              syncDropdown.isOpen ? "dropdown-enter" : "dropdown-exit"
            }`}
            style={syncDropdown.position}
          >
            <div className="p-4">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      Pesquisa Automática
                    </h3>
                    <p className="text-xs text-gray-600">
                      Verifica novas vendas a cada 10 minutos automaticamente
                    </p>
                  </div>
                  <button
                    onClick={handleToggleAutoSync}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                      autoSyncEnabled ? "bg-orange-500" : "bg-gray-300"
                    }`}
                    role="switch"
                    aria-checked={autoSyncEnabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoSyncEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {autoSyncEnabled && (
                  <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-green-50 rounded-md">
                    <div className="flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-xs text-green-700 font-medium">
                      Pesquisa automática ativa
                    </p>
                  </div>
                )}
              </div>

              {!checkResult ? (
                <div className="space-y-4">
                  <div className="text-start">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      Sincronizar Vendas
                    </h3>
                    <p className="text-xs text-gray-600">
                      {contasConectadas.length > 1 
                        ? "Selecione as contas que deseja sincronizar ou deixe em branco para sincronizar todas"
                        : "Primeiro vamos verificar se há novas vendas para sincronizar"}
                    </p>
                  </div>
                  
                  {/* Seleção de contas (apenas se houver mais de 1 conta) */}
                  {contasConectadas.length > 1 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">Contas:</span>
                        <button
                          onClick={toggleSelectAll}
                          className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                          {selectedAccountIds.length === contasConectadas.length ? "Limpar" : "Todas"}
                        </button>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2">
                        {contasConectadas.map((conta) => {
                          const label = conta.nickname || conta.shop_id || conta.merchant_id || conta.id;
                          const newOrdersCount = newOrdersByAccount[conta.id] || 0;
                          return (
                            <label
                              key={conta.id || label}
                              className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedAccountIds.includes(conta.id)}
                                onChange={() => toggleAccountSelection(conta.id)}
                                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                              />
                              <span className="flex-1 text-sm text-gray-700 leading-none select-none">
                                {label}
                              </span>
                              {newOrdersCount > 0 && (
                                <span className="ml-auto text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                  {newOrdersCount}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {selectedAccountIds.length > 0 && (
                        <p className="text-xs text-gray-500 italic">
                          {selectedAccountIds.length} conta(s) selecionada(s)
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleCheckNewOrders(false)}
                    disabled={isChecking}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChecking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-700"></div>
                        <span>Verificando...</span>
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
                          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Verificar novas vendas</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      Resultado da Verificação
                    </h3>

                    {checkResult.errors && checkResult.errors.length > 0 ? (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded-md">
                        {checkResult.errors[0].message}
                      </div>
                    ) : (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-blue-600"
                          >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
                            <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
                          </svg>
                          <span className="text-lg font-semibold text-blue-900">
                            {checkResult.totals?.new || 0}
                          </span>
                        </div>
                        <p className="text-xs text-blue-700">
                          {checkResult.totals?.new === 0
                            ? "Nenhuma venda nova encontrada"
                            : checkResult.totals?.new === 1
                            ? "Nova venda encontrada"
                            : "Novas vendas encontradas"}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Seleção de contas (após verificação - apenas se houver mais de 1 conta) */}
                  {contasConectadas.length > 1 && checkResult.totals?.new > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">Sincronizar apenas:</span>
                        <button
                          onClick={toggleSelectAll}
                          className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                          {selectedAccountIds.length === contasConectadas.length ? "Limpar" : "Todas"}
                        </button>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2">
                        {contasConectadas.map((conta) => {
                          const label = conta.nickname || conta.shop_id || conta.merchant_id || conta.id;
                          const newOrdersCount = newOrdersByAccount[conta.id] || 0;
                          return (
                            <label
                              key={conta.id || label}
                              className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedAccountIds.includes(conta.id)}
                                onChange={() => toggleAccountSelection(conta.id)}
                                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                              />
                              <span className="flex-1 text-sm text-gray-700 leading-none select-none">
                                {label}
                              </span>
                              {newOrdersCount > 0 && (
                                <span className="ml-auto text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                  {newOrdersCount}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {selectedAccountIds.length > 0 ? (
                        <p className="text-xs text-gray-500 italic">
                          {selectedAccountIds.length} conta(s) selecionada(s)
                        </p>
                      ) : (
                        <p className="text-xs text-orange-600 italic">
                          ⚠️ Nenhuma conta selecionada - todas serão sincronizadas
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelSync}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>

                    {checkResult.totals?.new > 0 && (
                      <button
                        onClick={handleConfirmSync}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-orange-500 bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                      >
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
                          <polyline points="20,6 9,17 4,12" />
                        </svg>
                        Confirmar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function VendasShopee() {
  const toast = useToast();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "1";
  });
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatus>("pagos");
  const [periodoAtivo, setPeriodoAtivo] = useState<FiltroPeriodo>("todos");
  const [dataInicioPersonalizada, setDataInicioPersonalizada] =
    useState<Date | null>(null);
  const [dataFimPersonalizada, setDataFimPersonalizada] =
    useState<Date | null>(null);

  const [filtroConta, setFiltroConta] = useState<string>("todas");

  const [colunasVisiveis, setColunasVisiveis] = useState<ColunasVisiveis>({
    data: true,
    canal: true,
    conta: true,
    pedido: true,
    ads: false,
    exposicao: false,
    tipo: false,
    produto: true,
    sku: true,
    quantidade: true,
    unitario: true,
    valor: true,
    taxa: true,
    frete: true,
    cmv: true,
    margem: true,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Usar o hook de vendas para Shopee (placeholder: lógica específica de Shopee ainda não implementada no hook)
  const { 
    vendas, 
    lastSyncedAt, 
    isSyncing, 
    handleSyncOrders, 
    contasConectadas,
    isConnected,
    progress,
    connect,
    disconnect
  } = useVendas("Shopee");

  const handlePeriodoPersonalizadoChange = (
    dataInicio: Date,
    dataFim: Date,
  ) => {
    setDataInicioPersonalizada(dataInicio);
    setDataFimPersonalizada(dataFim);
  };

  const filtrarPorPeriodo = (venda: any, periodo: FiltroPeriodo) => {
    if (periodo === "todos") return true;
    const dataVenda = new Date(venda.dataVenda);
    const agora = new Date();
    switch (periodo) {
      case "mes_passado": {
        const primeiroDiaMesPassado = new Date(
          agora.getFullYear(),
          agora.getMonth() - 1,
          1,
        );
        const ultimoDiaMesPassado = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          0,
        );
        return (
          dataVenda >= primeiroDiaMesPassado && dataVenda <= ultimoDiaMesPassado
        );
      }
      case "este_mes": {
        const primeiroDiaMesAtual = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          1,
        );
        const ultimoDiaMesAtual = new Date(
          agora.getFullYear(),
          agora.getMonth() + 1,
          0,
        );
        return (
          dataVenda >= primeiroDiaMesAtual && dataVenda <= ultimoDiaMesAtual
        );
      }
      case "personalizado": {
        if (dataInicioPersonalizada && dataFimPersonalizada) {
          const inicio = new Date(dataInicioPersonalizada);
          inicio.setHours(0, 0, 0, 0);
          const fim = new Date(dataFimPersonalizada);
          fim.setHours(23, 59, 59, 999);
          return dataVenda >= inicio && dataVenda <= fim;
        }
        return true;
      }
      default:
        return true;
    }
  };

  const vendasFiltradasPorPeriodo = vendas.filter((venda) =>
    filtrarPorPeriodo(venda, periodoAtivo),
  );
  const contagensVendas = {
    total: vendasFiltradasPorPeriodo.length,
    pagas: vendasFiltradasPorPeriodo.filter((venda) =>
      isStatusPago(venda.status, "Shopee"),
    ).length,
    canceladas: vendasFiltradasPorPeriodo.filter((venda) =>
      isStatusCancelado(venda.status, "Shopee"),
    ).length,
  };

  const hasInitialSet = useRef(false);
  useIsoLayout(() => {
    if (hasInitialSet.current) return;
    const el = containerRef.current;
    if (!el) return;
    hasInitialSet.current = true;
    gsap.set(el, {
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isSidebarCollapsed]);

  useIsoLayout(() => {
    const el = containerRef.current;
    if (!el) return;
    gsap.to(el, {
      duration: 0.35,
      ease: "power2.inOut",
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isSidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, isSidebarCollapsed ? "1" : "0");
    } catch {}
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const mdLeftVar = "md:left-[var(--sidebar-w,16rem)]";
  const mdMlVar = "md:ml-[var(--sidebar-w,16rem)]";

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden">
      <Sidebar
        collapsed={isSidebarCollapsed}
        mobileOpen={isSidebarMobileOpen}
        onMobileClose={() => setIsSidebarMobileOpen(false)}
      />

      <Topbar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
        onMobileMenu={() => setIsSidebarMobileOpen((v) => !v)}
      />

      <div
        className={`fixed top-16 bottom-0 left-0 right-0 ${mdLeftVar} z-10 bg-[#F3F3F3]`}
      >
        <div className="h-full w-full rounded-tl-none md:rounded-tl-2xl border border-gray-200 bg-white" />
      </div>

      <main className={`relative z-20 pt-16 p-6 ${mdMlVar}`}>
        <section className="p-6">
          <HeaderVendasShopee
            vendas={vendas || []}
            lastSyncedAt={lastSyncedAt || null}
            isSyncing={isSyncing || false}
            onSyncOrders={handleSyncOrders}
            contasConectadas={contasConectadas || []}
          />

          <FiltrosVendas
            filtroAtivo={filtroAtivo}
            onFiltroChange={setFiltroAtivo}
            totalVendas={contagensVendas.total}
            vendasPagas={contagensVendas.pagas}
            vendasCanceladas={contagensVendas.canceladas}
            periodoAtivo={periodoAtivo}
            onPeriodoChange={setPeriodoAtivo}
            onPeriodoPersonalizadoChange={handlePeriodoPersonalizadoChange}
            filtroConta={filtroConta}
            onContaChange={setFiltroConta}
            contasDisponiveis={contasConectadas.map((conta: any) => ({
              id: String(conta.shop_id || conta.merchant_id || conta.id || ""),
              nickname: conta.nickname || `Conta ${conta.shop_id || conta.merchant_id || conta.id}`,
            }))}
            colunasVisiveis={colunasVisiveis}
            onColunasChange={setColunasVisiveis}
            platform="Shopee"
          />

          <TabelaVendas
            platform="Shopee"
            isLoading={isLoading}
            isSyncing={isSyncing}
            syncProgress={progress}
            filtroAtivo={filtroAtivo}
            periodoAtivo={periodoAtivo}
            filtroConta={filtroConta}
            colunasVisiveis={colunasVisiveis}
            dataInicioPersonalizada={dataInicioPersonalizada}
            dataFimPersonalizada={dataFimPersonalizada}
          />
        </section>
      </main>
    </div>
  );
}
