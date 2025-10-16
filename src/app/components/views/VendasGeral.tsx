"use client";

import { useRef, useEffect, useLayoutEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { useNotification } from "@/contexts/NotificationContext";
import { AlertBanner } from "@/components/ui/alert-banner";
import { UserGuidanceNotification } from "@/components/ui/user-guidance-notification";
import { useUserGuidance } from "@/hooks/useUserGuidance";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

// useLayoutEffect no browser; fallback para useEffect no SSR
const useIsoLayout =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface HeaderVendasGeralProps {
  vendas?: any[];
  lastSyncedAt?: string | null;
  contasConectadas?: any[];
}

const HeaderVendasGeral = ({
  vendas = [],
  lastSyncedAt = null,
  contasConectadas = [],
}: HeaderVendasGeralProps) => {
  const router = useRouter();
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);

  // Dropdown de informações
  const infoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showInfoDropdown,
    onClose: () => setShowInfoDropdown(false),
    preferredPosition: "bottom-left",
    offset: 8,
    minDistanceFromEdge: 16,
  });

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
            Vendas Geral
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
              title="Informações das vendas"
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

                    <div className="pt-2 border-t border-gray-100/80">
                      <p className="text-xs text-gray-600 mb-1">Fonte dos dados:</p>
                      <p className="text-xs font-medium text-gray-800">
                        Vendas já sincronizadas do Shopee e Mercado Livre
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-600 text-left">
          Visualize todas as suas vendas sincronizadas em uma única tabela.
        </p>
      </div>

      {/* Informações das contas conectadas */}
      {contasConectadas.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Contas conectadas:</span>
          <div className="flex items-center -space-x-1">
            {contasConectadas.slice(0, 3).map((conta) => {
              const label = conta.nickname || conta.shop_id || conta.merchant_id || conta.ml_user_id || conta.id;
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
        </div>
      )}
    </div>
  );
};

export default function VendasGeral() {
  const { 
    hasAccounts, 
    hasSales, 
    isLoading: isLoadingGuidance, 
    showConnectAccounts, 
    showSyncVendas, 
    showViewVendas, 
    showViewDashboard,
    updateGuidanceState,
    dismissNotification 
  } = useUserGuidance();
  
  const searchParams = useSearchParams();
  const { showNotification } = useNotification();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "1";
  });
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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

  // Usar o hook de vendas para Vendas Geral (combinando Shopee e Mercado Livre)
  const { 
    vendas, 
    lastSyncedAt, 
    contasConectadas,
    isTableLoading,
    isConnected,
    progress,
    connect,
    disconnect
  } = useVendas("Geral");

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

  // Memoizar cálculos de filtro para evitar re-renders desnecessários
  const vendasFiltradasPorPeriodo = useMemo(() => 
    vendas.filter((venda) => filtrarPorPeriodo(venda, periodoAtivo)),
    [vendas, periodoAtivo, dataInicioPersonalizada, dataFimPersonalizada]
  );

  const contagensVendas = useMemo(() => ({
    total: vendasFiltradasPorPeriodo.length,
    pagas: vendasFiltradasPorPeriodo.filter((venda) => {
      const status = venda.status?.toLowerCase();
      return (
        status === "paid" || status === "pago" || status === "payment_approved"
      );
    }).length,
    canceladas: vendasFiltradasPorPeriodo.filter((venda) => {
      const status = venda.status?.toLowerCase();
      return status === "cancelled" || status === "cancelado";
    }).length,
  }), [vendasFiltradasPorPeriodo]);

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

  // Verificar contas e vendas para orientação do usuário
  useEffect(() => {
    const checkAccountsAndSales = async () => {
      try {
        const [accountsRes, salesRes] = await Promise.all([
          fetch('/api/accounts/check'),
          fetch('/api/sales/check')
        ]);

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          const salesData = salesRes.ok ? await salesRes.json() : { hasSales: false };
          
          updateGuidanceState(accountsData.hasAccounts, salesData.hasSales);
        }
      } catch (error) {
        console.error('Erro ao verificar contas e vendas:', error);
      }
    };

    checkAccountsAndSales();
  }, [updateGuidanceState]);

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
          <HeaderVendasGeral
            vendas={vendas || []}
            lastSyncedAt={lastSyncedAt || null}
            contasConectadas={contasConectadas || []}
          />

          {/* Sistema de orientação do usuário */}
          {!isLoadingGuidance && showConnectAccounts && (
            <UserGuidanceNotification
              type="warning"
              title="🚀 Bem-vindo ao Contazoom!"
              message="Para começar, você precisa conectar suas contas do Mercado Livre e Shopee. Após conectar, você poderá sincronizar e visualizar todas as suas vendas."
              actionLabel="Conectar Contas"
              actionHref="/contas"
              dismissible={true}
              onDismiss={() => dismissNotification('showConnectAccounts')}
            />
          )}

          {!isLoadingGuidance && showSyncVendas && (
            <UserGuidanceNotification
              type="sync"
              title="🔄 Sincronize suas vendas"
              message="Suas contas estão conectadas! Agora você pode sincronizar suas vendas para visualizar os dados na tabela abaixo."
              actionLabel="Sincronizar Agora"
              actionHref="#"
              dismissible={true}
              onDismiss={() => dismissNotification('showSyncVendas')}
            />
          )}

          {!isLoadingGuidance && showViewDashboard && (
            <UserGuidanceNotification
              type="success"
              title="📊 Vendas carregadas!"
              message="Aqui você pode visualizar todas as suas vendas em detalhes. Para ver gráficos e estatísticas, acesse o dashboard."
              actionLabel="Ver Dashboard"
              actionHref="/dashboard"
              dismissible={true}
              onDismiss={() => dismissNotification('showViewDashboard')}
            />
          )}

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
              id: String(conta.shop_id || conta.merchant_id || conta.ml_user_id || conta.id || ""),
              nickname: conta.nickname || `Conta ${conta.shop_id || conta.merchant_id || conta.ml_user_id || conta.id}`,
            }))}
            colunasVisiveis={colunasVisiveis}
            onColunasChange={setColunasVisiveis}
            platform="Geral"
          />

          <TabelaVendas
            platform="Geral"
            isLoading={isTableLoading}
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
