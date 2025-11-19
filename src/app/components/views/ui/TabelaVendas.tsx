"use client";

import { useEffect, useMemo, useState } from "react";
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
  ColunasVisiveis,
} from "./FiltrosVendas";
import { isStatusCancelado, isStatusPago } from "@/lib/vendasStatus";
import { useToast } from "./toaster";
import { useVendas } from "@/hooks/useVendas";

interface SyncProgressTotals {
  fetched?: number;
  expected?: number;
}

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
  syncProgress?: SyncProgressTotals | null;
  vendas?: Venda[];
  lastSyncedAt?: string | null;
  showInfoDropdown?: boolean;
  onToggleInfoDropdown?: () => void;
  dropdownRef?: React.RefObject<HTMLDivElement>;
  filtroAtivo?: FiltroStatus;
  periodoAtivo?: FiltroPeriodo;
  filtroADS?: FiltroADS;
  filtroExposicao?: FiltroExposicao;
  filtroTipoAnuncio?: FiltroTipoAnuncio;
  filtroModalidadeEnvio?: FiltroModalidadeEnvio;
  filtroConta?: string;
  colunasVisiveis?: ColunasVisiveis;
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
  if (normalized.startsWith("gold")) return "Premium";
  if (normalized === "silver") return "Clássico";
  return "Clássico";
}

function mapListingTypeToLabel(listingType: string | null): string | null {
  if (!listingType) return null;
  const normalized = listingType.toLowerCase();
  if (normalized.includes("catalog")) {
    return "Catálogo";
  }
  return "Próprio";
}

/**
 * Mantida por compatibilidade; cálculo vem do backend.
 */
