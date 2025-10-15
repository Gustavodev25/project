"use client";

import { useState, useEffect } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";

interface FiltrosGestaoSKUProps {
  onFiltrosChange: (filtros: FiltrosSKU) => void;
  isLoading?: boolean;
  onSKUsPendentes?: () => void;
  onToggleEditMode?: () => void;
  onToggleMultiSelect?: () => void;
  isEditMode?: boolean;
  isMultiSelect?: boolean;
  selectedCount?: number;
}

export interface FiltrosSKU {
  search: string;
  tipo: string;
  ativo: string | null;
  temEstoque: string | null;
  hierarquia1: string;
  hierarquia2: string;
  page: number;
  limit: number;
}

type FiltroStatus = "todos" | "ativos" | "inativos" | "sem-estoque";

export default function FiltrosGestaoSKU({ 
  onFiltrosChange, 
  isLoading = false,
  onSKUsPendentes,
  onToggleEditMode,
  onToggleMultiSelect,
  isEditMode = false,
  isMultiSelect = false,
  selectedCount = 0
}: FiltrosGestaoSKUProps) {
  const [filtros, setFiltros] = useState<FiltrosSKU>({
    search: '',
    tipo: '',
    ativo: null,
    temEstoque: null,
    hierarquia1: '',
    hierarquia2: '',
    page: 1,
    limit: 25,
  });

  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatus>('todos');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Estados dos dropdowns
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);
  const [showPendentesDropdown, setShowPendentesDropdown] = useState(false);
  const [showAcoesDropdown, setShowAcoesDropdown] = useState(false);

  // Hooks para dropdowns
  const tipoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showTipoDropdown,
    onClose: () => setShowTipoDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const pendentesDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showPendentesDropdown,
    onClose: () => setShowPendentesDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const acoesDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showAcoesDropdown,
    onClose: () => setShowAcoesDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  // Aplicar filtros quando mudarem
  useEffect(() => {
    onFiltrosChange(filtros);
  }, [filtros, onFiltrosChange]);

  const handleInputChange = (campo: keyof FiltrosSKU, valor: string | number | null) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor,
      page: 1,
    }));
  };

  const handleFiltroClick = (filtro: FiltroStatus) => {
    if (filtro === filtroAtivo || isAnimating) return;
    
    setIsAnimating(true);
    setFiltroAtivo(filtro);
    
    // Aplicar filtros baseados no filtro selecionado
    switch (filtro) {
      case 'ativos':
        setFiltros(prev => ({ ...prev, ativo: 'true', temEstoque: null, page: 1 }));
        break;
      case 'inativos':
        setFiltros(prev => ({ ...prev, ativo: 'false', temEstoque: null, page: 1 }));
        break;
      case 'sem-estoque':
        setFiltros(prev => ({ ...prev, ativo: null, temEstoque: 'false', page: 1 }));
        break;
      default:
        setFiltros(prev => ({ ...prev, ativo: null, temEstoque: null, page: 1 }));
    }
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const getTipoLabel = (tipo: string) => {
    if (!tipo) return "Todos os Tipos";
    return tipo === "pai" ? "Kits" : "Individual";
  };

  const filtrosStatus = [
    { id: "todos" as FiltroStatus, label: "Todos", color: "gray" },
    { id: "ativos" as FiltroStatus, label: "Ativos", color: "green" },
    { id: "inativos" as FiltroStatus, label: "Inativos", color: "red" },
    { id: "sem-estoque" as FiltroStatus, label: "Sem Estoque", color: "yellow" },
  ];

  const getFiltroClasses = (filtro: typeof filtrosStatus[0], isActive: boolean) => {
    const baseClasses = "relative flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs transition-all duration-300 ease-in-out cursor-pointer select-none";
    
    if (isActive) {
      const colorClasses = {
        gray: "bg-gray-100 text-gray-900 border border-gray-200",
        green: "bg-green-100 text-green-900 border border-green-200",
        red: "bg-red-100 text-red-900 border border-red-200",
        yellow: "bg-yellow-100 text-yellow-900 border border-yellow-200",
      };
      return `${baseClasses} ${colorClasses[filtro.color as keyof typeof colorClasses]}`;
    }
    
    return `${baseClasses} text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-200 border border-transparent`;
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Barra de Busca */}
      <div className="relative max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={filtros.search}
          onChange={(e) => handleInputChange('search', e.target.value)}
          placeholder="Buscar por SKU ou descrição do produto..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          disabled={isLoading}
        />
        {filtros.search && (
          <button
            onClick={() => handleInputChange('search', '')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            title="Limpar busca"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        {/* Filtros de Status */}
        <div className="inline-flex items-center gap-2 p-1 bg-gray-50 rounded-xl border border-gray-200">
          {filtrosStatus.map((filtro) => {
            const isActive = filtro.id === filtroAtivo;
            
            return (
              <button
                key={filtro.id}
                onClick={() => handleFiltroClick(filtro.id)}
                className={getFiltroClasses(filtro, isActive)}
                disabled={isAnimating}
              >
                <span className="font-medium">{filtro.label}</span>
              </button>
            );
          })}
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          {/* Botão de Tipo */}
          <div className="relative">
            <button
              ref={tipoDropdown.triggerRef}
              onClick={() => setShowTipoDropdown(!showTipoDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showTipoDropdown 
                  ? "border-gray-400 bg-gray-50 text-gray-900" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span>{getTipoLabel(filtros.tipo)}</span>
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
                className={`transition-transform duration-200 ${showTipoDropdown ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {tipoDropdown.isVisible && (
              <div 
                ref={tipoDropdown.dropdownRef}
                className={`smart-dropdown w-48 ${
                  tipoDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={tipoDropdown.position}
              >
                <div className="p-2">
                  <div className="space-y-1">
                    {[
                      { id: "", label: "Todos os Tipos" },
                      { id: "pai", label: "Kits" },
                      { id: "filho", label: "Individual" },
                    ].map((opcao) => (
                      <button
                        key={opcao.id}
                        onClick={() => {
                          handleInputChange('tipo', opcao.id);
                          setShowTipoDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          filtros.tipo === opcao.id
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {opcao.label}
            </button>
          ))}
        </div>
      </div>
              </div>
            )}
      </div>

          {/* Botão SKUs Pendentes */}
          <div className="relative">
            <button
              ref={pendentesDropdown.triggerRef}
              onClick={() => setShowPendentesDropdown(!showPendentesDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showPendentesDropdown 
                  ? "border-gray-400 bg-gray-50 text-gray-900" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Pendentes</span>
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
                className={`transition-transform duration-200 ${showPendentesDropdown ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {pendentesDropdown.isVisible && (
              <div 
                ref={pendentesDropdown.dropdownRef}
                className={`smart-dropdown w-64 ${
                  pendentesDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={pendentesDropdown.position}
              >
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">SKUs Pendentes</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    SKUs encontrados nas vendas que ainda não estão cadastrados.
                  </p>
                  <button
                    onClick={() => {
                      onSKUsPendentes?.();
                      setShowPendentesDropdown(false);
                    }}
                    className="w-full px-3 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Ver SKUs Pendentes
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botão Ações da Tabela */}
          <div className="relative">
            <button
              ref={acoesDropdown.triggerRef}
              onClick={() => setShowAcoesDropdown(!showAcoesDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showAcoesDropdown 
                  ? "border-gray-400 bg-gray-50 text-gray-900" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m-4-9l4-4m0 0L8 4m4 4H3"/>
              </svg>
              <span>Ações da Tabela</span>
              {(isEditMode || isMultiSelect) && (
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              )}
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
                className={`transition-transform duration-200 ${showAcoesDropdown ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {acoesDropdown.isVisible && (
              <div 
                ref={acoesDropdown.dropdownRef}
                className={`smart-dropdown w-56 ${
                  acoesDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={acoesDropdown.position}
              >
                <div className="p-2">
                  <div className="space-y-1">
                    {/* Modo Edição */}
          <button
                      onClick={() => {
                        onToggleEditMode?.();
                        // Não fechar o dropdown para permitir ativar ambos
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                        isEditMode
                          ? "bg-orange-50 text-orange-900 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-2"
                        >
                          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Modo Edição
                      </div>
                      {isEditMode && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-orange-600"
                        >
                          <polyline points="20 6 9 17 4 12"/>
            </svg>
                      )}
          </button>

                    {/* Seleção Múltipla */}
          <button
                      onClick={() => {
                        onToggleMultiSelect?.();
                        // Não fechar o dropdown
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                        isMultiSelect
                          ? "bg-blue-50 text-blue-900 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      } ${!isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!isEditMode}
                    >
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-2"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div>Seleção Múltipla</div>
                          {isMultiSelect && selectedCount > 0 && (
                            <div className="text-xs text-blue-600 font-semibold">
                              {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      {isMultiSelect && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-blue-600"
                        >
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
          </button>
        </div>

                  {!isEditMode && (
                    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                      💡 Ative o Modo Edição primeiro
              </div>
                  )}
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

