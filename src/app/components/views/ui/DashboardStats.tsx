"use client";

import { useEffect, useState, memo } from "react";
import NumberLoader from "../../../../components/NumberLoader";
import { FiltroPeriodo } from "./FiltrosDashboard";
import type { FiltroCanal, FiltroStatus, FiltroTipoAnuncio, FiltroModalidadeEnvio } from "./FiltrosDashboardExtra";
import type { FiltroAgrupamentoSKU } from "./FiltroSKU";

interface DashboardStatsProps {
  periodoAtivo?: FiltroPeriodo;
  dataInicioPersonalizada?: Date | null;
  dataFimPersonalizada?: Date | null;
  canalAtivo?: FiltroCanal;
  statusAtivo?: FiltroStatus;
  tipoAnuncioAtivo?: FiltroTipoAnuncio;
  modalidadeEnvioAtiva?: FiltroModalidadeEnvio;
  agrupamentoSKUAtivo?: FiltroAgrupamentoSKU;
  refreshKey?: number;
  selectedAccount?: { platform: 'meli' | 'shopee' | 'todos'; id?: string };
}

type Stats = {
  faturamentoTotal: number;
  faturamentoTendencia: number;
  impostos: number;
  taxasPlataformas: { total: number; mercadoLivre: number; shopee: number };
  custoFrete: { total: number; mercadoLivre: number; shopee: number };
  margemContribuicao: number; // Receita líquida após taxas e frete
  cmv: number;
  lucroBruto: number;
  vendasRealizadas: number;
  unidadesVendidas: number;
};

const DEFAULT_STATS: Stats = {
  faturamentoTotal: 0,
  faturamentoTendencia: 0,
  impostos: 0,
  taxasPlataformas: { total: 0, mercadoLivre: 0, shopee: 0 },
  custoFrete: { total: 0, mercadoLivre: 0, shopee: 0 },
  margemContribuicao: 0,
  cmv: 0,
  lucroBruto: 0,
  vendasRealizadas: 0,
  unidadesVendidas: 0,
};

