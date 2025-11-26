import { useState, useEffect, useRef } from "react";
import { useVendasSyncProgress } from "@/hooks/useVendasSyncProgress";
import {
  loadVendasFromCache,
  saveVendasToCache
} from "@/lib/vendasCache";
import { toast } from "@/hooks/use-toast";
import { API_CONFIG } from "@/lib/api-config";

// Re-exportar funções de cache para uso externo
export { 
  clearVendasCache, 
  clearAllVendasCache, 
  getCacheInfo,
  getLocalStorageUsage 
} from "@/lib/vendasCache";

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
export function useVendas(
  platform: string = "Mercado Livre",
  options?: {
    autoConnectSSE?: boolean;
  }
) {
  const autoConnectSSE = options?.autoConnectSSE ?? false;
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [contasConectadas, setContasConectadas] = useState<ContaConectada[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<MeliOrdersResponse["errors"]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [syncProgress, setSyncProgress] = useState({ fetched: 0, expected: 0 });
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);
  
  // Hook para progresso em tempo real
  const { isConnected, progress, connect, disconnect } = useVendasSyncProgress();

  // Conectar SSE automaticamente para acompanhar sincronizações em background (ex.: cron)
  useEffect(() => {
    if (!autoConnectSSE) return;
    if (platform !== "Mercado Livre" && platform !== "Shopee") return;

    connect();
    return () => {
      disconnect();
    };
  }, [autoConnectSSE, platform, connect, disconnect]);

  // Ref para rastrear se sync_complete já foi processado
  const syncCompleteProcessedRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingAccountsRef = useRef(0);

  // Resetar flag quando começar nova sincronização
  useEffect(() => {
    if (isSyncing) {
      syncCompleteProcessedRef.current = false;

      // Timeout de segurança: se após 10 minutos não receber sync_complete, forçar conclusão
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        if (isSyncing && platform === "Mercado Livre") {
          console.warn('[useVendas] ⚠️ Timeout de sincronização atingido (10min) - forçando conclusão');
          setIsSyncing(false);
          setIsTableLoading(false);
          loadVendasFromDatabase().catch(err => {
            console.error('[useVendas] Erro ao recarregar vendas após timeout:', err);
          });
        }
      }, 10 * 60 * 1000); // 10 minutos
    } else {
      // Limpar timeout quando sync terminar normalmente
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isSyncing, platform]);

  // Atualizar progresso quando receber eventos SSE (Mercado Livre e Shopee)
  useEffect(() => {
    if (progress && (platform === "Mercado Livre" || platform === "Shopee")) {
      console.log(`[useVendas] Progresso SSE recebido (${platform}):`, progress);

      // Se receber progresso de sincronização ativa, marcar como syncing
      // Isso garante que após reload da página, o estado seja restaurado
      if (
        progress.type === "sync_progress" ||
        progress.type === "sync_start" ||
        progress.type === "sync_continue"
      ) {
        if (!isSyncing) {
          console.log('[useVendas] Sincronização em andamento detectada - ativando isSyncing');
          setIsSyncing(true);
          setIsTableLoading(true);
        }
      }

      if (progress.type === "sync_progress" || progress.type === "sync_continue") {
        // Atualizar progresso usando fetched/expected ou current/total
        const fetched = progress.fetched || progress.current || 0;
        const expected = progress.expected || progress.total || 0;
        
        setSyncProgress({
          fetched,
          expected
        });
        console.log(`[useVendas] Progresso atualizado: ${fetched}/${expected}`);
      } else if (progress.type === "sync_complete") {
        if (pendingAccountsRef.current > 1) {
          pendingAccountsRef.current -= 1;
          console.log(`[useVendas] Sync parcial concluído - aguardando contas restantes (${pendingAccountsRef.current}).`);
          return;
        }

        if (!syncCompleteProcessedRef.current) {
          console.log('[useVendas] Sincronização completa - processando apenas uma vez');
          syncCompleteProcessedRef.current = true; // Marcar como processado
          pendingAccountsRef.current = 0;

          // Recarregar vendas do banco após sincronização completa
          loadVendasFromDatabase().catch(err => {
            console.error('[useVendas] Erro ao recarregar vendas após sync_complete:', err);
          });

          // Resetar estados de loading
          setIsSyncing(false);
          setIsTableLoading(false);

          // Desconectar SSE após um delay
          setTimeout(() => {
            disconnect();
          }, 2000);
        }
      } else if (progress.type === "sync_error") {
        console.error('[useVendas] Erro na sincronização:', progress);
        setIsSyncing(false);
        setIsTableLoading(false);
        disconnect();
      }
    }
  }, [progress, platform, disconnect, autoConnectSSE, isSyncing]);

  const resolveAuthOrigin = () => {
    const origin =
      API_CONFIG.baseURL ||
      process.env.NEXT_PUBLIC_MELI_REDIRECT_ORIGIN ||
      (typeof window !== "undefined" ? window.location.origin : "");

    if (origin && !origin.startsWith("http")) {
      return `https://${origin}`;
    }

    return origin;
  };

  const handleConnectAccount = () => {
    const authOrigin = resolveAuthOrigin();

    if (platform === "Mercado Livre") {
      // Redirecionar para autenticacao do Mercado Livre
      const url = `${authOrigin}/api/meli/auth`;
      window.location.href = url;
    } else if (platform === "Shopee") {
      // Redirecionar para autenticacao da Shopee
      const url = `${authOrigin}/api/shopee/auth`;
      window.location.href = url;
    } else if (platform === "Geral") {
      // Para vendas gerais, nao ha conexao direta - usar as paginas individuais
      console.log("Para conectar contas, acesse as paginas individuais do Shopee ou Mercado Livre.");
    } else {
      console.log(`Integracao com ${platform} ainda nao disponivel.`);
    }
  };

  const handleSyncOrders = async (accountIds?: string[], orderIdsByAccount?: Record<string, string[]>, fullSync?: boolean) => {
    let isMeliFireAndForget = false; // Flag para controlar se é Mercado Livre fire-and-forget

    try {
      console.log(`[useVendas] 🚀 Iniciando sincronização de vendas para ${platform}`);
      console.log(`[useVendas] Parâmetros recebidos:`, { accountIds, orderIdsByAccount, fullSync });
      setIsSyncing(true);
      setIsTableLoading(true);
      setSyncProgress({ fetched: 0, expected: 0 });
      setSyncErrors([]);

      // IMPORTANTE: Sempre conectar SSE para Mercado Livre
      if (platform === "Mercado Livre" || platform === "Shopee") {
        console.log(`[useVendas] 🔌 Status SSE antes de conectar: isConnected=${isConnected}`);
        if (!isConnected) {
          console.log('[useVendas] 🔌 SSE não está conectado, conectando agora...');
          try {
            connect();
            console.log('[useVendas] 🔌 Função connect() chamada, aguardando 1000ms...');
            // Aguardar conexão estabelecer (aumentado para 1s)
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('[useVendas] 🔌 Aguardo concluído, verificando conexão...');
            console.log('[useVendas] 🔌 Status SSE após aguardar: isConnected=', isConnected);
          } catch (error) {
            console.warn('[useVendas] ⚠️ SSE não disponível, continuando sem progresso em tempo real:', error);
          }
        } else {
          console.log('[useVendas] ✅ SSE já está conectado');
        }
      }

      let res: Response;
      if (platform === "Mercado Livre") {
        const selectedAccounts = new Set<string>();
        (accountIds ?? []).filter(Boolean).forEach((id) => selectedAccounts.add(id));

        if (orderIdsByAccount) {
          Object.keys(orderIdsByAccount).forEach((id) => {
            if (id) selectedAccounts.add(id);
          });
        }

        if (selectedAccounts.size === 0 && contasConectadas.length > 0) {
          contasConectadas.forEach((conta) => {
            if (conta.id) selectedAccounts.add(conta.id);
          });
        }

        const accountsToSync = Array.from(selectedAccounts);

        if (accountsToSync.length === 0) {
          throw new Error("Nenhuma conta do Mercado Livre conectada para sincronizar.");
        }

        pendingAccountsRef.current = 1; // Agora é sempre 1 pois fazemos UMA única chamada

        // UMA única chamada com TODAS as contas (backend processa sequencialmente)
        const body: any = { accountIds: accountsToSync };
        if (orderIdsByAccount && Object.keys(orderIdsByAccount).length > 0) {
          body.orderIdsByAccount = orderIdsByAccount;
        }
        if (fullSync) {
          body.fullSync = true;
        }

        console.log(`[useVendas] Chamando API /api/cron/meli-sync/trigger com ${accountsToSync.length} conta(s):`, body);
        console.log(`[useVendas] 🔗 Usando backend: ${API_CONFIG.baseURL || 'local'}`);

        // Fire-and-forget: Iniciar sincronização sem aguardar resposta HTTP
        // O progresso será acompanhado via SSE (Server-Sent Events)
        API_CONFIG.fetch("/api/cron/meli-sync/trigger", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          body: JSON.stringify(body),
        }).catch(() => {
          // Ignorar silenciosamente timeouts do navegador
          // Backend continua processando e SSE envia o progresso
        });

        console.log(`[useVendas] ✅ Sincronização iniciada para ${accountsToSync.length} conta(s) - acompanhe o progresso em tempo real`);

        // SSE vai atualizar automaticamente:
        // - syncProgress via setSyncProgress
        // - lastSyncedAt quando completar
        // - syncErrors se houver problemas

        // Marcar como fire-and-forget para não resetar estados no finally
        isMeliFireAndForget = true;

        // SSE já gerencia os erros via setSyncErrors
        await loadVendasFromDatabase();

        return;
      } else if (platform === "Shopee") {
        const body: any = {};
        if (accountIds && accountIds.length > 0) {
          body.accountIds = accountIds;
        }
        if (orderIdsByAccount) {
          body.orderIdsByAccount = orderIdsByAccount;
        }
        
        // Sincronização completa em uma única chamada (com paginação automática interna)
        console.log(`[useVendas] 🔗 Usando backend: ${API_CONFIG.baseURL || 'local'}`);
        res = await API_CONFIG.fetch("/api/shopee/vendas/sync", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
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
      // NOTA: Código após todos os returns foi removido pois era inacessível

    } catch (error) {
      console.error("Erro ao sincronizar vendas:", error);
      setSyncErrors([{ accountId: "", mlUserId: 0, message: error instanceof Error ? error.message : "Erro desconhecido" }]);
      // Em caso de erro, parar o syncing
      setIsSyncing(false);
      setIsTableLoading(false);
      pendingAccountsRef.current = 0;
    } finally {
      // ⚠️ IMPORTANTE: Se for Mercado Livre fire-and-forget, NÃO resetar aqui
      // O SSE vai resetar quando receber sync_complete
      if (!isMeliFireAndForget) {
        setIsSyncing(false);
        setIsTableLoading(false);
        pendingAccountsRef.current = 0;
      } else {
        console.log('[useVendas] Fire-and-forget ativo - SSE vai gerenciar o término da sincronização');
      }
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
      console.log(`[useVendas] 🔗 Usando backend: ${API_CONFIG.baseURL || 'local'}`);

      const res = await API_CONFIG.fetch(apiUrl, {
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
      const cachedData = loadVendasFromCache(platform);
      if (cachedData && cachedData.vendas.length > 0) {
        console.log(`[useVendas] Cache: ${cachedData.vendas.length} vendas (${platform})`);
        setVendas(cachedData.vendas);
        setIsTableLoading(false);
        setIsLoadingFromCache(true);
      } else {
        setIsTableLoading(true);
        setIsLoadingFromCache(false);
      }

      console.log(`[useVendas] Iniciando carregamento de vendas para plataforma: ${platform}`);

      let apiUrl = '/api/vendas';
      if (platform === 'Mercado Livre') apiUrl = '/api/meli/vendas';
      else if (platform === 'Shopee') apiUrl = '/api/shopee/vendas';

      // Fazer UMA única requisição que retorna TODAS as vendas
      // Backend já está configurado para retornar todos os registros sem paginação
      const res = await API_CONFIG.fetch(apiUrl, {
        cache: 'no-store',
        credentials: 'include'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const allVendas = Array.isArray(data.vendas) ? data.vendas : [];
      const lastSync = data.lastSync ?? null;

      console.log(`[useVendas] ✅ Carregamento instantâneo: ${allVendas.length} vendas`);

      setVendas(allVendas);
      setLastSyncedAt(lastSync);

      if (allVendas.length > 0) {
        saveVendasToCache(platform, allVendas);
      }

      setIsLoadingFromCache(false);
    } catch (error) {
      console.error(`[useVendas] Erro ao carregar vendas (${platform}):`, error);
      const cachedData = loadVendasFromCache(platform);
      if (!cachedData || cachedData.vendas.length === 0) {
        setVendas([]);
      }
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
    isLoadingFromCache: isLoadingFromCache || false,
    handleSyncOrders,
    handleConnectAccount,
    reloadVendas: loadVendasFromDatabase, // Exportar função de reload
    // Novas propriedades para progresso em tempo real
    isConnected,
    progress,
    connect,
    disconnect,
  };
}



