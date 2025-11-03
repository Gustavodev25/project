"use client";

import { useRef, useEffect, useLayoutEffect, useState, lazy, Suspense } from "react";
import gsap from "gsap";
import Sidebar from "../views/ui/Sidebar";
import Topbar from "../views/ui/Topbar";
import HeaderDashboard from "../views/ui/HeaderDashboard";
import DashboardStats from "../views/ui/DashboardStats";
import { FiltroPeriodo } from "../views/ui/FiltrosDashboard";

// Lazy load dos componentes de grÃ¡fico para melhor performance
const GraficoPeriodo = lazy(() => import("../views/ui/GraficoPeriodo"));
const TopProdutosFaturamento = lazy(() => import("../views/ui/TopProdutosFaturamento"));
const TopProdutosMargem = lazy(() => import("../views/ui/TopProdutosMargem"));
const FaturamentoPorOrigem = lazy(() => import("../views/ui/FaturamentoPorOrigem"));
const FaturamentoPorExposicao = lazy(() => import("../views/ui/FaturamentoPorExposicao"));
const FaturamentoPorTipoAnuncio = lazy(() => import("../views/ui/FaturamentoPorTipoAnuncio"));
import type { FiltroCanal, FiltroStatus, FiltroTipoAnuncio, FiltroModalidadeEnvio } from "../views/ui/FiltrosDashboardExtra";
import type { FiltroAgrupamentoSKU } from "../views/ui/FiltroSKU";
import { AlertBanner } from "@/components/ui/alert-banner";
import { UserGuidanceNotification } from "@/components/ui/user-guidance-notification";
import { useUserGuidance } from "@/hooks/useUserGuidance";
import { useAuthContext } from "@/contexts/AuthContext";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

