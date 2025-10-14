"use client";

import { useState } from "react";
import { useSmartDropdown } from "../../../../hooks/useSmartDropdown";
import DatePicker from "react-datepicker";

export type FiltroPeriodo = "todos" | "mes_passado" | "este_mes" | "personalizado";

// Novos filtros do Dashboard
type FiltroCanal = "todos" | "mercado_livre" | "shopee";
type FiltroStatus = "todos" | "pagos" | "cancelados";
type FiltroTipoAnuncio = "todos" | "catalogo" | "proprio";
type FiltroModalidadeEnvio = "todos" | "me" | "full" | "flex";

interface FiltrosDashboardProps {
  periodoAtivo: FiltroPeriodo;
  onPeriodoChange: (periodo: FiltroPeriodo) => void;
  onPeriodoPersonalizadoChange?: (dataInicio: Date, dataFim: Date) => void;
}

export default function FiltrosDashboard({
  periodoAtivo,
  onPeriodoChange,
  onPeriodoPersonalizadoChange,
}: FiltrosDashboardProps) {
  const [showPeriodoDropdown, setShowPeriodoDropdown] = useState(false);
  const [showCalendarioPersonalizado, setShowCalendarioPersonalizado] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Estados dos novos filtros (apenas UI nesta etapa)
  const [canalAtivo, setCanalAtivo] = useState<FiltroCanal>("todos");
  const [statusAtivo, setStatusAtivo] = useState<FiltroStatus>("todos");
  const [tipoAnuncioAtivo, setTipoAnuncioAtivo] = useState<FiltroTipoAnuncio>("todos");
  const [modalidadeEnvioAtiva, setModalidadeEnvioAtiva] = useState<FiltroModalidadeEnvio>("todos");

  // Visibilidade dos novos dropdowns
  const [showCanalDropdown, setShowCanalDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTipoAnuncioDropdown, setShowTipoAnuncioDropdown] = useState(false);
  const [showModalidadeEnvioDropdown, setShowModalidadeEnvioDropdown] = useState(false);

  // Hook para dropdown de período
  const periodoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showPeriodoDropdown,
    onClose: () => setShowPeriodoDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  // Hooks para dropdowns adicionais
  const canalDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showCanalDropdown,
    onClose: () => setShowCanalDropdown(false),
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

  const tipoAnuncioDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showTipoAnuncioDropdown,
    onClose: () => setShowTipoAnuncioDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const modalidadeEnvioDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showModalidadeEnvioDropdown,
    onClose: () => setShowModalidadeEnvioDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const handlePeriodoClick = (periodo: FiltroPeriodo) => {
    if (periodo === "personalizado") {
      setShowCalendarioPersonalizado(true);
      // Não fechar o dropdown ainda
      return;
    }
    
    onPeriodoChange(periodo);
    setShowPeriodoDropdown(false);
    setShowCalendarioPersonalizado(false);
  };

  const handleConfirmarPersonalizado = () => {
    if (startDate && endDate && onPeriodoPersonalizadoChange) {
      onPeriodoPersonalizadoChange(startDate, endDate);
      setDataInicio(startDate);
      setDataFim(endDate);
    }
    onPeriodoChange("personalizado");
    setShowPeriodoDropdown(false);
    setShowCalendarioPersonalizado(false);
  };

  const handleCancelarPersonalizado = () => {
    setShowCalendarioPersonalizado(false);
    setStartDate(null);
    setEndDate(null);
  };

  const getPeriodoLabel = (periodo: FiltroPeriodo) => {
    switch (periodo) {
      case "todos": return "Todos";
      case "mes_passado": return "Mês passado";
      case "este_mes": return "Este mês";
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
      default: return "Todos";
    }
  };

  // Labels dos novos filtros
  const getCanalLabel = (canal: FiltroCanal) => {
    switch (canal) {
      case "todos": return "Todos os Canais";
      case "mercado_livre": return "Mercado Livre";
      case "shopee": return "Shopee";
      default: return "Todos os Canais";
    }
  };

  const getStatusLabel = (status: FiltroStatus) => {
    switch (status) {
      case "todos": return "Todos";
      case "pagos": return "Pagos";
      case "cancelados": return "Cancelados";
      default: return "Todos";
    }
  };

  const getTipoAnuncioLabel = (tipo: FiltroTipoAnuncio) => {
    switch (tipo) {
      case "todos": return "Todos";
      case "catalogo": return "Catálogo";
      case "proprio": return "Próprio";
      default: return "Todos";
    }
  };

  const getModalidadeEnvioLabel = (mod: FiltroModalidadeEnvio) => {
    switch (mod) {
      case "todos": return "Todos";
      case "me": return "Mercado Envios";
      case "full": return "Full";
      case "flex": return "Flex";
      default: return "Todos";
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Filtro de Período */}
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
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{getPeriodoLabel(periodoAtivo)}</span>
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
            className={`transition-transform duration-200 ${showPeriodoDropdown ? 'rotate-180' : ''}`}
          >
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>

        {/* Dropdown de Período */}
        {periodoDropdown.isVisible && (
          <div 
            ref={periodoDropdown.dropdownRef}
            className={`smart-dropdown ${
              showCalendarioPersonalizado ? 'w-80' : 'w-48'
            } ${
              periodoDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
            }`}
            style={periodoDropdown.position}
          >
            {!showCalendarioPersonalizado ? (
              <div className="p-2">
                <div className="space-y-1">
                  {[
                    { id: "todos" as FiltroPeriodo, label: "Todos" },
                    { id: "mes_passado" as FiltroPeriodo, label: "Mês passado" },
                    { id: "este_mes" as FiltroPeriodo, label: "Este mês" },
                    { id: "personalizado" as FiltroPeriodo, label: "Personalizado" },
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
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Selecionar Período</h3>
                  
                  {/* Calendário Range Picker */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Selecione o período
                    </label>
                    <DatePicker
                      selected={startDate}
                      onChange={(dates) => {
                        const [start, end] = dates;
                        setStartDate(start);
                        setEndDate(end);
                      }}
                      startDate={startDate}
                      endDate={endDate}
                      selectsRange
                      inline
                      maxDate={new Date()}
                      dateFormat="dd/MM/yyyy"
                      locale="pt-BR"
                      showPopperArrow={false}
                      popperClassName="react-datepicker-popper"
                    />
                  </div>

                  {/* Resumo das datas selecionadas */}
                  {startDate && endDate && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-xs text-blue-800">
                        <strong>Período selecionado:</strong><br />
                        {startDate.toLocaleDateString('pt-BR')} até {endDate.toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleConfirmarPersonalizado}
                      disabled={!startDate || !endDate}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                        !startDate || !endDate
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={handleCancelarPersonalizado}
                      className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
