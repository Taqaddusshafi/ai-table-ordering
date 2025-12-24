'use client'

import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { generateSessionId } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
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

    // Subscribe to order changes
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

  // Notifications
  useEffect(() => {
    if (!sessionId || !tableId) return

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

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
            const statusMessages: Record<string, { message: string }> = {
              preparing: { message: 'Your order is being prepared' },
              ready: { message: 'Your order is ready!' },
              served: { message: 'Enjoy your meal!' },
              cancelled: { message: 'Order was cancelled' },
            }

            const notification = statusMessages[order.status]
            if (notification) {
              toast.success(notification.message, { duration: 4000 })

              if (Notification.permission === 'granted') {
                new Notification('Order Update', {
                  body: notification.message,
                  icon: '/icon-192.png',
                  tag: order.id,
                })
              }

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
  }, [sessionId, tableId, handleTabChange])

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
        setCartCount(0) // Clear cart count after order
        handleTabChange('orders')
      } else {
        throw new Error(result.error || 'Failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }

  // Update cart count from ManualMenu
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              Table {tableId.length > 10 ? `${tableId.slice(0, 10)}...` : tableId}
            </h1>
            <span className="text-xs text-gray-400 font-mono">
              {sessionId.slice(0, 6)}
            </span>
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
                  {/* Badge */}
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
