'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, Info, CheckCircle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'

type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'sync'

interface UserGuidanceNotificationProps {
  type?: NotificationType
  title: string
  message: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  dismissible?: boolean
  onDismiss?: () => void
  autoHide?: boolean
  autoHideDelay?: number
  showProgress?: boolean
  progressValue?: number
  progressMax?: number
  progressLabel?: string
}

const notificationStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  sync: 'bg-purple-50 border-purple-200 text-purple-900',
}

const iconStyles = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  success: 'text-green-500',
  error: 'text-red-500',
  sync: 'text-purple-500',
}

const buttonStyles = {
  info: 'bg-blue-600 hover:bg-blue-700',
  warning: 'bg-yellow-600 hover:bg-yellow-700',
  success: 'bg-green-600 hover:bg-green-700',
  error: 'bg-red-600 hover:bg-red-700',
  sync: 'bg-purple-600 hover:bg-purple-700',
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
  sync: Loader2,
}

export function UserGuidanceNotification({
  type = 'info',
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
  dismissible = true,
  onDismiss,
  autoHide = false,
  autoHideDelay = 5000,
  showProgress = false,
  progressValue = 0,
  progressMax = 100,
  progressLabel,
}: UserGuidanceNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(progressValue)
  const router = useRouter()
  const Icon = icons[type]

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, autoHideDelay)
      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, onDismiss])

  useEffect(() => {
    setProgress(progressValue)
  }, [progressValue])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else if (actionHref) {
      router.push(actionHref)
    }
  }

  if (!isVisible) return null

  return (
    <div className={`border-l-4 p-4 mb-4 rounded-r-md ${notificationStyles[type]} relative shadow-sm`}>
      <div className="flex items-start">
        <Icon className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${iconStyles[type]} ${type === 'sync' ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-sm opacity-90 mb-3">{message}</p>
          
          {showProgress && (
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span>{progressLabel || 'Progresso'}</span>
                <span>{Math.round((progress / progressMax) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${buttonStyles[type]}`}
                  style={{ width: `${(progress / progressMax) * 100}%` }}
                />
              </div>
            </div>
          )}

          {actionLabel && (
            <button
              onClick={handleAction}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${buttonStyles[type]}`}
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
