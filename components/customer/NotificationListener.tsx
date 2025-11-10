'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useBrowserNotifications } from '@/hooks/useNotifications'
import { Bell, BellOff } from 'lucide-react'

interface NotificationListenerProps {
  sessionId: string
  tableId: string
}

export default function NotificationListener({
  sessionId,
  tableId,
}: NotificationListenerProps) {
  const { showNotification, requestPermission, permission, isSupported } = useBrowserNotifications()
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)

  useEffect(() => {
    if (isSupported && permission === 'default') {
      setShowPermissionPrompt(true)
    }
  }, [isSupported, permission])

  const handleEnableNotifications = async () => {
    const granted = await requestPermission()
    if (granted) {
      toast.success('Notifications enabled! 🔔')
      setShowPermissionPrompt(false)
      
      // Register service worker for better notification support
      registerServiceWorker()
    } else {
      toast.error('Please allow notifications in your browser settings')
    }
  }

  useEffect(() => {
    if (!sessionId || !tableId) return

    const supabase = createClient()

    const ordersChannel = supabase
      .channel(`orders_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const order = payload.new as any
          const oldOrder = payload.old as any

          if (order.status !== oldOrder.status) {
            const statusMessages: Record<string, { title: string; body: string; icon: string }> = {
              preparing: {
                title: '🍳 Order Being Prepared',
                body: 'Your order is now being prepared in the kitchen!',
                icon: '👨‍🍳'
              },
              ready: {
                title: '✅ Order Ready!',
                body: 'Your order is ready for pickup. Please collect it from the counter.',
                icon: '✅'
              },
              served: {
                title: '🍽️ Enjoy Your Meal!',
                body: 'Your order has been served. Bon appétit!',
                icon: '🍽️'
              },
              cancelled: {
                title: '❌ Order Cancelled',
                body: 'Your order has been cancelled.',
                icon: '❌'
              }
            }

            const notification = statusMessages[order.status]
            if (notification) {
              // Show toast (works everywhere)
              toast.success(notification.body, { 
                duration: 5000,
                icon: notification.icon
              })

              // Show notification with sound
              if (permission === 'granted') {
                showNotificationWithSound(notification.title, notification.body, order.id)
              }

              // Vibrate on mobile
              if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200, 100, 200])
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
    }
  }, [sessionId, tableId, permission, showNotification])

  if (showPermissionPrompt && isSupported) {
    return (
      <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-2xl p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Stay Updated!</h3>
              <p className="text-sm opacity-90 mb-3">
                Get instant notifications when your order status changes
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleEnableNotifications}
                  className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
                >
                  Enable Notifications
                </button>
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  className="px-4 py-2 bg-white bg-opacity-20 rounded-lg font-semibold hover:bg-opacity-30 transition-colors text-sm"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowPermissionPrompt(false)}
              className="flex-shrink-0 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <BellOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Register service worker for better notification support
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.log('Service Worker registration failed:', error)
    })
  }
}

// Show notification with sound support
function showNotificationWithSound(title: string, body: string, tag: string) {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    // Try using service worker for better mobile support
    navigator.serviceWorker.ready.then((registration) => {
      // Cast to any to avoid TypeScript errors with vibrate
      const options: any = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        silent: false,
        actions: [
          {
            action: 'view',
            title: 'View Order'
          }
        ],
        data: {
          url: window.location.href
        }
      }
      
      registration.showNotification(title, options)
    }).catch(() => {
      // Fallback to regular notification
      const options: any = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag,
        requireInteraction: true,
        silent: false,
      }
      new Notification(title, options)
    })
  } else {
    // Fallback to regular notification
    const options: any = {
      body,
      icon: '/icon-192.png',
      tag,
      silent: false,
    }
    new Notification(title, options)
  }
}
