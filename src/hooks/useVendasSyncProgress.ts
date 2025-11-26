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
  pendingJobs?: number;
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

    // Get token from cookie
    let token = "";
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|; )\s*session=([^;]+)/);
      if (match && match[1]) {
        token = match[1];
      }
    }

    // Use API_CONFIG to get the full URL (pointing to Render backend)
    // We must import API_CONFIG dynamically or assume it's available globally if not imported.
    // Since I cannot add imports easily with replace_file_content if they are at the top,
    // I will assume I need to add the import or use a relative path if I can't.
    // But wait, I can't add imports with replace_file_content easily without replacing the top of the file.
    // I will use window.location.origin as fallback if API_CONFIG is not imported, but I should try to use the correct URL.
    // Actually, I should have added the import. I'll do that in a separate step or use a multi-step approach.
    // For now, I'll use a hardcoded check or try to use the global config if possible.
    // But wait, I can just use the relative path if I didn't change API_CONFIG to return absolute.
    // But I DID change API_CONFIG to return absolute.
    // So I MUST use the absolute URL here.

    // Let's assume I will add the import in a separate tool call or use a trick.
    // I'll use a dynamic import or just hardcode the logic for now to match API_CONFIG.

    // Actually, I'll just use the relative path and let the browser handle it? 
    // NO, if API_CONFIG points to Render, I want SSE to point to Render too.
    // If I use relative path '/api/...', it hits Vercel.
    // I want to hit Render.

    // I will use a hardcoded env var check here as a temporary fix if I can't import API_CONFIG.
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://project-backend-rjoh.onrender.com";
    const baseUrl = `${backendUrl.replace(/\/$/, "")}/api/meli/vendas/sync-progress`;

    const url = token ? `${baseUrl}?token=${token}` : baseUrl;

    console.log('[SSE useVendasSyncProgress] Connecting to:', url);

    let eventSource: EventSource;
    try {
      eventSource = new EventSource(url, {
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

          // SEMPRE dismiss o toast anterior e criar novo para garantir atualização
          if (toastRef.current) {
            try {
              toastRef.current.dismiss();
            } catch (e) {
              // Ignorar erro se toast já foi fechado
            }
          }

          // Criar novo toast com progresso atual
          toastRef.current = toast({
            title: "🔄 Sincronizando vendas",
            description: detailedMsg,
            duration: Infinity, // Manter visível durante toda sincronização
          });

          console.log('[SSE useVendasSyncProgress] Toast atualizado:', progressMsg);

        } else if (progressData.type === "sync_continue") {
          // Mostrar que está continuando automaticamente EM BACKGROUND
          const continueMsg = progressData.total && progressData.current
            ? `${progressData.message}\n\n🔄 Rodando em background... Não feche esta página!`
            : `${progressData.message}\n\n🔄 Rodando em background...`;

          // Dismiss toast anterior
          if (toastRef.current) {
            try {
              toastRef.current.dismiss();
            } catch (e) {
              // Ignorar erro
            }
          }

          // Criar novo toast
          toastRef.current = toast({
            title: "🔄 Sincronização em Background",
            description: continueMsg,
            duration: Infinity, // Manter visível durante toda sincronização
          });

          console.log('[SSE useVendasSyncProgress] Toast de continuação em background:', progressData.message);

        } else if (progressData.type === "sync_complete") {
          // Sucesso - mostrar toast de conclusão com informações detalhadas
          const completeMsg = progressData.total && progressData.current
            ? `${progressData.message}\n\n${progressData.current} de ${progressData.total} vendas sincronizadas`
            : `${progressData.message}`;

          // Dismiss toast anterior
          if (toastRef.current) {
            try {
              toastRef.current.dismiss();
            } catch (e) {
              // Ignorar erro
            }
          }

          // Criar toast de conclusão
          toast({
            title: "✅ Sincronização Concluída!",
            description: completeMsg,
            duration: 8000, // Auto-fechar após 8 segundos
          });

          // Limpar referência
          toastRef.current = null;
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
