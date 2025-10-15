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
    if (eventSourceRef.current) {
      console.log('[SSE] Fechando conexão existente antes de criar nova');
      eventSourceRef.current.close();
    }

    // Enable reconnection flag
    shouldReconnectRef.current = true;

    console.log('[SSE] Criando nova conexão EventSource');

    let eventSource: EventSource;
    try {
      eventSource = new EventSource('/api/meli/vendas/sync-progress', {
        withCredentials: true
      });
      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('[SSE] Erro ao criar EventSource:', error);
      setIsConnected(false);
      return;
    }

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      console.log('[SSE] Conexão estabelecida para progresso de vendas');
    };

    eventSource.onmessage = (event) => {
      try {
        const progressData: VendasSyncProgress = JSON.parse(event.data);
        setProgress(progressData);
        
        // Log para debug
        if (progressData.type === "sync_progress") {
          console.log('[SSE] Progresso recebido:', progressData.message);
        }
      } catch (error) {
        console.error('[SSE] Erro ao processar progresso:', error);
      }
    };

    eventSource.onerror = (error) => {
      // EventSource error objects are often empty, check readyState for more info
      const readyState = eventSource.readyState;
      const stateNames = ['CONNECTING', 'OPEN', 'CLOSED'];

      // Só loga erro se não for uma desconexão normal (quando shouldReconnect é false)
      if (shouldReconnectRef.current) {
        console.warn('[SSE] Erro na conexão:', {
          readyState: stateNames[readyState] || readyState,
          tentativa: reconnectAttemptsRef.current + 1
        });
      }

      // Only disconnect if the connection is closed
      if (readyState === EventSource.CLOSED) {
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
