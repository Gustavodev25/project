"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import NumberLoader from "../../../../components/NumberLoader";
import { FiltroPeriodo } from "./FiltrosDashboard";
import type { FiltroCanal, FiltroStatus, FiltroTipoAnuncio, FiltroModalidadeEnvio } from "./FiltrosDashboardExtra";
import type { FiltroAgrupamentoSKU } from "./FiltroSKU";

interface TopProdutosMargemProps {
  periodoAtivo?: FiltroPeriodo;
  dataInicioPersonalizada?: Date | null;
  dataFimPersonalizada?: Date | null;
  canalAtivo?: FiltroCanal;
  statusAtivo?: FiltroStatus;
  tipoAnuncioAtivo?: FiltroTipoAnuncio;
  modalidadeEnvioAtiva?: FiltroModalidadeEnvio;
  agrupamentoSKUAtivo?: FiltroAgrupamentoSKU;
  refreshKey?: number;
}

type ProdutoMargem = {
  produto: string;
  sku: string;
  margemContribuicao: number;
  faturamento: number;
  cmv: number;
  percentualMargem: number;
  quantidade: number;
};

export default function TopProdutosMargem({
  periodoAtivo = "todos",
  dataInicioPersonalizada = null,
  dataFimPersonalizada = null,
  canalAtivo = "todos",
  statusAtivo = "pagos",
  tipoAnuncioAtivo = "todos",
  modalidadeEnvioAtiva = "todos",
  agrupamentoSKUAtivo = "mlb",
  refreshKey = 0,
}: TopProdutosMargemProps) {
  const [dados, setDados] = useState<ProdutoMargem[]>([]);
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
        
        // Chamar API para dados do top produtos margem
        const url = `/api/dashboard/top-produtos-margem${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url, { credentials: "include" });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = (await res.json()) as ProdutoMargem[];
        
        // Debug: Log dos dados recebidos
        console.log('[TopProdutosMargem] Dados recebidos da API:', data);
        console.log('[TopProdutosMargem] Quantidade de produtos:', data.length);
        if (data.length > 0) {
          console.log('[TopProdutosMargem] Primeiro produto:', data[0]);
        }
        
        if (isMounted) {
          setDados(data);
        }
      } catch (err) {
        console.error("Falha ao carregar top produtos margem:", err);
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percFat = totalFaturamento > 0 ? (data.faturamento / totalFaturamento) * 100 : 0;
      const percQtd = totalQuantidade > 0 ? (data.quantidade / totalQuantidade) * 100 : 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{`${label}`}</p>
          <p className="text-sm text-green-600">
            {`Margem: ${formatCurrency(data.margemContribuicao)}`}
          </p>
          <p className="text-sm text-gray-600">
            {`Faturamento: ${formatCurrency(data.faturamento)} (${percFat.toFixed(1)}%)`}
          </p>
          <p className="text-sm text-gray-600">
            {`Quantidade: ${data.quantidade} (${percQtd.toFixed(1)}%)`}
          </p>
          <p className="text-sm text-gray-600">
            {`CMV: ${formatCurrency(data.cmv)}`}
          </p>
          <p className="text-sm text-purple-600">
            {`% Margem: ${formatPercentage(data.percentualMargem)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-600">Top Produtos Margem</h3>
            <p className="text-xs text-gray-500">Carregando produtos...</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-600">Top Produtos Margem</h3>
            <p className="text-xs text-gray-500">Nenhum produto encontrado</p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-xs text-gray-500">Não há produtos no período</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F3F3] rounded-lg border border-gray-200 p-3 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-600">Top Produtos Margem</h3>
            <p className="text-xs text-gray-500">Top 10 produtos por margem de contribuição</p>
          </div>
        </div>

        {/* Informações do gráfico */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando top 10 produtos por margem de contribuição
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[400px] -mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={dados}
            margin={{
              top: 5,
              right: 30,
              left: 5,
              bottom: 5,
            }}
            barCategoryGap="15%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              type="number"
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              angle={0}
              height={40}
            />
            <YAxis
              type="category"
              dataKey="produto"
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={150}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />

            <Bar
              dataKey="margemContribuicao"
              fill="#10b981"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
