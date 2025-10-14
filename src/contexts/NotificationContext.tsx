'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
  actionLabel?: string
  actionHref?: string
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void
  hideNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

const notificationStyles = {
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
}

const iconStyles = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = { ...notification, id }

    setNotifications((prev) => [...prev, newNotification])

    // Auto dismiss after duration (default 5 seconds)
    const duration = notification.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id)
      }, duration)
    }
  }, [])

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md w-full pointer-events-none">
        {notifications.map((notification) => {
          const Icon = icons[notification.type]
          return (
            <div
              key={notification.id}
              className={`${notificationStyles[notification.type]} border-l-4 p-4 rounded-r-lg shadow-lg pointer-events-auto animate-slide-in-right`}
            >
              <div className="flex items-start">
                <Icon className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${iconStyles[notification.type]}`} />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{notification.title}</h3>
                  <p className="text-sm opacity-90">{notification.message}</p>
                  {notification.actionLabel && notification.actionHref && (
                    <a
                      href={notification.actionHref}
                      className="mt-2 inline-block text-sm font-medium underline hover:no-underline"
                    >
                      {notification.actionLabel}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => hideNotification(notification.id)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}
