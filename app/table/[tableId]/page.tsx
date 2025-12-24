'use client'

import { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { generateSessionId } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import { Loader2, Bell, BellOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Lazy load components
const ChatInterface = lazy(() => import('@/components/customer/ChatInterface'))
const ManualMenu = lazy(() => import('@/components/customer/ManualMenu'))
const OrderStatus = lazy(() => import('@/components/customer/OrderStatus'))

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-12 rounded-xl" />
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-10 w-20 rounded-full flex-shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export default function TablePage() {
  const params = useParams()

  const tableId =
    typeof params.tableId === 'string'
      ? params.tableId
      : Array.isArray(params.tableId)
      ? params.tableId[0]
      : ''

  const [sessionId, setSessionId] = useState('')
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'orders'>('manual')
  const [cartCount, setCartCount] = useState(0)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.7
  }, [])

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((err) => {
        console.log('Audio play failed:', err)
      })
    }
  }, [])

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, [])

  // Check notification permission on load
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true)
      } else if (Notification.permission === 'default') {
        // Show prompt after a short delay
        setTimeout(() => setShowNotificationPrompt(true), 2000)
      }
    }
  }, [])

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
        setShowNotificationPrompt(false)
        toast.success('Notifications enabled!')
        
        // Play test sound
        playNotificationSound()
      } else {
        toast.error('Notifications blocked')
        setShowNotificationPrompt(false)
      }
    } catch (error) {
      console.error('Notification permission error:', error)
      toast.error('Failed to enable notifications')
    }
  }

  useEffect(() => {
    if (!tableId) return
    const storageKey = `table_${tableId}_session`
    const existingSession = localStorage.getItem(storageKey)
    if (existingSession) {
      setSessionId(existingSession)
    } else {
      const newSession = generateSessionId()
      localStorage.setItem(storageKey, newSession)
      setSessionId(newSession)
    }
  }, [tableId])

  const handleTabChange = useCallback((tab: 'manual' | 'ai' | 'orders') => {
    setActiveTab(tab)
  }, [])

  // Fetch active orders count
  useEffect(() => {
    if (!sessionId || !tableId) return

    const fetchOrdersCount = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('orders')
        .select('id, status')
        .eq('table_id', tableId)
        .eq('session_id', sessionId)
        .in('status', ['pending', 'preparing', 'ready'])

      if (data) {
        setActiveOrdersCount(data.length)
      }
    }

    fetchOrdersCount()

    const supabase = createClient()
    const channel = supabase
      .channel(`orders_count_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `session_id=eq.${sessionId}`,
        },
        fetchOrdersCount
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, tableId])

  // Order status notifications
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
            const statusMessages: Record<string, { message: string; emoji: string }> = {
              preparing: { message: 'Your order is being prepared', emoji: '👨‍🍳' },
              ready: { message: 'Your order is ready for pickup!', emoji: '🔔' },
              served: { message: 'Enjoy your meal!', emoji: '🍽️' },
              cancelled: { message: 'Order was cancelled', emoji: '❌' },
            }

            const notification = statusMessages[order.status]
            if (notification) {
              // Always show toast
              toast.success(notification.message, { 
                duration: 5000,
                icon: notification.emoji
              })

              // Play sound for important status changes
              if (order.status === 'ready' || order.status === 'preparing') {
                playNotificationSound()
              }

              // Show browser notification
              if (Notification.permission === 'granted') {
                try {
                  const notif = new Notification('Order Update', {
                    body: notification.message,
                    icon: '/icon-192.png',
                    tag: order.id,
                    requireInteraction: order.status === 'ready',
                    vibrate: [200, 100, 200],
                    silent: false, // Allow sound
                  } as NotificationOptions)

                  notif.onclick = () => {
                    window.focus()
                    handleTabChange('orders')
                    notif.close()
                  }
                } catch (error) {
                  console.error('Notification error:', error)
                }
              }

              // Switch to orders tab when ready
              if (order.status === 'ready') {
                setTimeout(() => handleTabChange('orders'), 1500)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
    }
  }, [sessionId, tableId, handleTabChange, playNotificationSound])

  const handleOrderConfirmed = async (items: any[], totalAmount: number) => {
    try {
      const orderData = { tableId, sessionId, items, totalAmount }
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Order placed!')
        setCartCount(0)
        handleTabChange('orders')
      } else {
        throw new Error(result.error || 'Failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }

  const handleCartChange = useCallback((count: number) => {
    setCartCount(count)
  }, [])

  if (!tableId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Table</h1>
          <p className="text-gray-500">Please scan a valid table QR code</p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'manual' as const, label: 'Menu', badge: cartCount },
    { id: 'ai' as const, label: 'AI Order', badge: 0 },
    { id: 'orders' as const, label: 'Orders', badge: activeOrdersCount },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Permission Prompt */}
      {showNotificationPrompt && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 animate-slide-down">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">Enable notifications to get order updates</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotificationPrompt(false)}
                className="text-xs text-gray-400 hover:text-white px-2 py-1"
              >
                Later
              </button>
              <button
                onClick={requestNotificationPermission}
                className="text-xs bg-white text-gray-900 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`bg-white border-b border-gray-200 sticky top-0 z-40 ${showNotificationPrompt ? 'mt-12' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              Table {tableId.length > 10 ? `${tableId.slice(0, 10)}...` : tableId}
            </h1>
            <div className="flex items-center gap-3">
              {/* Notification status indicator */}
              <button
                onClick={requestNotificationPermission}
                className={`p-2 rounded-lg transition-colors ${
                  notificationsEnabled 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
              >
                {notificationsEnabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>
              <span className="text-xs text-gray-400 font-mono">
                {sessionId.slice(0, 6)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${
                    isActive 
                      ? 'text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold rounded-full ${
                      isActive 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'manual' && (
            <ManualMenu
              tableId={tableId}
              sessionId={sessionId}
              onOrderConfirmed={handleOrderConfirmed}
              onSwitchToOrders={() => handleTabChange('orders')}
              onCartChange={handleCartChange}
            />
          )}

          {activeTab === 'ai' && (
            <ChatInterface
              tableId={tableId}
              sessionId={sessionId}
              onOrderConfirmed={handleOrderConfirmed}
            />
          )}

          {activeTab === 'orders' && (
            <OrderStatus tableId={tableId} sessionId={sessionId} />
          )}
        </Suspense>
      </div>
    </div>
  )
}
