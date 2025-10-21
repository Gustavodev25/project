"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
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
import ModalSyncVendas from "./ui/ModalSyncVendas";

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
  progress?: any;
  reloadVendas?: () => Promise<void>;
}

const HeaderVendasShopee = ({
  vendas = [],
  lastSyncedAt = null,
  isSyncing = false,
  onSyncOrders,
  contasConectadas = [],
  progress,
  reloadVendas
}: HeaderVendasShopeeProps) => {
  const router = useRouter();
  const toast = useToast();
  const hasBeenSynced = lastSyncedAt !== null;
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Estados para sincronizaÃ§Ã£o automÃ¡tica
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(false);
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dropdowns
  const infoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showInfoDropdown,
    onClose: () => setShowInfoDropdown(false),
    preferredPosition: "bottom-left",
    offset: 8,
    minDistanceFromEdge: 16,
  });


  const handleCheckNewOrders = async (silent = false) => {
    try {
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
    } catch (error) {
      console.error("Erro ao verificar vendas:", error);
    }
  };

  // ConfiguraÃ§Ãµes (compartilhada)
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
        console.error("Erro ao carregar configuraÃ§Ãµes:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // NotificaÃ§Ãµes
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
        console.error("Erro ao carregar notificaÃ§Ãµes:", error);
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
          `Erro ao atualizar configuraÃ§Ãµes: ${errorData.error || res.statusText}`,
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
        title: "Erro ao atualizar configuraÃ§Ãµes",
        description: `Erro ao atualizar configuraÃ§Ãµes: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }. Tente novamente.`,
      });
    }
  };

  const handleOpenSyncModal = () => {
    setShowSyncModal(true);
    fetch("/api/notifications", {
      method: "DELETE",
      credentials: "include",
    }).catch(err => console.error("Erro ao marcar notificaÃ§Ãµes:", err));
    setNewOrdersCount(0);
  };

  const handleSyncComplete = async () => {
    console.log("Sincronização concluída com sucesso - recarregando vendas...");
    // Recarregar vendas para atualizar a tabela
    if (reloadVendas) {
      await reloadVendas();
    }
    // Fechar modal (já acontece automaticamente no ModalSyncVendas)
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
          {/* BotÃ£o para Dashboard */}
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
              title="InformaÃ§Ãµes da sincronizaÃ§Ã£o"
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
                        <p className="text-xs text-gray-600 mb-1">Ãšltima sincronizaÃ§Ã£o:</p>
                        <p className="text-xs font-medium text-gray-800">
                          {formatDate(lastSyncedAt)} Ã s {new Date(lastSyncedAt).toLocaleTimeString("pt-BR")}
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

      {/* BotÃ£o de SincronizaÃ§Ã£o */}
      <button
        onClick={handleOpenSyncModal}
        className="inline-flex items-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-all duration-200 shadow-sm hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
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

      {/* Modal de SincronizaÃ§Ã£o */}
      <ModalSyncVendas
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        platform="Shopee"
        contas={contasConectadas}
        onStartSync={onSyncOrders}
        isSyncing={isSyncing}
        progress={progress}
        onSyncComplete={handleSyncComplete}
      />
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

  const {
    vendas,
    lastSyncedAt,
    isSyncing,
    handleSyncOrders,
    contasConectadas,
    isConnected,
    progress,
    connect,
    disconnect,
    reloadVendas
  } = useVendas("Shopee");

  const handlePeriodoPersonalizadoChange = (
    dataInicio: Date,
    dataFim: Date
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
        const primeiroDiaMesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        const ultimoDiaMesPassado = new Date(agora.getFullYear(), agora.getMonth(), 0);
        return dataVenda >= primeiroDiaMesPassado && dataVenda <= ultimoDiaMesPassado;
      }
      case "este_mes": {
        const primeiroDiaMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
        const ultimoDiaMesAtual = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
        return dataVenda >= primeiroDiaMesAtual && dataVenda <= ultimoDiaMesAtual;
      }
      case "hoje": {
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        return dataVenda >= hoje && dataVenda < amanha;
      }
      case "ontem": {
        const ontem = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1);
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        return dataVenda >= ontem && dataVenda < hoje;
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
    filtrarPorPeriodo(venda, periodoAtivo)
  );
  const contagensVendas = {
    total: vendasFiltradasPorPeriodo.length,
    pagas: vendasFiltradasPorPeriodo.filter((v) =>
      isStatusPago(v.status, "Shopee")
    ).length,
    canceladas: vendasFiltradasPorPeriodo.filter((v) =>
      isStatusCancelado(v.status, "Shopee")
    ).length,
  };

  const vendasFiltradas = vendasFiltradasPorPeriodo.filter((venda) => {
    const matchStatus =
      filtroAtivo === "todos" ||
      (filtroAtivo === "pagos" && isStatusPago(venda.status, "Shopee")) ||
      (filtroAtivo === "cancelados" && isStatusCancelado(venda.status, "Shopee"));

    const matchConta =
      filtroConta === "todas" ||
      venda.conta === filtroConta;

    return matchStatus && matchConta;
  });

  const contagensVendasGeral = {
    total: vendasFiltradasPorPeriodo.length,
    pagas: vendasFiltradasPorPeriodo.filter((v) =>
      isStatusPago(v.status, "Shopee"),
    ).length,
    canceladas: vendasFiltradasPorPeriodo.filter((v) =>
      isStatusCancelado(v.status, "Shopee"),
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
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
      ease: "power2.inOut",
    });
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleMobileClose = useCallback(() => {
    setIsSidebarMobileOpen(false);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setIsSidebarCollapsed((v) => !v);
  }, []);

  const handleMobileMenu = useCallback(() => {
    setIsSidebarMobileOpen((v) => !v);
  }, []);

  const mdLeftVar = "md:left-[var(--sidebar-w,16rem)]";
  const mdMlVar = "md:ml-[var(--sidebar-w,16rem)]";

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden bg-gray-50">
      <Sidebar
        collapsed={isSidebarCollapsed}
        mobileOpen={isSidebarMobileOpen}
        onMobileClose={handleMobileClose}
      />

      <Topbar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onMobileMenu={handleMobileMenu}
      />

      <main className={`relative z-20 pt-16 p-6 ${mdMlVar}`}>
        <section className="p-6">
          <HeaderVendasShopee
            vendas={vendas || []}
            lastSyncedAt={lastSyncedAt || null}
            isSyncing={isSyncing || false}
            onSyncOrders={handleSyncOrders}
            contasConectadas={contasConectadas || []}
            progress={progress}
            reloadVendas={reloadVendas}
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
              id: conta.id,
              nome: conta.nickname || conta.shop_id || conta.merchant_id || conta.id,
            }))}
            colunasVisiveis={colunasVisiveis}
            onColunasVisiveisChange={setColunasVisiveis}
          />

          <TabelaVendas
            vendas={vendasFiltradas}
            colunasVisiveis={colunasVisiveis}
            platform="Shopee"
          />
        </section>
      </main>
    </div>
  );
}
