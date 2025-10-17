"use client";

import { useState } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";
import FiltrosDashboard, { FiltroPeriodo } from "./FiltrosDashboard";

type Categoria = {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo?: string | null; // RECEITA | DESPESA
};

interface HeaderDREProps {
  periodoAtivo: FiltroPeriodo;
  onPeriodoChange: (periodo: FiltroPeriodo) => void;
  dataInicioPersonalizada: Date | null;
  dataFimPersonalizada: Date | null;
  onDataInicioChange: (data: Date | null) => void;
  onDataFimChange: (data: Date | null) => void;

  categorias: Categoria[];
  categoriasSelecionadas: Set<string>; // ids
  onCategoriasSelecionadasChange: (ids: Set<string>) => void;

  tipoVisualizacao: 'caixa' | 'competencia';
  onTipoVisualizacaoChange: (tipo: 'caixa' | 'competencia') => void;
}

export default function HeaderDRE({
  periodoAtivo,
  onPeriodoChange,
  dataInicioPersonalizada,
  dataFimPersonalizada,
  onDataInicioChange,
  onDataFimChange,
  categorias,
  categoriasSelecionadas,
  onCategoriasSelecionadasChange,
  tipoVisualizacao,
  onTipoVisualizacaoChange,
}: HeaderDREProps) {
  const [showCategoriasDropdown, setShowCategoriasDropdown] = useState(false);
  const categoriasDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showCategoriasDropdown,
    onClose: () => setShowCategoriasDropdown(false),
    preferredPosition: "bottom-right",
    offset: 8,
    minDistanceFromEdge: 16,
  });

  const totalCategorias = categorias.length;
  const totalCategoriasSelecionadas = categoriasSelecionadas.size;

  const toggleTipoVisualizacao = () => {
    const novoTipo = tipoVisualizacao === 'caixa' ? 'competencia' : 'caixa';
    onTipoVisualizacaoChange(novoTipo);
  };

  const toggleCategoria = (id: string) => {
    const next = new Set(categoriasSelecionadas);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onCategoriasSelecionadasChange(next);
  };

  const selecionarTodasCategorias = () => {
    onCategoriasSelecionadasChange(new Set(categorias.map((c) => c.id)));
  };
  const limparCategorias = () => {
    onCategoriasSelecionadasChange(new Set());
  };

  // Formatar texto do período
  const getPeriodoTexto = (): string => {
    const hoje = new Date();
    const mesAtual = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    
    switch (periodoAtivo) {
      case "hoje":
        return mesAtual;
      case "ontem":
        return mesAtual;
      case "ultimos_7d":
        return "ÚLTIMOS 7 DIAS";
      case "ultimos_30d":
        return "ÚLTIMOS 30 DIAS";
      case "ultimos_12m":
        return "ÚLTIMOS 12 MESES";
      case "mes_passado":
        const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1);
        return mesPassado.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
      case "este_mes":
        return mesAtual;
      case "personalizado":
        if (dataInicioPersonalizada && dataFimPersonalizada) {
          const inicio = dataInicioPersonalizada.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
          const fim = dataFimPersonalizada.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
          return `${inicio} - ${fim}`.toUpperCase();
        }
        return "PERÍODO PERSONALIZADO";
      default:
        return "ÚLTIMOS 12 MESES";
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">DRE</h1>
            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
              {getPeriodoTexto()}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Demonstrativo de Resultado do Exercício com filtros por meses e categorias de despesas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Switch Caixa/Competência */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium transition-colors duration-200 ${
              tipoVisualizacao === 'competencia' ? 'text-gray-900' : 'text-gray-500'
            }`}>
              Competência
            </span>
            <button
              onClick={toggleTipoVisualizacao}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                tipoVisualizacao === 'caixa' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={tipoVisualizacao === 'caixa'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  tipoVisualizacao === 'caixa' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-xs font-medium transition-colors duration-200 ${
              tipoVisualizacao === 'caixa' ? 'text-gray-900' : 'text-gray-500'
            }`}>
              Caixa
            </span>
          </div>

          {/* Filtrar Despesas */}
          <div className="relative">
            <button
              ref={categoriasDropdown.triggerRef}
              onClick={() => setShowCategoriasDropdown(!showCategoriasDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showCategoriasDropdown
                  ? "border-gray-400 bg-gray-50 text-gray-900"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20l9-16H3z" />
              </svg>
              <span>
                Filtrar Despesas ({totalCategoriasSelecionadas}/{totalCategorias || 0})
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showCategoriasDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>
            {categoriasDropdown.isVisible && (
              <div
                ref={categoriasDropdown.dropdownRef}
                className={`smart-dropdown w-80 ${categoriasDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={categoriasDropdown.position}
              >
                <div className="p-2">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <button onClick={() => { selecionarTodasCategorias(); setShowCategoriasDropdown(false); }} className="text-xs text-blue-600 hover:text-blue-700">
                      Selecionar todas
                    </button>
                    <button onClick={() => { limparCategorias(); setShowCategoriasDropdown(false); }} className="text-xs text-gray-600 hover:text-gray-700">
                      Limpar
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto mt-1 space-y-1">
                    {categorias.length === 0 ? (
                      <div className="text-xs text-gray-600 px-3 py-2">Nenhuma categoria de despesa</div>
                    ) : (
                      categorias.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" className="rounded border-gray-300" checked={categoriasSelecionadas.has(c.id)} onChange={() => toggleCategoria(c.id)} />
                          <span className="text-gray-700">{c.descricao || c.nome}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filtro de Período */}
          <FiltrosDashboard
            periodoAtivo={periodoAtivo}
            onPeriodoChange={onPeriodoChange}
            onPeriodoPersonalizadoChange={(dataInicio, dataFim) => {
              onDataInicioChange(dataInicio);
              onDataFimChange(dataFim);
            }}
          />
        </div>
      </div>
    </div>
  );
}

