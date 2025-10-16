"use client";

import { useState, useEffect } from "react";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";
import DatePicker from "react-datepicker";

export type FiltroStatus = "todos" | "pagos" | "cancelados";
export type FiltroPeriodo = "todos" | "mes_passado" | "este_mes" | "hoje" | "ontem" | "personalizado";
export type FiltroADS = "todos" | "com_ads" | "sem_ads";
export type FiltroExposicao = "todas" | "premium" | "classico";
export type FiltroTipoAnuncio = "todos" | "catalogo" | "proprio";
export type FiltroModalidadeEnvio = "todos" | "me" | "full" | "flex";

export interface ColunasVisiveis {
  data: boolean;
  canal: boolean;
  conta: boolean;
  pedido: boolean;
  ads: boolean;
  exposicao: boolean;
  tipo: boolean;
  produto: boolean;
  sku: boolean;
  quantidade: boolean;
  unitario: boolean;
  valor: boolean;
  taxa: boolean;
  frete: boolean;
  cmv: boolean;
  margem: boolean;
}

interface FiltrosVendasProps {
  filtroAtivo: FiltroStatus;
  onFiltroChange: (filtro: FiltroStatus) => void;
  totalVendas?: number;
  vendasPagas?: number;
  vendasCanceladas?: number;
  periodoAtivo?: FiltroPeriodo;
  onPeriodoChange?: (periodo: FiltroPeriodo) => void;
  onPeriodoPersonalizadoChange?: (dataInicio: Date, dataFim: Date) => void;
  // Novos filtros
  filtroADS?: FiltroADS;
  onADSChange?: (filtro: FiltroADS) => void;
  filtroExposicao?: FiltroExposicao;
  onExposicaoChange?: (filtro: FiltroExposicao) => void;
  filtroTipoAnuncio?: FiltroTipoAnuncio;
  onTipoAnuncioChange?: (filtro: FiltroTipoAnuncio) => void;
  filtroModalidadeEnvio?: FiltroModalidadeEnvio;
  onModalidadeEnvioChange?: (filtro: FiltroModalidadeEnvio) => void;
  filtroConta?: string;
  onContaChange?: (contaId: string) => void;
  contasDisponiveis?: Array<{ id: string; nickname: string }>;
  // Colunas visíveis
  colunasVisiveis?: ColunasVisiveis;
  onColunasChange?: (colunas: ColunasVisiveis) => void;
  // Platform
  platform?: "Mercado Livre" | "Shopee" | "Geral";
}

const colunasVisiveisDefault: ColunasVisiveis = {
  data: true,
  canal: true,
  conta: true,
  pedido: true,
  ads: true,
  exposicao: true,
  tipo: true,
  produto: true,
  sku: true,
  quantidade: true,
  unitario: true,
  valor: true,
  taxa: true,
  frete: true,
  cmv: true,
  margem: true,
};

