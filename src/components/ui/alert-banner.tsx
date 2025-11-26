'use client'

import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type BannerType = 'info' | 'warning' | 'success' | 'error'

interface AlertBannerProps {
  type?: BannerType
  title: string
  message: string
  actionLabel?: string
  actionHref?: string
  dismissible?: boolean
  onDismiss?: () => void
}

const bannerStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
}

const iconStyles = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  success: 'text-green-500',
  error: 'text-red-500',
}

const buttonStyles = {
  info: 'bg-blue-600 hover:bg-blue-700',
  warning: 'bg-yellow-600 hover:bg-yellow-700',
  success: 'bg-green-600 hover:bg-green-700',
  error: 'bg-red-600 hover:bg-red-700',
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
}

export function AlertBanner({
  type = 'info',
  title,
  message,
  actionLabel,
  actionHref,
  dismissible = true,
  onDismiss,
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const router = useRouter()
  const Icon = icons[type]

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  const handleAction = () => {
    if (actionHref) {
      router.push(actionHref)
    }
  }

  if (!isVisible) return null

  return (
    <div className={`border-l-4 p-3 mb-4 rounded-r-md ${bannerStyles[type]} relative`}>
      <div className="flex items-center">
        <Icon className={`h-4 w-4 mr-2 flex-shrink-0 ${iconStyles[type]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{title}</h3>
            {actionLabel && actionHref && (
              <button
                onClick={handleAction}
                className={`px-3 py-1 text-xs font-medium text-white rounded transition-colors ${buttonStyles[type]}`}
              >
                {actionLabel}
              </button>
            )}
          </div>
          <p className="text-xs opacity-90 mt-1">{message}</p>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
