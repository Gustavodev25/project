"use client";

import { useEffect, useState } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";
import FiltroMesesCheckbox from "./FiltroMesesCheckbox";

interface FormaPagamento {
  id: string;
  nome: string;
}

interface Categoria {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo?: string | null; // RECEITA | DESPESA
}

interface HeaderFinanceiroProps {
  mesesSelecionados: Set<string>;
  onMesesChange: (meses: Set<string>) => void;
  portadorId: string | null;
  onPortadorChange: (id: string | null) => void;
  categoriasSelecionadas: Set<string>;
  onCategoriasSelecionadasChange: (ids: Set<string>) => void;
  tipoVisualizacao?: 'caixa' | 'competencia';
  onTipoVisualizacaoChange?: (tipo: 'caixa' | 'competencia') => void;
}

export default function HeaderFinanceiro({
  mesesSelecionados,
  onMesesChange,
  portadorId,
  onPortadorChange,
  categoriasSelecionadas,
  onCategoriasSelecionadasChange,
  tipoVisualizacao = 'caixa',
  onTipoVisualizacaoChange,
}: HeaderFinanceiroProps) {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingFormas, setLoadingFormas] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  const [showPortadorDropdown, setShowPortadorDropdown] = useState(false);
  const [showCategoriaDropdown, setShowCategoriaDropdown] = useState(false);

  const portadorDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showPortadorDropdown,
    onClose: () => setShowPortadorDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16,
  });
  const categoriaDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showCategoriaDropdown,
    onClose: () => setShowCategoriaDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16,
  });

  useEffect(() => {
    let aborted = false;

    const loadFormas = async () => {
      try {
        setLoadingFormas(true);
        const res = await fetch('/api/financeiro/formas-pagamento', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!aborted) setFormas((data?.data || []).map((f: any) => ({ id: f.id, nome: f.nome })));
        }
      } finally {
        if (!aborted) setLoadingFormas(false);
      }
    };

    const loadCategorias = async () => {
      try {
        setLoadingCategorias(true);
        const res = await fetch('/api/financeiro/categorias', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const onlyDespesas = (data?.data || []).filter((c: any) => (c.tipo || '').toUpperCase() === 'DESPESA');
          if (!aborted) setCategorias(onlyDespesas);
        }
      } finally {
        if (!aborted) setLoadingCategorias(false);
      }
    };

    loadFormas();
    loadCategorias();
    return () => { aborted = true; };
  }, []);

  const getPortadorLabel = () => {
    if (!portadorId) return 'Portador: Todos';
    const f = formas.find((x) => x.id === portadorId);
    return `Portador: ${f ? f.nome : 'Selecionado'}`;
  };

  const getCategoriaLabel = () => {
    const total = categorias.length;
    const selecionadas = categoriasSelecionadas.size;
    return `Filtrar Despesas (${selecionadas}/${total})`;
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

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard Financeiro</h1>
          <p className="mt-1 text-sm text-gray-600">KPIs financeiros com filtros por período, portador e categoria.</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Switch Caixa/Competência */}
          {onTipoVisualizacaoChange && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white">
              <span className={`text-xs font-medium transition-colors duration-200 ${
                tipoVisualizacao === 'competencia' ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Competência
              </span>
              <button
                onClick={() => onTipoVisualizacaoChange(tipoVisualizacao === 'caixa' ? 'competencia' : 'caixa')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  tipoVisualizacao === 'caixa' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={tipoVisualizacao === 'caixa'}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${
                    tipoVisualizacao === 'caixa' ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium transition-colors duration-200 ${
                tipoVisualizacao === 'caixa' ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Caixa
              </span>
            </div>
          )}

          {/* Categoria de Despesas */}
          <div className="relative">
            <button
              ref={categoriaDropdown.triggerRef}
              onClick={() => setShowCategoriaDropdown(!showCategoriaDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showCategoriaDropdown ? 'border-gray-400 bg-gray-50 text-gray-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20l9-16H3z" />
              </svg>
              <span>{getCategoriaLabel()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showCategoriaDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>
            {categoriaDropdown.isVisible && (
              <div
                ref={categoriaDropdown.dropdownRef}
                className={`smart-dropdown w-80 ${categoriaDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={categoriaDropdown.position}
              >
                <div className="p-2">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <button
                      onClick={() => { selecionarTodasCategorias(); }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Selecionar todas
                    </button>
                    <button
                      onClick={() => { limparCategorias(); }}
                      className="text-xs text-gray-600 hover:text-gray-700"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto mt-1 space-y-1">
                    {loadingCategorias ? (
                      <div className="text-xs text-gray-600 px-3 py-2">Carregando...</div>
                    ) : categorias.length === 0 ? (
                      <div className="text-xs text-gray-600 px-3 py-2">Nenhuma categoria de despesa</div>
                    ) : (
                      categorias.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={categoriasSelecionadas.has(c.id)}
                            onChange={() => toggleCategoria(c.id)}
                          />
                          <span className="text-gray-700">{c.descricao || c.nome}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Portador (Forma de Pagamento) */}
          <div className="relative">
            <button
              ref={portadorDropdown.triggerRef}
              onClick={() => setShowPortadorDropdown(!showPortadorDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showPortadorDropdown ? 'border-gray-400 bg-gray-50 text-gray-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span>{getPortadorLabel()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showPortadorDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>
            {portadorDropdown.isVisible && (
              <div
                ref={portadorDropdown.dropdownRef}
                className={`smart-dropdown w-64 ${portadorDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={portadorDropdown.position}
              >
                <div className="p-2">
                  <button
                    onClick={() => { onPortadorChange(null); setShowPortadorDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${!portadorId ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Todos os portadores
                  </button>
                  <div className="max-h-72 overflow-y-auto mt-1">
                    {loadingFormas ? (
                      <div className="text-xs text-gray-600 px-3 py-2">Carregando...</div>
                    ) : formas.length === 0 ? (
                      <div className="text-xs text-gray-600 px-3 py-2">Nenhuma forma cadastrada</div>
                    ) : (
                      formas.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => { onPortadorChange(f.id); setShowPortadorDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${portadorId === f.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          {f.nome}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filtro de Meses */}
          <FiltroMesesCheckbox
            mesesSelecionados={mesesSelecionados}
            onMesesChange={onMesesChange}
          />
        </div>
      </div>
    </div>
  );
}

