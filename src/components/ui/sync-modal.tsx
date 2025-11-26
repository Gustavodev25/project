'use client'

import { useState } from 'react'
import { X, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'

interface SyncModalProps {
  isOpen: boolean
  onClose: () => void
  accounts?: Array<{
    id: string
    type: 'meli' | 'shopee'
    name: string
  }>
}

export function SyncModal({ isOpen, onClose, accounts = [] }: SyncModalProps) {
  const { showNotification } = useNotification()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<Array<{
    accountId: string
    accountName: string
    success: boolean
    message: string
  }>>([])

  const handleSyncAll = async () => {
    setIsSyncing(true)
    setSyncResults([])

    const results = []

    for (const account of accounts) {
      try {
        const endpoint = account.type === 'meli'
          ? `/api/meli/sync?accountId=${account.id}`
          : `/api/shopee/sync?accountId=${account.id}`

        const response = await fetch(endpoint, { method: 'POST' })
        const data = await response.json()

        results.push({
          accountId: account.id,
          accountName: account.name,
          success: response.ok,
          message: response.ok
            ? `${data.count || 0} vendas sincronizadas`
            : data.error || 'Erro ao sincronizar'
        })
      } catch (error) {
        results.push({
          accountId: account.id,
          accountName: account.name,
          success: false,
          message: 'Erro de conexão'
        })
      }
    }

    setSyncResults(results)
    setIsSyncing(false)

    // Mostrar notificação de resultado
    const successCount = results.filter(r => r.success).length
    if (successCount === results.length) {
      showNotification({
        type: 'success',
        title: 'Sincronização concluída!',
        message: `Todas as ${successCount} contas foram sincronizadas com sucesso.`,
        duration: 5000
      })
    } else if (successCount > 0) {
      showNotification({
        type: 'warning',
        title: 'Sincronização parcial',
        message: `${successCount} de ${results.length} contas foram sincronizadas.`,
        duration: 5000
      })
    } else {
      showNotification({
        type: 'error',
        title: 'Falha na sincronização',
        message: 'Não foi possível sincronizar nenhuma conta.',
        duration: 5000
      })
    }
  }

  const handleSyncSingle = async (account: typeof accounts[0]) => {
    setIsSyncing(true)

    try {
      const endpoint = account.type === 'meli'
        ? `/api/meli/sync?accountId=${account.id}`
        : `/api/shopee/sync?accountId=${account.id}`

      const response = await fetch(endpoint, { method: 'POST' })
      const data = await response.json()

      if (response.ok) {
        showNotification({
          type: 'success',
          title: 'Sincronização concluída!',
          message: `${data.count || 0} vendas foram importadas de ${account.name}.`,
          duration: 5000
        })

        setSyncResults([{
          accountId: account.id,
          accountName: account.name,
          success: true,
          message: `${data.count || 0} vendas sincronizadas`
        }])
      } else {
        showNotification({
          type: 'error',
          title: 'Erro na sincronização',
          message: data.error || 'Não foi possível sincronizar as vendas.',
          duration: 5000
        })

        setSyncResults([{
          accountId: account.id,
          accountName: account.name,
          success: false,
          message: data.error || 'Erro ao sincronizar'
        }])
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Erro na sincronização',
        message: 'Erro de conexão ao tentar sincronizar.',
        duration: 5000
      })
    }

    setIsSyncing(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Sincronizar Vendas</h2>
            <p className="text-sm text-gray-600 mt-1">
              Importe as vendas mais recentes das suas contas
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma conta conectada</p>
              <p className="text-sm text-gray-500 mt-2">
                Conecte suas contas para sincronizar vendas
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Botão de sincronizar todas */}
              <button
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Todas'}
              </button>

              {/* Lista de contas */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Ou sincronize individualmente:</p>
                {accounts.map((account) => {
                  const result = syncResults.find(r => r.accountId === account.id)

                  return (
                    <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          account.type === 'meli' ? 'bg-yellow-100' : 'bg-orange-100'
                        }`}>
                          <span className="text-sm font-semibold">
                            {account.type === 'meli' ? 'ML' : 'SP'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{account.name}</p>
                          {result && (
                            <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                              {result.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSyncSingle(account)}
                        disabled={isSyncing}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors disabled:opacity-50"
                      >
                        {result?.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
