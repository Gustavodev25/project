'use client'

import { useState, useEffect } from 'react'

export interface UserGuidanceState {
  hasAccounts: boolean | null
  hasSales: boolean | null
  isLoading: boolean
  showConnectAccounts: boolean
  showSyncVendas: boolean
  showViewVendas: boolean
  showViewDashboard: boolean
}

const STORAGE_KEY = 'userGuidance_dismissed';

// Função auxiliar para obter notificações dismissed do localStorage
function getDismissedNotifications(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Função auxiliar para salvar notificações dismissed no localStorage
function saveDismissedNotification(type: string) {
  if (typeof window === 'undefined') return;
  try {
    const dismissed = getDismissedNotifications();
    dismissed.add(type);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  } catch (error) {
    console.warn('Erro ao salvar notificação dismissed:', error);
  }
}

export function useUserGuidance() {
  const [state, setState] = useState<UserGuidanceState>({
    hasAccounts: null,
    hasSales: null,
    isLoading: true,
    showConnectAccounts: false,
    showSyncVendas: false,
    showViewVendas: false,
    showViewDashboard: false,
  })

  const updateGuidanceState = (hasAccounts: boolean, hasSales: boolean) => {
    const dismissed = getDismissedNotifications();
    
    setState(prev => ({
      ...prev,
      hasAccounts,
      hasSales,
      isLoading: false,
      showConnectAccounts: !hasAccounts && !dismissed.has('showConnectAccounts'),
      showSyncVendas: hasAccounts && !hasSales && !dismissed.has('showSyncVendas'),
      showViewVendas: hasAccounts && hasSales && !dismissed.has('showViewVendas'),
      showViewDashboard: hasAccounts && hasSales && !dismissed.has('showViewDashboard'),
    }))
  }

  const dismissNotification = (type: keyof Pick<UserGuidanceState, 'showConnectAccounts' | 'showSyncVendas' | 'showViewVendas' | 'showViewDashboard'>) => {
    // Salvar no localStorage
    saveDismissedNotification(type);
    
    // Atualizar estado local
    setState(prev => ({
      ...prev,
      [type]: false,
    }))
  }

  return {
    ...state,
    updateGuidanceState,
    dismissNotification,
  }
}
