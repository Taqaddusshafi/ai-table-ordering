'use client'

import OrdersTable from '@/components/admin/OrdersTable'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
  })
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
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

      // Fetch stats
      fetchStats()

      // Subscribe to changes
      const channel = supabase
        .channel('stats')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          () => {
            fetchStats()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
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
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/admin/login')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logout */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📊 Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Logged in as: <span className="font-semibold">{userEmail}</span>
            </p>
          </div>
          <Button onClick={handleLogout} variant="danger">
            🚪 Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <p className="text-sm opacity-90 mb-1">Total Orders</p>
            <p className="text-4xl font-bold">{stats.total}</p>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <p className="text-sm opacity-90 mb-1">⏳ Pending</p>
            <p className="text-4xl font-bold">{stats.pending}</p>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <p className="text-sm opacity-90 mb-1">🍳 Preparing</p>
            <p className="text-4xl font-bold">{stats.preparing}</p>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <p className="text-sm opacity-90 mb-1">✅ Ready</p>
            <p className="text-4xl font-bold">{stats.ready}</p>
          </Card>
        </div>

        {/* Orders Table */}
        <OrdersTable />
      </div>
    </div>
  )
}
