import { useState, useEffect, useRef } from "react";
import { useVendasSyncProgress } from "@/hooks/useVendasSyncProgress";

export interface Venda {
  id: string;
  orderId: string;
  dataVenda: string;
  status: string;
  conta: string;
  valorTotal: number;
  quantidade: number;
  unitario: number;
  taxaPlataforma?: number;
  frete: number;
  cmv?: number;
  margemContribuicao: number;
  isMargemReal: boolean;
  titulo: string;
  sku?: string;
  comprador: string;
  logisticType?: string;
  envioMode?: string;
  shippingStatus?: string;
  shippingId?: string;
  latitude?: number;
  longitude?: number;
  exposicao?: string;
  tipoAnuncio?: string;
  ads?: string;
  plataforma: string;
  canal: string;
  tags?: any;
  internalTags?: any;
  rawData?: any;
  atualizadoEm: string;
}

export interface ContaConectada {
  id: string;
  nickname: string | null;
  ml_user_id: number;
  expires_at: string;
}

export interface MeliOrdersResponse {
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
}

// Hook customizado para gerenciar vendas
export function useVendas(platform: string = "Mercado Livre") {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [contasConectadas, setContasConectadas] = useState<ContaConectada[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<MeliOrdersResponse["errors"]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [syncProgress, setSyncProgress] = useState({ fetched: 0, expected: 0 });
  
  // Hook para progresso em tempo real
  const { isConnected, progress, connect, disconnect } = useVendasSyncProgress();

  // Atualizar progresso quando receber eventos SSE
  useEffect(() => {
    if (progress && platform === "Mercado Livre") {
      if (progress.type === "sync_progress" && progress.current && progress.total) {
        setSyncProgress({
          fetched: progress.current,
          expected: progress.total
        });
      } else if (progress.type === "sync_complete") {
        setIsSyncing(false);
        setIsTableLoading(false);
        // Desconectar após conclusão
        setTimeout(() => {
          disconnect();
        }, 3000);
      } else if (progress.type === "sync_error") {
        setIsSyncing(false);
        setIsTableLoading(false);
        disconnect();
      }
    }
  }, [progress, platform, disconnect]);

  const handleConnectAccount = () => {
    if (platform === "Mercado Livre") {
      // Redirecionar para a autenticação do Mercado Livre
      const AUTH_ORIGIN = process.env.NEXT_PUBLIC_MELI_REDIRECT_ORIGIN || 
                         (typeof window !== "undefined" ? window.location.origin : "");
      const url = `${AUTH_ORIGIN}/api/meli/auth`;
      window.location.href = url;
    } else if (platform === "Shopee") {
      // Redirecionar para a autenticação da Shopee
      const AUTH_ORIGIN = process.env.NEXT_PUBLIC_MELI_REDIRECT_ORIGIN || 
                         (typeof window !== "undefined" ? window.location.origin : "");
      const url = `${AUTH_ORIGIN}/api/shopee/auth`;
      window.location.href = url;
    } else if (platform === "Geral") {
      // Para vendas gerais, não há conexão direta - usar as páginas individuais
      console.log("Para conectar contas, acesse as páginas individuais do Shopee ou Mercado Livre.");
    } else {
      console.log(`Integração com ${platform} ainda não disponível.`);
    }
  };

  const handleSyncOrders = async () => {
    try {
      setIsSyncing(true);
      setIsTableLoading(true);
      // Mostrar que a sincronização iniciou
      setSyncProgress({ fetched: 0, expected: 1 });

      // Conectar ao SSE para receber progresso em tempo real
      if (platform === "Mercado Livre") {
        connect();
      }

      let res: Response;
      if (platform === "Mercado Livre") {
        res = await fetch("/api/meli/vendas/sync", { 
          method: "POST",
          cache: "no-store",
          credentials: "include"
        });
      } else if (platform === "Shopee") {
        // Sincronização completa em uma única chamada (com paginação automática interna)
        res = await fetch("/api/shopee/vendas/sync", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          let message = `Erro ${res.status}`;
          try {
            const errJson = await res.json();
            const apiMsg = (errJson?.errors && errJson.errors[0]?.message) || errJson?.error || errJson?.message;
            if (typeof apiMsg === "string" && apiMsg.trim()) message = apiMsg;
          } catch {}
          throw new Error(message);
        }

        const payload: MeliOrdersResponse & { totals?: { expected?: number; fetched?: number; saved?: number } } = await res.json();
        const realTotals = payload.totals || {};
        setSyncProgress({
          fetched: realTotals.fetched || 0,
          expected: realTotals.expected || realTotals.fetched || 0
        });
        setLastSyncedAt(payload.syncedAt ?? null);
        setSyncErrors(payload.errors ?? []);
      } else if (platform === "Geral") {
        // Para vendas gerais, não há sincronização - apenas carrega dados existentes
        setVendas([]);
        setLastSyncedAt(null);
        setSyncErrors([]);
        setSyncProgress({ fetched: 0, expected: 0 });
        return;
      } else {
        setVendas([]);
        setLastSyncedAt(null);
        setSyncErrors([]);
        setSyncProgress({ fetched: 0, expected: 0 });
        return;
      }

      if (!res.ok) {
        let message = `Erro ${res.status}`;
        try {
          const errJson = await res.json();
          const apiMsg = (errJson?.errors && errJson.errors[0]?.message) || errJson?.error || errJson?.message;
          if (typeof apiMsg === "string" && apiMsg.trim()) message = apiMsg;
        } catch {}
        throw new Error(message);
      }

      const payload: MeliOrdersResponse & { totals?: { expected?: number; fetched?: number; saved?: number } } = await res.json();
      const realTotals = payload.totals || {};
      
      setSyncProgress({
        fetched: realTotals.fetched || 0,
        expected: realTotals.expected || realTotals.fetched || 0
      });
      setLastSyncedAt(payload.syncedAt ?? null);
      setSyncErrors(payload.errors ?? []);

      // Carregar vendas atualizadas do banco
      await loadVendasFromDatabase();
      
    } catch (error) {
      console.error("Erro ao sincronizar vendas:", error);
      setSyncErrors([{ accountId: "", mlUserId: 0, message: error instanceof Error ? error.message : "Erro desconhecido" }]);
    } finally {
      setIsSyncing(false);
      setIsTableLoading(false);
    }
  };

  const loadContasConectadas = async () => {
    try {
      setIsLoadingAccounts(true);
      console.log("Carregando contas conectadas...");
      const res = await fetch("/api/meli/accounts", { 
        cache: "no-store",
        credentials: "include"
      });
      
      if (!res.ok) {
        throw new Error(`Erro ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Dados recebidos da API:", data);
      // A API retorna diretamente o array de contas, não um objeto com propriedade accounts
      const contas = Array.isArray(data) ? data : [];
      console.log("Contas processadas:", contas);
      setContasConectadas(contas);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
      setContasConectadas([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const loadVendasFromDatabase = async () => {
    try {
      const res = await fetch("/api/meli/vendas", { 
        cache: "no-store",
        credentials: "include"
      });
      
      if (!res.ok) {
        throw new Error(`Erro ${res.status}`);
      }
      
      const data = await res.json();
      setVendas(data.vendas || []);
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
      setVendas([]);
    }
  };

  // Carrega dados quando a plataforma mudar
  useEffect(() => {
    if (platform !== "Mercado Livre" && platform !== "Shopee" && platform !== "Geral") {
      setVendas([]);
      setContasConectadas([]);
      setSyncErrors([]);
      setLastSyncedAt(null);
      return;
    }

    loadContasConectadas();
    loadVendasFromDatabase(); // Carrega vendas existentes do banco
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  return {
    vendas: vendas || [],
    contasConectadas: contasConectadas || [],
    lastSyncedAt: lastSyncedAt || null,
    syncErrors: syncErrors || [],
    isSyncing: isSyncing || false,
    isTableLoading: isTableLoading || false,
    isLoadingAccounts: isLoadingAccounts || false,
    syncProgress,
    handleSyncOrders,
    handleConnectAccount,
    // Novas propriedades para progresso em tempo real
    isConnected,
    progress,
    connect,
    disconnect,
  };
}
