"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSmartDropdown } from "@/hooks/useSmartDropdown";
import FiltrosDashboard, { FiltroPeriodo } from "./FiltrosDashboard";
import FiltrosDashboardExtra, { type FiltroCanal, type FiltroStatus, type FiltroTipoAnuncio, type FiltroModalidadeEnvio } from "./FiltrosDashboardExtra";
import FiltroSKU, { type FiltroAgrupamentoSKU } from "./FiltroSKU";
import ModalSyncVendasDashboard from "./ModalSyncVendasDashboard";

interface HeaderDashboardProps {
  periodoAtivo: FiltroPeriodo;
  onPeriodoChange: (periodo: FiltroPeriodo) => void;
  onPeriodoPersonalizadoChange?: (dataInicio: Date, dataFim: Date) => void;
  canalAtivo: FiltroCanal;
  onCanalChange: (v: FiltroCanal) => void;
  statusAtivo: FiltroStatus;
  onStatusChange: (v: FiltroStatus) => void;
  tipoAnuncioAtivo: FiltroTipoAnuncio;
  onTipoAnuncioChange: (v: FiltroTipoAnuncio) => void;
  modalidadeEnvioAtiva: FiltroModalidadeEnvio;
  onModalidadeEnvioChange: (v: FiltroModalidadeEnvio) => void;
  agrupamentoSKUAtivo: FiltroAgrupamentoSKU;
  onAgrupamentoSKUChange: (v: FiltroAgrupamentoSKU) => void;
  onForceRefresh: () => void;
  selectedAccount?: { platform: 'meli' | 'shopee' | 'todos'; id?: string; label?: string };
  onAccountChange?: (account: { platform: 'meli' | 'shopee' | 'todos'; id?: string; label?: string }) => void;
}

