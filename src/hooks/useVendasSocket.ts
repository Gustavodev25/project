import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { API_CONFIG } from "@/lib/api-config";

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
  [key: string]: any;
}

export interface ContaConectada {
  id: string;
  nickname: string | null;
  ml_user_id: number;
  expires_at: string;
}

export interface FiltrosVendas {
  status?: string;
  periodo?: string;
  dataInicio?: string;
  dataFim?: string;
  ads?: string;
  exposicao?: string;
  tipoAnuncio?: string;
  modalidadeEnvio?: string;
  conta?: string;
  search?: string;
}

interface UseVendasSocketOptions {
  platform?: string;
  autoConnect?: boolean;
  pageSize?: number;
}

export function useVendasSocket(options: UseVendasSocketOptions = {}) {
  const { platform = "Mercado Livre", autoConnect = true, pageSize = 50 } = options;

  // Estados
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [contasConectadas, setContasConectadas] = useState<ContaConectada[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ fetched: 0, expected: 0 });
  const [error, setError] = useState<string | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const filtrosRef = useRef<FiltrosVendas>({});
  const isLoadingPageRef = useRef(false);

  // Obter token de sessão
  const getSessionToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find((c) => c.trim().startsWith("session="));
    return sessionCookie ? sessionCookie.split("=")[1] : null;
  }, []);

  // Conectar Socket.io
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log("[useVendasSocket] Socket já conectado");
      return;
    }

    const sessionToken = getSessionToken();
    if (!sessionToken) {
      console.error("[useVendasSocket] Token de sessão não encontrado");
      setError("Não autenticado");
      return;
    }

    console.log("[useVendasSocket] Conectando ao Socket.io...");

    const socketUrl = API_CONFIG.baseURL || window.location.origin;

    const socket = io(socketUrl, {
      path: "/api/socketio",
      auth: { sessionToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Event: Conexão estabelecida
    socket.on("connect", () => {
      console.log("[useVendasSocket] ✅ Conectado ao Socket.io");
      setIsConnected(true);
      setError(null);
    });

    // Event: Desconexão
    socket.on("disconnect", (reason) => {
      console.log("[useVendasSocket] ❌ Desconectado:", reason);
      setIsConnected(false);
    });

    // Event: Erro de conexão
    socket.on("connect_error", (err) => {
      console.error("[useVendasSocket] Erro de conexão:", err.message);
      setError(`Erro de conexão: ${err.message}`);
    });

    // Event: Dados de vendas recebidos
    socket.on("vendas:data", (data: any) => {
      console.log(`[useVendasSocket] Recebido página ${data.page}: ${data.vendas.length} vendas`);

      setVendas((prev) => {
        // Se for a primeira página, substituir
        if (data.page === 1) {
          return data.vendas;
        }
        // Caso contrário, adicionar ao final (infinite scroll)
        return [...prev, ...data.vendas];
      });

      setCurrentPage(data.page);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setHasMore(data.hasMore);
      setIsLoading(false);
      isLoadingPageRef.current = false;
    });

    // Event: Erro ao buscar vendas
    socket.on("vendas:error", (data: any) => {
      console.error("[useVendasSocket] Erro:", data.message);
      setError(data.message);
      setIsLoading(false);
      isLoadingPageRef.current = false;
    });

    // Event: Dados de contas
    socket.on("contas:data", (data: any) => {
      console.log(`[useVendasSocket] Recebido ${data.contas.length} contas`);
      setContasConectadas(data.contas);
    });

    // Event: Progresso de sincronização
    socket.on("sync:progress", (data: any) => {
      console.log("[useVendasSocket] Progresso sync:", data);
      setSyncProgress({
        fetched: data.fetched || 0,
        expected: data.expected || 0,
      });
    });

    // Event: Sincronização iniciada
    socket.on("sync:started", (data: any) => {
      console.log("[useVendasSocket] Sincronização iniciada");
      setIsSyncing(true);
    });

    // Event: Sincronização concluída
    socket.on("sync:complete", (data: any) => {
      console.log("[useVendasSocket] Sincronização concluída");
      setIsSyncing(false);
      // Recarregar primeira página
      fetchPage(1, filtrosRef.current);
    });

    // Event: Erro na sincronização
    socket.on("sync:error", (data: any) => {
      console.error("[useVendasSocket] Erro na sync:", data.message);
      setError(data.message);
      setIsSyncing(false);
    });

    socketRef.current = socket;
  }, [getSessionToken]);

  // Desconectar Socket.io
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("[useVendasSocket] Desconectando...");
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Buscar página de vendas
  const fetchPage = useCallback(
    (page: number, filtros: FiltrosVendas = {}) => {
      if (!socketRef.current?.connected) {
        console.warn("[useVendasSocket] Socket não conectado");
        return;
      }

      if (isLoadingPageRef.current) {
        console.log("[useVendasSocket] Já está carregando uma página");
        return;
      }

      console.log(`[useVendasSocket] Solicitando página ${page}`);
      isLoadingPageRef.current = true;
      setIsLoading(true);
      filtrosRef.current = filtros;

      socketRef.current.emit("vendas:fetch", { page, filtros });
    },
    []
  );

  // Buscar próxima página (infinite scroll)
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingPageRef.current) {
      return;
    }

    const nextPage = currentPage + 1;
    console.log(`[useVendasSocket] Carregando próxima página: ${nextPage}`);
    fetchPage(nextPage, filtrosRef.current);
  }, [hasMore, currentPage, fetchPage]);

  // Aplicar filtros (resetar para página 1)
  const applyFilters = useCallback(
    (filtros: FiltrosVendas) => {
      console.log("[useVendasSocket] Aplicando filtros:", filtros);
      setVendas([]); // Limpar vendas anteriores
      setCurrentPage(1);
      fetchPage(1, filtros);
    },
    [fetchPage]
  );

  // Buscar contas conectadas
  const fetchContas = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn("[useVendasSocket] Socket não conectado");
      return;
    }

    console.log("[useVendasSocket] Solicitando contas conectadas");
    socketRef.current.emit("contas:fetch");
  }, []);

  // Iniciar sincronização
  const startSync = useCallback(
    (accountIds: string[], fullSync: boolean = false) => {
      if (!socketRef.current?.connected) {
        console.warn("[useVendasSocket] Socket não conectado");
        return;
      }

      console.log(`[useVendasSocket] Iniciando sincronização: ${accountIds.length} contas`);
      socketRef.current.emit("sync:start", { accountIds, fullSync });
    },
    []
  );

  // Conectar automaticamente ao montar
  useEffect(() => {
    if (autoConnect && platform === "Mercado Livre") {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, platform, connect, disconnect]);

  // Buscar dados iniciais após conectar
  useEffect(() => {
    if (isConnected && platform === "Mercado Livre") {
      fetchContas();
      fetchPage(1, {});
    }
  }, [isConnected, platform, fetchContas, fetchPage]);

  return {
    // Estado
    vendas,
    contasConectadas,
    isConnected,
    isLoading,
    isSyncing,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    syncProgress,
    error,

    // Ações
    connect,
    disconnect,
    fetchPage,
    loadMore,
    applyFilters,
    fetchContas,
    startSync,
  };
}