function calculateMargemContribuicao(
  valorTotal: number,
  taxaPlataforma: number | null,
  frete: number,
  cmv: number | null,
): { valor: number; isMargemReal: boolean } {
  const taxa = taxaPlataforma || 0;
  if (cmv !== null && cmv !== undefined && cmv > 0) {
    const margemContribuicao = valorTotal + taxa + frete - cmv;
    return {
      valor: roundCurrency(margemContribuicao),
      isMargemReal: true,
    };
  }
  const receitaLiquida = valorTotal + taxa + frete;
  return {
    valor: roundCurrency(receitaLiquida),
    isMargemReal: false,
  };
}

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
  syncProgress = null,
}: TabelaVendasProps) {
  const toast = useToast();
  const [isStartingSync, setIsStartingSync] = useState(false);

  const handleConnectAccountWithToast = () => {
    if (platform === "Geral") {
      toast.toast({
        variant: "info",
        title: "Conectar contas",
        description:
          "Para conectar contas, acesse as páginas individuais do Shopee ou Mercado Livre.",
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
    syncProgress: hookSyncProgress,
    isConnected,
    progress,
    connect,
    disconnect,
  } = useVendas(platform, {
    autoConnectSSE: true, // Conectar SSE automaticamente para detectar syncs em andamento
  });

  const effectiveSyncProgress: SyncProgressTotals | null =
    syncProgress || hookSyncProgress || null;

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [localSyncProgress, setLocalSyncProgress] = useState<{
    fetched: number;
    expected: number;
  }>({ fetched: 0, expected: 0 });

  // Atualiza progresso local a partir dos eventos SSE (inclui complete)
  useEffect(() => {
    if (
      progress &&
      ["sync_progress", "sync_continue", "sync_start", "sync_complete"].includes(
        progress.type,
      )
    ) {
      setLocalSyncProgress({
        fetched:
          (typeof progress.current === "number" ? progress.current : undefined) ??
          (typeof progress.fetched === "number" ? progress.fetched : 0),
        expected:
          (typeof progress.total === "number" ? progress.total : undefined) ??
          (typeof progress.expected === "number" ? progress.expected : 0),
      });
    }
  }, [progress]);

  useEffect(() => {
    if (isSyncing) {
      setIsStartingSync(false);
    }
  }, [isSyncing]);

  const vendasProcessadas = useMemo(() => {
    if (!vendas || vendas.length === 0) {
      return [];
    }

    const processedVendas = vendas.map((venda) => {
      let freteCorrigido = venda.frete;

      if (Math.abs(Number(venda.frete)) === 999) {
        const shipping = (venda as any).shipping;
        const rawData = (venda as any).raw || (venda as any).rawData;
        const rawShipping = rawData?.shipping;
        const freight = rawData?.freight;

        const adjustedCost =
          shipping?.adjustedCost ??
          rawShipping?.adjustedCost ??
          freight?.adjustedCost;

        if (
          adjustedCost !== null &&
          adjustedCost !== undefined &&
          Math.abs(Number(adjustedCost)) !== 999
        ) {
          freteCorrigido = adjustedCost;
        }
      }

      return {
        venda: { ...venda, frete: freteCorrigido } as any,
        isCalculating: false,
      };
    });

    console.log(
      `[TabelaVendas] ✅ ${processedVendas.length} vendas processadas`,
    );
    return processedVendas;
  }, [vendas]);

  const filtrarPorPeriodo = (
    item: ProcessedVenda,
    periodo: FiltroPeriodo,
    dataInicioPersonalizada?: Date | null,
    dataFimPersonalizada?: Date | null,
  ) => {
    if (periodo === "todos") return true;
    const dataVenda = new Date(item.venda.dataVenda);
    const agora = new Date();

    switch (periodo) {
      case "mes_passado": {
        const primeiroDiaMesPassado = new Date(
          agora.getFullYear(),
          agora.getMonth() - 1,
          1,
        );
        const ultimoDiaMesPassado = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          0,
        );
        return (
          dataVenda >= primeiroDiaMesPassado &&
          dataVenda <= ultimoDiaMesPassado
        );
      }
      case "este_mes": {
        const primeiroDiaMesAtual = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          1,
        );
        const ultimoDiaMesAtual = new Date(
          agora.getFullYear(),
          agora.getMonth() + 1,
          0,
        );
        return (
          dataVenda >= primeiroDiaMesAtual && dataVenda <= ultimoDiaMesAtual
        );
      }
      case "hoje": {
        const hoje = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          agora.getDate(),
        );
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        return dataVenda >= hoje && dataVenda < amanha;
      }
      case "ontem": {
        const ontem = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          agora.getDate() - 1,
        );
        const hoje = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          agora.getDate(),
        );
        return dataVenda >= ontem && dataVenda < hoje;
      }
      case "personalizado": {
        if (dataInicioPersonalizada && dataFimPersonalizada) {
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

  const filtrarPorADS = (item: ProcessedVenda, filtro: FiltroADS) => {
    if (filtro === "todos") return true;
    const { venda } = item;
    const temADS =
      venda.ads === "ADS" ||
      (venda.internalTags && venda.internalTags.includes("ads"));
    if (filtro === "com_ads") return temADS;
    if (filtro === "sem_ads") return !temADS;
    return true;
  };

  const filtrarPorExposicao = (
    item: ProcessedVenda,
    filtro: FiltroExposicao,
  ) => {
    if (filtro === "todas") return true;
    const { exposicao } = item.venda;
    const lowerExposicao = exposicao?.toLowerCase();
    if (filtro === "premium") return lowerExposicao === "premium";
    if (filtro === "classico") return lowerExposicao === "clássico";
    return true;
  };

  const filtrarPorTipoAnuncio = (
    item: ProcessedVenda,
    filtro: FiltroTipoAnuncio,
  ) => {
    if (filtro === "todos") return true;
    const { venda } = item;
    const tipoAnuncio = venda.tipoAnuncio?.toLowerCase();
    if (filtro === "catalogo")
      return (
        tipoAnuncio === "catalog" ||
        tipoAnuncio === "catálogo" ||
        (venda.tags && venda.tags.includes("catalog_product"))
      );
    if (filtro === "proprio")
      return (
        tipoAnuncio !== "catalog" &&
        tipoAnuncio !== "catálogo" &&
        (!venda.tags || !venda.tags.includes("catalog_product"))
      );
    return true;
  };

  const filtrarPorModalidadeEnvio = (
    item: ProcessedVenda,
    filtro: FiltroModalidadeEnvio,
  ) => {
    if (filtro === "todos") return true;
    const { venda } = item;
    const logisticType = venda.logisticType?.toLowerCase();
    if (filtro === "full") return logisticType?.includes("fulfill") || false;
    if (filtro === "flex") return logisticType?.includes("flex") || false;
    if (filtro === "me")
      return (
        !logisticType?.includes("fulfill") && !logisticType?.includes("flex")
      );
    return true;
  };

  const filtrarPorConta = (item: ProcessedVenda, contaId: string) => {
    if (contaId === "todas") return true;
    const venda = item.venda as any;
    if (platform === "Shopee")
      return venda?.shopeeAccountId === contaId || venda?.conta === contaId;
    return venda?.meliAccountId === contaId || venda?.conta === contaId;
  };

  const vendasFiltradas = useMemo(() => {
    return vendasProcessadas.filter((item) => {
      if (
        filtroAtivo === "pagos" &&
        !isStatusPago(item.venda.status, platform)
      )
        return false;
      if (
        filtroAtivo === "cancelados" &&
        !isStatusCancelado(item.venda.status, platform)
      )
        return false;
      if (
        periodoAtivo !== "todos" &&
        !filtrarPorPeriodo(
          item,
          periodoAtivo,
          dataInicioPersonalizada,
          dataFimPersonalizada,
        )
      )
        return false;
      if (filtroADS !== "todos" && !filtrarPorADS(item, filtroADS))
        return false;
      if (
        filtroExposicao !== "todas" &&
        !filtrarPorExposicao(item, filtroExposicao)
      )
        return false;
      if (
        filtroTipoAnuncio !== "todos" &&
        !filtrarPorTipoAnuncio(item, filtroTipoAnuncio)
      )
        return false;
      if (
        filtroModalidadeEnvio !== "todos" &&
        !filtrarPorModalidadeEnvio(item, filtroModalidadeEnvio)
      )
        return false;
      if (filtroConta !== "todas" && !filtrarPorConta(item, filtroConta))
        return false;
      return true;
    });
  }, [
    vendasProcessadas,
    filtroAtivo,
    periodoAtivo,
    filtroADS,
    filtroExposicao,
    filtroTipoAnuncio,
    filtroModalidadeEnvio,
    filtroConta,
    dataInicioPersonalizada,
    dataFimPersonalizada,
    platform,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(vendasFiltradas.length / ITEMS_PER_PAGE),
  );

  // Combina progressos: SSE + local + retorno do backend
  const mergedSync = useMemo(() => {
    const sse: any = progress || {};
    const local = localSyncProgress || { fetched: 0, expected: 0 };
    const prop = effectiveSyncProgress || {};

    const fetchedCandidates = [
      typeof sse.fetched === "number" ? sse.fetched : undefined,
      typeof sse.current === "number" ? sse.current : undefined,
      typeof local.fetched === "number" ? local.fetched : undefined,
      typeof prop.fetched === "number" ? prop.fetched : undefined,
    ].filter((v) => typeof v === "number") as number[];

    const expectedCandidates = [
      typeof sse.expected === "number" ? sse.expected : undefined,
      typeof sse.total === "number" ? sse.total : undefined,
      typeof local.expected === "number" ? local.expected : undefined,
      typeof prop.expected === "number" ? prop.expected : undefined,
    ].filter((v) => typeof v === "number") as number[];

    const fetched = Math.max(0, fetchedCandidates[0] ?? 0);
    const expected = Math.max(0, expectedCandidates[0] ?? (fetched || 0));

    const accountLabel =
      (sse.accountNickname as string | undefined) ||
      (sse.accountId ? `Conta ${sse.accountId}` : undefined) ||
      (contasConectadas.length === 1
        ? contasConectadas[0].nickname ||
          (contasConectadas[0].ml_user_id
            ? `Conta ${contasConectadas[0].ml_user_id}`
            : "Conta única")
        : "Todas");

    const baseMessage =
      (sse.message as string | undefined) ||
      (isStartingSync && fetched === 0
        ? "Conectando e iniciando sincronização..."
        : `Sincronizando vendas da ${accountLabel}: ${fetched} de ${expected}`);

    return {
      fetched,
      expected,
      accountLabel,
      message: baseMessage,
      type: sse.type as string | undefined,
      steps: (sse.steps as any[]) || undefined,
    };
  }, [
    progress,
    localSyncProgress,
    effectiveSyncProgress,
    contasConectadas,
    isStartingSync,
  ]);

  const resumoPorConta = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of vendasFiltradas) {
      const contaNome = (item as any)?.venda?.conta ?? "Sem conta";
      counts.set(contaNome, (counts.get(contaNome) ?? 0) + 1);
    }

    const lista: { conta: string; total: number }[] = Array.from(
      counts.entries(),
    ).map(([conta, total]) => ({ conta, total }));

    // Enquanto está sincronizando, injeta informações de progresso
    if (isSyncing || isStartingSync) {
      const sse: any = progress || {};
      const steps: any[] | undefined = Array.isArray(sse.steps)
        ? sse.steps
        : undefined;

      if (steps && steps.length > 0) {
        // Mostra por conta (multi-conta / cron job)
        for (const step of steps) {
          const statusLabel =
            step.currentStep === "completed"
              ? "Concluída"
              : step.currentStep === "saving"
              ? "Salvando"
              : step.currentStep === "fetching"
              ? "Buscando"
              : step.currentStep === "error"
              ? "Erro"
              : "Aguardando";

          const fetched = step.fetched ?? 0;
          const expected = step.expected ?? fetched;
          const textProgresso =
            expected > 0 ? `${Math.min(fetched, expected)}/${expected}` : "";

          lista.push({
            conta: `↻ ${step.accountName} (${statusLabel}${
              textProgresso ? ` ${textProgresso}` : ""
            })`,
            total: fetched,
          });
        }
      } else {
        // Fallback agregado (single conta ou sem steps)
        const fetched = mergedSync.fetched;
        const expected = mergedSync.expected;

        const baseLabel =
          mergedSync.type === "sync_continue"
            ? "↻ Continuando"
            : mergedSync.type === "sync_start"
            ? "↻ Iniciando"
            : "↻ Sincronizando";

        const textoQtd =
          expected > 0 ? ` (${Math.min(fetched, expected)}/${expected})` : "";

        lista.push({
          conta: `${baseLabel} ${mergedSync.accountLabel}${textoQtd}`,
          total: fetched,
        });
      }
    } else if (
      effectiveSyncProgress &&
      (effectiveSyncProgress.fetched || effectiveSyncProgress.expected)
    ) {
      // Pós-sync (incluindo cron): mostra resumo do último sync
      const fetched = effectiveSyncProgress.fetched ?? 0;
      lista.push({
        conta: "↻ Última sincronização (vendas processadas)",
        total: fetched,
      });
    }

    return lista;
  }, [
    vendasFiltradas,
    isSyncing,
    isStartingSync,
    progress,
    mergedSync.fetched,
    mergedSync.expected,
    mergedSync.accountLabel,
    mergedSync.type,
    effectiveSyncProgress,
  ]);

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
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
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
          setIsStartingSync(true);
          setTimeout(() => setIsStartingSync(false), 10000);

          if (platform === "Mercado Livre" || platform === "Shopee") {
            connect();
            setTimeout(() => {
              handleSyncOrders(undefined, undefined, true);
            }, 500);
          } else {
            handleSyncOrders(undefined, undefined, true);
          }
        }}
        disabled={isSyncing || isStartingSync}
        className="inline-flex items-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center">
          {isSyncing || isStartingSync ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700"></div>
          ) : (
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
              <path
                stroke="none"
                d="M0 0h24v24H0z"
                fill="none"
              />
              <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
              <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
            </svg>
          )}
        </div>
        <span>
          {isSyncing || isStartingSync ? "Sincronizando..." : "Sincronizar Vendas"}
        </span>
      </button>
    );
  };

  const emptyStateIcons = [
    <svg
      key="cart"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
      <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
    </svg>,
    <svg
      key="chart"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
      <path d="M9 8m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
      <path d="M15 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
      <path d="M4 20l14 0" />
    </svg>,
    <svg
      key="money"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" />
      <path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" />
    </svg>,
  ];

  const syncStatusText = mergedSync.message;

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      {(isSyncing || isStartingSync) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-md p-6">
            <div className="text-center text-sm font-semibold text-gray-700">
              {syncStatusText}
            </div>
          </div>
        </div>
      )}

      {syncErrors.length > 0 && (
        <div className="border-b border-orange-100 bg-orange-50 px-6 py-3 text-sm text-orange-700">
          <p className="font-medium">
            Ocorreram alguns avisos durante a sincronização:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {syncErrors.map((err, index) => (
              <li key={`${err.accountId}-${index}`}>
                {err.mlUserId ? `Conta ${err.mlUserId}: ` : ""}
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isTableLoading ? (
        <div className="flex min-height-[320px] items-center justify-center bg-white">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-orange-500" />
            <p className="text-sm font-medium text-gray-600">
              Carregando vendas...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Buscando dados dos últimos 6 meses
            </p>
          </div>
        </div>
      ) : vendas.length === 0 ? (
        <div className="relative">
          <EmptyState
            title="Nenhuma venda encontrada"
            description={
              platform === "Geral"
                ? "Nenhuma venda sincronizada encontrada. Sincronize vendas nas páginas individuais do Shopee ou Mercado Livre."
                : `Use o botão "Sincronizar Vendas" para atualizar ou conecte uma nova conta do ${platform}.`
            }
            icons={emptyStateIcons}
            footer={<EmptyStateActionButton />}
            variant="default"
            size="default"
            theme="light"
            isIconAnimated={true}
            className="min-h-[320px] w-full"
          />
        </div>
      ) : vendasFiltradas.length === 0 ? (
        <div className="relative">
          <EmptyState
            title="Nenhuma venda encontrada para este filtro"
            description={`Não há vendas com status "${
              filtroAtivo === "todos" ? "todos" : filtroAtivo
            }" no momento.`}
            icons={emptyStateIcons}
            footer={undefined}
            variant="default"
            size="default"
            theme="light"
            isIconAnimated={true}
            className="min-h-[320px] w-full"
          />
        </div>
      ) : (
        <div className="flex h-[600px] flex-col">
          <div className="min-h-0 flex-1">
            <VendasTable
              vendas={vendasFiltradas}
              isLoading={isTableLoading}
              currentPage={currentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              colunasVisiveis={colunasVisiveis}
              platform={platform as "Mercado Livre" | "Shopee" | "Geral"}
            />
          </div>
          <div className="border-t border-gray-200 bg-white">
            <VendasPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={vendasFiltradas.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              resumoPorConta={resumoPorConta}
            />
          </div>

          {/* Indicador de sincronização/salvamento (persiste após reload) */}
          {progress && (progress.message?.includes('Salvando') || progress.message?.includes('baixadas') || progress.type === 'sync_progress') && progress.type !== 'sync_complete' && (
            <div className="border-t border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex items-center justify-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
                <div className="text-sm text-blue-800">
                  <span className="font-medium">{progress.message || 'Sincronizando...'}</span>
                  {progress.current && progress.total && (
                    <span className="ml-2 text-blue-600">
                      ({Math.round((progress.current / progress.total) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
