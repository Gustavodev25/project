"use client";

import { useEffect, useState } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";
import FiltroMesesCheckbox from "./FiltroMesesCheckbox";
import DatePicker from "react-datepicker";
import { FiltroPeriodo } from "./FiltrosDashboard";

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
  
  // Novos filtros de período
  filtroPeriodoPagamento?: FiltroPeriodo;
  onFiltroPeriodoPagamentoChange?: (periodo: FiltroPeriodo) => void;
  onFiltroPagamentoPersonalizadoChange?: (dataInicio: Date, dataFim: Date) => void;
  filtroPeriodoCompetencia?: FiltroPeriodo;
  onFiltroPeriodoCompetenciaChange?: (periodo: FiltroPeriodo) => void;
  onFiltroCompetenciaPersonalizadoChange?: (dataInicio: Date, dataFim: Date) => void;
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
  filtroPeriodoPagamento = "todos",
  onFiltroPeriodoPagamentoChange,
  onFiltroPagamentoPersonalizadoChange,
  filtroPeriodoCompetencia = "todos",
  onFiltroPeriodoCompetenciaChange,
  onFiltroCompetenciaPersonalizadoChange,
}: HeaderFinanceiroProps) {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingFormas, setLoadingFormas] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  const [showPortadorDropdown, setShowPortadorDropdown] = useState(false);
  const [showCategoriaDropdown, setShowCategoriaDropdown] = useState(false);
  const [showPagamentoDropdown, setShowPagamentoDropdown] = useState(false);
  const [showCompetenciaDropdown, setShowCompetenciaDropdown] = useState(false);
  const [showCalendarioPagamento, setShowCalendarioPagamento] = useState(false);
  const [showCalendarioCompetencia, setShowCalendarioCompetencia] = useState(false);
  const [startDatePag, setStartDatePag] = useState<Date | null>(null);
  const [endDatePag, setEndDatePag] = useState<Date | null>(null);
  const [startDateComp, setStartDateComp] = useState<Date | null>(null);
  const [endDateComp, setEndDateComp] = useState<Date | null>(null);
  const [dataPagInicio, setDataPagInicio] = useState<Date | null>(null);
  const [dataPagFim, setDataPagFim] = useState<Date | null>(null);
  const [dataCompInicio, setDataCompInicio] = useState<Date | null>(null);
  const [dataCompFim, setDataCompFim] = useState<Date | null>(null);

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
  const pagamentoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showPagamentoDropdown,
    onClose: () => setShowPagamentoDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16,
  });
  const competenciaDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showCompetenciaDropdown,
    onClose: () => setShowCompetenciaDropdown(false),
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

  // Handlers Filtro de Pagamento
  const handlePeriodoPagamentoClick = (periodo: FiltroPeriodo) => {
    if (periodo === "personalizado") {
      setShowCalendarioPagamento(true);
      return;
    }
    if (onFiltroPeriodoPagamentoChange) onFiltroPeriodoPagamentoChange(periodo);
    setShowPagamentoDropdown(false);
    setShowCalendarioPagamento(false);
  };

  const handleConfirmarPersonalizadoPagamento = () => {
    if (startDatePag && endDatePag && onFiltroPagamentoPersonalizadoChange) {
      onFiltroPagamentoPersonalizadoChange(startDatePag, endDatePag);
      setDataPagInicio(startDatePag);
      setDataPagFim(endDatePag);
    }
    if (onFiltroPeriodoPagamentoChange) onFiltroPeriodoPagamentoChange("personalizado");
    setShowPagamentoDropdown(false);
    setShowCalendarioPagamento(false);
  };

  const handleCancelarPersonalizadoPagamento = () => {
    setShowCalendarioPagamento(false);
    setStartDatePag(null);
    setEndDatePag(null);
  };

  // Handlers Filtro de Competência
  const handlePeriodoCompetenciaClick = (periodo: FiltroPeriodo) => {
    if (periodo === "personalizado") {
      setShowCalendarioCompetencia(true);
      return;
    }
    if (onFiltroPeriodoCompetenciaChange) onFiltroPeriodoCompetenciaChange(periodo);
    setShowCompetenciaDropdown(false);
    setShowCalendarioCompetencia(false);
  };

  const handleConfirmarPersonalizadoCompetencia = () => {
    if (startDateComp && endDateComp && onFiltroCompetenciaPersonalizadoChange) {
      onFiltroCompetenciaPersonalizadoChange(startDateComp, endDateComp);
      setDataCompInicio(startDateComp);
      setDataCompFim(endDateComp);
    }
    if (onFiltroPeriodoCompetenciaChange) onFiltroPeriodoCompetenciaChange("personalizado");
    setShowCompetenciaDropdown(false);
    setShowCalendarioCompetencia(false);
  };

  const handleCancelarPersonalizadoCompetencia = () => {
    setShowCalendarioCompetencia(false);
    setStartDateComp(null);
    setEndDateComp(null);
  };

  // Labels dos filtros
  const getPeriodoPagamentoLabel = (periodo: FiltroPeriodo) => {
    switch (periodo) {
      case "todos": return "Todos os Períodos";
      case "hoje": return "Hoje";
      case "ontem": return "Ontem";
      case "este_mes": return "Este mês";
      case "mes_passado": return "Mês passado";
      case "personalizado": {
        if (dataPagInicio && dataPagFim) {
          const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          return `${formatDate(dataPagInicio)} - ${formatDate(dataPagFim)}`;
        }
        return "Personalizado";
      }
      default: return "Todos os Períodos";
    }
  };

  const getPeriodoCompetenciaLabel = (periodo: FiltroPeriodo) => {
    switch (periodo) {
      case "todos": return "Todos os Períodos";
      case "hoje": return "Hoje";
      case "ontem": return "Ontem";
      case "este_mes": return "Este mês";
      case "mes_passado": return "Mês passado";
      case "personalizado": {
        if (dataCompInicio && dataCompFim) {
          const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          return `${formatDate(dataCompInicio)} - ${formatDate(dataCompFim)}`;
        }
        return "Personalizado";
      }
      default: return "Todos os Períodos";
    }
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
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium transition-colors duration-200 ${
                tipoVisualizacao === 'competencia' ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Competência
              </span>
              <button
                onClick={() => onTipoVisualizacaoChange(tipoVisualizacao === 'caixa' ? 'competencia' : 'caixa')}
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
          )}

          {/* Filtro de Pagamento */}
          {onFiltroPeriodoPagamentoChange && (
            <div className="relative">
              <button
                ref={pagamentoDropdown.triggerRef}
                onClick={() => setShowPagamentoDropdown(!showPagamentoDropdown)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                  showPagamentoDropdown ? 'border-gray-400 bg-gray-50 text-gray-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Pagamento: {getPeriodoPagamentoLabel(filtroPeriodoPagamento)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showPagamentoDropdown ? 'rotate-180' : ''}`}>
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </button>

              {pagamentoDropdown.isVisible && (
                <div 
                  ref={pagamentoDropdown.dropdownRef}
                  className={`smart-dropdown w-64 ${pagamentoDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                  style={pagamentoDropdown.position}
                >
                  {!showCalendarioPagamento ? (
                    <div className="p-2">
                      <div className="space-y-1">
                        {[
                          { id: "todos" as FiltroPeriodo, label: "Todos os Períodos" },
                          { id: "hoje" as FiltroPeriodo, label: "Hoje" },
                          { id: "ontem" as FiltroPeriodo, label: "Ontem" },
                          { id: "este_mes" as FiltroPeriodo, label: "Este mês" },
                          { id: "mes_passado" as FiltroPeriodo, label: "Mês passado" },
                          { id: "personalizado" as FiltroPeriodo, label: "Personalizado..." },
                        ].map((opcao) => (
                          <button
                            key={opcao.id}
                            onClick={() => handlePeriodoPagamentoClick(opcao.id)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                              filtroPeriodoPagamento === opcao.id ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {opcao.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Período de Pagamento</h4>
                      <DatePicker
                        selected={startDatePag}
                        onChange={(dates: [Date | null, Date | null]) => {
                          const [start, end] = dates;
                          setStartDatePag(start);
                          setEndDatePag(end);
                        }}
                        startDate={startDatePag}
                        endDate={endDatePag}
                        selectsRange
                        inline
                        locale="pt-BR"
                        dateFormat="dd/MM/yyyy"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleCancelarPersonalizadoPagamento}
                          className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleConfirmarPersonalizadoPagamento}
                          disabled={!startDatePag || !endDatePag}
                          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Filtro de Competência */}
          {onFiltroPeriodoCompetenciaChange && (
            <div className="relative">
              <button
                ref={competenciaDropdown.triggerRef}
                onClick={() => setShowCompetenciaDropdown(!showCompetenciaDropdown)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                  showCompetenciaDropdown ? 'border-gray-400 bg-gray-50 text-gray-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Competência: {getPeriodoCompetenciaLabel(filtroPeriodoCompetencia)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showCompetenciaDropdown ? 'rotate-180' : ''}`}>
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </button>

              {competenciaDropdown.isVisible && (
                <div 
                  ref={competenciaDropdown.dropdownRef}
                  className={`smart-dropdown w-64 ${competenciaDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                  style={competenciaDropdown.position}
                >
                  {!showCalendarioCompetencia ? (
                    <div className="p-2">
                      <div className="space-y-1">
                        {[
                          { id: "todos" as FiltroPeriodo, label: "Todos os Períodos" },
                          { id: "hoje" as FiltroPeriodo, label: "Hoje" },
                          { id: "ontem" as FiltroPeriodo, label: "Ontem" },
                          { id: "este_mes" as FiltroPeriodo, label: "Este mês" },
                          { id: "mes_passado" as FiltroPeriodo, label: "Mês passado" },
                          { id: "personalizado" as FiltroPeriodo, label: "Personalizado..." },
                        ].map((opcao) => (
                          <button
                            key={opcao.id}
                            onClick={() => handlePeriodoCompetenciaClick(opcao.id)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                              filtroPeriodoCompetencia === opcao.id ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {opcao.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Período de Competência</h4>
                      <DatePicker
                        selected={startDateComp}
                        onChange={(dates: [Date | null, Date | null]) => {
                          const [start, end] = dates;
                          setStartDateComp(start);
                          setEndDateComp(end);
                        }}
                        startDate={startDateComp}
                        endDate={endDateComp}
                        selectsRange
                        inline
                        locale="pt-BR"
                        dateFormat="dd/MM/yyyy"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleCancelarPersonalizadoCompetencia}
                          className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleConfirmarPersonalizadoCompetencia}
                          disabled={!startDateComp || !endDateComp}
                          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

