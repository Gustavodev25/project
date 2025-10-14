"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import NumberLoader from "../../../../components/NumberLoader";
import { FiltroPeriodo } from "./FiltrosDashboard";
import type { FiltroCanal, FiltroStatus, FiltroTipoAnuncio as FiltroTipo, FiltroModalidadeEnvio } from "./FiltrosDashboardExtra";
import type { FiltroAgrupamentoSKU } from "./FiltroSKU";

interface FaturamentoPorTipoAnuncioProps {
  periodoAtivo?: FiltroPeriodo;
  dataInicioPersonalizada?: Date | null;
  dataFimPersonalizada?: Date | null;
  canalAtivo?: FiltroCanal;
  statusAtivo?: FiltroStatus;
  tipoAnuncioAtivo?: FiltroTipo;
  modalidadeEnvioAtiva?: FiltroModalidadeEnvio;
  agrupamentoSKUAtivo?: FiltroAgrupamentoSKU;
  refreshKey?: number;
}

type DadosTipoAnuncio = {
  tipoAnuncio: string;
  faturamento: number;
  quantidade: number;
  percentual: number;
  percentualFaturamento?: number;
  percentualQuantidade?: number;
};

const CORES = {
  "Catálogo": "#ef4444", // Vermelho
  "Próprio": "#06b6d4", // Ciano
};

export default function FaturamentoPorTipoAnuncio({
  periodoAtivo = "todos",
  dataInicioPersonalizada = null,
  dataFimPersonalizada = null,
  canalAtivo = "todos",
  statusAtivo = "pagos",
  tipoAnuncioAtivo = "todos",
  modalidadeEnvioAtiva = "todos",
  agrupamentoSKUAtivo = "mlb",
  refreshKey = 0,
}: FaturamentoPorTipoAnuncioProps) {
  const [dados, setDados] = useState<DadosTipoAnuncio[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const totalFaturamento = dados.reduce((acc, it) => acc + (it.faturamento || 0), 0);
  const totalQuantidade = dados.reduce((acc, it) => acc + (it.quantidade || 0), 0);

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
        
        // Chamar API para dados do faturamento por tipo de anúncio
        const url = `/api/dashboard/faturamento-por-tipo-anuncio${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url, { credentials: "include" });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = (await res.json()) as DadosTipoAnuncio[];
        
        // Debug: Log dos dados recebidos
        console.log('[FaturamentoPorTipoAnuncio] Dados recebidos da API:', data);
        console.log('[FaturamentoPorTipoAnuncio] Quantidade de tipos:', data.length);
        
        if (isMounted) {
          setDados(data);
        }
      } catch (err) {
        console.error("Falha ao carregar faturamento por tipo de anúncio:", err);
        if (isMounted) {
          setDados([]); // Fallback para array vazio
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [periodoAtivo, dataInicioPersonalizada, dataFimPersonalizada, canalAtivo, statusAtivo, tipoAnuncioAtivo, modalidadeEnvioAtiva, agrupamentoSKUAtivo, refreshKey]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { 
      style: "currency", 
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatPercentage = (value: number) => `${(value || 0).toFixed(1)}%`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percFat = data.percentualFaturamento ?? data.percentual;
      const percQtde = data.percentualQuantidade ?? data.percentual;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.tipoAnuncio}</p>
          <p className="text-sm text-red-600">
            {`Fat. ${formatCurrency(data.faturamento)} (${percFat.toFixed(1)}%)`}
          </p>
          <p className="text-sm text-gray-600">
            {`Qtde. ${data.quantidade} (${percQtde.toFixed(1)}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V2a1 1 0 011-1h8v2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-600">Faturamento por Tipo de Anúncio</h3>
            <p className="text-xs text-gray-500">Carregando dados...</p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <NumberLoader width="w-32" height="h-8" variant="currency" />
        </div>
      </div>
    );
  }

  if (dados.length === 0) {
    return (
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V2a1 1 0 011-1h8v2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-600">Faturamento por Tipo de Anúncio</h3>
            <p className="text-xs text-gray-500">Nenhum dado encontrado</p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V2a1 1 0 011-1h8v2z" />
              </svg>
            </div>
            <div className="text-xs text-gray-500">Não há vendas no período</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V2a1 1 0 011-1h8v2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-600">Faturamento por Tipo de Anúncio</h3>
            <p className="text-xs text-gray-500">Distribuição entre Catálogo e Próprio</p>
          </div>
        </div>

        {/* Informações do gráfico */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando faturamento por tipo de anúncio
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dados}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={80}
              innerRadius={40}
              fill="#8884d8"
              dataKey="faturamento"
              nameKey="tipoAnuncio"
            >
              {dados.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CORES[entry.tipoAnuncio as keyof typeof CORES] || "#6b7280"} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
