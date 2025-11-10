'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ChatInterface from '@/components/customer/ChatInterface'
import ManualMenu from '@/components/customer/ManualMenu'
import OrderStatus from '@/components/customer/OrderStatus'
import { generateSessionId } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import { Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
                  icon: '/icon-192.png', // Add your app icon
                  tag: order.id,
                })
              }

              // Play notification sound
              try {
                const audio = new Audio('/notification.mp3') // Add sound file to public folder
                audio.volume = 0.5
                audio.play()
              } catch (e) {
                console.log('Sound play failed:', e)
              }

              // Auto-switch to orders tab if ready
              if (order.status === 'ready') {
                setTimeout(() => setActiveTab('orders'), 2000)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
    }
  }, [sessionId, tableId])

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
        setActiveTab('orders')
      } else {
        throw new Error(result.error || 'Failed to create order')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }

  if (!tableId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
        <div className="text-center">
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">
            Loading table {tableId}...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Table #{tableId}
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              Browse menu, chat with AI, or view your orders
            </p>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Session: {sessionId.slice(0, 12)}...
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <div className="flex items-center justify-around">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 sm:py-4 px-2 text-xs sm:text-sm font-semibold transition-all duration-200 relative ${
                  activeTab === 'manual' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl sm:text-2xl">📋</span>
                  <span>Menu</span>
                </div>
                {activeTab === 'manual' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-3 sm:py-4 px-2 text-xs sm:text-sm font-semibold transition-all duration-200 relative ${
                  activeTab === 'ai' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl sm:text-2xl">🤖</span>
                  <span>AI Chat</span>
                </div>
                {activeTab === 'ai' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-3 sm:py-4 px-2 text-xs sm:text-sm font-semibold transition-all duration-200 relative ${
                  activeTab === 'orders' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl sm:text-2xl">🧾</span>
                  <span>Orders</span>
                </div>
                {activeTab === 'orders' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {activeTab === 'manual' && (
          <ManualMenu
            tableId={tableId}
            sessionId={sessionId}
            onOrderConfirmed={handleOrderConfirmed}
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
      </div>
    </div>
  )
}
