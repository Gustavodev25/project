import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface VendasSyncProgress {
  type: "connected" | "sync_start" | "sync_progress" | "sync_complete" | "sync_error" | "sync_warning" | "sync_debug" | "sync_continue";
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
  hasMoreToSync?: boolean;
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
  const toastRef = useRef<ReturnType<typeof toast> | null>(null);

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

        // MOSTRAR TOASTS BASEADO NO TIPO DE EVENTO
        const percentual = progressData.total && progressData.current
          ? Math.round((progressData.current / progressData.total) * 100)
          : 0;

        if (progressData.type === "sync_start") {
          // Criar novo toast para início da sincronização - PERSISTENTE
          toastRef.current = toast({
            title: "🔄 Sincronizando vendas",
            description: progressData.message,
            duration: Infinity, // NÃO fecha automaticamente durante sincronização
          });
          console.log('[SSE useVendasSyncProgress] Toast criado para sync_start');

        } else if (progressData.type === "sync_progress") {
          // Atualizar toast com progresso detalhado
          const progressMsg = progressData.total
            ? `${progressData.message} (${percentual}%)`
            : progressData.message;

          // Adicionar informações extras se disponíveis
          const detailedMsg = progressData.accountNickname
            ? `Conta: ${progressData.accountNickname}\n${progressMsg}`
            : progressMsg;

          if (toastRef.current) {
            toastRef.current.update({
              title: "🔄 Sincronizando vendas",
              description: detailedMsg,
              duration: Infinity, // Manter visível durante toda sincronização
            });
          } else {
            // Criar toast se não existir
            toastRef.current = toast({
              title: "🔄 Sincronizando vendas",
              description: detailedMsg,
              duration: Infinity,
            });
          }
          console.log('[SSE useVendasSyncProgress] Toast atualizado:', progressMsg);

        } else if (progressData.type === "sync_continue") {
          // Mostrar que está continuando automaticamente EM BACKGROUND
          const continueMsg = progressData.total && progressData.current
            ? `${progressData.message}\n\n🔄 Rodando em background... Não feche esta página!`
            : `${progressData.message}\n\n🔄 Rodando em background...`;

          if (toastRef.current) {
            toastRef.current.update({
              title: "🔄 Sincronização em Background",
              description: continueMsg,
              duration: Infinity, // Manter visível durante toda sincronização
            });
          } else {
            toastRef.current = toast({
              title: "🔄 Sincronização em Background",
              description: continueMsg,
              duration: Infinity,
            });
          }
          console.log('[SSE useVendasSyncProgress] Toast de continuação em background:', progressData.message);

        } else if (progressData.type === "sync_complete") {
          // Sucesso - mostrar toast de conclusão com informações detalhadas
          const completeMsg = progressData.total && progressData.current
            ? `✅ ${progressData.message}\n\n${progressData.current} de ${progressData.total} vendas sincronizadas (100%)`
            : `✅ ${progressData.message}`;

          if (toastRef.current) {
            toastRef.current.update({
              title: "✅ Sincronização Concluída!",
              description: completeMsg,
              duration: 8000, // Auto-fechar após 8 segundos
            });
          } else {
            toast({
              title: "✅ Sincronização Concluída!",
              description: completeMsg,
              duration: 8000,
            });
          }

          // Limpar referência após 8 segundos
          setTimeout(() => {
            toastRef.current = null;
          }, 8000);
          console.log('[SSE useVendasSyncProgress] Toast de conclusão mostrado');

        } else if (progressData.type === "sync_error") {
          // Erro - mostrar toast de erro detalhado
          const errorMsg = progressData.accountNickname
            ? `❌ ${progressData.message}\n\nConta: ${progressData.accountNickname}`
            : `❌ ${progressData.message}`;

          if (toastRef.current) {
            toastRef.current.update({
              title: "❌ Erro na Sincronização",
              description: errorMsg,
              duration: 10000, // Manter visível por 10s para usuário ler
            });
          } else {
            toast({
              title: "❌ Erro na Sincronização",
              description: errorMsg,
              duration: 10000,
            });
          }

          // Limpar referência após 10 segundos
          setTimeout(() => {
            toastRef.current = null;
          }, 10000);
          console.error('[SSE useVendasSyncProgress] Toast de erro mostrado:', progressData.message);

        } else if (progressData.type === "sync_warning") {
          // Aviso - mostrar detalhado
          const warningMsg = progressData.accountNickname
            ? `⚠️ ${progressData.message}\n\nConta: ${progressData.accountNickname}`
            : `⚠️ ${progressData.message}`;

          toast({
            title: "⚠️ Aviso",
            description: warningMsg,
            duration: 8000,
          });
          console.warn('[SSE useVendasSyncProgress] Toast de aviso:', progressData.message);
        }

        // Log para debug (mantido)
        if (progressData.type === "sync_progress") {
          console.log('[SSE useVendasSyncProgress] Progresso recebido:', progressData.message);
        } else if (progressData.type !== "connected") {
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

    // Limpar toast se existir
    if (toastRef.current) {
      toastRef.current.dismiss();
      toastRef.current = null;
      console.log('[SSE] Toast limpo ao desconectar');
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
