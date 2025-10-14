"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Sidebar from "./ui/Sidebar";
import Topbar from "./ui/Topbar";
import HeaderDRE, { MesKey } from "./ui/HeaderDRE";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Categoria = {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo?: string | null; // RECEITA | DESPESA
};

function buildLastMonths(count: number): Array<{ key: MesKey; label: string; ano: number; mes: number }> {
  const out: Array<{ key: MesKey; label: string; ano: number; mes: number }> = [];
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1..12
    const key: MesKey = `${y}-${String(m).padStart(2, "0")}`;
    const label = `${String(m).padStart(2, "0")}/${y}`;
    out.push({ key, label, ano: y, mes: m });
  }
  // Mostrar do mais recente para o mais antigo já está assim; para tabela, usaremos ordem crescente
  return out;
}

export default function DRE() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "1";
  });
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

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

  // Meses (padrão: últimos 64 meses, todos selecionados)
  const meses = useMemo(() => buildLastMonths(64), []);
  const [mesesSelecionados, setMesesSelecionados] = useState<Set<MesKey>>(
    () => new Set(meses.map((m) => m.key))
  );

  // Categorias de despesas
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<Set<string>>(new Set());

  // Tipo de visualização (caixa ou competência)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'caixa' | 'competencia'>('competencia');

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/financeiro/categorias", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const all = (data?.data || []) as Categoria[];
        const onlyDespesas = all.filter((c) => (c.tipo || "").toUpperCase() === "DESPESA");
        if (!aborted) {
          setCategorias(onlyDespesas);
          setCategoriasSelecionadas(new Set(onlyDespesas.map((c) => c.id)));
        }
      } catch {}
    })();
    return () => {
      aborted = true;
    };
  }, []);

  // DRE data loading
  const mesesAsc = useMemo(
    () => [...meses.filter((m) => mesesSelecionados.has(m.key))].sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)),
    [meses, mesesSelecionados]
  );

  type DREApi = {
    months: Array<{ key: string; label: string; ano: number; mes: number }>;
    categorias: Array<{ id: string; nome: string; descricao?: string | null }>;
    valoresPorCategoriaMes: Record<string, Record<string, number>>;
    receitasPorMes: Record<string, number>;
    despesasPorMes: Record<string, number>;
    cmvPorMes: Record<string, number>;
    totals: { receitas: number; despesas: number; cmv: number };
  };

  const [dreData, setDreData] = useState<DREApi | null>(null);
  const [loading, setLoading] = useState(false);

  // Horizontal navigation controls for months table
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const firstMonthThRef = useRef<HTMLTableCellElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const scrollByOneCol = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const colW = firstMonthThRef.current?.getBoundingClientRect()?.width || 120;
    const target = Math.max(0, Math.min(el.scrollLeft + dir * colW, el.scrollWidth - el.clientWidth));
    el.scrollTo({ left: target, behavior: "smooth" });
    // Fallback to update arrows in case scroll event coalesces
    requestAnimationFrame(() => updateArrows());
  };

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        const monthsParam = mesesAsc.map((m) => m.key).join(",");
        const catsParam = Array.from(categoriasSelecionadas).join(",");
        const qs = new URLSearchParams();
        if (monthsParam) qs.set("meses", monthsParam);
        if (catsParam) qs.set("categorias", catsParam);
        qs.set("tipo", tipoVisualizacao);
        const res = await fetch(`/api/financeiro/dre/series?${qs.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as DREApi;
        if (!aborted) setDreData(data);
      } catch (e) {
        if (!aborted) setDreData(null);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [mesesAsc.map((m) => m.key).join("|"), Array.from(categoriasSelecionadas).sort().join("|"), tipoVisualizacao]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => updateArrows();
    updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => updateArrows();
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll as any);
      window.removeEventListener("resize", onResize);
    };
  }, [dreData, mesesAsc.length]);

  const mdLeftVar = "md:left-[var(--sidebar-w,16rem)]";
  const mdMlVar = "md:ml-[var(--sidebar-w,16rem)]";

  const currency = (n?: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);

  const sumValues = (obj?: Record<string, number>) => Object.values(obj || {}).reduce((a, b) => a + b, 0);

  const totalReceitas = dreData?.totals?.receitas || 0;
  const totalCMV = dreData?.totals?.cmv || 0;
  const totalDespesas = dreData?.totals?.despesas || 0;
  const despesasOperacionais = Math.max(0, totalDespesas - totalCMV);
  const deducoes = 0; // Placeholder até termos classificação de deduções
  const receitaLiquida = Math.max(0, totalReceitas - deducoes);
  const resultadoBruto = Math.max(0, receitaLiquida - totalCMV);
  const ebitda = Math.max(0, resultadoBruto - despesasOperacionais);
  const resultadoLiquido = ebitda; // sem deprec/juros/IR
  const lucratividadePct = receitaLiquida > 0 ? (resultadoLiquido / receitaLiquida) : 0;

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
          <HeaderDRE
            meses={meses}
            mesesSelecionados={mesesSelecionados}
            onMesesSelecionadosChange={setMesesSelecionados}
            categorias={categorias}
            categoriasSelecionadas={categoriasSelecionadas}
            onCategoriasSelecionadasChange={setCategoriasSelecionadas}
            tipoVisualizacao={tipoVisualizacao}
            onTipoVisualizacaoChange={setTipoVisualizacao}
          />

          {/* Demonstrativo */}
          <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Demonstrativo</h3>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                tipoVisualizacao === 'caixa' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {tipoVisualizacao === 'caixa' ? (
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  ) : (
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  )}
                </svg>
                <span>{tipoVisualizacao === 'caixa' ? 'Caixa' : 'Competência'}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">(+) RECEITA OPERACIONAL BRUTA</span>
                <span className="font-medium text-gray-900">{currency(totalReceitas)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">(-) DEDUÇÕES DA RECEITA BRUTA</span>
                <span className="font-medium text-gray-900">{currency(deducoes)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-700">(=) RECEITA OPERACIONAL LÍQUIDA</span>
                <span className="font-semibold text-gray-900">{currency(receitaLiquida)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">(-) CUSTO (CMV / CPV / CSP)</span>
                <span className="font-medium text-gray-900">{currency(totalCMV)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-700">(=) RESULTADO OPERACIONAL BRUTO</span>
                <span className="font-semibold text-gray-900">{currency(resultadoBruto)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">(-) DESPESAS OPERACIONAIS</span>
                <span className="font-medium text-gray-900">{currency(despesasOperacionais)}</span>
              </div>
            </div>
          </div>

          {/* Categorias listadas por meses */}
          <div className="mt-6 bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-700">Categorias por Mês</h3>
                  <p className="text-xs text-gray-500">Todas as categorias (despesas) cruzadas com os meses selecionados</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollByOneCol(-1)}
                  disabled={!canScrollLeft}
                  className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition ${
                    canScrollLeft ? "bg-white text-gray-700 hover:bg-gray-50" : "bg-white/50 text-gray-400 cursor-not-allowed"
                  }`}
                  aria-label="Meses anteriores"
                  title="Meses anteriores"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollByOneCol(1)}
                  disabled={!canScrollRight}
                  className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition ${
                    canScrollRight ? "bg-white text-gray-700 hover:bg-gray-50" : "bg-white/50 text-gray-400 cursor-not-allowed"
                  }`}
                  aria-label="Próximos meses"
                  title="Próximos meses"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="overflow-x-auto table-scroll-hidden">
             
             <table className="min-w-full text-xs">
               <thead>
                 <tr>
                   <th className="sticky left-0 z-10 bg-[#F3F3F3] text-left text-gray-700 font-medium py-2 pr-4 whitespace-nowrap border-r border-gray-200">Categoria</th>
                  {mesesAsc.map((m, idx) => (
                    <th
                      key={m.key}
                      ref={idx === 0 ? firstMonthThRef : undefined}
                      className="text-right text-gray-700 font-medium py-2 px-2 whitespace-nowrap"
                    >
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!dreData || dreData.categorias.length === 0 ? (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={1 + mesesAsc.length}>Nenhuma categoria selecionada</td>
                  </tr>
                ) : (
                  dreData.categorias.map((c) => {
                    const row = dreData.valoresPorCategoriaMes[c.id] || {};
                    return (
                      <tr key={c.id} className="border-t border-gray-200">
                        <td className="sticky left-0 z-10 bg-[#F3F3F3] py-2 pr-4 text-gray-900 whitespace-nowrap border-r border-gray-200">{c.descricao || c.nome}</td>
                        {mesesAsc.map((m) => {
                          const v = row[m.key] || 0;
                          return (
                            <td key={m.key} className="py-2 px-2 text-right text-gray-600">{v > 0 ? currency(v) : "—"}</td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* KPIs finais */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">(=) EBITDA</div>
              <div className="text-lg font-semibold text-gray-900">{currency(ebitda)}</div>
            </div>
            <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">(=) RESULTADO LÍQUIDO DO EXERCÍCIO</div>
              <div className="text-lg font-semibold text-gray-900">{currency(resultadoLiquido)}</div>
            </div>
            <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">Margem de Contribuição</div>
              <div className="text-lg font-semibold text-gray-900">{currency(resultadoBruto)}</div>
            </div>
            <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">Lucratividade</div>
              <div className="text-lg font-semibold text-gray-900">{(lucratividadePct * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">Ponto de Equilíbrio (Período)</div>
              <div className="text-lg font-semibold text-gray-900">—</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
