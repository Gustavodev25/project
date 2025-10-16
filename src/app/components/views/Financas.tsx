"use client";

import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import gsap from "gsap";
import Sidebar from "./ui/Sidebar";
import Topbar from "./ui/Topbar";
import { EmptyState } from "./ui/CardsContas";
import Modal from "./ui/Modal";
import EditModal from "./ui/EditModal";
import DeleteModal from "./ui/DeleteModal";
import { useToast } from "./ui/toaster";
import { ImportFinanceModal } from "./ui/ImportFinanceModal";
import VendasPagination from "./ui/VendasPagination";
import { useSyncProgress } from "@/hooks/useSyncProgress";
import FiltrosFinancas, { FiltroPeriodo, FiltroStatus, FiltroOrigem } from "./ui/FiltrosFinancas";

const FULL_W = "16rem";
const RAIL_W = "4rem";
const LS_KEY = "cz_sidebar_collapsed";

// useLayoutEffect no browser; fallback para useEffect no SSR
const useIsoLayout =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type TabOption = "contas_pagar" | "contas_receber" | "categorias" | "formas_pagamento";

interface HeaderFinancasProps {
  activeTab: TabOption;
  onTabChange: (tab: TabOption) => void;
  onAddNew: () => void;
  onImportClick: () => void;
  onIncrementalSync?: () => void;
  hasSyncedBefore?: boolean;
  isIncrementalSyncing?: boolean;
  filtrosComponent?: React.ReactNode;
}