// useLayoutEffect no browser; fallback para useEffect no SSR
const useIsoLayout =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Dashboard() {
  const { user } = useAuthContext();
  const { 
    hasAccounts, 
    hasSales, 
    isLoading, 
    showConnectAccounts, 
    showSyncVendas, 
    showViewVendas, 
    showViewDashboard,
    updateGuidanceState,
    dismissNotification 
  } = useUserGuidance();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "1";
  });
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Estados dos filtros
  const [periodoAtivo, setPeriodoAtivo] = useState<FiltroPeriodo>("ultimos_30d");
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<Date | null>(null);
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<Date | null>(null);
  const [canalAtivo, setCanalAtivo] = useState<FiltroCanal>("todos");
  const [statusAtivo, setStatusAtivo] = useState<FiltroStatus>("pagos");
  const [tipoAnuncioAtivo, setTipoAnuncioAtivo] = useState<FiltroTipoAnuncio>("todos");
  const [modalidadeEnvioAtiva, setModalidadeEnvioAtiva] = useState<FiltroModalidadeEnvio>("todos");
  const [agrupamentoSKUAtivo, setAgrupamentoSKUAtivo] = useState<FiltroAgrupamentoSKU>("mlb");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState<{ platform: 'meli' | 'shopee' | 'todos'; id?: string; label?: string }>({ platform: 'todos' });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Define a var CSS logo na 1Âª pintura do cliente (conforme o estado inicial)
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

  // Anima quando o estado muda
  useIsoLayout(() => {
    const el = containerRef.current;
    if (!el) return;
    gsap.to(el, {
      duration: 0.2,
      ease: "power2.out",
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isSidebarCollapsed]);

  // Persiste o estado
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, isSidebarCollapsed ? "1" : "0");
    } catch {}
  }, [isSidebarCollapsed]);

  // Verifica se o usuÃ¡rio tem contas e vendas conectadas
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

    if (user) {
      checkAccountsAndSales();
    }
  }, [user, refreshKey]);
  // Fallback automático de período quando há vendas, mas o período selecionado retorna vazio
  const hasAutoPeriodFallback = useRef(false);
  useEffect(() => {
    if (hasAutoPeriodFallback.current) return;
    if (!hasSales) return; // Só tenta fallback se sabemos que há vendas no banco

    (async () => {
      try {
        const params = new URLSearchParams();
        if (periodoAtivo && periodoAtivo !== 'todos') params.append('periodo', periodoAtivo);
        if (canalAtivo && canalAtivo !== 'todos') params.append('canal', canalAtivo);
        if (statusAtivo && statusAtivo !== 'todos') params.append('status', statusAtivo);
        if (tipoAnuncioAtivo && tipoAnuncioAtivo !== 'todos') params.append('tipoAnuncio', tipoAnuncioAtivo);
        if (modalidadeEnvioAtiva && modalidadeEnvioAtiva !== 'todos') params.append('modalidade', modalidadeEnvioAtiva);
        if (agrupamentoSKUAtivo && agrupamentoSKUAtivo !== 'mlb') params.append('agrupamentoSKU', agrupamentoSKUAtivo);
        if (selectedAccount && selectedAccount.platform !== 'todos' && selectedAccount.id) {
          params.append('accountPlatform', selectedAccount.platform);
          params.append('accountId', selectedAccount.id);
        }
        const res = await fetch(`/api/dashboard/series?${params.toString()}` , { credentials: 'include' });
        const arr = res.ok ? await res.json() : [];
        if (Array.isArray(arr) && arr.length === 0) {
          hasAutoPeriodFallback.current = true;
          let nextPeriod: FiltroPeriodo | null = null;
          if (periodoAtivo === 'hoje') nextPeriod = 'ultimos_30d';
          else if (periodoAtivo === 'este_mes') nextPeriod = 'mes_passado';
          else if (periodoAtivo === 'mes_passado') nextPeriod = 'ultimos_30d';
          else nextPeriod = 'ultimos_30d';
          setPeriodoAtivo(nextPeriod);
          setRefreshKey((v) => v + 1);
        }
      } catch {}
    })();
  }, [periodoAtivo, hasSales]);

  

  // FunÃ§Ãµes de callback para os filtros
  const handlePeriodoChange = (periodo: FiltroPeriodo) => {
    setPeriodoAtivo(periodo);
    // Limpar datas personalizadas se nÃ£o for perÃ­odo personalizado
    if (periodo !== "personalizado") {
      setDataInicioPersonalizada(null);
      setDataFimPersonalizada(null);
    }
  };

  const handlePeriodoPersonalizadoChange = (dataInicio: Date, dataFim: Date) => {
    setDataInicioPersonalizada(dataInicio);
    setDataFimPersonalizada(dataFim);
  };

  // Fallbacks de var + evita scroll horizontal
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

      {/* Plano de fundo da Ã¡rea de conteÃºdo */}
      <div
        className={`fixed top-16 bottom-0 left-0 right-0 ${mdLeftVar} z-10 bg-[#F3F3F3]`}
      >
        <div className="h-full w-full rounded-tl-none md:rounded-tl-2xl border border-gray-200 bg-white" />
      </div>

      {/* ConteÃºdo */}
      <main className={`relative z-20 pt-16 p-6 ${mdMlVar}`}>
        <section className="p-6">
          {/* Sistema de orientaÃ§Ã£o do usuÃ¡rio */}
          {!isLoading && showConnectAccounts && (
            <UserGuidanceNotification
              type="warning"
              title="ðŸš€ Bem-vindo ao Contazoom!"
              message="Para comeÃ§ar, vocÃª precisa conectar suas contas do Mercado Livre e Shopee. ApÃ³s conectar, vocÃª poderÃ¡ sincronizar e visualizar todas as suas vendas."
              actionLabel="Conectar Contas"
              actionHref="/contas"
              dismissible={true}
              onDismiss={() => dismissNotification('showConnectAccounts')}
            />
          )}

          {!isLoading && showSyncVendas && (
            <UserGuidanceNotification
              type="info"
              title="âœ… Contas conectadas com sucesso!"
              message="Agora vocÃª pode sincronizar suas vendas para visualizar os dados no dashboard. Clique no botÃ£o abaixo para comeÃ§ar a sincronizaÃ§Ã£o."
              actionLabel="Sincronizar Vendas"
              actionHref="/vendas/geral"
              dismissible={true}
              onDismiss={() => dismissNotification('showSyncVendas')}
            />
          )}

          {!isLoading && showViewVendas && (
            <UserGuidanceNotification
              type="success"
              title="ðŸ“Š Dashboard carregado!"
              message="Aqui vocÃª pode visualizar grÃ¡ficos e estatÃ­sticas das suas vendas. Para ver os detalhes completos, acesse a tabela de vendas."
              actionLabel="Ver Tabela de Vendas"
              actionHref="/vendas/geral"
              dismissible={true}
              onDismiss={() => dismissNotification('showViewVendas')}
            />
          )}

          <HeaderDashboard
            periodoAtivo={periodoAtivo}
            onPeriodoChange={handlePeriodoChange}
            onPeriodoPersonalizadoChange={handlePeriodoPersonalizadoChange}
            canalAtivo={canalAtivo}
            onCanalChange={setCanalAtivo}
            statusAtivo={statusAtivo}
            onStatusChange={setStatusAtivo}
            tipoAnuncioAtivo={tipoAnuncioAtivo}
            onTipoAnuncioChange={setTipoAnuncioAtivo}
            modalidadeEnvioAtiva={modalidadeEnvioAtiva}
            onModalidadeEnvioChange={setModalidadeEnvioAtiva}
            agrupamentoSKUAtivo={agrupamentoSKUAtivo}
            onAgrupamentoSKUChange={setAgrupamentoSKUAtivo}
            onForceRefresh={() => setRefreshKey((v) => v + 1)}
            selectedAccount={selectedAccount}
            onAccountChange={(acc) => {
              setSelectedAccount(acc);
              // Ajusta canal automaticamente ao escolher plataforma especÃ­fica
              if (acc.platform === 'meli') setCanalAtivo('mercado_livre');
              else if (acc.platform === 'shopee') setCanalAtivo('shopee');
              else setCanalAtivo('todos');
              setRefreshKey((v) => v + 1);
            }}
          />
          <DashboardStats
            periodoAtivo={periodoAtivo}
            dataInicioPersonalizada={dataInicioPersonalizada}
            dataFimPersonalizada={dataFimPersonalizada}
            canalAtivo={canalAtivo}
            statusAtivo={statusAtivo}
            tipoAnuncioAtivo={tipoAnuncioAtivo}
            modalidadeEnvioAtiva={modalidadeEnvioAtiva}
            agrupamentoSKUAtivo={agrupamentoSKUAtivo}
            refreshKey={refreshKey}
            selectedAccount={selectedAccount}
          />
          
          {/* GrÃ¡fico de PerÃ­odo */}
          <div className="mt-6">
            <Suspense fallback={<div className="h-96 bg-gray-50 rounded-lg animate-pulse" />}>
              <GraficoPeriodo
                periodoAtivo={periodoAtivo}
                dataInicioPersonalizada={dataInicioPersonalizada}
                dataFimPersonalizada={dataFimPersonalizada}
                canalAtivo={canalAtivo}
                statusAtivo={statusAtivo}
                tipoAnuncioAtivo={tipoAnuncioAtivo}
                modalidadeEnvioAtiva={modalidadeEnvioAtiva}
                agrupamentoSKUAtivo={agrupamentoSKUAtivo}
                refreshKey={refreshKey}
                selectedAccount={selectedAccount}
              />
            </Suspense>
          </div>

          {/* Top Produtos - Faturamento e Margem */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<div className="h-96 bg-gray-50 rounded-lg animate-pulse" />}>
              <TopProdutosFaturamento
                periodoAtivo={periodoAtivo}
                dataInicioPersonalizada={dataInicioPersonalizada}
                dataFimPersonalizada={dataFimPersonalizada}
                canalAtivo={canalAtivo}
                statusAtivo={statusAtivo}
                tipoAnuncioAtivo={tipoAnuncioAtivo}
                modalidadeEnvioAtiva={modalidadeEnvioAtiva}
                agrupamentoSKUAtivo={agrupamentoSKUAtivo}
                refreshKey={refreshKey}
                selectedAccount={selectedAccount}
              />
            </Suspense>
            <Suspense fallback={<div className="h-96 bg-gray-50 rounded-lg animate-pulse" />}>
              <TopProdutosMargem
                periodoAtivo={periodoAtivo}
                dataInicioPersonalizada={dataInicioPersonalizada}
                dataFimPersonalizada={dataFimPersonalizada}
                canalAtivo={canalAtivo}
                statusAtivo={statusAtivo}
                tipoAnuncioAtivo={tipoAnuncioAtivo}
                modalidadeEnvioAtiva={modalidadeEnvioAtiva}
                agrupamentoSKUAtivo={agrupamentoSKUAtivo}
                refreshKey={refreshKey}
                selectedAccount={selectedAccount}
              />
            </Suspense>
          </div>

          {/* GrÃ¡ficos Donut - Origem e ExposiÃ§Ã£o (apenas para Mercado Livre e Todos) */}
          {canalAtivo !== 'shopee' && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Suspense fallback={<div className="h-96 bg-gray-50 rounded-lg animate-pulse" />}>
                <FaturamentoPorOrigem
                  periodoAtivo={periodoAtivo}
                  dataInicioPersonalizada={dataInicioPersonalizada}
                  dataFimPersonalizada={dataFimPersonalizada}
                  canalAtivo={canalAtivo}
                  statusAtivo={statusAtivo}
                  tipoAnuncioAtivo={tipoAnuncioAtivo}
                  modalidadeEnvioAtiva={modalidadeEnvioAtiva}
                  agrupamentoSKUAtivo={agrupamentoSKUAtivo}
                  refreshKey={refreshKey}
                  selectedAccount={selectedAccount}
                />
              </Suspense>
              <Suspense fallback={<div className="h-96 bg-gray-50 rounded-lg animate-pulse" />}>
                <FaturamentoPorExposicao
                  periodoAtivo={periodoAtivo}
                  dataInicioPersonalizada={dataInicioPersonalizada}
                  dataFimPersonalizada={dataFimPersonalizada}
                  canalAtivo={canalAtivo}
                  statusAtivo={statusAtivo}
                  tipoAnuncioAtivo={tipoAnuncioAtivo}
                  modalidadeEnvioAtiva={modalidadeEnvioAtiva}
                  agrupamentoSKUAtivo={agrupamentoSKUAtivo}
                  refreshKey={refreshKey}
                  selectedAccount={selectedAccount}
                />
              </Suspense>
            </div>
          )}

          {/* GrÃ¡fico Donut - Tipo de AnÃºncio (apenas para Mercado Livre e Todos) */}
          {canalAtivo !== 'shopee' && (
            <div className="mt-6">
              <Suspense fallback={<div className="h-96 bg-gray-50 rounded-lg animate-pulse" />}>
                <FaturamentoPorTipoAnuncio
                  periodoAtivo={periodoAtivo}
                  dataInicioPersonalizada={dataInicioPersonalizada}
                  dataFimPersonalizada={dataFimPersonalizada}
                  canalAtivo={canalAtivo}
                  statusAtivo={statusAtivo}
                  tipoAnuncioAtivo={tipoAnuncioAtivo}
                  modalidadeEnvioAtiva={modalidadeEnvioAtiva}
                  agrupamentoSKUAtivo={agrupamentoSKUAtivo}
                  refreshKey={refreshKey}
                  selectedAccount={selectedAccount}
                />
              </Suspense>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}






