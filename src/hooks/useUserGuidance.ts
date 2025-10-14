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
    setState(prev => ({
      ...prev,
      hasAccounts,
      hasSales,
      isLoading: false,
      showConnectAccounts: !hasAccounts,
      showSyncVendas: hasAccounts && !hasSales,
      showViewVendas: hasAccounts && hasSales,
      showViewDashboard: hasAccounts && hasSales,
    }))
  }

  const dismissNotification = (type: keyof Pick<UserGuidanceState, 'showConnectAccounts' | 'showSyncVendas' | 'showViewVendas' | 'showViewDashboard'>) => {
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
