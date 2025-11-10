'use client'

import OrdersTable from '@/components/admin/OrdersTable'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Bell, BellRing } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
  })
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [unreadOrders, setUnreadOrders] = useState(0)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const supabase = createClient()

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/admin/login')
        return
      }

      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', session.user.email)
        .single()

      if (adminError || !adminData) {
        toast.error('Unauthorized access')
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }

      setUserEmail(session.user.email || '')
      setLoading(false)

      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission()
        setNotificationsEnabled(permission === 'granted')
      }

      // Fetch initial stats
      fetchStats()

      // ✅ Subscribe to new orders (INSERT event)
      const newOrdersChannel = supabase
        .channel('admin_new_orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
          },
          async (payload) => {
            const order = payload.new as any
            
            // Fetch order details with items
            const { data: orderWithItems } = await supabase
              .from('orders')
              .select(`
                *,
                order_items (
                  *,
                  menu_item:menu_items (name)
                )
              `)
              .eq('id', order.id)
              .single()

            if (orderWithItems) {
              const tableDisplay = orderWithItems.table_id.slice(0, 8)
              const itemCount = orderWithItems.order_items?.length || 0
              
              // Show toast notification
              toast.success(
                `New order from Table #${tableDisplay}\n${itemCount} items - ₹${orderWithItems.total_amount}`,
                {
                  duration: 10000,
                  icon: '🔔',
                  style: {
                    background: '#10B981',
                    color: 'white',
                  },
                }
              )

              // Browser notification
              if (notificationsEnabled) {
                new Notification('🎉 New Order!', {
                  body: `Table #${tableDisplay} - ${itemCount} items - ₹${orderWithItems.total_amount}`,
                  icon: '/icon-192.png',
                  tag: order.id,
                  requireInteraction: true,
                })
              }

              // Play alert sound
              playAlertSound()

              // Increment unread counter
              setUnreadOrders(prev => prev + 1)
              
              // Refresh stats
              fetchStats()
            }
          }
        )
        .subscribe()

      // Subscribe to order updates for stats
      const statsChannel = supabase
        .channel('admin_stats')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
          },
          () => {
            fetchStats()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(newOrdersChannel)
        supabase.removeChannel(statsChannel)
      }
    }

    const fetchStats = async () => {
      const supabase = createClient()
      const { data: orders } = await supabase.from('orders').select('status')

      if (orders) {
        setStats({
          total: orders.length,
          pending: orders.filter((o) => o.status === 'pending').length,
          preparing: orders.filter((o) => o.status === 'preparing').length,
          ready: orders.filter((o) => o.status === 'ready').length,
        })
      }
    }

    checkAuthAndFetch()
  }, [router, notificationsEnabled])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/admin/login')
  }

  const clearUnreadOrders = () => {
    setUnreadOrders(0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logout */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                📊 Admin Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Logged in as: <span className="font-semibold">{userEmail}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button
                onClick={clearUnreadOrders}
                className="relative p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                {unreadOrders > 0 ? (
                  <BellRing className="w-6 h-6 text-blue-600 animate-bounce" />
                ) : (
                  <Bell className="w-6 h-6 text-gray-600" />
                )}
                {unreadOrders > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulse">
                    {unreadOrders > 9 ? '9+' : unreadOrders}
                  </span>
                )}
              </button>

              <Button onClick={handleLogout} variant="danger">
                🚪 Logout
              </Button>
            </div>
          </div>

          {/* Notification Status */}
          {notificationsEnabled && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                🔔 Browser notifications enabled
              </span>
            </div>
          )}
          {!notificationsEnabled && 'Notification' in window && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                Enable browser notifications to get instant order alerts
              </span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 sm:p-6">
            <p className="text-xs sm:text-sm opacity-90 mb-1">Total Orders</p>
            <p className="text-3xl sm:text-4xl font-bold">{stats.total}</p>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 sm:p-6">
            <p className="text-xs sm:text-sm opacity-90 mb-1">⏳ Pending</p>
            <p className="text-3xl sm:text-4xl font-bold">{stats.pending}</p>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 sm:p-6">
            <p className="text-xs sm:text-sm opacity-90 mb-1">🍳 Preparing</p>
            <p className="text-3xl sm:text-4xl font-bold">{stats.preparing}</p>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 sm:p-6">
            <p className="text-xs sm:text-sm opacity-90 mb-1">✅ Ready</p>
            <p className="text-3xl sm:text-4xl font-bold">{stats.ready}</p>
          </Card>
        </div>

        {/* Orders Table */}
        <OrdersTable />
      </div>
    </div>
  )
}

function playAlertSound() {
  try {
    const audio = new Audio('/alert.mp3') // Add to public folder
    audio.volume = 0.7
    audio.play()
  } catch (e) {
    console.log('Sound play failed:', e)
  }
}
