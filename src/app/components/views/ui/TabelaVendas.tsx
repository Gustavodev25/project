"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "./CardsContas";
import AvatarConta, { type ContaConectada } from "./AvatarConta";
import VendasTable, { type Venda } from "./VendasTable";
import VendasPagination from "./VendasPagination";
import { 
  FiltroStatus, 
  FiltroPeriodo, 
  FiltroADS, 
  FiltroExposicao, 
  FiltroTipoAnuncio,
  FiltroModalidadeEnvio,
  ColunasVisiveis 
} from "./FiltrosVendas";
import { calcularFreteAdjust } from "@/lib/frete";
import { useToast } from "./toaster";
import { useVendas } from "@/hooks/useVendas";

type MeliOrdersResponse = {
  syncedAt: string;
  accounts: Array<{
    id: string;
    nickname: string | null;
    ml_user_id: number;
    expires_at: string;
  }>;
  orders: Array<{
    accountId: string;
    accountNickname: string | null;
    mlUserId: number;
    order: Record<string, unknown>;
    shipment?: Record<string, unknown>;
  }>;
  errors: Array<{
    accountId: string;
    mlUserId: number;
    message: string;
  }>;
  totals?: {
    expected: number;
    fetched: number;
  };
};

interface TabelaVendasProps {
  platform?: string;
  isLoading?: boolean;
  onSyncOrders?: () => void;
  isSyncing?: boolean;
  vendas?: Venda[];
  lastSyncedAt?: string | null;
  showInfoDropdown?: boolean;
  onToggleInfoDropdown?: () => void;
  dropdownRef?: React.RefObject<HTMLDivElement>;
  filtroAtivo?: FiltroStatus;
  periodoAtivo?: FiltroPeriodo;
  // Novos filtros
  filtroADS?: FiltroADS;
  filtroExposicao?: FiltroExposicao;
  filtroTipoAnuncio?: FiltroTipoAnuncio;
  filtroModalidadeEnvio?: FiltroModalidadeEnvio;
  filtroConta?: string;
  colunasVisiveis?: ColunasVisiveis;
  // Datas personalizadas para filtro de período
  dataInicioPersonalizada?: Date | null;
  dataFimPersonalizada?: Date | null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function roundCurrency(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function mapListingTypeToExposure(listingType: string | null): string | null {
  if (!listingType) return null;
  const normalized = listingType.toLowerCase();
  // Gold types (including gold_special) are Premium
  if (normalized.startsWith("gold")) return "Premium";
  // Silver types are Clássico
  if (normalized === "silver") return "Clássico";
  // All other types default to Clássico
  return "Clássico";
}

function mapListingTypeToLabel(listingType: string | null): string | null {
  if (!listingType) return null;
  const normalized = listingType.toLowerCase();
  
  // Verifica se contém "catalog" no listing_type_id
  if (normalized.includes("catalog")) {
    return "Catálogo";
  }
  
  // Todos os outros tipos são considerados "Próprio"
  return "Próprio";
}

/**
 * Calcula a margem de contribuição seguindo a fórmula:
 * Margem = Valor Total + Taxa Plataforma + Frete - CMV
 * 
 * Esta função é mantida por compatibilidade mas não é usada no frontend.
 * Os valores já vêm calculados do backend.
 * 
 * @param valorTotal - Valor total da venda (POSITIVO)
 * @param taxaPlataforma - Taxa da plataforma (JÁ DEVE VIR NEGATIVA)
 * @param frete - Valor do frete (pode ser + ou -)
 * @param cmv - Custo da Mercadoria Vendida (POSITIVO)
 * @returns Margem de contribuição e se é margem real ou receita líquida
 */
function calculateMargemContribuicao(
  valorTotal: number,
  taxaPlataforma: number | null,
  frete: number,
  cmv: number | null
): { valor: number; isMargemReal: boolean } {
  // Valores base (taxa já vem negativa, frete pode ser + ou -)
  const taxa = taxaPlataforma || 0;
  
  // Se temos CMV, calculamos a margem de contribuição real
  // Fórmula: Margem = Valor Total + Taxa Plataforma + Frete - CMV
  if (cmv !== null && cmv !== undefined && cmv > 0) {
    const margemContribuicao = valorTotal + taxa + frete - cmv;
    return {
      valor: roundCurrency(margemContribuicao),
      isMargemReal: true
    };
  }
  
  // Se não temos CMV, retornamos a receita líquida
  // Receita Líquida = Valor Total + Taxa Plataforma + Frete
  const receitaLiquida = valorTotal + taxa + frete;
  return {
    valor: roundCurrency(receitaLiquida),
    isMargemReal: false
  };
}

// Hook customizado para gerenciar vendas - MOVED TO /hooks/useVendas.ts
type ProcessedVenda = {
  venda: Venda;
  isCalculating: boolean;
};

export default function TabelaVendas({
  platform = "Mercado Livre",
  isLoading = false,
  filtroAtivo = "pagos",
  periodoAtivo = "todos",
  filtroADS = "todos",
  filtroExposicao = "todas",
  filtroTipoAnuncio = "todos",
  filtroModalidadeEnvio = "todos",
  filtroConta = "todas",
  colunasVisiveis = {
    data: true,
    pedido: true,
    produto: true,
    quantidade: true,
    valor: true,
    frete: true,
    taxa: true,
    margem: true,
    exposicao: true,
    ads: true,
    tipo: true,
    conta: true,
    canal: true,
    sku: true,
    unitario: true,
    cmv: true,
  },
  dataInicioPersonalizada = null,
  dataFimPersonalizada = null,
}: TabelaVendasProps) {
  const toast = useToast();
  
  // Wrapper para handleConnectAccount com toast
  const handleConnectAccountWithToast = () => {
    if (platform === "Geral") {
      toast.toast({
        variant: "info",
        title: "Conectar contas",
        description: "Para conectar contas, acesse as páginas individuais do Shopee ou Mercado Livre.",
      });
    } else if (platform !== "Mercado Livre" && platform !== "Shopee") {
      toast.toast({
        variant: "warning",
        title: "Integração não disponível",
        description: `Integração com ${platform} ainda não disponível.`,
      });
    } else {
      handleConnectAccount();
    }
  };

  const {
    vendas,
    contasConectadas,
    syncErrors,
    isTableLoading,
    isLoadingAccounts,
    handleConnectAccount,
    handleSyncOrders,
    isSyncing,
    syncProgress,
    isConnected,
    progress,
    connect,
    disconnect
  } = useVendas(platform);
  
  console.log("TabelaVendas - contasConectadas:", contasConectadas);
  console.log("TabelaVendas - isLoadingAccounts:", isLoadingAccounts);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [vendasProcessadas, setVendasProcessadas] = useState<ProcessedVenda[]>([]);
  const [localSyncProgress, setLocalSyncProgress] = useState({ fetched: 0, expected: 0 });

  // Atualizar progresso quando receber eventos SSE
  useEffect(() => {
    if (progress && progress.type === "sync_progress") {
      setLocalSyncProgress({
        fetched: progress.fetched || 0,
        expected: progress.expected || 0
      });
    }
  }, [progress]);

  useEffect(() => {
    if (vendas && vendas.length > 0) {
      const initialVendas = vendas.map(v => ({ venda: v as any, isCalculating: true }));
      setVendasProcessadas(initialVendas);

      vendas.forEach((venda, index) => {
        setTimeout(() => {
        // Não aplicar calcularFreteAdjust para vendas do Shopee
          const freteCorrigido = venda.plataforma === "Shopee" 
            ? venda.frete // Usar o valor original do frete para Shopee
            : calcularFreteAdjust({
                shipment_logistic_type: venda.logisticType || null,
                base_cost: (venda as any).freteBaseCost || null,
                shipment_list_cost: (venda as any).freteListCost || null,
                shipment_cost: (venda as any).freteFinalCost || null,
                order_cost: venda.valorTotal,
              quantity: venda.quantidade,
            });

          setVendasProcessadas(prev => {
            const newVendas = [...prev];
            newVendas[index] = {
              ...newVendas[index],
              venda: { ...newVendas[index].venda, frete: freteCorrigido },
          isCalculating: false,
        };
            return newVendas;
          });
        }, index * 50); // Stagger of 50ms
      });
    } else {
      setVendasProcessadas([]);
    }
  }, [vendas]);

  // Função para filtrar por período
  const filtrarPorPeriodo = (item: ProcessedVenda, periodo: FiltroPeriodo, dataInicioPersonalizada?: Date | null, dataFimPersonalizada?: Date | null) => {
    if (periodo === "todos") return true;

    const dataVenda = new Date(item.venda.dataVenda);
    const agora = new Date();

    switch (periodo) {
      case "mes_passado": {
        const primeiroDiaMesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        const ultimoDiaMesPassado = new Date(agora.getFullYear(), agora.getMonth(), 0);
        return dataVenda >= primeiroDiaMesPassado && dataVenda <= ultimoDiaMesPassado;
      }
      case "este_mes": {
        const primeiroDiaMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
        const ultimoDiaMesAtual = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
        return dataVenda >= primeiroDiaMesAtual && dataVenda <= ultimoDiaMesAtual;
      }
      case "hoje": {
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        return dataVenda >= hoje && dataVenda < amanha;
      }
      case "ontem": {
        const ontem = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1);
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        return dataVenda >= ontem && dataVenda < hoje;
      }
      case "personalizado": {
        if (dataInicioPersonalizada && dataFimPersonalizada) {
          // Ajustar para incluir o dia inteiro
          const inicio = new Date(dataInicioPersonalizada);
          inicio.setHours(0, 0, 0, 0);
          const fim = new Date(dataFimPersonalizada);
          fim.setHours(23, 59, 59, 999);
          return dataVenda >= inicio && dataVenda <= fim;
        }
        return true;
      }
      default:
        return true;
    }
  };

  // Função para filtrar por ADS
  const filtrarPorADS = (item: ProcessedVenda, filtro: FiltroADS) => {
    if (filtro === "todos") return true;
    const { venda } = item;
    const temADS = venda.ads === "ADS" || (venda.internalTags && venda.internalTags.includes("ads"));
    if (filtro === "com_ads") return temADS;
    if (filtro === "sem_ads") return !temADS;
    return true;
  };

  // Função para filtrar por Exposição
  const filtrarPorExposicao = (item: ProcessedVenda, filtro: FiltroExposicao) => {
    if (filtro === "todas") return true;
    const { exposicao } = item.venda;
    const lowerExposicao = exposicao?.toLowerCase();
    if (filtro === "premium") {
      return lowerExposicao === "premium" || lowerExposicao === "gold_special" || lowerExposicao === "gold_pro";
    }
    if (filtro === "classico") {
      return lowerExposicao === "classic" || lowerExposicao === "gold" || lowerExposicao === "free";
    }
    return true;
  };

  // Função para filtrar por Tipo de Anúncio
  const filtrarPorTipoAnuncio = (item: ProcessedVenda, filtro: FiltroTipoAnuncio) => {
    if (filtro === "todos") return true;
    const { venda } = item;
    const tipoAnuncio = venda.tipoAnuncio?.toLowerCase();
    if (filtro === "catalogo") {
      return tipoAnuncio === "catalog" || tipoAnuncio === "catálogo" || (venda.tags && venda.tags.includes("catalog_product"));
    }
    if (filtro === "proprio") {
      return tipoAnuncio !== "catalog" && tipoAnuncio !== "catálogo" && (!venda.tags || !venda.tags.includes("catalog_product"));
    }
    return true;
  };

  // Função para filtrar por Modalidade de Envio
  const filtrarPorModalidadeEnvio = (item: ProcessedVenda, filtro: FiltroModalidadeEnvio) => {
    if (filtro === "todos") return true;
    const { venda } = item;
    const logisticType = venda.logisticType?.toLowerCase();
    
    if (filtro === "full") {
      return logisticType?.includes("fulfill") || false;
    }
    
    if (filtro === "flex") {
      return logisticType?.includes("flex") || false;
    }
    
    if (filtro === "me") {
      // Mercado Envios: não é full nem flex
      return !logisticType?.includes("fulfill") && !logisticType?.includes("flex");
    }
    
    return true;
  };

  // Função para filtrar por Conta
  const filtrarPorConta = (item: ProcessedVenda, contaId: string) => {
    if (contaId === "todas") return true;
    const vendaContaId = item.venda.raw?.seller?.id?.toString();
    return vendaContaId === contaId;
  };

  const vendasFiltradas = useMemo(() => {
    return vendasProcessadas.filter(item => {
      if (filtroAtivo !== "todos") {
        const status = item.venda.status?.toLowerCase();
        let match = false;
        switch (filtroAtivo) {
          case "pagos":
            match = status === 'paid' || status === 'pago' || status === 'payment_approved';
            break;
          case "cancelados":
            match = status === 'cancelled' || status === 'cancelado';
            break;
          default: 
            match = true;
        }
        if (!match) return false;
      }
      if (periodoAtivo !== "todos" && !filtrarPorPeriodo(item, periodoAtivo, dataInicioPersonalizada, dataFimPersonalizada)) return false;
      if (filtroADS !== "todos" && !filtrarPorADS(item, filtroADS)) return false;
      if (filtroExposicao !== "todas" && !filtrarPorExposicao(item, filtroExposicao)) return false;
      if (filtroTipoAnuncio !== "todos" && !filtrarPorTipoAnuncio(item, filtroTipoAnuncio)) return false;
      if (filtroModalidadeEnvio !== "todos" && !filtrarPorModalidadeEnvio(item, filtroModalidadeEnvio)) return false;
      if (filtroConta !== "todas" && !filtrarPorConta(item, filtroConta)) return false;
      return true;
    });
  }, [vendasProcessadas, filtroAtivo, periodoAtivo, filtroADS, filtroExposicao, filtroTipoAnuncio, filtroModalidadeEnvio, filtroConta, dataInicioPersonalizada, dataFimPersonalizada]);

  const totalPages = Math.max(1, Math.ceil(vendasFiltradas.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [platform, filtroAtivo, periodoAtivo]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const EmptyStateActionButton = () => {
    if (isLoadingAccounts) {
      return (
        <div className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Verificando contas...</span>
        </div>
      );
    }

    if (contasConectadas.length === 0) {
      return (
        <button
          onClick={handleConnectAccountWithToast}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span>Conectar conta</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => {
          if (platform === "Mercado Livre") {
            connect(); // Conectar SSE antes de sincronizar
          }
          handleSyncOrders();
        }}
        disabled={isSyncing}
        className="inline-flex items-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center">
          {isSyncing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-700"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-shopping-bag">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
              <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
            </svg>
          )}
        </div>
        <span>{isSyncing ? "Sincronizando..." : "Sincronizar vendas"}</span>
        <div className="flex items-center -space-x-1">
          {contasConectadas.slice(0, 3).map((conta) => (
            <AvatarConta key={conta.id} conta={conta} />
          ))}
          {contasConectadas.length > 3 && (
            <div className="relative bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-semibold w-6 h-6 ml-1">
              <span>+{contasConectadas.length - 3}</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  const emptyStateIcons = [
    <svg key="cart" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
      <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
    </svg>,
    <svg key="chart" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
      <path d="M9 8m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
      <path d="M15 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
      <path d="M4 20l14 0" />
    </svg>,
    <svg key="money" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" />
      <path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" />
    </svg>,
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full">
      {syncErrors.length > 0 && (
          <div className="px-6 py-3 bg-orange-50 border-b border-orange-100 text-sm text-orange-700">
            <p className="font-medium">Ocorreram alguns avisos durante a sincronização:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              {syncErrors.map((err, index) => (
                <li key={`${err.accountId}-${index}`}>
                  {err.mlUserId ? `Conta ${err.mlUserId}: ` : ""}
                  {err.message}
                </li>
              ))}
            </ul>
          </div>
      )}
      {vendasFiltradas.length === 0 && vendas.length === 0 ? (
        <div className="relative">
          {(isSyncing) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="w-full max-w-md mx-auto p-6">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
                  <span>Sincronização {platform || "Mercado Livre"}</span>
                  <span>
                    {syncProgress.fetched > 0 && syncProgress.expected > 0
                      ? `${Math.min(100, Math.round((syncProgress.fetched / syncProgress.expected) * 100))}%`
                      : isSyncing ? "..." : "-"}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isSyncing && syncProgress.fetched === 0 ? "bg-orange-400 animate-pulse" : "bg-orange-500"}`}
                    style={{ width: `${syncProgress.fetched > 0 && syncProgress.expected > 0 ? Math.min(100, Math.round((syncProgress.fetched / syncProgress.expected) * 100)) : isSyncing ? 30 : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {syncProgress.fetched > 0 && syncProgress.expected > 0
                    ? isSyncing
                      ? `${syncProgress.fetched} de ${syncProgress.expected} pedidos sincronizados`
                      : `Sincronização concluída: ${syncProgress.fetched} pedidos encontrados`
                    : isSyncing
                    ? "Carregando dados da sincronização..."
                    : "Pronto para sincronizar"}
                </div>
                
                {/* Avisos e logs de debug */}
                {progress && (
                  <div className="mt-3 space-y-2">
                    {/* Progresso detalhado */}
                    {progress.type === "sync_progress" && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <div className="font-medium">{progress.message}</div>
                        {progress.accountNickname && (
                          <div className="text-gray-500 mt-1">
                            Conta: {progress.accountNickname}
                          </div>
                        )}
                        {progress.page && (
                          <div className="text-gray-500">
                            Página {progress.page} • Offset: {progress.offset} • Total: {progress.expected}
                          </div>
                        )}
                        {progress.fetched && progress.expected && (
                          <div className="text-gray-500 mt-1">
                            Progresso: {progress.fetched} de {progress.expected} vendas processadas
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Avisos */}
                    {progress.type === "sync_warning" && (
                      <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                        <div className="font-medium flex items-center gap-1">
                          ⚠️ Aviso: {progress.message}
                        </div>
                        {progress.errorCode && (
                          <div className="text-yellow-700 mt-1">
                            Código: {progress.errorCode}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Erros */}
                    {progress.type === "sync_error" && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                        <div className="font-medium flex items-center gap-1">
                          ✗ Erro: {progress.message}
                        </div>
                        {progress.errorCode && (
                          <div className="text-red-700 mt-1">
                            Código: {progress.errorCode}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Sucesso */}
                    {progress.type === "sync_complete" && (
                      <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                        <div className="font-medium flex items-center gap-1">
                          ✓ {progress.message}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <EmptyState
            title={vendas.length === 0 ? "Nenhuma venda encontrada" : "Nenhuma venda encontrada para este filtro"}
            description={vendas.length === 0 
              ? platform === "Geral" 
                ? "Nenhuma venda sincronizada encontrada. Sincronize vendas nas páginas individuais do Shopee ou Mercado Livre."
                : `Use o botão "Sincronizar Vendas" para atualizar ou conecte uma nova conta do ${platform}.`
              : `Não há vendas com status "${filtroAtivo === 'todos' ? 'todos' : filtroAtivo}" no momento.`
            }
            icons={emptyStateIcons}
            footer={vendas.length === 0 ? <EmptyStateActionButton /> : undefined}
            variant="default"
            size="default"
            theme="light"
            isIconAnimated={true}
            className="w-full min-h-[320px]"
          />
        </div>
      ) : (
        <div className="flex flex-col h-[600px]">
          <div className="flex-1 min-h-0">
            <VendasTable 
              vendas={vendasFiltradas}
              isLoading={isTableLoading}
              currentPage={currentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              colunasVisiveis={colunasVisiveis}
            />
          </div>
          <div className="border-t border-gray-200 bg-white">
            <VendasPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={vendasFiltradas.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
