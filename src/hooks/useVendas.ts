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

  // Atualizar progresso quando receber eventos SSE (Mercado Livre e Shopee)
  useEffect(() => {
    if (progress && (platform === "Mercado Livre" || platform === "Shopee")) {
      console.log(`[useVendas] Progresso SSE recebido (${platform}):`, progress);
      
      if (progress.type === "sync_progress") {
        // Atualizar progresso usando fetched/expected ou current/total
        const fetched = progress.fetched || progress.current || 0;
        const expected = progress.expected || progress.total || 0;
        
        setSyncProgress({
          fetched,
          expected
        });
        console.log(`[useVendas] Progresso atualizado: ${fetched}/${expected}`);
      } else if (progress.type === "sync_complete") {
        console.log('[useVendas] Sincronização completa - limpando estados e recarregando vendas');
        
        // Recarregar vendas do banco após sincronização completa
        loadVendasFromDatabase().catch(err => {
          console.error('[useVendas] Erro ao recarregar vendas após sync_complete:', err);
        });
        
        // Resetar estados de loading
        setIsSyncing(false);
        
        // Desconectar SSE após um delay
        setTimeout(() => {
          disconnect();
        }, 2000);
      } else if (progress.type === "sync_error") {
        console.error('[useVendas] Erro na sincronização:', progress);
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

  const handleSyncOrders = async (accountIds?: string[]) => {
    try {
      setIsSyncing(true);
      setIsTableLoading(true);
      setSyncProgress({ fetched: 0, expected: 0 });
      setSyncErrors([]);

      // Conectar ao SSE para progresso em tempo real (Mercado Livre e Shopee)
      if (platform === "Mercado Livre" || platform === "Shopee") {
        try {
          connect();
        } catch (error) {
          console.warn('[Sync] SSE não disponível, continuando sem progresso em tempo real:', error);
        }
      }

      let res: Response;
      if (platform === "Mercado Livre") {
        res = await fetch("/api/meli/vendas/sync", { 
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: accountIds && accountIds.length > 0 ? JSON.stringify({ accountIds }) : undefined,
        });
      } else if (platform === "Shopee") {
        // Sincronização completa em uma única chamada (com paginação automática interna)
        res = await fetch("/api/shopee/vendas/sync", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: accountIds && accountIds.length > 0 ? JSON.stringify({ accountIds }) : undefined,
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
        const realTotals = payload.totals || { fetched: 0, expected: 0 };
        setSyncProgress({
          fetched: realTotals.fetched || 0,
          expected: realTotals.expected || realTotals.fetched || 0
        });
        setLastSyncedAt(payload.syncedAt ?? null);
        setSyncErrors(payload.errors ?? []);
        
        // Aguardar um pouco para garantir que o cache foi invalidado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Carregar vendas atualizadas do banco
        console.log(`[useVendas] Shopee: Recarregando vendas do banco após sincronização...`);
        await loadVendasFromDatabase();
        
        // Resetar estados
        setIsSyncing(false);
        setIsTableLoading(false);
        
        // Finalizar sincronização do Shopee
        return;
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
      const realTotals = payload.totals || { fetched: 0, expected: 0 };
      
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
      console.log(`[useVendas] Carregando contas conectadas para plataforma: ${platform}`);
      
      // Determinar a URL da API baseada na plataforma
      let apiUrl = "";
      
      if (platform === "Mercado Livre") {
        apiUrl = "/api/meli/accounts";
      } else if (platform === "Shopee") {
        apiUrl = "/api/shopee/accounts";
      } else if (platform === "Geral") {
        // Para "Geral", combinar contas de ambas plataformas
        console.log(`[useVendas] Plataforma Geral: não há contas específicas`);
        setContasConectadas([]);
        setIsLoadingAccounts(false);
        return;
      }

      console.log(`[useVendas] Chamando API de contas: ${apiUrl}`);
      
      const res = await fetch(apiUrl, { 
        cache: "no-store",
        credentials: "include"
      });
      
      if (!res.ok) {
        throw new Error(`Erro ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`[useVendas] Dados de contas recebidos de ${apiUrl}:`, data);
      // A API retorna diretamente o array de contas, não um objeto com propriedade accounts
      const contas = Array.isArray(data) ? data : [];
      console.log(`[useVendas] Contas processadas (${platform}):`, contas);
      setContasConectadas(contas);
    } catch (error) {
      console.error(`[useVendas] Erro ao carregar contas (${platform}):`, error);
      setContasConectadas([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const loadVendasFromDatabase = async () => {
    try {
      setIsTableLoading(true);
      console.log(`[useVendas] Iniciando carregamento de vendas para plataforma: ${platform}`);

      // Determinar a URL da API baseada na plataforma
      let apiUrl = "/api/vendas"; // Default para "Geral"
      
      if (platform === "Mercado Livre") {
        apiUrl = "/api/meli/vendas";
      } else if (platform === "Shopee") {
        apiUrl = "/api/shopee/vendas";
      }

      console.log(`[useVendas] Chamando API: ${apiUrl}`);

      const res = await fetch(apiUrl, {
        cache: "no-store",
        credentials: "include"
      });

      console.log(`[useVendas] Resposta da API ${apiUrl}:`, res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[useVendas] Erro na resposta de ${apiUrl}:`, errorText);
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log(`[useVendas] Dados recebidos de ${apiUrl}:`, { 
        total: data.total, 
        vendasLength: data.vendas?.length || 0,
        lastSync: data.lastSync 
      });
      setVendas(data.vendas || []);
      console.log(`[useVendas] ✅ ${data.vendas?.length || 0} vendas carregadas para ${platform}`);
    } catch (error) {
      console.error(`[useVendas] Erro ao carregar vendas (${platform}):`, error);
      // Não mostrar erro em dev mode com strict mode (double render)
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        console.warn("[useVendas] Fetch falhou - provavelmente servidor não está rodando ou rota incorreta");
      }
      setVendas([]);
    } finally {
      setIsTableLoading(false);
    }
  };

  // Carrega dados quando a plataforma mudar
  useEffect(() => {
    if (platform !== "Mercado Livre" && platform !== "Shopee" && platform !== "Geral") {
      setVendas([]);
      setContasConectadas([]);
      setSyncErrors([]);
      setLastSyncedAt(null);
      setIsTableLoading(false);
      return;
    }

    loadContasConectadas();
    loadVendasFromDatabase(); // Carrega vendas existentes do banco
    
    // Timeout de segurança: garantir que loading não fique travado
    const safetyTimeout = setTimeout(() => {
      setIsTableLoading(false);
      console.warn('[useVendas] Timeout de segurança: forçando isTableLoading = false');
    }, 10000); // 10 segundos
    
    return () => clearTimeout(safetyTimeout);
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
