"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import gsap from "gsap";
import Sidebar from "../views/ui/Sidebar";
import Topbar from "../views/ui/Topbar";
import HeaderFinanceiro from "../views/ui/HeaderFinanceiro";
import FinanceiroStats from "../views/ui/FinanceiroStats";
import FinanceiroCategoriasArea from "../views/ui/FinanceiroCategoriasArea";
import { FiltroPeriodo } from "../views/ui/FiltrosDashboard";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function DashboardFinanceiro() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "1";
  });
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Filtros
  const [mesesSelecionados, setMesesSelecionados] = useState<Set<string>>(() => {
    // Inicializar com último mês
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const key = `${ano}-${String(mes).padStart(2, "0")}`;
    return new Set([key]);
  });
  const [periodoAtivo, setPeriodoAtivo] = useState<FiltroPeriodo>("personalizado");
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<Date | null>(null);
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<Date | null>(null);
  const [portadorId, setPortadorId] = useState<string | null>(null);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasInitialSet = useRef(false);

  useIsoLayout(() => {
    if (hasInitialSet.current) return;
    const el = containerRef.current;
    if (!el) return;
    hasInitialSet.current = true;
    gsap.set(el, { css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W } });
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

  // Calcular datas baseado nos meses selecionados
  useEffect(() => {
    if (mesesSelecionados.size === 0) {
      setDataInicioPersonalizada(null);
      setDataFimPersonalizada(null);
      return;
    }

    const mesesOrdenados = Array.from(mesesSelecionados).sort();
    const primeiroMes = mesesOrdenados[0];
    const ultimoMes = mesesOrdenados[mesesOrdenados.length - 1];

    const [ano1, mes1] = primeiroMes.split('-').map(Number);
    const [ano2, mes2] = ultimoMes.split('-').map(Number);

    const dataInicio = new Date(ano1, mes1 - 1, 1);
    const dataFim = new Date(ano2, mes2, 0, 23, 59, 59, 999);

    setDataInicioPersonalizada(dataInicio);
    setDataFimPersonalizada(dataFim);
    setPeriodoAtivo("personalizado");
    setRefreshKey((v) => v + 1);
  }, [mesesSelecionados]);

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

      <div className={`fixed top-16 bottom-0 left-0 right-0 ${mdLeftVar} z-10 bg-[#F3F3F3]`}>
        <div className="h-full w-full rounded-tl-none md:rounded-tl-2xl border border-gray-200 bg-white" />
      </div>

      <main className={`relative z-20 pt-16 p-6 ${mdMlVar}`}>
        <section className="p-6">
          <HeaderFinanceiro
            mesesSelecionados={mesesSelecionados}
            onMesesChange={setMesesSelecionados}
            portadorId={portadorId}
            onPortadorChange={(id) => { setPortadorId(id); setRefreshKey((v) => v + 1); }}
            categoriasSelecionadas={categoriasSelecionadas}
            onCategoriasSelecionadasChange={(ids) => { setCategoriasSelecionadas(ids); setRefreshKey((v) => v + 1); }}
          />

          <FinanceiroStats
            periodoAtivo={periodoAtivo}
            dataInicioPersonalizada={dataInicioPersonalizada}
            dataFimPersonalizada={dataFimPersonalizada}
            portadorId={portadorId}
            categoriasSelecionadas={categoriasSelecionadas}
            refreshKey={refreshKey}
          />

          <div className="mt-8">
            <FinanceiroCategoriasArea
              periodoAtivo={periodoAtivo}
              dataInicioPersonalizada={dataInicioPersonalizada}
              dataFimPersonalizada={dataFimPersonalizada}
              portadorId={portadorId}
              categoriasSelecionadas={categoriasSelecionadas}
              refreshKey={refreshKey}
              tipo="despesas"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