export default function FiltrosVendas({
  filtroAtivo,
  onFiltroChange,
  totalVendas = 0,
  vendasPagas = 0,
  vendasCanceladas = 0,
  periodoAtivo = "todos",
  onPeriodoChange,
  onPeriodoPersonalizadoChange,
  filtroADS = "todos",
  onADSChange,
  filtroExposicao = "todas",
  onExposicaoChange,
  filtroTipoAnuncio = "todos",
  onTipoAnuncioChange,
  filtroModalidadeEnvio = "todos",
  onModalidadeEnvioChange,
  filtroConta = "todas",
  onContaChange,
  contasDisponiveis = [],
  colunasVisiveis = colunasVisiveisDefault,
  onColunasChange,
  platform = "Mercado Livre",
}: FiltrosVendasProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPeriodoDropdown, setShowPeriodoDropdown] = useState(false);
  const [showCalendarioPersonalizado, setShowCalendarioPersonalizado] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Estados para os novos dropdowns
  const [showADSDropdown, setShowADSDropdown] = useState(false);
  const [showExposicaoDropdown, setShowExposicaoDropdown] = useState(false);
  const [showTipoAnuncioDropdown, setShowTipoAnuncioDropdown] = useState(false);
  const [showModalidadeEnvioDropdown, setShowModalidadeEnvioDropdown] = useState(false);
  const [showContaDropdown, setShowContaDropdown] = useState(false);
  const [showColunasDropdown, setShowColunasDropdown] = useState(false);

  // Hook para dropdown de período
  const periodoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showPeriodoDropdown,
    onClose: () => setShowPeriodoDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  // Hooks para os novos dropdowns
  const adsDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showADSDropdown,
    onClose: () => setShowADSDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const exposicaoDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showExposicaoDropdown,
    onClose: () => setShowExposicaoDropdown(false),
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

  const contaDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showContaDropdown,
    onClose: () => setShowContaDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const colunasDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showColunasDropdown,
    onClose: () => setShowColunasDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const filtros = [
    {
      id: "pagos" as FiltroStatus,
      label: "Pagos",
      count: vendasPagas,
      color: "green",
    },
    {
      id: "cancelados" as FiltroStatus,
      label: "Cancelados",
      count: vendasCanceladas,
      color: "red",
    },
    {
      id: "todos" as FiltroStatus,
      label: "Todos",
      count: totalVendas,
      color: "gray",
    },
  ];

  const handleFiltroClick = (filtro: FiltroStatus) => {
    if (filtro === filtroAtivo || isAnimating) return;
    
    setIsAnimating(true);
    onFiltroChange(filtro);
    
    // Reset da animação após um pequeno delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const handlePeriodoClick = (periodo: FiltroPeriodo) => {
    if (periodo === "personalizado") {
      setShowCalendarioPersonalizado(true);
      // Não fechar o dropdown ainda
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

  const getPeriodoLabel = (periodo: FiltroPeriodo) => {
    switch (periodo) {
      case "todos": return "Todos";
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
      default: return "Todos";
    }
  };

  const getADSLabel = (filtro: FiltroADS) => {
    switch (filtro) {
      case "todos": return "Todos";
      case "com_ads": return "Com ADS";
      case "sem_ads": return "Sem ADS";
      default: return "Todos";
    }
  };

  const getExposicaoLabel = (filtro: FiltroExposicao) => {
    switch (filtro) {
      case "todas": return "Todas";
      case "premium": return "Premium";
      case "classico": return "Clássico";
      default: return "Todas";
    }
  };

  const getTipoAnuncioLabel = (filtro: FiltroTipoAnuncio) => {
    switch (filtro) {
      case "todos": return "Todos";
      case "catalogo": return "Catálogo";
      case "proprio": return "Próprio";
      default: return "Todos";
    }
  };

  const getModalidadeEnvioLabel = (filtro: FiltroModalidadeEnvio) => {
    switch (filtro) {
      case "todos": return "Todos";
      case "me": return "Mercado Envios";
      case "full": return "Full";
      case "flex": return "Flex";
      default: return "Todos";
    }
  };

  const getContaLabel = (contaId: string) => {
    if (contaId === "todas") return "Todas as Contas";
    const conta = contasDisponiveis.find(c => c.id === contaId);
    return conta ? conta.nickname : "Todas as Contas";
  };

  // Função para alternar visibilidade de coluna
  const handleToggleColuna = (colunaId: keyof ColunasVisiveis) => {
    if (onColunasChange) {
      onColunasChange({
        ...colunasVisiveis,
        [colunaId]: !colunasVisiveis[colunaId]
      });
    }
  };

  // Função para selecionar todas as colunas
  const handleSelecionarTodas = () => {
    if (onColunasChange) {
      const todasVisiveis: ColunasVisiveis = {
        data: true,
        canal: true,
        conta: true,
        pedido: true,
        ads: true,
        exposicao: true,
        tipo: true,
        produto: true,
        sku: true,
        quantidade: true,
        unitario: true,
        valor: true,
        taxa: true,
        frete: true,
        cmv: true,
        margem: true,
      };
      onColunasChange(todasVisiveis);
    }
  };

  // Função para desselecionar todas as colunas
  const handleDeselecionarTodas = () => {
    if (onColunasChange) {
      const nenhumaVisivel: ColunasVisiveis = {
        data: false,
        canal: false,
        conta: false,
        pedido: false,
        ads: false,
        exposicao: false,
        tipo: false,
        produto: false,
        sku: false,
        quantidade: false,
        unitario: false,
        valor: false,
        taxa: false,
        frete: false,
        cmv: false,
        margem: false,
      };
      onColunasChange(nenhumaVisivel);
    }
  };

  const getFiltroClasses = (filtro: typeof filtros[0], isActive: boolean) => {
    const baseClasses = "relative flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs transition-all duration-300 ease-in-out cursor-pointer select-none";
    
    if (isActive) {
      const colorClasses = {
        gray: "bg-gray-100 text-gray-900 border border-gray-200",
        yellow: "bg-yellow-100 text-yellow-900 border border-yellow-200",
        green: "bg-green-100 text-green-900 border border-green-200",
        red: "bg-red-100 text-red-900 border border-red-200",
      };
      return `${baseClasses} ${colorClasses[filtro.color as keyof typeof colorClasses]}`;
    }
    
    return `${baseClasses} text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-200 border border-transparent`;
  };

  const getBadgeClasses = (filtro: typeof filtros[0], isActive: boolean) => {
    const baseClasses = "inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-xs font-semibold transition-all duration-300";
    
    if (isActive) {
      const colorClasses = {
        gray: "bg-gray-200 text-gray-800",
        yellow: "bg-yellow-200 text-yellow-800",
        green: "bg-green-200 text-green-800",
        red: "bg-red-200 text-red-800",
      };
      return `${baseClasses} ${colorClasses[filtro.color as keyof typeof colorClasses]}`;
    }
    
    return `${baseClasses} bg-gray-100 text-gray-600`;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {/* Filtros de Status */}
        <div className="inline-flex items-center gap-2 p-1 bg-gray-50 rounded-xl border border-gray-200">
          {filtros.map((filtro) => {
            const isActive = filtro.id === filtroAtivo;
            
            return (
              <button
                key={filtro.id}
                onClick={() => handleFiltroClick(filtro.id)}
                className={getFiltroClasses(filtro, isActive)}
                disabled={isAnimating}
              >
                {/* Label do filtro */}
                <span className="font-medium">{filtro.label}</span>
                
                {/* Badge com contagem */}
                {filtro.count > 0 && (
                  <span className={getBadgeClasses(filtro, isActive)}>
                    {filtro.count > 99 ? "99+" : filtro.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          {/* Botão de Filtro ADS - Apenas para Mercado Livre */}
          {platform !== "Shopee" && <div className="relative">
            <button
              ref={adsDropdown.triggerRef}
              onClick={() => setShowADSDropdown(!showADSDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showADSDropdown 
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
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M6 5h12l3 5l-8.5 9.5a.7 .7 0 0 1 -1 0l-8.5 -9.5l3 -5" />
                <path d="M10 12l-2 -2.2l.6 -1" />
              </svg>
              <span>{getADSLabel(filtroADS)}</span>
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
                className={`transition-transform duration-200 ${showADSDropdown ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {/* Dropdown de ADS */}
            {adsDropdown.isVisible && (
              <div 
                ref={adsDropdown.dropdownRef}
                className={`smart-dropdown w-48 ${
                  adsDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={adsDropdown.position}
              >
                <div className="p-2">
                  <div className="space-y-1">
                    {[
                      { id: "todos" as FiltroADS, label: "Todos" },
                      { id: "com_ads" as FiltroADS, label: "Com ADS" },
                      { id: "sem_ads" as FiltroADS, label: "Sem ADS" },
                    ].map((opcao) => (
                      <button
                        key={opcao.id}
                        onClick={() => {
                          if (onADSChange) {
                            onADSChange(opcao.id);
                          }
                          setShowADSDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          filtroADS === opcao.id
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
          </div>}

          {/* Botão de Filtro Exposição - Apenas para Mercado Livre */}
          {platform !== "Shopee" && <div className="relative">
            <button
              ref={exposicaoDropdown.triggerRef}
              onClick={() => setShowExposicaoDropdown(!showExposicaoDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showExposicaoDropdown 
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
                <polygon points="12,2 2,7 12,12 22,7 12,2"/>
                <polyline points="2,17 12,22 22,17"/>
                <polyline points="2,12 12,17 22,12"/>
              </svg>
              <span>{getExposicaoLabel(filtroExposicao)}</span>
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
                className={`transition-transform duration-200 ${showExposicaoDropdown ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {/* Dropdown de Exposição */}
            {exposicaoDropdown.isVisible && (
              <div 
                ref={exposicaoDropdown.dropdownRef}
                className={`smart-dropdown w-48 ${
                  exposicaoDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={exposicaoDropdown.position}
              >
                <div className="p-2">
                  <div className="space-y-1">
                    {[
                      { id: "todas" as FiltroExposicao, label: "Todas" },
                      { id: "premium" as FiltroExposicao, label: "Premium" },
                      { id: "classico" as FiltroExposicao, label: "Clássico" },
                    ].map((opcao) => (
                      <button
                        key={opcao.id}
                        onClick={() => {
                          if (onExposicaoChange) {
                            onExposicaoChange(opcao.id);
                          }
                          setShowExposicaoDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          filtroExposicao === opcao.id
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
          </div>}

          {/* Botão de Filtro Tipo de Anúncio - Apenas para Mercado Livre */}
          {platform !== "Shopee" && <div className="relative">
            <button
              ref={tipoAnuncioDropdown.triggerRef}
              onClick={() => setShowTipoAnuncioDropdown(!showTipoAnuncioDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showTipoAnuncioDropdown 
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
              <span>{getTipoAnuncioLabel(filtroTipoAnuncio)}</span>
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
                className={`transition-transform duration-200 ${showTipoAnuncioDropdown ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {/* Dropdown de Tipo de Anúncio */}
            {tipoAnuncioDropdown.isVisible && (
              <div 
                ref={tipoAnuncioDropdown.dropdownRef}
                className={`smart-dropdown w-48 ${
                  tipoAnuncioDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={tipoAnuncioDropdown.position}
              >
                <div className="p-2">
                  <div className="space-y-1">
                    {[
                      { id: "todos" as FiltroTipoAnuncio, label: "Todos" },
                      { id: "catalogo" as FiltroTipoAnuncio, label: "Catálogo" },
                      { id: "proprio" as FiltroTipoAnuncio, label: "Próprio" },
                    ].map((opcao) => (
                      <button
                        key={opcao.id}
                        onClick={() => {
                          if (onTipoAnuncioChange) {
                            onTipoAnuncioChange(opcao.id);
                          }
                          setShowTipoAnuncioDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          filtroTipoAnuncio === opcao.id
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
          </div>}

          {/* Botão de Filtro Modalidade de Envio - Apenas para Mercado Livre */}
          {platform !== "Shopee" && <div className="relative">
            <button
              ref={modalidadeEnvioDropdown.triggerRef}
              onClick={() => setShowModalidadeEnvioDropdown(!showModalidadeEnvioDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showModalidadeEnvioDropdown 
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
                <path d="M3 3h18l-2 13H5L3 3z"/>
                <path d="M8 3v4"/>
                <path d="M16 3v4"/>
                <path d="M6 19h12"/>
              </svg>
              <span>{getModalidadeEnvioLabel(filtroModalidadeEnvio)}</span>
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
                className={`transition-transform duration-200 ${showModalidadeEnvioDropdown ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {/* Dropdown de Modalidade de Envio */}
            {modalidadeEnvioDropdown.isVisible && (
              <div 
                ref={modalidadeEnvioDropdown.dropdownRef}
                className={`smart-dropdown w-48 ${
                  modalidadeEnvioDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={modalidadeEnvioDropdown.position}
              >
                <div className="p-2">
                  <div className="space-y-1">
                    {[
                      { id: "todos" as FiltroModalidadeEnvio, label: "Todos" },
                      { id: "me" as FiltroModalidadeEnvio, label: "Mercado Envios" },
                      { id: "full" as FiltroModalidadeEnvio, label: "Full" },
                      { id: "flex" as FiltroModalidadeEnvio, label: "Flex" },
                    ].map((opcao) => (
                      <button
                        key={opcao.id}
                        onClick={() => {
                          if (onModalidadeEnvioChange) {
                            onModalidadeEnvioChange(opcao.id);
                          }
                          setShowModalidadeEnvioDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          filtroModalidadeEnvio === opcao.id
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
          </div>}

          {/* Botão de Filtro Conta */}
          <div className="relative">
            <button
              ref={contaDropdown.triggerRef}
              onClick={() => setShowContaDropdown(!showContaDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showContaDropdown 
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>{getContaLabel(filtroConta)}</span>
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
                className={`transition-transform duration-200 ${showContaDropdown ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {/* Dropdown de Conta */}
            {contaDropdown.isVisible && (
              <div 
                ref={contaDropdown.dropdownRef}
                className={`smart-dropdown w-56 ${
                  contaDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={contaDropdown.position}
              >
                <div className="p-2">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        if (onContaChange) {
                          onContaChange("todas");
                        }
                        setShowContaDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        filtroConta === "todas"
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Todas as Contas
                    </button>
                    
                    {contasDisponiveis.length > 0 && (
                      <>
                        <div className="h-px bg-gray-200 my-1" />
                        {contasDisponiveis.map((conta) => (
                          <button
                            key={conta.id}
                            onClick={() => {
                              if (onContaChange) {
                                onContaChange(conta.id);
                              }
                              setShowContaDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                              filtroConta === conta.id
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {conta.nickname}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botão de Período */}
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
                        { id: "hoje" as FiltroPeriodo, label: "Hoje" },
                        { id: "ontem" as FiltroPeriodo, label: "Ontem" },
                        { id: "este_mes" as FiltroPeriodo, label: "Este mês" },
                        { id: "mes_passado" as FiltroPeriodo, label: "Mês passado" },
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

          {/* Botão de Colunas */}
          <div className="relative">
            <button
              ref={colunasDropdown.triggerRef}
              onClick={() => setShowColunasDropdown(!showColunasDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showColunasDropdown 
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
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M3 3m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v16a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z"/>
                <path d="M9 3l0 18"/>
                <path d="M15 3l0 18"/>
              </svg>
              <span>Colunas</span>
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
                className={`transition-transform duration-200 ${showColunasDropdown ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {/* Dropdown de Colunas */}
            {colunasDropdown.isVisible && (
              <div 
                ref={colunasDropdown.dropdownRef}
                className={`smart-dropdown w-64 ${
                  colunasDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
                }`}
                style={colunasDropdown.position}
              >
                <div className="p-3">
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">
                      Exibir/Ocultar Colunas
                    </h3>
                    
                    {/* CSS customizado para checkboxes bonitos */}
                    <style dangerouslySetInnerHTML={{
                      __html: `
                        .custom-checkbox {
                          appearance: none;
                          width: 16px;
                          height: 16px;
                          border: 2px solid #d1d5db;
                          border-radius: 4px;
                          background-color: white;
                          cursor: pointer;
                          position: relative;
                          transition: all 0.2s ease;
                          flex-shrink: 0;
                        }
                        .custom-checkbox:hover {
                          border-color: #3b82f6;
                          background-color: #eff6ff;
                        }
                        .custom-checkbox:checked {
                          background-color: #3b82f6;
                          border-color: #3b82f6;
                        }
                        .custom-checkbox:checked::after {
                          content: '';
                          position: absolute;
                          left: 4px;
                          top: 1px;
                          width: 4px;
                          height: 8px;
                          border: solid white;
                          border-width: 0 2px 2px 0;
                          transform: rotate(45deg);
                          animation: checkmark 0.2s ease;
                        }
                        @keyframes checkmark {
                          0% {
                            height: 0;
                            width: 0;
                            opacity: 0;
                          }
                          50% {
                            height: 8px;
                            width: 4px;
                            opacity: 1;
                          }
                        }
                        .custom-checkbox:focus {
                          outline: none;
                          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                        }
                      `
                    }} />

                    {/* Lista de colunas disponíveis em 2 colunas */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {[
                        { id: "data" as keyof ColunasVisiveis, label: "Data" },
                        { id: "canal" as keyof ColunasVisiveis, label: "Canal" },
                        { id: "conta" as keyof ColunasVisiveis, label: "Conta" },
                        { id: "pedido" as keyof ColunasVisiveis, label: "Id venda" },
                        { id: "ads" as keyof ColunasVisiveis, label: "ADS" },
                        { id: "exposicao" as keyof ColunasVisiveis, label: "Exposição" },
                        { id: "tipo" as keyof ColunasVisiveis, label: "Tipo" },
                        { id: "produto" as keyof ColunasVisiveis, label: "Produto" },
                        { id: "sku" as keyof ColunasVisiveis, label: "SKU" },
                        { id: "quantidade" as keyof ColunasVisiveis, label: "Qtd." },
                        { id: "unitario" as keyof ColunasVisiveis, label: "Unitário" },
                        { id: "valor" as keyof ColunasVisiveis, label: "Valor" },
                        { id: "taxa" as keyof ColunasVisiveis, label: "Taxa" },
                        { id: "frete" as keyof ColunasVisiveis, label: "Frete" },
                        { id: "cmv" as keyof ColunasVisiveis, label: "CMV" },
                        { id: "margem" as keyof ColunasVisiveis, label: "Margem" },
                      ].filter(coluna => {
                        // Esconde colunas de Mercado Livre APENAS quando for Shopee
                        // Na tabela Geral, mantém as colunas disponíveis (mas desmarcadas por padrão)
                        if (platform === "Shopee" && (coluna.id === "ads" || coluna.id === "exposicao" || coluna.id === "tipo")) {
                          return false;
                        }
                        return true;
                      }).map((coluna) => (
                        <label
                          key={coluna.id}
                          className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-50 cursor-pointer transition-colors group"
                        >
                          <input
                            type="checkbox"
                            checked={colunasVisiveis[coluna.id] ?? false}
                            onChange={() => handleToggleColuna(coluna.id)}
                            className="custom-checkbox"
                          />
                          <span className="text-xs text-gray-700 group-hover:text-gray-900 select-none">{coluna.label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-1.5 pt-2 border-t border-gray-200 mt-2">
                      <button
                        onClick={handleSelecionarTodas}
                        className="flex-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        Todas
                      </button>
                      <button
                        onClick={handleDeselecionarTodas}
                        className="flex-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        Nenhuma
                      </button>
                    </div>
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