const HeaderFinancas = ({ 
  activeTab, 
  onTabChange, 
  onAddNew, 
  onImportClick, 
  onIncrementalSync, 
  hasSyncedBefore = false, 
  isIncrementalSyncing = false,
  filtrosComponent
}: HeaderFinancasProps) => {
  const tabs = [
    { id: "contas_pagar" as TabOption, label: "Contas a Pagar" },
    { id: "contas_receber" as TabOption, label: "Contas a Receber" },
    { id: "categorias" as TabOption, label: "Categorias" },
    { id: "formas_pagamento" as TabOption, label: "Formas de Pagamento" },
  ];

  const getButtonLabel = () => {
    switch (activeTab) {
      case "contas_pagar":
        return "Adicionar Despesa";
      case "contas_receber":
        return "Adicionar Receita";
      case "categorias":
        return "Adicionar Categoria";
      case "formas_pagamento":
        return "Adicionar Forma de Pagamento";
      default:
        return "Adicionar";
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="text-left">
          <h1 className="text-2xl font-semibold text-gray-900">
            Finanças
          </h1>
          <p className="mt-1 text-sm text-gray-600 text-left">
            Gerencie suas finanças, contas a pagar e receber.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão de Atualização Incremental - só aparece após primeira sincronização */}
          {hasSyncedBefore && onIncrementalSync && (
            <button
              onClick={onIncrementalSync}
              disabled={isIncrementalSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIncrementalSyncing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Atualizando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Atualizar
                </>
              )}
            </button>
          )}

          {/* Botão de Importar Excel */}
          <button
            onClick={onImportClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Importar Excel
          </button>

          {/* Botão de Adicionar */}
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors shadow-sm"
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
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {getButtonLabel()}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={[
                  activeTab === tab.id
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                  "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                ].join(" ")}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          
          {/* Filtros na mesma linha das tabs */}
          {filtrosComponent && (
            <div className="flex items-center gap-2 pb-px">
              {filtrosComponent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const emptyStateIcons = [
  <svg
    key="icon1"
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>,
];

export default function Financas() {
  const toast = useToast();
  const { connect, disconnect, isConnected } = useSyncProgress();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "1";
  });
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabOption>("contas_pagar");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>("");
  const [isIncrementalSyncing, setIsIncrementalSyncing] = useState(false);
  const [hasSyncedBefore, setHasSyncedBefore] = useState(false);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [pagePagar, setPagePagar] = useState(1);
  const [pageReceber, setPageReceber] = useState(1);
  const itemsPerPage = 15;
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados de filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | null>(null);
  const [filtroDataFim, setFiltroDataFim] = useState<Date | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroOrigem, setFiltroOrigem] = useState<FiltroOrigem>("todas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Estados para modais de edição e exclusão
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  
  // Estado para modal de JSON
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonItem, setJsonItem] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    dataPagamento: new Date().toISOString().split('T')[0],
    categoriaId: "",
    formaPagamentoId: "",
    tipo: "",
    categoriaPaiId: "",
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasInitialSet = useRef(false);
  useIsoLayout(() => {
    if (hasInitialSet.current) return;
    const el = containerRef.current;
    if (!el) return;
    hasInitialSet.current = true;
    gsap.set(el, {
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isSidebarCollapsed]);

  useIsoLayout(() => {
    const el = containerRef.current;
    if (!el) return;
    gsap.to(el, {
      duration: 0.35,
      ease: "power2.inOut",
      css: { "--sidebar-w": isSidebarCollapsed ? RAIL_W : FULL_W },
    });
  }, [isSidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, isSidebarCollapsed ? "1" : "0");
    } catch {}
  }, [isSidebarCollapsed]);

  const mdLeftVar = "md:left-[var(--sidebar-w,16rem)]";
  const mdMlVar = "md:ml-[var(--sidebar-w,16rem)]";

  const getTabDescription = () => {
    switch (activeTab) {
      case "contas_pagar":
        return "contas a pagar";
      case "contas_receber":
        return "contas a receber";
      case "categorias":
        return "categorias";
      case "formas_pagamento":
        return "formas de pagamento";
      default:
        return "";
    }
  };

  const loadFormasPagamento = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/financeiro/formas-pagamento", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormasPagamento(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar formas de pagamento:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContasPagar = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/financeiro/contas-pagar", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setContasPagar(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar contas a pagar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContasReceber = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/financeiro/contas-receber", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setContasReceber(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar contas a receber:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress("");

    try {
      // Conectar ao SSE para receber progresso em tempo real
      connect();

      // Definir ordem de sincronização baseada nas dependências
      const syncOrder = [];

      if (activeTab === "contas_pagar" || activeTab === "contas_receber") {
        // Precisa sincronizar as dependências primeiro
        setSyncProgress("Sincronizando formas de pagamento...");
        const formasPagamentoRes = await fetch("/api/financeiro/formas-pagamento/sync", {
          method: "POST",
          credentials: "include",
        });

        if (!formasPagamentoRes.ok) {
          const errorData = await formasPagamentoRes.json().catch(() => ({}));
          if (errorData.requiresReconnection) {
            throw new Error("Tokens do Bling expirados. Reconecte sua conta Bling para continuar.");
          }
          throw new Error("Erro ao sincronizar formas de pagamento");
        }

        setSyncProgress("Sincronizando categorias...");
        const categoriasRes = await fetch("/api/financeiro/categorias/sync", {
          method: "POST",
          credentials: "include",
        });

        if (!categoriasRes.ok) {
          const errorData = await categoriasRes.json().catch(() => ({}));
          if (errorData.requiresReconnection) {
            throw new Error("Tokens do Bling expirados. Reconecte sua conta Bling para continuar.");
          }
          throw new Error("Erro ao sincronizar categorias");
        }

        // Agora sincroniza Contas a Receber e depois Contas a Pagar (ordem fixa)
        setSyncProgress("Sincronizando contas a receber...");
        let res = await fetch("/api/financeiro/contas-receber/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.requiresReconnection) {
            throw new Error("Tokens do Bling expirados. Reconecte sua conta Bling para continuar.");
          }
          throw new Error("Erro ao sincronizar contas a receber");
        }

        setSyncProgress("Sincronizando contas a pagar...");
        res = await fetch("/api/financeiro/contas-pagar/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.requiresReconnection) {
            throw new Error("Tokens do Bling expirados. Reconecte sua conta Bling para continuar.");
          }
          throw new Error("Erro ao sincronizar contas a pagar");
        }
      } else {
        // Sincronização completa em sequência: FP -> Categorias -> Receber -> Pagar
        setSyncProgress("Sincronizando formas de pagamento...");
        let res = await fetch("/api/financeiro/formas-pagamento/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.requiresReconnection) {
            throw new Error("Tokens do Bling expirados. Reconecte sua conta Bling para continuar.");
          }
          throw new Error("Erro ao sincronizar formas de pagamento");
        }

        setSyncProgress("Sincronizando categorias...");
        res = await fetch("/api/financeiro/categorias/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.requiresReconnection) {
            throw new Error("Tokens do Bling expirados. Reconecte sua conta Bling para continuar.");
          }
          throw new Error("Erro ao sincronizar categorias");
        }

        setSyncProgress("Sincronizando contas a receber...");
        res = await fetch("/api/financeiro/contas-receber/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.requiresReconnection) {
            throw new Error("Tokens do Bling expirados. Reconecte sua conta Bling para continuar.");
          }
          throw new Error("Erro ao sincronizar contas a receber");
        }

        setSyncProgress("Sincronizando contas a pagar...");
        res = await fetch("/api/financeiro/contas-pagar/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (errorData.requiresReconnection) {
            throw new Error("Tokens do Bling expirados. Reconecte sua conta Bling para continuar.");
          }
          throw new Error("Erro ao sincronizar contas a pagar");
        }
      }

      setSyncProgress("Sincronização concluída!");
      
      // Recarregar dados após sincronização
      if (activeTab === "formas_pagamento") {
        await loadFormasPagamento();
      }
      
      // Garantir recarga também para outras abas
      if (activeTab === "categorias") {
        await loadCategorias();
      } else if (activeTab === "contas_pagar") {
        await loadContasPagar();
      } else if (activeTab === "contas_receber") {
        await loadContasReceber();
      }

      // Marcar que já foi sincronizado para habilitar o botão de atualização
      setHasSyncedBefore(true);
      
      setTimeout(() => {
        setSyncProgress("");
      }, 2000);
    } catch (error) {
      console.error("Erro na sincronização:", error);
      setSyncProgress("Erro na sincronização. Tente novamente.");
      setTimeout(() => {
        setSyncProgress("");
      }, 3000);
    } finally {
      setIsSyncing(false);
      // Desconectar do SSE após sincronização
      disconnect();
    }
  };

  const handleIncrementalSync = async () => {
    setIsIncrementalSyncing(true);
    
    try {
      // Conectar ao SSE para receber progresso em tempo real
      connect();

      // Sincronização incremental - apenas busca dados novos/atualizados
      const syncPromises = [];

      // Sincronizar apenas as dependências necessárias
      if (activeTab === "contas_pagar" || activeTab === "contas_receber") {
        syncPromises.push(
          fetch("/api/financeiro/formas-pagamento/sync", {
            method: "POST",
            credentials: "include",
          }).then(res => {
            if (!res.ok) throw new Error("Erro ao sincronizar formas de pagamento");
            return res.json();
          })
        );

        syncPromises.push(
          fetch("/api/financeiro/categorias/sync", {
            method: "POST",
            credentials: "include",
          }).then(res => {
            if (!res.ok) throw new Error("Erro ao sincronizar categorias");
            return res.json();
          })
        );
      }

      // Aguardar dependências
      await Promise.all(syncPromises);

      // Sincronizar dados específicos da aba ativa
      if (activeTab === "contas_receber") {
        const res = await fetch("/api/financeiro/contas-receber/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Erro ao sincronizar contas a receber");
        await res.json();
      } else if (activeTab === "contas_pagar") {
        const res = await fetch("/api/financeiro/contas-pagar/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Erro ao sincronizar contas a pagar");
        await res.json();
      } else if (activeTab === "categorias") {
        const res = await fetch("/api/financeiro/categorias/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Erro ao sincronizar categorias");
        await res.json();
      } else if (activeTab === "formas_pagamento") {
        const res = await fetch("/api/financeiro/formas-pagamento/sync", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Erro ao sincronizar formas de pagamento");
        await res.json();
      }

      // Recarregar dados da aba ativa
      if (activeTab === "formas_pagamento") {
        await loadFormasPagamento();
      } else if (activeTab === "categorias") {
        await loadCategorias();
      } else if (activeTab === "contas_pagar") {
        await loadContasPagar();
      } else if (activeTab === "contas_receber") {
        await loadContasReceber();
      }

      toast.toast({
        variant: "success",
        title: "✅ Atualização Concluída",
        description: "Dados atualizados com sucesso!",
        duration: 3000
      });

    } catch (error) {
      console.error("Erro na sincronização incremental:", error);
      toast.toast({
        variant: "error",
        title: "❌ Erro na Atualização",
        description: `Erro ao atualizar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        duration: 5000
      });
    } finally {
      setIsIncrementalSyncing(false);
      // Desconectar do SSE após sincronização
      disconnect();
    }
  };

  const loadCategorias = async () => {
    // Mostra loader quando a aba de categorias está ativa
    if (activeTab === "categorias") setIsLoading(true);
    try {
      const response = await fetch("/api/financeiro/categorias", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCategorias(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    } finally {
      if (activeTab === "categorias") setIsLoading(false);
    }
  };

  // Carregar dados quando necessário
  useEffect(() => {
    if (activeTab === "formas_pagamento") {
      loadFormasPagamento();
    } else if (activeTab === "categorias") {
      loadCategorias();
    } else if (activeTab === "contas_pagar") {
      loadContasPagar();
    } else if (activeTab === "contas_receber") {
      loadContasReceber();
    }
  }, [activeTab]);

  // Carregar formas de pagamento e categorias quando abrir modais de despesa/receita
  useEffect(() => {
    if (isModalOpen && (activeTab === "contas_pagar" || activeTab === "contas_receber")) {
      loadFormasPagamento();
      loadCategorias();
    }
  }, [isModalOpen, activeTab]);

  const handleOpenModal = () => {
    setFormData({
      descricao: "",
      valor: "",
      dataPagamento: new Date().toISOString().split('T')[0],
      categoriaId: "",
      formaPagamentoId: "",
      tipo: "",
      categoriaPaiId: "",
    });
    setIsModalOpen(true);
  };

  // Aplicar filtros de período
  const calcularPeriodo = (periodo: FiltroPeriodo) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    switch (periodo) {
      case "hoje":
        return { inicio: hoje, fim: hoje };
      case "ontem": {
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        return { inicio: ontem, fim: ontem };
      }
      case "este_mes": {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        return { inicio, fim };
      }
      case "mes_passado": {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        return { inicio, fim };
      }
      case "personalizado":
        if (filtroDataInicio && filtroDataFim) {
          return { inicio: filtroDataInicio, fim: filtroDataFim };
        }
        return null;
      default:
        return null;
    }
  };

  // Aplicar filtros
  const aplicarFiltros = (contas: any[]) => {
    return contas.filter(conta => {
      // Filtro de data/período
      const periodo = calcularPeriodo(filtroPeriodo);
      if (periodo) {
        const dataVencimento = new Date(conta.dataVencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        const inicio = new Date(periodo.inicio);
        inicio.setHours(0, 0, 0, 0);
        const fim = new Date(periodo.fim);
        fim.setHours(23, 59, 59, 999);
        if (dataVencimento < inicio || dataVencimento > fim) return false;
      }
      // Filtro de categoria
      if (filtroCategoria !== "todas" && conta.categoriaId !== filtroCategoria) return false;
      // Filtro de status
      if (filtroStatus !== "todos" && conta.status !== filtroStatus) return false;
      // Filtro de origem
      if (filtroOrigem !== "todas" && conta.origem !== filtroOrigem) return false;
      return true;
    });
  };

  // Paginação (client-side) para tabelas de contas
  const contasPagarFiltradas = aplicarFiltros(contasPagar);
  const contasReceberFiltradas = aplicarFiltros(contasReceber);
  const totalPagar = contasPagarFiltradas.length;
  const totalReceber = contasReceberFiltradas.length;
  const totalPagesPagar = Math.max(1, Math.ceil(totalPagar / itemsPerPage));
  const totalPagesReceber = Math.max(1, Math.ceil(totalReceber / itemsPerPage));
  const paginatedContasPagar = contasPagarFiltradas.slice((pagePagar - 1) * itemsPerPage, pagePagar * itemsPerPage);
  const paginatedContasReceber = contasReceberFiltradas.slice((pageReceber - 1) * itemsPerPage, pageReceber * itemsPerPage);

  useEffect(() => {
    // Garantir que a página atual exista após alterações de dados
    if (pagePagar > totalPagesPagar) setPagePagar(totalPagesPagar);
  }, [totalPagesPagar]);
  useEffect(() => {
    if (pageReceber > totalPagesReceber) setPageReceber(totalPagesReceber);
  }, [totalPagesReceber]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};

      switch (activeTab) {
        case "contas_pagar":
          endpoint = "/api/financeiro/contas-pagar";
          body = {
            descricao: formData.descricao,
            valor: formData.valor,
            dataPagamento: formData.dataPagamento,
            categoriaId: formData.categoriaId || null,
            formaPagamentoId: formData.formaPagamentoId || null,
          };
          break;
        case "contas_receber":
          endpoint = "/api/financeiro/contas-receber";
          body = {
            descricao: formData.descricao,
            valor: formData.valor,
            dataPagamento: formData.dataPagamento,
            categoriaId: formData.categoriaId || null,
            formaPagamentoId: formData.formaPagamentoId || null,
          };
          break;
        case "categorias":
          endpoint = "/api/financeiro/categorias";
          body = {
            descricao: formData.descricao,
            tipo: formData.tipo,
            categoriaPaiId: formData.categoriaPaiId || undefined,
          };
          break;
        case "formas_pagamento":
          endpoint = "/api/financeiro/formas-pagamento";
          body = {
            descricao: formData.descricao,
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar registro");
      }

      // Recarregar dados
      if (activeTab === "formas_pagamento") {
        await loadFormasPagamento();
      } else if (activeTab === "categorias") {
        await loadCategorias();
      } else if (activeTab === "contas_pagar") {
        await loadContasPagar();
      } else if (activeTab === "contas_receber") {
        await loadContasReceber();
      }

      toast.toast({
        variant: "success",
        title: "Sucesso!",
        description: `Registro ${activeTab === "contas_pagar" ? "de despesa" : activeTab === "contas_receber" ? "de receita" : activeTab === "categorias" ? "de categoria" : "de forma de pagamento"} salvo com sucesso!`,
      });

      handleCloseModal();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.toast({
        variant: "error",
        title: "Erro ao salvar",
        description: "Erro ao salvar registro. Tente novamente.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Funções para editar e excluir
  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = (item: any) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleViewJson = (item: any) => {
    setJsonItem(item);
    setIsJsonModalOpen(true);
  };

  const handleCloseJsonModal = () => {
    setIsJsonModalOpen(false);
    setJsonItem(null);
  };

  const handleEditSave = async (data: any) => {
    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};

      switch (activeTab) {
        case "contas_pagar":
          endpoint = `/api/financeiro/contas-pagar/${editingItem.id}`;
          body = {
            descricao: data.descricao,
            valor: parseFloat(data.valor),
            dataPagamento: data.dataPagamento,
            categoriaId: data.categoriaId,
            formaPagamentoId: data.formaPagamentoId,
          };
          break;
        case "contas_receber":
          endpoint = `/api/financeiro/contas-receber/${editingItem.id}`;
          body = {
            descricao: data.descricao,
            valor: parseFloat(data.valor),
            dataRecebimento: data.dataPagamento,
            categoriaId: data.categoriaId,
            formaPagamentoId: data.formaPagamentoId,
          };
          break;
        case "categorias":
          endpoint = `/api/financeiro/categorias/${editingItem.id}`;
          body = {
            descricao: data.descricao,
            tipo: data.tipo,
            categoriaPaiId: data.categoriaPaiId || undefined,
          };
          break;
        case "formas_pagamento":
          endpoint = `/api/financeiro/formas-pagamento/${editingItem.id}`;
          body = {
            nome: data.descricao,
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorMessage = "Erro ao atualizar registro";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Se não conseguir fazer parse do JSON, usar a mensagem padrão
          console.error("Erro ao fazer parse da resposta:", parseError);
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Recarregar dados
      switch (activeTab) {
        case "contas_pagar":
          await loadContasPagar();
          break;
        case "contas_receber":
          await loadContasReceber();
          break;
        case "categorias":
          await loadCategorias();
          break;
        case "formas_pagamento":
          await loadFormasPagamento();
          break;
      }

      toast.toast({
        variant: "success",
        title: "Sucesso!",
        description: `Registro ${activeTab === "contas_pagar" ? "de despesa" : activeTab === "contas_receber" ? "de receita" : activeTab === "categorias" ? "de categoria" : "de forma de pagamento"} atualizado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.toast({
        variant: "error",
        title: "Erro ao atualizar",
        description: "Erro ao atualizar registro. Tente novamente.",
      });
      throw error;
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      let endpoint = "";

      switch (activeTab) {
        case "contas_pagar":
          endpoint = `/api/financeiro/contas-pagar/${deletingItem.id}`;
          break;
        case "contas_receber":
          endpoint = `/api/financeiro/contas-receber/${deletingItem.id}`;
          break;
        case "categorias":
          endpoint = `/api/financeiro/categorias/${deletingItem.id}`;
          break;
        case "formas_pagamento":
          endpoint = `/api/financeiro/formas-pagamento/${deletingItem.id}`;
          break;
      }

      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Erro ao excluir registro";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Se não conseguir fazer parse do JSON, usar a mensagem padrão
          console.error("Erro ao fazer parse da resposta:", parseError);
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Recarregar dados
      switch (activeTab) {
        case "contas_pagar":
          await loadContasPagar();
          break;
        case "contas_receber":
          await loadContasReceber();
          break;
        case "categorias":
          await loadCategorias();
          break;
        case "formas_pagamento":
          await loadFormasPagamento();
          break;
      }

      toast.toast({
        variant: "success",
        title: "Sucesso!",
        description: `Registro ${activeTab === "contas_pagar" ? "de despesa" : activeTab === "contas_receber" ? "de receita" : activeTab === "categorias" ? "de categoria" : "de forma de pagamento"} excluído com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao excluir:", error);
      
      // Verificar se é um erro específico de validação
      if (error instanceof Error && error.message.includes("não é possível excluir")) {
        toast.toast({
          variant: "warning",
          title: "Não é possível excluir",
          description: error.message,
        });
      } else {
        toast.toast({
          variant: "error",
          title: "Erro ao excluir",
          description: "Erro ao excluir registro. Tente novamente.",
        });
      }
      throw error;
    }
  };

  const getEditFields = () => {
    switch (activeTab) {
      case "contas_pagar":
      case "contas_receber":
        return [
          { name: "descricao", label: "Descrição", type: "text" as const, required: true },
          { name: "valor", label: "Valor (R$)", type: "number" as const, required: true, step: "0.01", min: "0" },
          { name: "dataPagamento", label: "Data", type: "date" as const, required: true },
          { 
            name: "categoriaId", 
            label: "Categoria", 
            type: "select" as const, 
            required: true,
            options: categorias.map(cat => ({ value: cat.id, label: cat.descricao || cat.nome }))
          },
          { 
            name: "formaPagamentoId", 
            label: "Forma de Pagamento", 
            type: "select" as const, 
            required: true,
            options: formasPagamento.map(forma => ({ value: forma.id, label: forma.nome }))
          },
        ];
      case "categorias":
        return [
          { name: "descricao", label: "Descrição", type: "text" as const, required: true },
          { 
            name: "tipo", 
            label: "Tipo", 
            type: "select" as const, 
            required: true,
            options: [
              { value: "RECEITA", label: "Receita" },
              { value: "DESPESA", label: "Despesa" }
            ]
          },
          { 
            name: "categoriaPaiId", 
            label: "Categoria Pai (opcional)", 
            type: "select" as const, 
            required: false,
            options: categorias.filter(cat => !cat.categoriaPaiId).map(cat => ({ value: cat.id, label: cat.descricao || cat.nome }))
          },
        ];
      case "formas_pagamento":
        return [
          { name: "descricao", label: "Nome", type: "text" as const, required: true },
        ];
      default:
        return [];
    }
  };

  const getDeleteMessage = () => {
    switch (activeTab) {
      case "contas_pagar":
        return "Tem certeza que deseja excluir esta despesa?";
      case "contas_receber":
        return "Tem certeza que deseja excluir esta receita?";
      case "categorias":
        return "Tem certeza que deseja excluir esta categoria?";
      case "formas_pagamento":
        return "Tem certeza que deseja excluir esta forma de pagamento?";
      default:
        return "Tem certeza que deseja excluir este item?";
    }
  };

  const EmptyStateButton = () => (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSyncing ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-700"></div>
          <span>{syncProgress || "Sincronizando..."}</span>
        </>
      ) : (
        <>
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
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>Sincronizar</span>
        </>
      )}
    </button>
  );

  const getModalTitle = () => {
    switch (activeTab) {
      case "contas_pagar":
        return "Adicionar Despesa";
      case "contas_receber":
        return "Adicionar Receita";
      case "categorias":
        return "Adicionar Categoria";
      case "formas_pagamento":
        return "Adicionar Forma de Pagamento";
      default:
        return "Adicionar";
    }
  };

  const renderModalContent = () => {
    switch (activeTab) {
      case "contas_pagar":
      case "contas_receber":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$)
              </label>
              <input
                type="number"
                id="valor"
                name="valor"
                value={formData.valor}
                onChange={handleInputChange}
                required
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="dataPagamento" className="block text-sm font-medium text-gray-700 mb-1">
                Data de Pagamento
              </label>
              <input
                type="date"
                id="dataPagamento"
                name="dataPagamento"
                value={formData.dataPagamento}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="categoriaId" className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                id="categoriaId"
                name="categoriaId"
                value={formData.categoriaId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="formaPagamentoId" className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pagamento
              </label>
              <select
                id="formaPagamentoId"
                name="formaPagamentoId"
                value={formData.formaPagamentoId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              >
                <option value="">Selecione uma forma de pagamento</option>
                {formasPagamento.map((forma) => (
                  <option key={forma.id} value={forma.id}>
                    {forma.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors text-white ${
                  isSaving ? "bg-orange-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/60 border-t-white"></span>
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </form>
        );

      case "categorias":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              >
                <option value="">Selecione um tipo</option>
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>
            </div>

            <div>
              <label htmlFor="categoriaPaiId" className="block text-sm font-medium text-gray-700 mb-1">
                Categoria Pai (Opcional)
              </label>
              <select
                id="categoriaPaiId"
                name="categoriaPaiId"
                value={formData.categoriaPaiId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              >
                <option value="">Nenhuma (Categoria Principal)</option>
                {categorias.filter(cat => !cat.categoriaPaiId).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.descricao || cat.nome}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Deixe vazio para criar uma categoria principal. Selecione uma categoria para criar uma subcategoria.</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors text-white ${
                  isSaving ? "bg-orange-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/60 border-t-white"></span>
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </form>
        );

      case "formas_pagamento":
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors text-white ${
                  isSaving ? "bg-orange-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/60 border-t-white"></span>
                    Salvando...
                  </span>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden">
      <Sidebar
        collapsed={isSidebarCollapsed}
        mobileOpen={isSidebarMobileOpen}
        onMobileClose={() => setIsSidebarMobileOpen(false)}
      />

      <Topbar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
        onMobileMenu={() => setIsSidebarMobileOpen((v) => !v)}
      />

      <div
        className={`fixed top-16 bottom-0 left-0 right-0 ${mdLeftVar} z-10 bg-[#F3F3F3]`}
      >
        <div className="h-full w-full rounded-tl-none md:rounded-tl-2xl border border-gray-200 bg-white" />
      </div>

      <main className={`relative z-20 pt-16 p-6 ${mdMlVar}`}>
        <section className="p-6">
          <HeaderFinancas
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAddNew={handleOpenModal}
            onImportClick={() => setIsImportModalOpen(true)}
            onIncrementalSync={handleIncrementalSync}
            hasSyncedBefore={hasSyncedBefore}
            isIncrementalSyncing={isIncrementalSyncing}
            filtrosComponent={(activeTab === "contas_pagar" || activeTab === "contas_receber") ? (
              <FiltrosFinancas
                tipo={activeTab}
                periodoAtivo={filtroPeriodo}
                onPeriodoChange={setFiltroPeriodo}
                onPeriodoPersonalizadoChange={(inicio, fim) => {
                  setFiltroDataInicio(inicio);
                  setFiltroDataFim(fim);
                }}
                filtroCategoria={filtroCategoria}
                onCategoriaChange={setFiltroCategoria}
                categoriasDisponiveis={categorias.filter(c => c.tipo === (activeTab === "contas_pagar" ? 'DESPESA' : 'RECEITA')).map(c => ({ id: c.id, nome: c.nome, descricao: c.descricao }))}
                filtroStatus={filtroStatus}
                onStatusChange={setFiltroStatus}
                filtroOrigem={filtroOrigem}
                onOrigemChange={setFiltroOrigem}
              />
            ) : undefined}
          />

          {/* Conteúdo da Tab */}
          {activeTab === "formas_pagamento" ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-orange-500"></div>
                </div>
              ) : formasPagamento.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sincronizado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formasPagamento.map((forma) => (
                        <tr key={forma.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {forma.nome}
                            </div>
                            {forma.descricao && (
                              <div className="text-sm text-gray-500">
                                {forma.descricao}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {forma.tipo || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              forma.ativo 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }`}>
                              {forma.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(forma.sincronizadoEm).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(forma)}
                                className="text-orange-600 hover:text-orange-900 transition-colors"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(forma)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Excluir"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Nenhuma forma de pagamento encontrada"
                  description="Sincronize suas formas de pagamento do Bling para começar."
                  icons={emptyStateIcons}
                  footer={<EmptyStateButton />}
                  variant="default"
                  size="default"
                  theme="light"
                  isIconAnimated={true}
                  className="w-full min-h-[320px]"
                />
              )}
            </div>
          ) : activeTab === "categorias" ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-orange-500"></div>
                </div>
              ) : categorias.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categorias.filter(cat => !cat.categoriaPaiId).map((cat) => (
                        <React.Fragment key={cat.id}>
                          <tr className={cat.categoriaPaiId ? "bg-gray-50" : ""}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {cat.categoriaPaiId ? (
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  {cat.descricao || cat.nome}
                                </span>
                              ) : (
                                <span className="font-semibold">{cat.descricao || cat.nome}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cat.tipo}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cat.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {cat.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEdit(cat)}
                                  className="text-orange-600 hover:text-orange-900 transition-colors"
                                  title="Editar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(cat)}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Excluir"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {cat.subCategorias && cat.subCategorias.map((subCat: any) => (
                            <tr key={subCat.id} className="bg-blue-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className="flex items-center pl-8">
                                  <svg className="w-4 h-4 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                  </svg>
                                  {subCat.descricao || subCat.nome}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subCat.tipo}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${subCat.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                  {subCat.ativo ? "Ativo" : "Inativo"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleEdit(subCat)}
                                    className="text-orange-600 hover:text-orange-900 transition-colors"
                                    title="Editar"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(subCat)}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    title="Excluir"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Nenhuma categoria encontrada"
                  description="Sincronize ou adicione categorias para começar."
                  icons={emptyStateIcons}
                  footer={<EmptyStateButton />}
                  variant="default"
                  size="default"
                  theme="light"
                  isIconAnimated={true}
                  className="w-full min-h-[320px]"
                />
              )}
            </div>
          ) : activeTab === "contas_pagar" ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-orange-500"></div>
                </div>
              ) : contasPagar.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origem</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedContasPagar.map((c) => (
                        <tr key={c.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.descricao}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Number(c.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col leading-tight">
                              <span>{c.dataVencimento ? new Date(c.dataVencimento).toLocaleDateString("pt-BR") : "-"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.categoria?.descricao || c.categoria?.nome || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.formaPagamento?.nome || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">{c.status}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${c.origem === 'BLING' ? 'bg-blue-100 text-blue-800' : c.origem === 'EXCEL' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{c.origem || 'MANUAL'}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(c)}
                                className="text-orange-600 hover:text-orange-900 transition-colors"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleViewJson(c)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Ver JSON"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(c)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Excluir"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <VendasPagination
                    currentPage={pagePagar}
                    totalPages={Math.max(1, totalPagesPagar)}
                    totalItems={totalPagar}
                    itemsPerPage={itemsPerPage}
                    onPageChange={(p) => setPagePagar(p)}
                  />
                </div>
              ) : (
                <EmptyState
                  title="Nenhuma conta a pagar cadastrada"
                  description="Adicione uma despesa ou sincronize para começar."
                  icons={emptyStateIcons}
                  footer={<EmptyStateButton />}
                  variant="default"
                  size="default"
                  theme="light"
                  isIconAnimated={true}
                  className="w-full min-h-[320px]"
                />
              )}
            </div>
          ) : activeTab === "contas_receber" ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-orange-500"></div>
                </div>
              ) : contasReceber.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origem</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedContasReceber.map((c) => (
                        <tr key={c.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.descricao}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Number(c.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(c.dataRecebimento || c.dataVencimento).toLocaleDateString("pt-BR")}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.categoria?.descricao || c.categoria?.nome || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.formaPagamento?.nome || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{c.status}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${c.origem === 'BLING' ? 'bg-blue-100 text-blue-800' : c.origem === 'EXCEL' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{c.origem || 'MANUAL'}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(c)}
                                className="text-orange-600 hover:text-orange-900 transition-colors"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleViewJson(c)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="Ver JSON"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(c)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Excluir"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <VendasPagination
                    currentPage={pageReceber}
                    totalPages={Math.max(1, totalPagesReceber)}
                    totalItems={totalReceber}
                    itemsPerPage={itemsPerPage}
                    onPageChange={(p) => setPageReceber(p)}
                  />
                </div>
              ) : (
                <EmptyState
                  title="Nenhuma conta a receber cadastrada"
                  description="Adicione uma receita ou sincronize para começar."
                  icons={emptyStateIcons}
                  footer={<EmptyStateButton />}
                  variant="default"
                  size="default"
                  theme="light"
                  isIconAnimated={true}
                  className="w-full min-h-[320px]"
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <EmptyState
                title="Nenhum registro encontrado"
                description={`Comece adicionando ${getTabDescription()}.`}
                icons={emptyStateIcons}
                footer={<EmptyStateButton />}
                variant="default"
                size="default"
                theme="light"
                isIconAnimated={true}
                className="w-full min-h-[320px]"
              />
            </div>
          )}
        </section>
      </main>

      {/* Modal Universal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={getModalTitle()}
        size="md"
      >
        {renderModalContent()}
      </Modal>

      {/* Modal de Edição */}
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
        title={`Editar ${activeTab === "contas_pagar" ? "Despesa" : activeTab === "contas_receber" ? "Receita" : activeTab === "categorias" ? "Categoria" : "Forma de Pagamento"}`}
        data={editingItem}
        fields={getEditFields()}
        isLoading={isSaving}
      />

      {/* Modal de Exclusão */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={`Excluir ${activeTab === "contas_pagar" ? "Despesa" : activeTab === "contas_receber" ? "Receita" : activeTab === "categorias" ? "Categoria" : "Forma de Pagamento"}`}
        message={getDeleteMessage()}
        itemName={deletingItem?.descricao || deletingItem?.nome}
        isLoading={isSaving}
      />

      {/* Modal de Importação Excel */}
      <ImportFinanceModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeTab={activeTab}
        onImportSuccess={() => {
          // Recarregar dados após importação
          window.location.reload();
        }}
      />

      {/* Modal de JSON */}
      <Modal
        isOpen={isJsonModalOpen}
        onClose={handleCloseJsonModal}
        title="JSON da Conta"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Dados completos da conta:
            </h3>
            <pre className="text-xs text-gray-800 overflow-auto max-h-96 bg-white p-4 rounded border">
              {JSON.stringify(jsonItem, null, 2)}
            </pre>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCloseJsonModal}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
