"use client";

import { useEffect, useState } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";
import FiltrosDashboard, { FiltroPeriodo } from "./FiltrosDashboard";

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
  periodoAtivo: FiltroPeriodo;
  onPeriodoChange: (periodo: FiltroPeriodo) => void;
  onPeriodoPersonalizadoChange?: (dataInicio: Date, dataFim: Date) => void;
  portadorId: string | null;
  onPortadorChange: (id: string | null) => void;
  categoriaId: string | null;
  onCategoriaChange: (id: string | null) => void;
}

export default function HeaderFinanceiro({
  periodoAtivo,
  onPeriodoChange,
  onPeriodoPersonalizadoChange,
  portadorId,
  onPortadorChange,
  categoriaId,
  onCategoriaChange,
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
    if (!categoriaId) return 'Categoria: Todas (Desp.)';
    const c = categorias.find((x) => x.id === categoriaId);
    return `Categoria: ${c ? (c.descricao || c.nome) : 'Selecionada'}`;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard Financeiro</h1>
          <p className="mt-1 text-sm text-gray-600">KPIs financeiros com filtros por período, portador e categoria.</p>
        </div>

        <div className="flex items-center gap-4">
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
                className={`smart-dropdown w-72 ${categoriaDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={categoriaDropdown.position}
              >
                <div className="p-2">
                  <button
                    onClick={() => { onCategoriaChange(null); setShowCategoriaDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${!categoriaId ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Todas as despesas
                  </button>
                  <div className="max-h-72 overflow-y-auto mt-1">
                    {loadingCategorias ? (
                      <div className="text-xs text-gray-600 px-3 py-2">Carregando...</div>
                    ) : categorias.length === 0 ? (
                      <div className="text-xs text-gray-600 px-3 py-2">Nenhuma categoria de despesa</div>
                    ) : (
                      categorias.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { onCategoriaChange(c.id); setShowCategoriaDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${categoriaId === c.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          {c.descricao || c.nome}
                        </button>
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

          {/* Período */}
          <FiltrosDashboard
            periodoAtivo={periodoAtivo}
            onPeriodoChange={onPeriodoChange}
            onPeriodoPersonalizadoChange={onPeriodoPersonalizadoChange}
          />
        </div>
      </div>
    </div>
  );
}