const DashboardStats = memo(function DashboardStats({
  periodoAtivo = "todos",
  dataInicioPersonalizada = null,
  dataFimPersonalizada = null,
  canalAtivo = "todos",
  statusAtivo = "pagos",
  tipoAnuncioAtivo = "todos",
  modalidadeEnvioAtiva = "todos",
  agrupamentoSKUAtivo = "mlb",
  refreshKey = 0,
  selectedAccount,
}: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        
        // Construir parâmetros da URL
        const params = new URLSearchParams();
        if (periodoAtivo !== "todos") {
          params.append("periodo", periodoAtivo);
        }
        if (dataInicioPersonalizada && dataFimPersonalizada) {
          params.append("dataInicio", dataInicioPersonalizada.toISOString());
          params.append("dataFim", dataFimPersonalizada.toISOString());
        }
        if (canalAtivo && canalAtivo !== 'todos') params.append('canal', canalAtivo);
        if (statusAtivo && statusAtivo !== 'todos') params.append('status', statusAtivo);
        if (tipoAnuncioAtivo && tipoAnuncioAtivo !== 'todos') params.append('tipoAnuncio', tipoAnuncioAtivo);
        if (modalidadeEnvioAtiva && modalidadeEnvioAtiva !== 'todos') params.append('modalidade', modalidadeEnvioAtiva);
        if (agrupamentoSKUAtivo && agrupamentoSKUAtivo !== 'mlb') params.append('agrupamentoSKU', agrupamentoSKUAtivo);
        if (refreshKey) params.append('refresh', String(refreshKey));
        if (selectedAccount && selectedAccount.platform !== 'todos' && selectedAccount.id) {
          params.append('accountPlatform', selectedAccount.platform);
          params.append('accountId', selectedAccount.id);
        }
        
        const url = `/api/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url, { credentials: "include" });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Stats;
        if (isMounted) setStats({ ...DEFAULT_STATS, ...data });
      } catch (err) {
        console.error("Falha ao carregar estatísticas do dashboard:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [periodoAtivo, dataInicioPersonalizada, dataFimPersonalizada, canalAtivo, statusAtivo, tipoAnuncioAtivo, modalidadeEnvioAtiva, agrupamentoSKUAtivo, refreshKey, selectedAccount]);

  const safeDiv = (num: number, den: number) => (den ? num / den : 0);

  const ticketMedioVenda = safeDiv(stats.faturamentoTotal, stats.vendasRealizadas);
  const ticketMedioUnidade = safeDiv(stats.faturamentoTotal, stats.unidadesVendidas);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      value || 0,
    );

  const formatPercentage = (value: number) => `${value > 0 ? "+" : ""}${(value || 0).toFixed(1)}%`;
  const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value || 0);

  // Função para renderizar valores com loader
  const renderValue = (
    value: number,
    formatter: (val: number) => string,
    width = "w-24",
    variant: "currency" | "number" | "percentage" = "currency"
  ) => {
    if (loading) {
      if (variant === "percentage") {
        return (
          <span
            className={`inline-block ${width} h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded animate-pulse mt-1`}
            aria-hidden
          />
        );
      }
      return <NumberLoader width={width} height="h-6" className="mt-1" variant={variant} />;
    }
    return formatter(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {/* Faturamento Total */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Valor total das vendas">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Faturamento Total</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(stats.faturamentoTotal, formatCurrency, "w-28", "currency")}</div>
          <div className="flex items-center">
            <span className={`text-xs font-medium ${stats.faturamentoTendencia > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {renderValue(stats.faturamentoTendencia, formatPercentage, "w-16", "percentage")}
            </span>
            <span className="text-xs text-gray-500 ml-2">vs mês anterior</span>
          </div>
        </div>
      </div>

      {/* Impostos s/ Faturamento */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Valor de impostos sobre o faturamento baseado nas alíquotas cadastradas">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Impostos s/ Faturamento</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(-Math.abs(stats.impostos), formatCurrency, "w-24", "currency")}</div>
          <div className="text-xs text-gray-600">
            {loading ? (
              <NumberLoader width="w-12" height="h-3" variant="percentage" />
            ) : stats.impostos > 0 ? (
              `${(safeDiv(stats.impostos, stats.faturamentoTotal) * 100).toFixed(1)}% do faturamento`
            ) : (
              <span className="text-gray-500">Configure alíquotas</span>
            )}
          </div>
        </div>
      </div>

      {/* Taxas das Plataformas */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Total de taxas pagas às plataformas">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Taxas das Plataformas</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(-Math.abs(stats.taxasPlataformas.total), formatCurrency, "w-24", "currency")}</div>
          <div className="flex flex-col text-xs text-gray-600 gap-0.5">
            {loading ? (
              <NumberLoader width="w-12" height="h-3" variant="percentage" />
            ) : (
              <>
                <span>{`${(safeDiv(stats.taxasPlataformas.total, stats.faturamentoTotal) * 100).toFixed(1)}% do faturamento`}</span>
                {(stats.taxasPlataformas.mercadoLivre > 0 || stats.taxasPlataformas.shopee > 0) && (
                  <div className="flex gap-2 mt-1">
                    {stats.taxasPlataformas.mercadoLivre > 0 && (
                      <span className="text-[10px]">ML: {formatCurrency(stats.taxasPlataformas.mercadoLivre)}</span>
                    )}
                    {stats.taxasPlataformas.shopee > 0 && (
                      <span className="text-[10px]">Shopee: {formatCurrency(stats.taxasPlataformas.shopee)}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Custo de Frete */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Total gasto com frete">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Custo de Frete</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(-Math.abs(stats.custoFrete.total), formatCurrency, "w-24", "currency")}</div>
          <div className="flex flex-col text-xs text-gray-600 gap-0.5">
            {loading ? (
              <NumberLoader width="w-12" height="h-3" variant="percentage" />
            ) : (
              <>
                <span>{`${(safeDiv(stats.custoFrete.total, stats.faturamentoTotal) * 100).toFixed(1)}% do faturamento`}</span>
                {(stats.custoFrete.mercadoLivre > 0 || stats.custoFrete.shopee > 0) && (
                  <div className="flex gap-2 mt-1">
                    {stats.custoFrete.mercadoLivre > 0 && (
                      <span className="text-[10px]">ML: {formatCurrency(stats.custoFrete.mercadoLivre)}</span>
                    )}
                    {stats.custoFrete.shopee > 0 && (
                      <span className="text-[10px]">Shopee: {formatCurrency(stats.custoFrete.shopee)}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Margem de Contribuição (Receita líquida) */}
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
          <div className="text-lg font-bold text-gray-900">{renderValue(stats.margemContribuicao, formatCurrency, "w-24", "currency")}</div>
          <div className="text-xs text-gray-600">
            {loading ? (
              <NumberLoader width="w-12" height="h-3" variant="percentage" />
            ) : (
              `${(safeDiv(stats.margemContribuicao, stats.faturamentoTotal) * 100).toFixed(1)}% do faturamento`
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
              `${(safeDiv(stats.cmv, stats.faturamentoTotal) * 100).toFixed(1)}% do faturamento`
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
              `${(safeDiv(stats.lucroBruto, stats.faturamentoTotal) * 100).toFixed(1)}% do faturamento`
            )}
          </div>
        </div>
      </div>

      {/* Vendas Realizadas */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Número total de vendas">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Vendas Realizadas</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(stats.vendasRealizadas, formatNumber, "w-20", "number")}</div>
          <p className="text-xs text-gray-600">vendas realizadas</p>
        </div>
      </div>

      {/* Ticket Médio (Venda) */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Valor médio por venda">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Ticket Médio (Venda)</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(ticketMedioVenda, formatCurrency, "w-24", "currency")}</div>
          <p className="text-xs text-gray-600">por venda</p>
        </div>
      </div>

      {/* Unidades Vendidas */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Quantidade total de produtos vendidos">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V2a1 1 0 011-1h8v2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Unidades Vendidas</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(stats.unidadesVendidas, formatNumber, "w-20", "number")}</div>
          <p className="text-xs text-gray-600">unidades vendidas</p>
        </div>
      </div>

      {/* Ticket Médio (Unid.) */}
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm" title="Valor médio por unidade vendida">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600">Ticket Médio (Unid.)</h3>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{renderValue(ticketMedioUnidade, formatCurrency, "w-24", "currency")}</div>
          <p className="text-xs text-gray-600">por unidade</p>
        </div>
      </div>
    </div>
  );
});

export default DashboardStats;
