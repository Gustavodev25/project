"use client";

import { useEffect, useRef, useState } from "react";
import NumberLoader from "../../../../components/NumberLoader";
import { FiltroPeriodo } from "./FiltrosDashboard";

interface FinanceiroCategoriasAreaProps {
  periodoAtivo?: FiltroPeriodo;
  dataInicioPersonalizada?: Date | null;
  dataFimPersonalizada?: Date | null;
  portadorId?: string | null;
  categoriasSelecionadas?: Set<string>; // Se filtrar categorias específicas, mostra apenas elas
  tipoVisualizacao?: 'caixa' | 'competencia';
  
  // Filtros separados de pagamento e competência
  filtroPeriodoPagamento?: FiltroPeriodo;
  filtroDataPagInicio?: Date | null;
  filtroDataPagFim?: Date | null;
  filtroPeriodoCompetencia?: FiltroPeriodo;
  filtroDataCompInicio?: Date | null;
  filtroDataCompFim?: Date | null;
  
  refreshKey?: number;
  tipo?: "despesas" | "receitas";
}

type ApiResp = {
  categories: string[];
  data: Array<{ date: string; [key: string]: number | string }>;
};

const COLORS = [
  "#f97316", // orange-500
  "#10b981", // emerald-500
  "#6366f1", // indigo-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#6b7280", // gray-500 (Outras)
];

