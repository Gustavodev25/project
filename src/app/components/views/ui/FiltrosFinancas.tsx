"use client";

import { useState } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";
import DatePicker from "react-datepicker";

export type FiltroStatus = "todos" | "pendente" | "pago" | "vencido";
export type FiltroPeriodo = "todos" | "mes_passado" | "este_mes" | "hoje" | "ontem" | "personalizado";
export type FiltroOrigem = "todas" | "MANUAL" | "BLING" | "EXCEL";

interface FiltrosFinancasProps {
  tipo: "contas_pagar" | "contas_receber";
  periodoAtivo?: FiltroPeriodo;
  onPeriodoChange?: (periodo: FiltroPeriodo) => void;
  onPeriodoPersonalizadoChange?: (dataInicio: Date, dataFim: Date) => void;
  periodoCompetenciaAtivo?: FiltroPeriodo;
  onPeriodoCompetenciaChange?: (periodo: FiltroPeriodo) => void;
  onPeriodoCompetenciaPersonalizadoChange?: (dataInicio: Date, dataFim: Date) => void;
  filtroCategoria?: string;
  onCategoriaChange?: (categoriaId: string) => void;
  categoriasDisponiveis?: Array<{ id: string; nome: string; descricao?: string }>;
  filtroStatus?: FiltroStatus;
  onStatusChange?: (status: FiltroStatus) => void;
  filtroOrigem?: FiltroOrigem;
  onOrigemChange?: (origem: FiltroOrigem) => void;
}

