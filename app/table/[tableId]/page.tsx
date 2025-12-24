'use client'

import { useState, useEffect, Suspense, lazy, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { generateSessionId } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import { Sparkles, Menu, MessageSquare, Receipt, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Lazy load components for better initial load performance
const ChatInterface = lazy(() => import('@/components/customer/ChatInterface'))
const ManualMenu = lazy(() => import('@/components/customer/ManualMenu'))
const OrderStatus = lazy(() => import('@/components/customer/OrderStatus'))

// Loading skeleton for lazy loaded components
function TabContentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="skeleton h-12 rounded-xl" />
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-10 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-64 rounded-2xl" />
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
  const [isTabChanging, setIsTabChanging] = useState(false)

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

  // Smooth tab change with animation
  const handleTabChange = useCallback((tab: 'manual' | 'ai' | 'orders') => {
    if (tab === activeTab) return
    setIsTabChanging(true)
    // Short delay for exit animation
    setTimeout(() => {
      setActiveTab(tab)
      setIsTabChanging(false)
    }, 150)
  }, [activeTab])

  // ✅ Notification System
  useEffect(() => {
    if (!sessionId || !tableId) return

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const supabase = createClient()

    // Subscribe to order status changes for this session
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

          // Only notify if status actually changed
          if (order.status !== oldOrder.status) {
            const statusMessages: Record<string, { message: string; icon: string }> = {
              preparing: { message: '👨‍🍳 Your order is being prepared!', icon: '👨‍🍳' },
              ready: { message: '✅ Your order is ready! Please collect it.', icon: '✅' },
              served: { message: '🍽️ Enjoy your meal!', icon: '🍽️' },
              cancelled: { message: '❌ Order was cancelled', icon: '❌' },
            }

            const notification = statusMessages[order.status]
            if (notification) {
              // Show toast notification
              toast.success(notification.message, {
                duration: 5000,
                icon: notification.icon,
              })

              // Show browser notification
              if (Notification.permission === 'granted') {
                new Notification('Order Update', {
                  body: notification.message,
                  icon: '/icon-192.png',
                  tag: order.id,
                })
              }

              // Play notification sound
              try {
                const audio = new Audio('/notification.mp3')
                audio.volume = 0.5
                audio.play().catch(() => {})
              } catch (e) {
                console.log('Sound play failed:', e)
              }

              // Auto-switch to orders tab if ready
              if (order.status === 'ready') {
                setTimeout(() => handleTabChange('orders'), 2000)
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
        toast.success('🎉 Order placed successfully!')
        handleTabChange('orders')
      } else {
        throw new Error(result.error || 'Failed to create order')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }

  if (!tableId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 safe-area-all">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-xl font-bold text-red-600 mb-2">No Table ID</div>
          <p className="text-gray-600 text-sm sm:text-base">
            Please visit a valid table URL like /table/test-table-1
          </p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 safe-area-all">
        <div className="text-center animate-fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm sm:text-base">
            Loading table {tableId}...
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'manual' as const, label: 'Menu', icon: Menu, emoji: '📋' },
    { id: 'ai' as const, label: 'AI Chat', icon: MessageSquare, emoji: '🤖' },
    { id: 'orders' as const, label: 'Orders', icon: Receipt, emoji: '🧾' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 safe-area-x">
      {/* Header - Compact on Mobile */}
      <div className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Table #{tableId.length > 12 ? `${tableId.slice(0, 12)}...` : tableId}
              </h1>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-gray-400 font-mono">
                Session: {sessionId.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Mobile First Design */}
        <div className="border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                const TabIcon = tab.icon
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex-1 py-3 sm:py-4 relative transition-all duration-200 touch-feedback no-select ${
                      isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    aria-selected={isActive}
                    role="tab"
                  >
                    <div className="flex flex-col items-center gap-1">
                      {/* Mobile: Show emoji, Desktop: Show icon */}
                      <span className="text-xl sm:hidden">{tab.emoji}</span>
                      <TabIcon className="w-5 h-5 hidden sm:block" />
                      <span className={`text-xs sm:text-sm font-semibold ${
                        isActive ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {tab.label}
                      </span>
                    </div>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-scale-in" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Animation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className={`transition-opacity duration-150 ${isTabChanging ? 'opacity-0' : 'opacity-100'}`}>
          <Suspense fallback={<TabContentSkeleton />}>
            {activeTab === 'manual' && (
              <ManualMenu
                tableId={tableId}
                sessionId={sessionId}
                onOrderConfirmed={handleOrderConfirmed}
                onSwitchToOrders={() => handleTabChange('orders')}
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
    </div>
  )
}
