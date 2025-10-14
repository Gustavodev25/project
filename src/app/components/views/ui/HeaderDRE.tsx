"use client";

import { useState } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";

export type MesKey = string; // yyyy-MM

type Categoria = {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo?: string | null; // RECEITA | DESPESA
};

interface HeaderDREProps {
  meses: Array<{ key: MesKey; label: string; ano: number; mes: number }>;
  mesesSelecionados: Set<MesKey>;
  onMesesSelecionadosChange: (keys: Set<MesKey>) => void;

  categorias: Categoria[];
  categoriasSelecionadas: Set<string>; // ids
  onCategoriasSelecionadasChange: (ids: Set<string>) => void;

  tipoVisualizacao: 'caixa' | 'competencia';
  onTipoVisualizacaoChange: (tipo: 'caixa' | 'competencia') => void;
}

export default function HeaderDRE({
  meses,
  mesesSelecionados,
  onMesesSelecionadosChange,
  categorias,
  categoriasSelecionadas,
  onCategoriasSelecionadasChange,
  tipoVisualizacao,
  onTipoVisualizacaoChange,
}: HeaderDREProps) {
  const [showMesesDropdown, setShowMesesDropdown] = useState(false);
  const [showCategoriasDropdown, setShowCategoriasDropdown] = useState(false);

  const mesesDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showMesesDropdown,
    onClose: () => setShowMesesDropdown(false),
    preferredPosition: "bottom-right",
    offset: 8,
    minDistanceFromEdge: 16,
  });
  const categoriasDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showCategoriasDropdown,
    onClose: () => setShowCategoriasDropdown(false),
    preferredPosition: "bottom-right",
    offset: 8,
    minDistanceFromEdge: 16,
  });

  const totalMeses = meses.length;
  const totalMesesSelecionados = mesesSelecionados.size;
  const totalCategorias = categorias.length;
  const totalCategoriasSelecionadas = categoriasSelecionadas.size;

  const toggleTipoVisualizacao = () => {
    const novoTipo = tipoVisualizacao === 'caixa' ? 'competencia' : 'caixa';
    onTipoVisualizacaoChange(novoTipo);
  };

  const toggleMes = (key: MesKey) => {
    const next = new Set(mesesSelecionados);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onMesesSelecionadosChange(next);
  };

  const toggleCategoria = (id: string) => {
    const next = new Set(categoriasSelecionadas);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onCategoriasSelecionadasChange(next);
  };

  const selecionarTodosMeses = () => {
    onMesesSelecionadosChange(new Set(meses.map((m) => m.key)));
  };
  const limparMeses = () => {
    onMesesSelecionadosChange(new Set());
  };

  const selecionarTodasCategorias = () => {
    onCategoriasSelecionadasChange(new Set(categorias.map((c) => c.id)));
  };
  const limparCategorias = () => {
    onCategoriasSelecionadasChange(new Set());
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h1 className="text-2xl font-semibold text-gray-900">DRE</h1>
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

          {/* Filtrar Meses (64/64) */}
          <div className="relative">
            <button
              ref={mesesDropdown.triggerRef}
              onClick={() => setShowMesesDropdown(!showMesesDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showMesesDropdown
                  ? "border-gray-400 bg-gray-50 text-gray-900"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>
                Filtrar Meses ({totalMesesSelecionados}/{totalMeses || 0})
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showMesesDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>
            {mesesDropdown.isVisible && (
              <div
                ref={mesesDropdown.dropdownRef}
                className={`smart-dropdown w-72 ${mesesDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={mesesDropdown.position}
              >
                <div className="p-2">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <button onClick={() => { selecionarTodosMeses(); setShowMesesDropdown(false); }} className="text-xs text-blue-600 hover:text-blue-700">
                      Selecionar todos
                    </button>
                    <button onClick={() => { limparMeses(); setShowMesesDropdown(false); }} className="text-xs text-gray-600 hover:text-gray-700">
                      Limpar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 max-h-72 overflow-y-auto">
                    {meses.map((m) => (
                      <label key={m.key} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" className="rounded border-gray-300" checked={mesesSelecionados.has(m.key)} onChange={() => toggleMes(m.key)} />
                        <span className="text-gray-700">{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

