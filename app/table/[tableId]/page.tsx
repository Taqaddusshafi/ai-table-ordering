'use client'

import { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { generateSessionId } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import { Loader2, Bell, BellOff, Volume2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useGroupSession } from '@/hooks/useGroupSession'

// Lazy load components
const ChatInterface = lazy(() => import('@/components/customer/ChatInterface'))
const ManualMenu = lazy(() => import('@/components/customer/ManualMenu'))
const OrderStatus = lazy(() => import('@/components/customer/OrderStatus'))
const CreateJoinGroupModal = lazy(() => import('@/components/customer/CreateJoinGroupModal'))
const GroupOrderBanner = lazy(() => import('@/components/customer/GroupOrderBanner'))
const GroupOrderSummary = lazy(() => import('@/components/customer/GroupOrderSummary'))

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
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showGroupSummary, setShowGroupSummary] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null)

  // Group ordering hook
  const {
    group,
    isLoading: groupLoading,
    error: groupError,
    isHost,
    memberName,
    createGroup,
    joinGroup,
    leaveGroup,
    endGroup,
    groupCode,
    members,
    groupOrders,
    groupTotal,
    myTotal,
  } = useGroupSession({ tableId, sessionId })

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.8
    // Preload audio
    audioRef.current.load()
  }, [])

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log('Audio play requires user interaction:', err)
        })
      }
    }
  }, [])

  // Show notification via Service Worker (more reliable)
  const showNotification = useCallback((title: string, body: string, tag: string) => {
    // Try Service Worker first (works better in background)
    if (swRegistration.current && Notification.permission === 'granted') {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          tag,
          url: window.location.href
        })
        return
      }
      
      // Fallback to direct service worker notification
      swRegistration.current.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag,
        requireInteraction: true,
      }).catch(console.error)
      return
    }

    // Last resort: regular Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          tag,
          requireInteraction: true,
        })
      } catch (error) {
        console.error('Notification error:', error)
      }
    }
  }, [])

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope)
          swRegistration.current = registration
          
          // Update service worker if there's a new version
          registration.update()
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
        setTimeout(() => setShowNotificationPrompt(true), 2000)
      }
    }
  }, [])

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported on this browser')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
        setShowNotificationPrompt(false)
        toast.success('Notifications enabled!')
        
        // Test notification
        showNotification('Notifications Enabled', 'You will receive order updates here', 'test')
        playNotificationSound()
      } else if (permission === 'denied') {
        toast.error('Notifications blocked. Enable in browser settings.')
        setShowNotificationPrompt(false)
      } else {
        toast.error('Notification permission dismissed')
        setShowNotificationPrompt(false)
      }
    } catch (error) {
      console.error('Notification permission error:', error)
      toast.error('Failed to enable notifications')
    }
  }

  // Test sound button handler
  const testSound = () => {
    playNotificationSound()
    toast.success('Sound test!', { duration: 1500 })
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
              preparing: { message: 'Your order is being prepared by the kitchen', emoji: '👨‍🍳' },
              ready: { message: 'Your order is ready! Please collect it now', emoji: '🔔' },
              served: { message: 'Order delivered. Enjoy your meal!', emoji: '🍽️' },
              cancelled: { message: 'Your order was cancelled', emoji: '❌' },
            }

            const notification = statusMessages[order.status]
            if (notification) {
              // Always show toast
              toast.success(notification.message, { 
                duration: 6000,
                icon: notification.emoji
              })

              // Play sound for important updates
              if (order.status === 'ready' || order.status === 'preparing') {
                playNotificationSound()
              }

              // Show browser notification
              if (Notification.permission === 'granted') {
                showNotification(
                  `Order ${order.status === 'ready' ? 'Ready!' : 'Update'}`,
                  notification.message,
                  `order-${order.id}-${order.status}`
                )
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
  }, [sessionId, tableId, handleTabChange, playNotificationSound, showNotification])

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
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 animate-slide-down safe-area-top">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Bell className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">Enable notifications for order updates</p>
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
            <div className="flex items-center gap-2">
              {/* Group Order Button - Made more prominent */}
              {group ? (
                <button
                  onClick={() => setShowGroupSummary(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-purple-200 hover:shadow-purple-300"
                >
                  <Users className="w-4 h-4" />
                  <span className="font-semibold text-sm">{groupCode}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {members.length} 👥
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg animate-pulse hover:animate-none"
                  title="Group Order"
                >
                  <Users className="w-4 h-4" />
                  <span className="font-medium text-sm hidden sm:inline">Group Order</span>
                </button>
              )}
              {/* Sound test button */}
              <button
                onClick={testSound}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Test sound"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              {/* Notification status */}
              <button
                onClick={requestNotificationPermission}
                className={`p-2 rounded-lg transition-colors ${
                  notificationsEnabled 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={notificationsEnabled ? 'Notifications on' : 'Enable notifications'}
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
        {/* Group Order Banner */}
        {group && (
          <Suspense fallback={<div className="h-20 skeleton rounded-2xl mb-4" />}>
            <div className="mb-4">
              <GroupOrderBanner
                groupCode={groupCode || ''}
                members={members}
                memberName={memberName}
                isHost={isHost}
                onViewGroup={() => setShowGroupSummary(true)}
                onLeaveGroup={async () => {
                  if (isHost) {
                    if (confirm('End group for everyone?')) {
                      await endGroup()
                      toast.success('Group ended')
                    }
                  } else {
                    if (confirm('Leave this group?')) {
                      await leaveGroup()
                      toast.success('Left group')
                    }
                  }
                }}
              />
            </div>
          </Suspense>
        )}

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

      {/* Group Order Modal */}
      <Suspense fallback={null}>
        <CreateJoinGroupModal
          isOpen={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          onCreateGroup={createGroup}
          onJoinGroup={joinGroup}
          isLoading={groupLoading}
          error={groupError}
        />
      </Suspense>

      {/* Group Summary Modal */}
      <Suspense fallback={null}>
        <GroupOrderSummary
          isOpen={showGroupSummary}
          onClose={() => setShowGroupSummary(false)}
          groupCode={groupCode || ''}
          members={members}
          orders={groupOrders}
          groupTotal={groupTotal}
          myTotal={myTotal}
          mySessionId={sessionId}
          isHost={isHost}
          onLeaveGroup={async () => {
            await leaveGroup()
            toast.success('Left group')
          }}
          onEndGroup={async () => {
            await endGroup()
            toast.success('Group ended')
          }}
        />
      </Suspense>
    </div>
  )
}