export default function FinanceiroCategoriasArea({
  periodoAtivo = "todos",
  dataInicioPersonalizada = null,
  dataFimPersonalizada = null,
  portadorId = null,
  categoriasSelecionadas = new Set(),
  tipoVisualizacao = 'caixa',
  
  filtroPeriodoPagamento = "todos",
  filtroDataPagInicio = null,
  filtroDataPagFim = null,
  filtroPeriodoCompetencia = "todos",
  filtroDataCompInicio = null,
  filtroDataCompFim = null,
  
  refreshKey = 0,
  tipo = "despesas",
}: FinanceiroCategoriasAreaProps) {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<ApiResp>({ categories: [], data: [] });
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let aborted = false;
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        // Filtros separados de pagamento e competência
        if (filtroPeriodoPagamento && filtroPeriodoPagamento !== 'todos') {
          params.append('filtroPeriodoPagamento', filtroPeriodoPagamento);
        }
        if (filtroDataPagInicio && filtroDataPagFim) {
          params.append('filtroDataPagInicio', filtroDataPagInicio.toISOString());
          params.append('filtroDataPagFim', filtroDataPagFim.toISOString());
        }
        if (filtroPeriodoCompetencia && filtroPeriodoCompetencia !== 'todos') {
          params.append('filtroPeriodoCompetencia', filtroPeriodoCompetencia);
        }
        if (filtroDataCompInicio && filtroDataCompFim) {
          params.append('filtroDataCompInicio', filtroDataCompInicio.toISOString());
          params.append('filtroDataCompFim', filtroDataCompFim.toISOString());
        }
        
        // Backward compatibility (período geral)
        if (periodoAtivo && periodoAtivo !== 'todos') params.append('periodo', periodoAtivo);
        if (dataInicioPersonalizada && dataFimPersonalizada) {
          params.append('dataInicio', dataInicioPersonalizada.toISOString());
          params.append('dataFim', dataFimPersonalizada.toISOString());
        }
        if (portadorId) params.append('portadorId', portadorId);
        if (categoriasSelecionadas.size > 0) {
          params.append('categoriaIds', Array.from(categoriasSelecionadas).join(','));
        }
        params.append('tipo', tipo);
        params.append('tipoData', tipoVisualizacao);
        if (refreshKey) params.append('refresh', String(refreshKey));

        const url = `/api/financeiro/dashboard/series-categorias?${params.toString()}`;
        const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ApiResp;
        if (!aborted) setSeries(data);
      } catch (e) {
        if (!aborted) setSeries({ categories: [], data: [] });
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    load();
    return () => { aborted = true; };
  }, [
    periodoAtivo, dataInicioPersonalizada, dataFimPersonalizada, 
    portadorId, categoriasSelecionadas, tipoVisualizacao,
    filtroPeriodoPagamento, filtroDataPagInicio, filtroDataPagFim,
    filtroPeriodoCompetencia, filtroDataCompInicio, filtroDataCompFim,
    refreshKey, tipo
  ]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // Monta dados para treemap (total por categoria no período)
  const treemapData = (() => {
    const totals: Record<string, number> = {};
    for (const c of series.categories) totals[c] = 0;
    for (const row of series.data) {
      for (const c of series.categories) {
        const v = Number((row as any)[c] || 0);
        if (!Number.isFinite(v)) continue;
        totals[c] += v;
      }
    }
    // Converte em array
    const arr = Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .filter((it) => (it.value || 0) > 0)
      .sort((a, b) => b.value - a.value);
    return arr;
  })();

  const treemapKey = treemapData.map((d) => `${d.name}:${d.value}`).join("|");

  const effectSignature = `${loading ? "loading" : "ready"}|${tipo}|${treemapKey}`;

  // Instancia/atualiza ECharts (Treemap)
  useEffect(() => {
    if (loading) return;
    if (!chartRef.current) return;
    if (treemapData.length === 0) return;

    let chart: any = null;
    let resizeHandler: (() => void) | null = null;
    let cancelled = false;

    const ensureLayout = async (el: HTMLDivElement) => {
      if (el.clientWidth > 0 && el.clientHeight > 0) return;
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    };

    const setup = async () => {
      const el = chartRef.current;
      if (!el || !el.isConnected) return;
      await ensureLayout(el);
      if (!el.isConnected || el.clientWidth === 0 || el.clientHeight === 0) return;

      const echarts = await import("echarts");
      if (cancelled) return;

      chart = echarts.getInstanceByDom(el) || echarts.init(el);
      resizeHandler = () => {
        if (chart && !chart.isDisposed()) chart.resize();
      };
      window.addEventListener("resize", resizeHandler);

      const option: any = {
        tooltip: {
          formatter: (info: any) => {
            const v = info?.value ?? 0;
            const n = info?.name ?? "";
            return `${n}<br/>${formatCurrency(v as number)}`;
          },
        },
        series: [
          {
            type: "treemap",
            roam: false,
            data: treemapData,
            breadcrumb: { show: false },
            label: {
              show: true,
              formatter: (params: any) => {
                const name = params?.name ?? "";
                const v = params?.value ?? 0;
                return `${name}\n${formatCurrency(v)}`;
              },
              fontSize: 11,
            },
            upperLabel: { show: false },
            itemStyle: {
              borderColor: "#fff",
              borderWidth: 2,
              gapWidth: 2,
            },
            levels: [
              {
                color: [
                  "#f97316",
                  "#10b981",
                  "#6366f1",
                  "#f59e0b",
                  "#ef4444",
                  "#06b6d4",
                  "#84cc16",
                  "#8b5cf6",
                  "#fb7185",
                  "#64748b",
                ],
                colorMappingBy: "index",
              },
            ],
          },
        ],
      };

      chart.setOption(option, true);
    };

    setup();

    return () => {
      cancelled = true;
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (chart && !chart.isDisposed()) chart.dispose();
    };
  }, [effectSignature]);

  if (loading) {
    return (
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-600">Categorias por Dia ({tipo === 'despesas' ? 'Despesas' : 'Receitas'})</h3>
            <p className="text-xs text-gray-500">Carregando dados do gráfico...</p>
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <NumberLoader width="w-32" height="h-8" variant="currency" />
        </div>
      </div>
    );
  }

  if (treemapData.length === 0) {
    return (
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-600">Categorias por Dia ({tipo === 'despesas' ? 'Despesas' : 'Receitas'})</h3>
            <p className="text-xs text-gray-500">Nenhum dado encontrado</p>
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-xs text-gray-500">Não há dados para o período selecionado</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex items-center mb-4">
        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xs font-medium text-gray-600">Categorias por Dia ({tipo === 'despesas' ? 'Despesas' : 'Receitas'})</h3>
          <p className="text-xs text-gray-500">Visualize a distribuição das categorias ao longo do tempo</p>
        </div>
      </div>

      <div className="h-96">
        <div ref={chartRef} className="h-full w-full" />
      </div>

      {/* Legenda embaixo do gráfico */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          {series.categories.slice(0, 6).map((category, index) => (
            <div key={category} className="flex items-center space-x-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></div>
              <span className="text-gray-600 font-medium">{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
