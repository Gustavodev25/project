"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import Sidebar from "./ui/Sidebar";
import Topbar from "./ui/Topbar";
import HeaderDRE from "./ui/HeaderDRE";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

const useIsoLayout =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Categoria = {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo?: string | null; // RECEITA | DESPESA
};

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

  // Filtro de meses (checkbox)
  const [mesesSelecionados, setMesesSelecionados] = useState<Set<string>>(
    () => {
      // Inicializar com os ├║ltimos 12 meses
      const hoje = new Date();
      const meses = new Set<string>();
      for (let i = 0; i < 12; i++) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = data.getFullYear();
        const mes = data.getMonth() + 1;
        const key = `${ano}-${String(mes).padStart(2, "0")}`;
        meses.add(key);
      }
      return meses;
    },
  );

  // Categorias de despesas
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    Set<string>
  >(new Set());

  // Tipo de visualiza├º├úo (caixa ou compet├¬ncia)
  const [tipoVisualizacao, setTipoVisualizacao] = useState<
    "caixa" | "competencia"
  >("competencia");

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/financeiro/categorias", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const all = (data?.data || []) as Categoria[];
        const onlyDespesas = all.filter(
          (c) => (c.tipo || "").toUpperCase() === "DESPESA",
        );
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
  type DREApi = {
    months: Array<{ key: string; label: string; ano: number; mes: number }>;
    categorias: Array<{ id: string; nome: string; descricao?: string | null }>;
    valoresPorCategoriaMes: Record<string, Record<string, number>>;
    receitaBrutaMeliPorMes: Record<string, number>;
    receitaBrutaShopeePorMes: Record<string, number>;
    deducoesMeliPorMes: Record<string, number>;
    deducoesShopeePorMes: Record<string, number>;
    taxasMeliPorMes: Record<string, number>;
    taxasShopeePorMes: Record<string, number>;
    freteMeliPorMes: Record<string, number>;
    freteShopeePorMes: Record<string, number>;
    despesasPorMes: Record<string, number>;
    cmvPorMes: Record<string, number>;
    totals: {
      receitaBrutaMeli: number;
      receitaBrutaShopee: number;
      receitaBrutaTotal: number;
      deducoesMeli: number;
      deducoesShopee: number;
      deducoesTotal: number;
      taxasMeli: number;
      taxasShopee: number;
      taxasTotal: number;
      freteMeli: number;
      freteShopee: number;
      freteTotal: number;
      cmv: number;
      despesas: number;
    };
  };

  const [dreData, setDreData] = useState<DREApi | null>(null);
  const [loading, setLoading] = useState(false);

  // Controle de visibilidade de categorias
  const [categoriasVisiveis, setCategoriasVisiveis] = useState<Set<string>>(
    new Set(),
  );

  // Converter meses selecionados em array ordenado
  const calcularMeses = useMemo(() => {
    return Array.from(mesesSelecionados).sort();
  }, [mesesSelecionados]);

  // Carregar dados do DRE
  useEffect(() => {
    let aborted = false;

    // Limpar dados antigos ao mudar filtros
    setDreData(null);

    if (calcularMeses.length === 0) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const mesesParam = calcularMeses.join(",");
        const catsParam = Array.from(categoriasSelecionadas).join(",");
        const qs = new URLSearchParams();
        qs.set("meses", mesesParam);
        if (catsParam) qs.set("categorias", catsParam);
        qs.set("tipo", tipoVisualizacao);

        const res = await fetch(`/api/financeiro/dre/series?${qs}`, {
          credentials: "include",
        });
        if (!res.ok) {
          if (!aborted) setDreData(null);
          return;
        }
        const data = await res.json();
        if (!aborted) setDreData(data);
      } catch {
        if (!aborted) setDreData(null);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [calcularMeses, categoriasSelecionadas, tipoVisualizacao]);

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
    const target = Math.max(
      0,
      Math.min(el.scrollLeft + dir * colW, el.scrollWidth - el.clientWidth),
    );
    el.scrollTo({ left: target, behavior: "smooth" });
    // Fallback to update arrows in case scroll event coalesces
    requestAnimationFrame(() => updateArrows());
  };

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
  }, [dreData]);

  const mdLeftVar = "md:left-[var(--sidebar-w,16rem)]";
  const mdMlVar = "md:ml-[var(--sidebar-w,16rem)]";

  const currency = (n?: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n ?? 0);

  const sumValues = (obj?: Record<string, number>) =>
    Object.values(obj || {}).reduce((a, b) => a + b, 0);

  // Inicializar categorias vis├¡veis quando dreData ├® carregado
  React.useEffect(() => {
    if (dreData?.categorias) {
      setCategoriasVisiveis(new Set(dreData.categorias.map((c) => c.id)));
    }
  }, [dreData?.categorias]);

  // Calcular despesas apenas das categorias vis├¡veis
  const despesasVisiveis = React.useMemo(() => {
    if (!dreData) return 0;
    let total = 0;
    for (const catId of categoriasVisiveis) {
      total += sumValues(dreData.valoresPorCategoriaMes[catId]);
    }
    return total;
  }, [dreData, categoriasVisiveis]);

  // Total de despesas por mês considerando apenas categorias visíveis
  const despesasPorMesVisiveis: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {};
    if (!dreData) return map;
    for (const m of dreData.months || []) map[m.key] = 0;
    for (const catId of categoriasVisiveis) {
      const row = dreData.valoresPorCategoriaMes[catId] || {};
      for (const m of dreData.months || []) {
        const v = Number(row[m.key] || 0);
        map[m.key] = (map[m.key] || 0) + v;
      }
    }
    return map;
  }, [dreData, categoriasVisiveis]);

  // C├ílculos do DRE
  const receitaBrutaMeli = dreData?.totals?.receitaBrutaMeli || 0;
  const receitaBrutaShopee = dreData?.totals?.receitaBrutaShopee || 0;
  const receitaBrutaTotal = dreData?.totals?.receitaBrutaTotal || 0;
  const deducoesMeli = dreData?.totals?.deducoesMeli || 0;
  const deducoesShopee = dreData?.totals?.deducoesShopee || 0;
  const deducoesTotal = dreData?.totals?.deducoesTotal || 0;
  const receitaLiquidaTotal = receitaBrutaTotal - deducoesTotal;
  const taxasMeli = dreData?.totals?.taxasMeli || 0;
  const taxasShopee = dreData?.totals?.taxasShopee || 0;
  const taxasTotal = dreData?.totals?.taxasTotal || 0;
  const freteMeli = dreData?.totals?.freteMeli || 0;
  const freteShopee = dreData?.totals?.freteShopee || 0;
  const freteTotal = dreData?.totals?.freteTotal || 0;
  const receitaOperacionalLiquida =
    receitaLiquidaTotal - taxasTotal - freteTotal;
  const cmvTotal = dreData?.totals?.cmv || 0;
  const lucroBruto = receitaOperacionalLiquida - cmvTotal;
  const margemContribuicao = lucroBruto;
  const despesasOperacionais = despesasVisiveis;
  const ebitda = lucroBruto - despesasOperacionais;
  const resultadoLiquido = ebitda; // sem deprec/juros/IR
  const lucratividadePct =
    receitaOperacionalLiquida > 0
      ? resultadoLiquido / receitaOperacionalLiquida
      : 0;

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
          <HeaderDRE
            mesesSelecionados={mesesSelecionados}
            onMesesChange={setMesesSelecionados}
            categorias={categorias}
            categoriasSelecionadas={categoriasSelecionadas}
            onCategoriasSelecionadasChange={setCategoriasSelecionadas}
            tipoVisualizacao={tipoVisualizacao}
            onTipoVisualizacaoChange={setTipoVisualizacao}
          />

          {/* Demonstrativo */}
          <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Demonstrativo de Resultado do Exerc├¡cio
              </h3>
              {loading && (
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
                  <span>Atualizando...</span>
                </div>
              )}
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  tipoVisualizacao === "caixa"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {tipoVisualizacao === "caixa" ? (
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  ) : (
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  )}
                </svg>
                <span>
                  {tipoVisualizacao === "caixa" ? "Caixa" : "Compet├¬ncia"}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {/* RECEITA BRUTA TOTAL */}
              <div className="flex items-center justify-between font-semibold text-gray-900">
                <span>(+) RECEITA BRUTA TOTAL</span>
                <span>{currency(receitaBrutaTotal)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-xs">
                <span className="text-gray-600">
                  ÔåÆ Receita Bruta Mercado Livre
                </span>
                <span className="text-gray-700">
                  {currency(receitaBrutaMeli)}
                </span>
              </div>
              <div className="flex items-center justify-between pl-4 text-xs mb-2">
                <span className="text-gray-600">ÔåÆ Receita Bruta Shopee</span>
                <span className="text-gray-700">
                  {currency(receitaBrutaShopee)}
                </span>
              </div>

              {/* DEDU├ç├òES */}
              <div className="flex items-center justify-between font-semibold text-gray-900">
                <span>(-) DEDU├ç├òES DA RECEITA BRUTA</span>
                <span>{currency(deducoesTotal)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-xs">
                <span className="text-gray-600">
                  VENDAS CANCELADAS MERCADO LIVRE
                </span>
                <span className="text-gray-700">{currency(deducoesMeli)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-xs mb-2">
                <span className="text-gray-600">VENDAS CANCELADAS SHOPEE</span>
                <span className="text-gray-700">
                  {currency(deducoesShopee)}
                </span>
              </div>

              {/* RECEITA L├ìQUIDA TOTAL */}
              <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-bold text-gray-900">
                <span>(=) RECEITA L├ìQUIDA</span>
                <span>{currency(receitaLiquidaTotal)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-xs">
                <span className="text-gray-600">
                  RECEITA BRUTA TOTAL + (-) DEDU├ç├òES DA RECEITA BRUTA
                </span>
              </div>

              {/* TAXAS E COMISS├òES */}
              <div className="flex items-center justify-between font-semibold text-gray-900 mt-3">
                <span>(-) TAXA E COMISS├òES DE MARKETPLACES</span>
                <span>{currency(taxasTotal)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-xs">
                <span className="text-gray-600">ÔåÆ Taxas Mercado Livre</span>
                <span className="text-gray-700">{currency(taxasMeli)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-xs mb-2">
                <span className="text-gray-600">ÔåÆ Taxas Shopee</span>
                <span className="text-gray-700">{currency(taxasShopee)}</span>
              </div>

              {/* CUSTO DE FRETE */}
              <div className="flex items-center justify-between font-semibold text-gray-900">
                <span>(-) CUSTO DE FRETE MARKETPLACE</span>
                <span>{currency(freteTotal)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-xs">
                <span className="text-gray-600">ÔåÆ Frete Mercado Livre</span>
                <span className="text-gray-700">{currency(freteMeli)}</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-xs mb-2">
                <span className="text-gray-600">ÔåÆ Frete Shopee</span>
                <span className="text-gray-700">{currency(freteShopee)}</span>
              </div>

              {/* RECEITA OPERACIONAL L├ìQUIDA */}
              <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-bold text-gray-900">
                <span>(=) RECEITA OPERACIONAL L├ìQUIDA</span>
                <span>{currency(receitaOperacionalLiquida)}</span>
              </div>

              {/* CMV */}
              <div className="flex items-center justify-between font-semibold text-gray-900 mt-3">
                <span>(-) CUSTO (CMV / CPV / CSP)</span>
                <span>{currency(cmvTotal)}</span>
              </div>

              {/* LUCRO BRUTO */}
              <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-bold text-gray-900">
                <span>(=) LUCRO BRUTO / MARGEM DE CONTRIBUI├ç├âO</span>
                <span>{currency(lucroBruto)}</span>
              </div>

              {/* DESPESAS OPERACIONAIS */}
              <div className="flex items-center justify-between font-semibold text-gray-900 mt-3">
                <span>(-) DESPESAS OPERACIONAIS</span>
                <span>{currency(despesasOperacionais)}</span>
              </div>

              {/* M├¬s a m├¬s: Receitas e dedu├º├Áes */}
              {dreData && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
                        <svg
                          className="w-3 h-3 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                          />
                        </svg>
                      </div>
                      <h4 className="text-xs font-medium text-gray-700">Receitas e Deducoes por Mes</h4>
                    </div>
                  </div>
                  <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="sticky left-0 z-10 bg-gray-50 py-2 px-3 text-left text-xs font-medium text-gray-700 border-r border-gray-200">
                            Indicador
                          </th>
                          {(dreData.months || []).map((m) => (
                            <th key={m.key} className="py-2 px-2 text-right text-xs font-medium text-gray-700">
                              {m.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* (+) RECEITA BRUTA */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (+) Receita Bruta
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {v !== 0 ? currency(v) : "ÔÇö"}
                              </td>
                            );
                          })}
                        </tr>
                        {/* (-) DEDU├ç├òES */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (-) Deducoes da Receita Bruta
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {v !== 0 ? currency(v) : "ÔÇö"}
                              </td>
                            );
                          })}
                        </tr>
                        {/* (=) RECEITA L├ìQUIDA */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                            (=) Receita Liquida
                          </td>
                          {dreData.months.map((m) => {
                            const receitaBruta = (dreData.receitaBrutaMeliPorMes[m.key] || 0) + (dreData.receitaBrutaShopeePorMes[m.key] || 0);
                            const deducoes = (dreData.deducoesMeliPorMes[m.key] || 0) + (dreData.deducoesShopeePorMes[m.key] || 0);
                            const v = receitaBruta - deducoes;
                            return (
                              <td key={m.key} className="py-2 px-2 text-right font-semibold text-gray-900">
                                {v !== 0 ? currency(v) : "ÔÇö"}
                              </td>
                            );
                          })}
                        </tr>
                        {/* (-) TAXAS/COMISS├òES */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (-) Taxas e Comissoes de Marketplaces
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.taxasMeliPorMes[m.key] || 0) + (dreData.taxasShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {v !== 0 ? currency(v) : "ÔÇö"}
                              </td>
                            );
                          })}
                        </tr>
                        {/* (-) FRETES */}
                        <tr className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-white py-2 px-3 font-medium text-gray-900 border-r border-gray-200">
                            (-) Custo de Frete Marketplace
                          </td>
                          {dreData.months.map((m) => {
                            const v = (dreData.freteMeliPorMes[m.key] || 0) + (dreData.freteShopeePorMes[m.key] || 0);
                            return (
                              <td key={m.key} className="py-2 px-2 text-right text-gray-700">
                                {v !== 0 ? currency(v) : "ÔÇö"}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Categorias listadas por meses */}
          <div className="mt-6 bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
                  <svg
                    className="w-3 h-3 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-700">
                    Categorias por M├¬s
                  </h3>
                  <p className="text-xs text-gray-500">
                    Todas as categorias (despesas) cruzadas com os meses
                    selecionados
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollByOneCol(-1)}
                  disabled={!canScrollLeft}
                  className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition ${
                    canScrollLeft
                      ? "bg-white text-gray-700 hover:bg-gray-50"
                      : "bg-white/50 text-gray-400 cursor-not-allowed"
                  }`}
                  aria-label="Meses anteriores"
                  title="Meses anteriores"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollByOneCol(1)}
                  disabled={!canScrollRight}
                  className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition ${
                    canScrollRight
                      ? "bg-white text-gray-700 hover:bg-gray-50"
                      : "bg-white/50 text-gray-400 cursor-not-allowed"
                  }`}
                  aria-label="Pr├│ximos meses"
                  title="Pr├│ximos meses"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="overflow-x-auto table-scroll-hidden"
            >
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-[#F3F3F3] text-left text-gray-700 font-medium py-2 pr-4 whitespace-nowrap border-r border-gray-200">
                      Categoria
                    </th>
                    {(dreData?.months || []).map((m, idx) => (
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
                  {/* Total de Despesas (todas as categorias do m├¬s) */}
                  {dreData && (
                    <tr className="border-t border-gray-300 bg-white/70">
                      <td className="sticky left-0 z-10 bg-white/70 py-2 pr-4 text-gray-900 whitespace-nowrap border-r border-gray-200 font-semibold">
                        Total de Despesas
                      </td>
                      {dreData.months.map((m) => {
                        const v = despesasPorMesVisiveis[m.key] || 0;
                        return (
                          <td key={m.key} className="py-2 px-2 text-right text-gray-800 font-medium">
                            {v !== 0 ? currency(v) : "ÔÇö"}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {!dreData || dreData.categorias.length === 0 ? (
                    <tr>
                      <td
                        className="py-3 text-gray-500"
                        colSpan={1 + (dreData?.months?.length || 0)}
                      >
                        Nenhuma categoria selecionada
                      </td>
                    </tr>
                  ) : (
                    dreData.categorias.map((c) => {
                      const row = dreData.valoresPorCategoriaMes[c.id] || {};
                      const isVisible = categoriasVisiveis.has(c.id);
                      return (
                        <tr key={c.id} className="border-t border-gray-200">
                          <td className="sticky left-0 z-10 bg-[#F3F3F3] py-2 pr-4 text-gray-900 whitespace-nowrap border-r border-gray-200">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={(e) => {
                                  const newSet = new Set(categoriasVisiveis);
                                  if (e.target.checked) {
                                    newSet.add(c.id);
                                  } else {
                                    newSet.delete(c.id);
                                  }
                                  setCategoriasVisiveis(newSet);
                                }}
                                className="w-3 h-3 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className={!isVisible ? "opacity-50" : ""}>
                                {c.descricao || c.nome}
                              </span>
                            </div>
                          </td>
                          {(dreData.months || []).map((m) => {
                            const v = row[m.key] || 0;
                            return (
                              <td
                                key={m.key}
                                className={`py-2 px-2 text-right ${!isVisible ? "opacity-50 line-through" : "text-gray-600"}`}
                              >
                                {v > 0 ? currency(v) : "ÔÇö"}
                              </td>
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
              <div
                className={`text-lg font-semibold ${ebitda >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {currency(ebitda)}
              </div>
            </div>
            <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">
                (=) RESULTADO L├ìQUIDO DO EXERC├ìCIO
              </div>
              <div
                className={`text-lg font-semibold ${resultadoLiquido >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {currency(resultadoLiquido)}
              </div>
            </div>
            <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">
                Margem de Contribui├º├úo
              </div>
              <div
                className={`text-lg font-semibold ${margemContribuicao >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {currency(margemContribuicao)}
              </div>
            </div>
            <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">
                Lucratividade (%)
              </div>
              <div
                className={`text-lg font-semibold ${lucratividadePct >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {(lucratividadePct * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">
                Ponto de Equil├¡brio (Per├¡odo)
              </div>
              <div className="text-lg font-semibold text-gray-900">ÔÇö</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


