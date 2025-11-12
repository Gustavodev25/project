import { useState, useEffect, useRef, useCallback } from 'react';

interface VendasSyncProgress {
  type: "connected" | "sync_start" | "sync_progress" | "sync_complete" | "sync_error" | "sync_warning" | "sync_debug";
  message: string;
  current?: number;
  total?: number;
  accountId?: string;
  accountNickname?: string;
  page?: number;
  offset?: number;
  fetched?: number;
  expected?: number;
  timestamp?: string;
  userId?: string;
  errorCode?: string;
  debugData?: any;
}

interface UseVendasSyncProgressReturn {
  isConnected: boolean;
  progress: VendasSyncProgress | null;
  connect: () => void;
  disconnect: () => void;
}

export function useVendasSyncProgress(): UseVendasSyncProgressReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState<VendasSyncProgress | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const shouldReconnectRef = useRef(false);

  const connect = useCallback(() => {
    console.log('[SSE useVendasSyncProgress] 🔌 Função connect() chamada');

    if (eventSourceRef.current) {
      console.log('[SSE useVendasSyncProgress] Fechando conexão existente antes de criar nova');
      eventSourceRef.current.close();
    }

    // Enable reconnection flag
    shouldReconnectRef.current = true;
    console.log('[SSE useVendasSyncProgress] Flag shouldReconnect ativada');

    console.log('[SSE useVendasSyncProgress] Criando nova conexão EventSource para /api/meli/vendas/sync-progress');

    let eventSource: EventSource;
    try {
      eventSource = new EventSource('/api/meli/vendas/sync-progress', {
        withCredentials: true
      });
      eventSourceRef.current = eventSource;
      console.log('[SSE useVendasSyncProgress] EventSource criado com sucesso, readyState:', eventSource.readyState);
    } catch (error) {
      console.error('[SSE useVendasSyncProgress] ❌ Erro ao criar EventSource:', error);
      setIsConnected(false);
      return;
    }

    eventSource.onopen = () => {
      console.log('[SSE useVendasSyncProgress] ✅ onopen disparado - conexão estabelecida!');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      console.log('[SSE useVendasSyncProgress] Estado atualizado: isConnected=true, reconnectAttempts=0');
    };

    eventSource.onmessage = (event) => {
      console.log('[SSE useVendasSyncProgress] 📨 Mensagem recebida:', event.data);
      try {
        const progressData: VendasSyncProgress = JSON.parse(event.data);
        console.log('[SSE useVendasSyncProgress] Dados parseados:', progressData);
        setProgress(progressData);

        // Log para debug
        if (progressData.type === "sync_progress") {
          console.log('[SSE useVendasSyncProgress] Progresso recebido:', progressData.message);
        } else {
          console.log('[SSE useVendasSyncProgress] Evento recebido:', progressData.type);
        }
      } catch (error) {
        console.error('[SSE useVendasSyncProgress] ❌ Erro ao processar progresso:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.log('[SSE useVendasSyncProgress] ⚠️ onerror disparado');
      console.log('[SSE useVendasSyncProgress] Objeto de erro:', error);

      // EventSource error objects are often empty, check readyState for more info
      const readyState = eventSource.readyState;
      const stateNames = ['CONNECTING', 'OPEN', 'CLOSED'];

      console.log('[SSE useVendasSyncProgress] Estado da conexão:', {
        readyState: stateNames[readyState] || readyState,
        readyStateNumero: readyState,
        shouldReconnect: shouldReconnectRef.current,
        reconnectAttempt: reconnectAttemptsRef.current
      });

      // Só loga erro se não for uma desconexão normal (quando shouldReconnect é false)
      if (shouldReconnectRef.current) {
        console.warn('[SSE useVendasSyncProgress] Erro na conexão:', {
          readyState: stateNames[readyState] || readyState,
          tentativa: reconnectAttemptsRef.current + 1
        });
      }

      // Only disconnect if the connection is closed
      if (readyState === EventSource.CLOSED) {
        console.log('[SSE useVendasSyncProgress] Conexão FECHADA, atualizando estado');
        setIsConnected(false);

        // Try to reconnect if enabled and within retry limit
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const retryDelay = Math.min(2000 * reconnectAttemptsRef.current, 6000); // Exponential backoff, max 6s

          console.log(`[SSE] Tentando reconectar... (tentativa ${reconnectAttemptsRef.current}/${maxReconnectAttempts}) em ${retryDelay}ms`);

          setTimeout(() => {
            if (shouldReconnectRef.current && eventSourceRef.current === eventSource) {
              connect();
            }
          }, retryDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.warn('[SSE] Número máximo de tentativas de reconexão atingido. A sincronização continuará sem atualizações em tempo real.');
          shouldReconnectRef.current = false;
        }
      }
    };

    return eventSource;
  }, []);

  const disconnect = useCallback(() => {
    // Disable reconnection when manually disconnecting
    shouldReconnectRef.current = false;
    reconnectAttemptsRef.current = 0;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      console.log('[SSE] Conexão fechada');
    }
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    progress,
    connect,
    disconnect
  };
}