export default function FiltrosFinancas({
  tipo,
  periodoAtivo = "todos",
  onPeriodoChange,
  onPeriodoPersonalizadoChange,
  periodoCompetenciaAtivo = "todos",
  onPeriodoCompetenciaChange,
  onPeriodoCompetenciaPersonalizadoChange,
  filtroCategoria = "todas",
  onCategoriaChange,
  categoriasDisponiveis = [],
  filtroStatus = "todos",
  onStatusChange,
  filtroOrigem = "todas",
  onOrigemChange,
}: FiltrosFinancasProps) {
  const [showPeriodoDropdown, setShowPeriodoDropdown] = useState(false);
  const [showPeriodoCompetenciaDropdown, setShowPeriodoCompetenciaDropdown] = useState(false);
  const [showCategoriaDropdown, setShowCategoriaDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showOrigemDropdown, setShowOrigemDropdown] = useState(false);
  const [showCalendarioPersonalizado, setShowCalendarioPersonalizado] = useState(false);
  const [showCalendarioPersonalizadoComp, setShowCalendarioPersonalizadoComp] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dataCompInicio, setDataCompInicio] = useState<Date | null>(null);
  const [dataCompFim, setDataCompFim] = useState<Date | null>(null);
  const [startDateComp, setStartDateComp] = useState<Date | null>(null);
  const [endDateComp, setEndDateComp] = useState<Date | null>(null);

  // Hooks para dropdowns
  const periodoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showPeriodoDropdown,
    onClose: () => setShowPeriodoDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const periodoCompetenciaDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showPeriodoCompetenciaDropdown,
    onClose: () => setShowPeriodoCompetenciaDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const categoriaDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showCategoriaDropdown,
    onClose: () => setShowCategoriaDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const statusDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showStatusDropdown,
    onClose: () => setShowStatusDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const origemDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showOrigemDropdown,
    onClose: () => setShowOrigemDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const handlePeriodoClick = (periodo: FiltroPeriodo) => {
    if (periodo === "personalizado") {
      setShowCalendarioPersonalizado(true);
      return;
    }
    
    if (onPeriodoChange) {
      onPeriodoChange(periodo);
    }
    setShowPeriodoDropdown(false);
    setShowCalendarioPersonalizado(false);
  };

  const handleConfirmarPersonalizado = () => {
    if (startDate && endDate && onPeriodoPersonalizadoChange) {
      onPeriodoPersonalizadoChange(startDate, endDate);
      setDataInicio(startDate);
      setDataFim(endDate);
    }
    if (onPeriodoChange) {
      onPeriodoChange("personalizado");
    }
    setShowPeriodoDropdown(false);
    setShowCalendarioPersonalizado(false);
  };

  const handleCancelarPersonalizado = () => {
    setShowCalendarioPersonalizado(false);
    setStartDate(null);
    setEndDate(null);
  };

  // Handlers Competência
  const handlePeriodoCompetenciaClick = (periodo: FiltroPeriodo) => {
    if (periodo === "personalizado") {
      setShowCalendarioPersonalizadoComp(true);
      return;
    }
    if (onPeriodoCompetenciaChange) onPeriodoCompetenciaChange(periodo);
    setShowPeriodoCompetenciaDropdown(false);
    setShowCalendarioPersonalizadoComp(false);
  };

  const handleConfirmarPersonalizadoCompetencia = () => {
    if (startDateComp && endDateComp && onPeriodoCompetenciaPersonalizadoChange) {
      onPeriodoCompetenciaPersonalizadoChange(startDateComp, endDateComp);
      setDataCompInicio(startDateComp);
      setDataCompFim(endDateComp);
    }
    if (onPeriodoCompetenciaChange) onPeriodoCompetenciaChange("personalizado");
    setShowPeriodoCompetenciaDropdown(false);
    setShowCalendarioPersonalizadoComp(false);
  };

  const handleCancelarPersonalizadoCompetencia = () => {
    setShowCalendarioPersonalizadoComp(false);
    setStartDateComp(null);
    setEndDateComp(null);
  };

  const getPeriodoLabel = (periodo: FiltroPeriodo) => {
    switch (periodo) {
      case "todos": return "Todos os Períodos";
      case "hoje": return "Hoje";
      case "ontem": return "Ontem";
      case "este_mes": return "Este mês";
      case "mes_passado": return "Mês passado";
      case "personalizado": {
        if (dataInicio && dataFim) {
          const formatDate = (date: Date) => {
            return date.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
          };
          return `${formatDate(dataInicio)} - ${formatDate(dataFim)}`;
        }
        return "Personalizado";
      }
      default: return "Todos os Períodos";
    }
  };

  const getCategoriaLabel = (categoriaId: string) => {
    if (categoriaId === "todas") return "Todas as Categorias";
    const categoria = categoriasDisponiveis.find(c => c.id === categoriaId);
    return categoria ? (categoria.descricao || categoria.nome) : "Todas as Categorias";
  };

  const getStatusLabel = (status: FiltroStatus) => {
    switch (status) {
      case "todos": return "Todos os Status";
      case "pendente": return "Pendente";
      case "pago": return tipo === "contas_receber" ? "Recebido" : "Pago";
      case "vencido": return "Vencido";
      default: return "Todos os Status";
    }
  };

  const getOrigemLabel = (origem: FiltroOrigem) => {
    switch (origem) {
      case "todas": return "Todas as Origens";
      case "MANUAL": return "Manual";
      case "BLING": return "Bling";
      case "EXCEL": return "Excel";
      default: return "Todas as Origens";
    }
  };

  const limparFiltros = () => {
    if (onPeriodoChange) onPeriodoChange("todos");
    if (onPeriodoCompetenciaChange) onPeriodoCompetenciaChange("todos");
    if (onCategoriaChange) onCategoriaChange("todas");
    if (onStatusChange) onStatusChange("todos");
    if (onOrigemChange) onOrigemChange("todas");
    setDataInicio(null);
    setDataFim(null);
    setStartDate(null);
    setEndDate(null);
    setDataCompInicio(null);
    setDataCompFim(null);
    setStartDateComp(null);
    setEndDateComp(null);
  };

  const temFiltrosAtivos = periodoAtivo !== "todos" || periodoCompetenciaAtivo !== "todos" || filtroCategoria !== "todas" || filtroStatus !== "todos" || filtroOrigem !== "todas";

  return (
    <>
      <div className="flex items-center gap-2">
          {/* Dropdown de Período */}
          <div className="relative">
            <button
              ref={periodoDropdown.triggerRef}
              onClick={() => setShowPeriodoDropdown(!showPeriodoDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showPeriodoDropdown 
                  ? "border-gray-400 bg-gray-50 text-gray-900" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Pagamento: {getPeriodoLabel(periodoAtivo)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showPeriodoDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {periodoDropdown.isVisible && (
              <div 
                ref={periodoDropdown.dropdownRef}
                className={`smart-dropdown w-64 ${periodoDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={periodoDropdown.position}
              >
                {!showCalendarioPersonalizado ? (
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
                          onClick={() => handlePeriodoClick(opcao.id)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            periodoAtivo === opcao.id 
                              ? "bg-gray-100 text-gray-900 font-medium" 
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {opcao.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Selecione o Período</h4>
                    <DatePicker
                      selected={startDate}
                      onChange={(dates: [Date | null, Date | null]) => {
                        const [start, end] = dates;
                        setStartDate(start);
                        setEndDate(end);
                      }}
                      startDate={startDate}
                      endDate={endDate}
                      selectsRange
                      inline
                      locale="pt-BR"
                      dateFormat="dd/MM/yyyy"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleCancelarPersonalizado}
                        className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmarPersonalizado}
                        disabled={!startDate || !endDate}
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

          {/* Período Competência */}
          <div className="relative">
            <button
              ref={periodoCompetenciaDropdown.triggerRef}
              onClick={() => setShowPeriodoCompetenciaDropdown(!showPeriodoCompetenciaDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showPeriodoCompetenciaDropdown 
                  ? "border-gray-400 bg-gray-50 text-gray-900" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Competência: {getPeriodoLabel(periodoCompetenciaAtivo || "todos")}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showPeriodoCompetenciaDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {periodoCompetenciaDropdown.isVisible && (
              <div 
                ref={periodoCompetenciaDropdown.dropdownRef}
                className={`smart-dropdown w-64 ${periodoCompetenciaDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={periodoCompetenciaDropdown.position}
              >
                {!showCalendarioPersonalizadoComp ? (
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
                            periodoCompetenciaAtivo === opcao.id 
                              ? "bg-gray-100 text-gray-900 font-medium" 
                              : "text-gray-700 hover:bg-gray-50"
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

          {/* Dropdown de Categoria */}
          <div className="relative">
            <button
              ref={categoriaDropdown.triggerRef}
              onClick={() => setShowCategoriaDropdown(!showCategoriaDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showCategoriaDropdown 
                  ? "border-gray-400 bg-gray-50 text-gray-900" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20l9-16H3z" />
              </svg>
              <span>{getCategoriaLabel(filtroCategoria)}</span>
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
                    onClick={() => {
                      if (onCategoriaChange) onCategoriaChange("todas");
                      setShowCategoriaDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      filtroCategoria === "todas" 
                        ? "bg-gray-100 text-gray-900 font-medium" 
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Todas as Categorias
                  </button>
                  <div className="max-h-72 overflow-y-auto mt-1">
                    {categoriasDisponiveis.map((categoria) => (
                      <button
                        key={categoria.id}
                        onClick={() => {
                          if (onCategoriaChange) onCategoriaChange(categoria.id);
                          setShowCategoriaDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          filtroCategoria === categoria.id 
                            ? "bg-gray-100 text-gray-900 font-medium" 
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {categoria.descricao || categoria.nome}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown de Status */}
          <div className="relative">
            <button
              ref={statusDropdown.triggerRef}
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showStatusDropdown 
                  ? "border-gray-400 bg-gray-50 text-gray-900" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{getStatusLabel(filtroStatus)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {statusDropdown.isVisible && (
              <div 
                ref={statusDropdown.dropdownRef}
                className={`smart-dropdown w-48 ${statusDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={statusDropdown.position}
              >
                <div className="p-2">
                  <div className="space-y-1">
                    {[
                      { id: "todos" as FiltroStatus, label: "Todos os Status" },
                      { id: "pendente" as FiltroStatus, label: "Pendente" },
                      { id: "pago" as FiltroStatus, label: tipo === "contas_receber" ? "Recebido" : "Pago" },
                      { id: "vencido" as FiltroStatus, label: "Vencido" },
                    ].map((opcao) => (
                      <button
                        key={opcao.id}
                        onClick={() => {
                          if (onStatusChange) onStatusChange(opcao.id);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          filtroStatus === opcao.id 
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

          {/* Dropdown de Origem */}
          <div className="relative">
            <button
              ref={origemDropdown.triggerRef}
              onClick={() => setShowOrigemDropdown(!showOrigemDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showOrigemDropdown 
                  ? "border-gray-400 bg-gray-50 text-gray-900" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>{getOrigemLabel(filtroOrigem)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showOrigemDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {origemDropdown.isVisible && (
              <div 
                ref={origemDropdown.dropdownRef}
                className={`smart-dropdown w-48 ${origemDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={origemDropdown.position}
              >
                <div className="p-2">
                  <div className="space-y-1">
                    {[
                      { id: "todas" as FiltroOrigem, label: "Todas as Origens" },
                      { id: "MANUAL" as FiltroOrigem, label: "Manual" },
                      { id: "BLING" as FiltroOrigem, label: "Bling" },
                      { id: "EXCEL" as FiltroOrigem, label: "Excel" },
                    ].map((opcao) => (
                      <button
                        key={opcao.id}
                        onClick={() => {
                          if (onOrigemChange) onOrigemChange(opcao.id);
                          setShowOrigemDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          filtroOrigem === opcao.id 
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
      </div>

      {/* Botão Limpar Filtros */}
      {temFiltrosAtivos && (
        <button
          onClick={limparFiltros}
          className="text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </>
  );
}

