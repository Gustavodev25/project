"use client";

import { useState } from "react";
import { useSmartDropdown } from "../../../../hooks/useSmartDropdown";

export type FiltroCanal = "todos" | "mercado_livre" | "shopee";
export type FiltroStatus = "todos" | "pagos" | "cancelados";
export type FiltroTipoAnuncio = "todos" | "catalogo" | "proprio";
export type FiltroModalidadeEnvio = "todos" | "me" | "full" | "flex";

interface FiltrosDashboardExtraProps {
  canalAtivo: FiltroCanal;
  onCanalChange: (v: FiltroCanal) => void;
  statusAtivo: FiltroStatus;
  onStatusChange: (v: FiltroStatus) => void;
  tipoAnuncioAtivo: FiltroTipoAnuncio;
  onTipoAnuncioChange: (v: FiltroTipoAnuncio) => void;
  modalidadeEnvioAtiva: FiltroModalidadeEnvio;
  onModalidadeEnvioChange: (v: FiltroModalidadeEnvio) => void;
}

export default function FiltrosDashboardExtra({
  canalAtivo,
  onCanalChange,
  statusAtivo,
  onStatusChange,
  tipoAnuncioAtivo,
  onTipoAnuncioChange,
  modalidadeEnvioAtiva,
  onModalidadeEnvioChange,
}: FiltrosDashboardExtraProps) {

  const [showCanalDropdown, setShowCanalDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTipoAnuncioDropdown, setShowTipoAnuncioDropdown] = useState(false);
  const [showModalidadeEnvioDropdown, setShowModalidadeEnvioDropdown] = useState(false);

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
      {/* Canal de Venda */}
      <div className="relative">
        <button
          ref={canalDropdown.triggerRef}
          onClick={() => setShowCanalDropdown(!showCanalDropdown)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
            showCanalDropdown 
              ? "border-gray-400 bg-gray-50 text-gray-900" 
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.36 0 .7.07 1 .2" />
          </svg>
          <span>{getCanalLabel(canalAtivo)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showCanalDropdown ? 'rotate-180' : ''}`}>
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>

        {canalDropdown.isVisible && (
          <div 
            ref={canalDropdown.dropdownRef}
            className={`smart-dropdown w-56 ${
              canalDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
            }`}
            style={canalDropdown.position}
          >
            <div className="p-2">
              <div className="space-y-1">
                {[
                  { id: "todos" as FiltroCanal, label: "Todos os Canais" },
                  { id: "mercado_livre" as FiltroCanal, label: "Mercado Livre" },
                  { id: "shopee" as FiltroCanal, label: "Shopee" },
                ].map((opcao) => (
                  <button
                    key={opcao.id}
                    onClick={() => { onCanalChange(opcao.id); setShowCanalDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      canalAtivo === opcao.id
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

      {/* Status (ML/Shopee) */}
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
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>Status: {getStatusLabel(statusAtivo)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`}>
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>

        {statusDropdown.isVisible && (
          <div 
            ref={statusDropdown.dropdownRef}
            className={`smart-dropdown w-48 ${
              statusDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'
            }`}
            style={statusDropdown.position}
          >
            <div className="p-2">
              <div className="space-y-1">
                {[
                  { id: "todos" as FiltroStatus, label: "Todos" },
                  { id: "pagos" as FiltroStatus, label: "Pagos" },
                  { id: "cancelados" as FiltroStatus, label: "Cancelados" },
                ].map((opcao) => (
                  <button
                    key={opcao.id}
                    onClick={() => { onStatusChange(opcao.id); setShowStatusDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      statusAtivo === opcao.id
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

      {/* Tipo de Anúncio (ML) */}
      <div className="relative">
        <button
          ref={tipoAnuncioDropdown.triggerRef}
          onClick={() => setShowTipoAnuncioDropdown(!showTipoAnuncioDropdown)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
            showTipoAnuncioDropdown 
              ? "border-gray-400 bg-gray-50 text-gray-900" 
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="14" rx="2" ry="2"/>
            <path d="M7 8h10" />
          </svg>
          <span>Tipo: {getTipoAnuncioLabel(tipoAnuncioAtivo)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showTipoAnuncioDropdown ? 'rotate-180' : ''}`}>
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>

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
                    onClick={() => { onTipoAnuncioChange(opcao.id); setShowTipoAnuncioDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      tipoAnuncioAtivo === opcao.id
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

      {/* Modalidade de Envio (ML) */}
      <div className="relative">
        <button
          ref={modalidadeEnvioDropdown.triggerRef}
          onClick={() => setShowModalidadeEnvioDropdown(!showModalidadeEnvioDropdown)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
            showModalidadeEnvioDropdown 
              ? "border-gray-400 bg-gray-50 text-gray-900" 
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 13h2l1 2h13" />
            <path d="M5 6h14l-1 7H6z" />
          </svg>
          <span>Envio: {getModalidadeEnvioLabel(modalidadeEnvioAtiva)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showModalidadeEnvioDropdown ? 'rotate-180' : ''}`}>
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>

        {modalidadeEnvioDropdown.isVisible && (
          <div 
            ref={modalidadeEnvioDropdown.dropdownRef}
            className={`smart-dropdown w-56 ${
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
                    onClick={() => { onModalidadeEnvioChange(opcao.id); setShowModalidadeEnvioDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      modalidadeEnvioAtiva === opcao.id
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
  );
}
