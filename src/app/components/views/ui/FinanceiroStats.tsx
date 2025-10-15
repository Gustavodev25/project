"use client";

import { useEffect, useState } from "react";
import NumberLoader from "../../../../components/NumberLoader";
import { FiltroPeriodo } from "./FiltrosDashboard";

interface FinanceiroStatsProps {
  periodoAtivo?: FiltroPeriodo;
  dataInicioPersonalizada?: Date | null;
  dataFimPersonalizada?: Date | null;
  portadorId?: string | null;
  categoriaId?: string | null;
  refreshKey?: number;
}

type Stats = {
  // Apenas os KPIs específicos do financeiro
  faturamentoBruto: number;
  taxasPlataformas: { total: number; mercadoLivre: number; shopee: number };
  custoFrete: { total: number; mercadoLivre: number; shopee: number };
  receitaLiquida: number;
  cmv: number;
  lucroBruto: number;
  despesasOperacionais: number;
  lucroLiquido: number;
};

const DEFAULT_STATS: Stats = {
  // Apenas os KPIs específicos do financeiro
  faturamentoBruto: 0,
  taxasPlataformas: { total: 0, mercadoLivre: 0, shopee: 0 },
  custoFrete: { total: 0, mercadoLivre: 0, shopee: 0 },
  receitaLiquida: 0,
  cmv: 0,
  lucroBruto: 0,
  despesasOperacionais: 0,
  lucroLiquido: 0,
};

export default function FinanceiroStats({
  periodoAtivo = "todos",
  dataInicioPersonalizada = null,
  dataFimPersonalizada = null,
  portadorId = null,
  categoriaId = null,
  refreshKey = 0,
}: FinanceiroStatsProps) {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (periodoAtivo && periodoAtivo !== 'todos') params.append('periodo', periodoAtivo);
        if (dataInicioPersonalizada && dataFimPersonalizada) {
          params.append('dataInicio', dataInicioPersonalizada.toISOString());
          params.append('dataFim', dataFimPersonalizada.toISOString());
        }
        if (portadorId) params.append('portadorId', portadorId);
        if (categoriaId) params.append('categoriaId', categoriaId);
        if (refreshKey) params.append('refresh', String(refreshKey));

        const url = `/api/financeiro/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Stats;
        if (isMounted) setStats({ ...DEFAULT_STATS, ...data });
      } catch (err) {
        console.error("Falha ao carregar estatísticas financeiras:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [periodoAtivo, dataInicioPersonalizada, dataFimPersonalizada, portadorId, categoriaId, refreshKey]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const formatPercentage = (value: number) => `${value > 0 ? "+" : ""}${(value || 0).toFixed(1)}%`;
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value || 0);

  const renderValue = (
    value: number,
    formatter: (val: number) => string,
    width = 'w-24',
    variant: 'currency' | 'number' | 'percentage' = 'currency',
  ) => {
    if (loading) return <NumberLoader width={width} height="h-6" className="mt-1" variant={variant} />;
    return formatter(value);
  };

  const pct = (num: number, den: number) => (den ? (num / den) * 100 : 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {/* Faturamento Bruto */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Valor total das vendas">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Faturamento Bruto</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(stats.faturamentoBruto, formatCurrency, "w-28", "currency")}</div>
        </div>
      </div>

      {/* Taxas de Marketplaces */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Total de taxas pagas às plataformas">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Taxas de Marketplaces</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(-Math.abs(stats.taxasPlataformas.total), formatCurrency, "w-24", "currency")}</div>
          <div className="text-xs text-gray-600">
            {loading ? (
              <NumberLoader width="w-12" height="h-3" variant="percentage" />
            ) : (
              `${pct(stats.taxasPlataformas.total, stats.faturamentoBruto).toFixed(1)}% do faturamento`
            )}
          </div>
        </div>
      </div>

      {/* Custo com Frete */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Total gasto com frete">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Custo com Frete</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(-Math.abs(stats.custoFrete.total), formatCurrency, "w-24", "currency")}</div>
          <div className="text-xs text-gray-600">
            {loading ? (
              <NumberLoader width="w-12" height="h-3" variant="percentage" />
            ) : (
              `${pct(stats.custoFrete.total, stats.faturamentoBruto).toFixed(1)}% do faturamento`
            )}
          </div>
        </div>
      </div>

      {/* Receita Líquida */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Após taxas e frete">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Receita Líquida</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(stats.receitaLiquida, formatCurrency, "w-24", "currency")}</div>
          <div className="text-xs text-gray-600">
            {loading ? (
              <NumberLoader width="w-12" height="h-3" variant="percentage" />
            ) : (
              `${pct(stats.receitaLiquida, stats.faturamentoBruto).toFixed(1)}% do faturamento`
            )}
          </div>
        </div>
      </div>

      {/* CMV */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Custo das mercadorias vendidas">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">CMV</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(-Math.abs(stats.cmv), formatCurrency, "w-24", "currency")}</div>
          <div className="text-xs text-gray-600">
            {loading ? (
              <NumberLoader width="w-12" height="h-3" variant="percentage" />
            ) : (
              `${pct(stats.cmv, stats.faturamentoBruto).toFixed(1)}% do faturamento`
            )}
          </div>
        </div>
      </div>

      {/* Lucro Bruto */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Receita líquida - CMV">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Lucro Bruto</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(stats.lucroBruto, formatCurrency, "w-24", "currency")}</div>
          <div className="text-xs text-gray-600">
            {loading ? (
              <NumberLoader width="w-12" height="h-3" variant="percentage" />
            ) : (
              `${pct(stats.lucroBruto, stats.faturamentoBruto).toFixed(1)}% do faturamento`
            )}
          </div>
        </div>
      </div>

      {/* Despesas Operacionais */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Soma das despesas operacionais">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l-4 4m0 0l-4-4m4 4V3" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Despesas Operacionais</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(-Math.abs(stats.despesasOperacionais), formatCurrency, "w-24", "currency")}</div>
          <p className="text-xs text-gray-600">soma das despesas</p>
        </div>
      </div>

      {/* Lucro Líquido */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Lucro após todas as despesas">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5v14" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Lucro Líquido</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(stats.lucroLiquido, formatCurrency, "w-24", "currency")}</div>
          <p className="text-xs text-gray-600">após todas as despesas</p>
        </div>
      </div>
    </div>
  );
}

