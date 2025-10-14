'use client'

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/app/components/views/ui/toaster';

interface SyncProgress {
  type: "sync_start" | "sync_progress" | "sync_complete" | "sync_error";
  title: string;
  message: string;
  progressValue?: number;
  progressMax?: number;
  progressLabel?: string;
}

export function useSyncProgress() {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const { toast, updateToast, dismiss } = useToast();

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/financeiro/sync-progress', { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('SSE conectado para progresso de sincronização');
    };

    eventSource.onmessage = (event) => {
      try {
        const progress: SyncProgress = JSON.parse(event.data);
        handleProgress(progress);
      } catch (error) {
        console.error('Erro ao processar progresso:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Erro na conexão SSE:', error);
      setIsConnected(false);
    };

    return eventSource;
  };

  const handleProgress = (progress: SyncProgress) => {
    if (progress.type === "sync_start") {
      // Criar novo toast para sincronização
      toastIdRef.current = toast({
        title: progress.title,
        description: progress.message,
        variant: "info",
        duration: 0, // Não auto-fechar
        showProgress: true,
        progressValue: progress.progressValue || 0,
        progressMax: progress.progressMax || 100,
        progressLabel: progress.progressLabel
      });
    } else if (progress.type === "sync_progress" && toastIdRef.current) {
      // Atualizar toast existente
      updateToast(toastIdRef.current, {
        title: progress.title,
        description: progress.message,
        variant: "info",
        showProgress: true,
        progressValue: progress.progressValue || 0,
        progressMax: progress.progressMax || 100,
        progressLabel: progress.progressLabel
      });
    } else if (progress.type === "sync_complete" && toastIdRef.current) {
      // Atualizar para sucesso
      updateToast(toastIdRef.current, {
        title: progress.title,
        description: progress.message,
        variant: "success",
        showProgress: true,
        progressValue: progress.progressValue || 100,
        progressMax: progress.progressMax || 100,
        progressLabel: progress.progressLabel,
        duration: 5000 // Auto-fechar após 5 segundos
      });
      
      // Limpar referência após um delay
      setTimeout(() => {
        toastIdRef.current = null;
      }, 5000);
    } else if (progress.type === "sync_error" && toastIdRef.current) {
      // Atualizar para erro
      updateToast(toastIdRef.current, {
        title: progress.title,
        description: progress.message,
        variant: "error",
        showProgress: true,
        progressValue: progress.progressValue || 0,
        progressMax: progress.progressMax || 100,
        progressLabel: progress.progressLabel,
        duration: 8000 // Auto-fechar após 8 segundos
      });
      
      // Limpar referência após um delay
      setTimeout(() => {
        toastIdRef.current = null;
      }, 8000);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    
    // Limpar toast se existir
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    isConnected
  };
}



