"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Sidebar from "../views/ui/Sidebar";
import Topbar from "../views/ui/Topbar";
import TabelaVendas from "../views/ui/TabelaVendas";
import { useVendasSocket, FiltrosVendas } from "@/hooks/useVendasSocket";
import FiltrosVendas as FiltrosVendasComponent, {
  FiltroStatus,
  FiltroPeriodo,
  FiltroADS,
  FiltroExposicao,
  FiltroTipoAnuncio,
  FiltroModalidadeEnvio,
  ColunasVisiveis
} from "../views/ui/FiltrosVendas";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";
import { useToast } from "./ui/toaster";
import ModalSyncVendas from "./ui/ModalSyncVendas";
import { useBackendDetection } from "@/hooks/useBackendDetection";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

const useIsoLayout =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface HeaderVendasMercadolivreProps {
  totalVendas?: number;
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
  onSyncOrders: (accountIds?: string[]) => void;
  contasConectadas?: any[];
  progress?: any;
  reloadVendas?: () => void;
  backendUrl?: string;
  isConnected?: boolean;
}

const HeaderVendasMercadolivre = ({
  totalVendas = 0,
  lastSyncedAt = null,
  isSyncing = false,
  onSyncOrders,
  contasConectadas = [],
  progress,
  reloadVendas,
  backendUrl = "",
  isConnected = false
}: HeaderVendasMercadolivreProps) => {
  const router = useRouter();
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const infoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showInfoDropdown,
    onClose: () => setShowInfoDropdown(false),
    preferredPosition: 'bottom-left',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const handleOpenSyncModal = () => {
    setShowSyncModal(true);
  };

  const handleSyncComplete = () => {
    console.log("Sincronização concluída - recarregando vendas...");
    if (reloadVendas) {
      reloadVendas();
    }
  };

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
            Vendas Mercado Livre
          </h1>

          {/* Status de Conexão WebSocket */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
            isConnected
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`} />
            {isConnected ? "WebSocket Conectado" : "WebSocket Desconectado"}
          </div>

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
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
            </button>

            {infoDropdown.isVisible && (
              <div
                ref={infoDropdown.dropdownRef}
                className={`smart-dropdown w-72 ${
                  infoDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={infoDropdown.position}
              >
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Total de vendas:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {totalVendas}
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

                    {backendUrl && (
                      <div className="pt-2 border-t border-gray-100/80">
                        <p className="text-xs text-gray-600 mb-2">🔗 Backend em uso:</p>
                        <div className="bg-gray-50 rounded p-2 border border-gray-200">
                          <p className="text-xs font-semibold text-gray-800 mb-1">
                            {backendUrl.split(' - ')[0]} {backendUrl.split(' - ')[1] || ""}
                          </p>
                          <p className="text-xs font-mono text-gray-600 break-all bg-white rounded p-1 border border-gray-100">
                            {backendUrl.split(' - ')[2] || backendUrl}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-600 text-left">
          Gerencie e acompanhe suas vendas na plataforma do Mercado Livre com WebSocket em tempo real.
        </p>
      </div>

      <div className="flex items-center gap-3">
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
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
                <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
              </svg>
            )}
          </div>

          <span>{isSyncing ? "Sincronizando..." : "Sincronizar vendas"}</span>

          {contasConectadas.length > 0 && (
            <div className="flex items-center -space-x-1">
              {contasConectadas.slice(0, 3).map((conta) => (
                <div
                  key={conta.id}
                  className="relative bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-semibold w-6 h-6"
                  title={conta.nickname || `Conta ${conta.ml_user_id}`}
                >
                  <span>
                    {conta.nickname
                      ? conta.nickname.charAt(0).toUpperCase()
                      : conta.ml_user_id.toString().slice(-1)}
                  </span>
                </div>
              ))}
              {contasConectadas.length > 3 && (
                <div className="relative bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-semibold w-6 h-6 ml-1">
                  <span>+{contasConectadas.length - 3}</span>
                </div>
              )}
            </div>
          )}
        </button>
      </div>

      <ModalSyncVendas
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        platform="Mercado Livre"
        contas={contasConectadas}
        onStartSync={onSyncOrders}
        isSyncing={isSyncing}
        progress={progress}
        onSyncComplete={handleSyncComplete}
      />
    </div>
  );
};

export default function VendasMercadolivreSocket() {
  const toast = useToast();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored === "1") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const backendInfo = useBackendDetection();

  // Estados de Filtros
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatus>("pagos");
  const [periodoAtivo, setPeriodoAtivo] = useState<FiltroPeriodo>("todos");
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<Date | null>(null);
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<Date | null>(null);

  const [filtroADS, setFiltroADS] = useState<FiltroADS>("todos");
  const [filtroExposicao, setFiltroExposicao] = useState<FiltroExposicao>("todas");
  const [filtroTipoAnuncio, setFiltroTipoAnuncio] = useState<FiltroTipoAnuncio>("todos");
  const [filtroModalidadeEnvio, setFiltroModalidadeEnvio] = useState<FiltroModalidadeEnvio>("todos");
  const [filtroConta, setFiltroConta] = useState<string>("todas");

  const [colunasVisiveis, setColunasVisiveis] = useState<ColunasVisiveis>({
    data: true,
    canal: true,
    conta: true,
    pedido: true,
    ads: true,
    exposicao: true,
    tipo: true,
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
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Usar o novo hook WebSocket
  const {
    vendas,
    contasConectadas,
    isConnected,
    isLoading: isLoadingSocket,
    isSyncing,
    hasMore,
    syncProgress,
    totalCount,
    loadMore,
    applyFilters,
    startSync,
  } = useVendasSocket({
    platform: "Mercado Livre",
    autoConnect: true,
    pageSize: 50,
  });

  // Configurar Intersection Observer para infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoadingSocket) {
          console.log("[Infinite Scroll] Carregando mais vendas...");
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingSocket, loadMore]);

  // Observar elemento de carregamento
  useEffect(() => {
    const currentObserver = observerRef.current;
    const currentLoadMoreRef = loadMoreRef.current;

    if (currentObserver && currentLoadMoreRef) {
      currentObserver.observe(currentLoadMoreRef);
    }

    return () => {
      if (currentObserver && currentLoadMoreRef) {
        currentObserver.unobserve(currentLoadMoreRef);
      }
    };
  }, [loadMoreRef.current, hasMore]);

  // Aplicar filtros quando mudarem
  useEffect(() => {
    const filtros: FiltrosVendas = {};

    if (filtroAtivo !== "todos") {
      filtros.status = filtroAtivo;
    }

    if (periodoAtivo === "personalizado" && dataInicioPersonalizada && dataFimPersonalizada) {
      filtros.dataInicio = dataInicioPersonalizada.toISOString();
      filtros.dataFim = dataFimPersonalizada.toISOString();
    } else if (periodoAtivo !== "todos") {
      filtros.periodo = periodoAtivo;
    }

    if (filtroADS !== "todos") {
      filtros.ads = filtroADS;
    }

    if (filtroExposicao !== "todas") {
      filtros.exposicao = filtroExposicao;
    }

    if (filtroTipoAnuncio !== "todos") {
      filtros.tipoAnuncio = filtroTipoAnuncio;
    }

    if (filtroModalidadeEnvio !== "todos") {
      filtros.modalidadeEnvio = filtroModalidadeEnvio;
    }

    if (filtroConta !== "todas") {
      filtros.conta = filtroConta;
    }

    applyFilters(filtros);
  }, [
    filtroAtivo,
    periodoAtivo,
    dataInicioPersonalizada,
    dataFimPersonalizada,
    filtroADS,
    filtroExposicao,
    filtroTipoAnuncio,
    filtroModalidadeEnvio,
    filtroConta,
    applyFilters,
  ]);

  const handlePeriodoPersonalizadoChange = (dataInicio: Date, dataFim: Date) => {
    setDataInicioPersonalizada(dataInicio);
    setDataFimPersonalizada(dataFim);
  };

  const contagensVendas = useMemo(() => {
    return {
      total: vendas.length,
      pagas: vendas.filter(venda => {
        const status = venda.status?.toLowerCase();
        return status === 'paid' || status === 'pago' || status === 'payment_approved';
      }).length,
      canceladas: vendas.filter(venda => {
        const status = venda.status?.toLowerCase();
        return status === 'cancelled' || status === 'cancelado';
      }).length,
    };
  }, [vendas]);

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
      duration: 0.2,
      ease: "power2.out",
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

  const handleMobileClose = useCallback(() => {
    setIsSidebarMobileOpen(false);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setIsSidebarCollapsed((v) => !v);
  }, []);

  const handleMobileMenu = useCallback(() => {
    setIsSidebarMobileOpen((v) => !v);
  }, []);

  const handleSyncOrders = (accountIds?: string[]) => {
    if (accountIds && accountIds.length > 0) {
      startSync(accountIds, false);
    }
  };

  const mdLeftVar = "md:left-[var(--sidebar-w,16rem)]";
  const mdMlVar = "md:ml-[var(--sidebar-w,16rem)]";

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden">
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

      <div
        className={`fixed top-16 bottom-0 left-0 right-0 ${mdLeftVar} z-10 bg-[#F3F3F3]`}
      >
        <div className="h-full w-full rounded-tl-none md:rounded-tl-2xl border border-gray-200 bg-white" />
      </div>

      <main className={`relative z-20 pt-16 p-6 ${mdMlVar}`}>
        <section className="p-6">
          <HeaderVendasMercadolivre
            totalVendas={totalCount}
            lastSyncedAt={null}
            isSyncing={isSyncing}
            onSyncOrders={handleSyncOrders}
            contasConectadas={contasConectadas}
            progress={syncProgress}
            reloadVendas={() => applyFilters({})}
            backendUrl={`${backendInfo.statusIcon} ${backendInfo.source} - ${backendInfo.url}`}
            isConnected={isConnected}
          />

          <FiltrosVendasComponent
            filtroAtivo={filtroAtivo}
            onFiltroChange={setFiltroAtivo}
            totalVendas={contagensVendas.total}
            vendasPagas={contagensVendas.pagas}
            vendasCanceladas={contagensVendas.canceladas}
            periodoAtivo={periodoAtivo}
            onPeriodoChange={setPeriodoAtivo}
            onPeriodoPersonalizadoChange={handlePeriodoPersonalizadoChange}
            filtroADS={filtroADS}
            onADSChange={setFiltroADS}
            filtroExposicao={filtroExposicao}
            onExposicaoChange={setFiltroExposicao}
            filtroTipoAnuncio={filtroTipoAnuncio}
            onTipoAnuncioChange={setFiltroTipoAnuncio}
            filtroModalidadeEnvio={filtroModalidadeEnvio}
            onModalidadeEnvioChange={setFiltroModalidadeEnvio}
            filtroConta={filtroConta}
            onContaChange={setFiltroConta}
            contasDisponiveis={contasConectadas.map(conta => ({
              id: conta.id,
              nickname: conta.nickname || ""
            }))}
            colunasVisiveis={colunasVisiveis}
            onColunasChange={setColunasVisiveis}
            platform="Mercado Livre"
          />

          {/* Tabela com Infinite Scroll */}
          <div className="space-y-4">
            <TabelaVendas
              platform="Mercado Livre"
              isLoading={isLoading}
              isSyncing={isSyncing}
              syncProgress={syncProgress}
              filtroAtivo={filtroAtivo}
              periodoAtivo={periodoAtivo}
              filtroADS={filtroADS}
              filtroExposicao={filtroExposicao}
              filtroTipoAnuncio={filtroTipoAnuncio}
              filtroModalidadeEnvio={filtroModalidadeEnvio}
              filtroConta={filtroConta}
              colunasVisiveis={colunasVisiveis}
              dataInicioPersonalizada={dataInicioPersonalizada}
              dataFimPersonalizada={dataFimPersonalizada}
            />

            {/* Infinite Scroll Loader */}
            {hasMore && (
              <div
                ref={loadMoreRef}
                className="flex items-center justify-center p-4"
              >
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-orange-500"></div>
                <span className="ml-3 text-sm text-gray-600">Carregando mais vendas...</span>
              </div>
            )}

            {!hasMore && vendas.length > 0 && (
              <div className="text-center p-4 text-sm text-gray-500">
                ✅ Todas as {totalCount} vendas foram carregadas
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