export default function HeaderDashboard({
  periodoAtivo,
  onPeriodoChange,
  onPeriodoPersonalizadoChange,
  canalAtivo,
  onCanalChange,
  statusAtivo,
  onStatusChange,
  tipoAnuncioAtivo,
  onTipoAnuncioChange,
  modalidadeEnvioAtiva,
  onModalidadeEnvioChange,
  agrupamentoSKUAtivo,
  onAgrupamentoSKUChange,
  onForceRefresh,
  selectedAccount,
  onAccountChange,
}: HeaderDashboardProps) {
  const router = useRouter();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showSyncDropdown, setShowSyncDropdown] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'todos' | 'mercado_livre' | 'shopee'>('todos');
  const syncDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showSyncDropdown,
    onClose: () => setShowSyncDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });

  const [showContasDropdown, setShowContasDropdown] = useState(false);
  const contasDropdown = useSmartDropdown<HTMLButtonElement>({
    isOpen: showContasDropdown,
    onClose: () => setShowContasDropdown(false),
    preferredPosition: 'bottom-right',
    offset: 8,
    minDistanceFromEdge: 16
  });
  const [contasML, setContasML] = useState<Array<{ id: string; nickname: string | null; ml_user_id: number; expires_at: string }>>([]);
  const [contasShopee, setContasShopee] = useState<Array<{ id: string; shop_id: string; shop_name: string | null; expires_at: string }>>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  useEffect(() => {
    if (!showContasDropdown) return;
    let aborted = false;
    const load = async () => {
      try {
        setIsLoadingAccounts(true);
        
        // Carregar contas do Mercado Livre
        const resML = await fetch('/api/meli/accounts', { cache: 'no-store', credentials: 'include' });
        if (resML.ok) {
          const rowsML = await resML.json();
          if (!aborted) setContasML(rowsML || []);
        }
        
        // Carregar contas do Shopee
        const resShopee = await fetch('/api/shopee/accounts', { cache: 'no-store', credentials: 'include' });
        if (resShopee.ok) {
          const rowsShopee = await resShopee.json();
          if (!aborted) setContasShopee(rowsShopee || []);
        }
      } catch {
        if (!aborted) {
          setContasML([]);
          setContasShopee([]);
        }
      } finally {
        if (!aborted) setIsLoadingAccounts(false);
      }
    };
    load();
    return () => { aborted = true; };
  }, [showContasDropdown]);

  const handleSyncComplete = () => {
    // Recarregar dados do dashboard após sincronização
    onForceRefresh();
  };

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-6">
        <div className="text-left flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Visão geral das estatísticas e métricas do negócio.
          </p>
        </div>
        
        {/* Botão de Sincronizar em Destaque */}
        <div className="flex-shrink-0">
          <div className="relative">
            <button
              ref={syncDropdown.triggerRef}
              onClick={() => {
                setShowSyncDropdown(!showSyncDropdown);
                if (!showSyncDropdown) {
                  setShowSyncModal(false);
                }
              }}
              className={`inline-flex items-center gap-3 rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 shadow-sm ${
                showSyncDropdown 
                  ? "bg-orange-600 border-orange-600 text-white ring-2 ring-orange-200" 
                  : "bg-orange-500 border-orange-500 text-white hover:bg-orange-600 hover:border-orange-600"
              }`}
            >
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
                className="icon icon-tabler icons-tabler-outline icon-tabler-shopping-bag"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
                <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
              </svg>
              <span>Sincronizar vendas</span>
            </button>
            {syncDropdown.isVisible && (
              <div 
                ref={syncDropdown.dropdownRef}
                className={`smart-dropdown w-72 ${syncDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={syncDropdown.position}
              >
                <div className="p-3 space-y-3">
                  {/* Seletor de Plataforma */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-700 mb-1.5 block">Plataforma</label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => setSelectedPlatform('todos')}
                        className={`px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
                          selectedPlatform === 'todos'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setSelectedPlatform('mercado_livre')}
                        className={`px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
                          selectedPlatform === 'mercado_livre'
                            ? 'bg-yellow-400 text-gray-900'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Meli
                      </button>
                      <button
                        onClick={() => setSelectedPlatform('shopee')}
                        className={`px-2 py-1.5 text-[10px] font-medium rounded transition-colors ${
                          selectedPlatform === 'shopee'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Shopee
                      </button>
                    </div>
                  </div>

                  {/* Botão de Sincronizar */}
                  <button
                    onClick={() => {
                      setShowSyncDropdown(false);
                      setShowSyncModal(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-orange-500 bg-orange-500 px-3 py-2 text-xs font-medium text-white hover:bg-orange-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    <span>Iniciar Sincronização</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Sincronização */}
        <ModalSyncVendasDashboard
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          selectedPlatform={selectedPlatform}
          onSyncComplete={handleSyncComplete}
        />
      </div>

      {/* Filtros e Contas */}
      <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Filtro de Agrupamento por SKU */}
          <FiltroSKU
            agrupamentoAtivo={agrupamentoSKUAtivo}
            onAgrupamentoChange={onAgrupamentoSKUChange}
          />
          
          <FiltrosDashboardExtra 
            canalAtivo={canalAtivo}
            onCanalChange={onCanalChange}
            statusAtivo={statusAtivo}
            onStatusChange={onStatusChange}
            tipoAnuncioAtivo={tipoAnuncioAtivo}
            onTipoAnuncioChange={onTipoAnuncioChange}
            modalidadeEnvioAtiva={modalidadeEnvioAtiva}
            onModalidadeEnvioChange={onModalidadeEnvioChange}
          />
          <FiltrosDashboard
            periodoAtivo={periodoAtivo}
            onPeriodoChange={onPeriodoChange}
            onPeriodoPersonalizadoChange={onPeriodoPersonalizadoChange}
          />
        </div>

        {/* Contas Dropdown */}
        <div className="flex-shrink-0">
          <div className="relative">
            <button
              ref={contasDropdown.triggerRef}
              onClick={() => setShowContasDropdown(!showContasDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                showContasDropdown 
                  ? "border-gray-400 bg-gray-50 text-gray-900" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{selectedAccount?.label ? selectedAccount.label : 'Contas'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showContasDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>
            {contasDropdown.isVisible && (
              <div 
                ref={contasDropdown.dropdownRef}
                className={`smart-dropdown w-80 ${contasDropdown.isOpen ? 'dropdown-enter' : 'dropdown-exit'}`}
                style={contasDropdown.position}
              >
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-900">Selecionar conta</h3>
                    <button
                      className="text-[11px] text-gray-600 hover:text-gray-900 underline"
                      onClick={() => {
                        onAccountChange && onAccountChange({ platform: 'todos' });
                        setShowContasDropdown(false);
                      }}
                    >
                      Limpar filtro
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Mercado Livre</h3>
                    {isLoadingAccounts ? (
                      <div className="text-xs text-gray-600">Carregando...</div>
                    ) : contasML.length === 0 ? (
                      <div className="text-xs text-gray-600">Nenhuma conta conectada</div>
                    ) : (
                      <ul className="space-y-1">
                        {contasML.map((c) => (
                          <li key={c.id} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-gray-50">
                            <button
                              className={`flex-1 text-left ${selectedAccount?.platform === 'meli' && selectedAccount?.id === c.id ? 'font-semibold text-gray-900' : 'text-gray-800'}`}
                              onClick={() => {
                                onAccountChange && onAccountChange({ platform: 'meli', id: c.id, label: c.nickname || `Usuário ${c.ml_user_id}` });
                                setShowContasDropdown(false);
                              }}
                            >
                              {c.nickname || `Usuário ${c.ml_user_id}`}
                            </button>
                            <span className={`ml-2 px-2 py-0.5 rounded-full ${new Date(c.expires_at).getTime() > Date.now() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {new Date(c.expires_at).getTime() > Date.now() ? 'Ativa' : 'Inativa'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Shopee</h3>
                    {isLoadingAccounts ? (
                      <div className="text-xs text-gray-600">Carregando...</div>
                    ) : contasShopee.length === 0 ? (
                      <div className="text-xs text-gray-600">Nenhuma conta conectada</div>
                    ) : (
                      <ul className="space-y-1">
                        {contasShopee.map((c) => (
                          <li key={c.id} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-gray-50">
                            <button
                              className={`flex-1 text-left ${selectedAccount?.platform === 'shopee' && selectedAccount?.id === c.id ? 'font-semibold text-gray-900' : 'text-gray-800'}`}
                              onClick={() => {
                                onAccountChange && onAccountChange({ platform: 'shopee', id: c.id, label: c.shop_name || `Shop ${c.shop_id}` });
                                setShowContasDropdown(false);
                              }}
                            >
                              {c.shop_name || `Shop ${c.shop_id}`}
                            </button>
                            <span className={`ml-2 px-2 py-0.5 rounded-full ${new Date(c.expires_at).getTime() > Date.now() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {new Date(c.expires_at).getTime() > Date.now() ? 'Ativa' : 'Inativa'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
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

