'use client'

import OrdersTable from '@/components/admin/OrdersTable'
import Card from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
  })

  useEffect(() => {
    const supabase = createClient()

    const fetchStats = async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('status')

      if (orders) {
        setStats({
          total: orders.length,
          pending: orders.filter((o) => o.status === 'pending').length,
          preparing: orders.filter((o) => o.status === 'preparing').length,
          ready: orders.filter((o) => o.status === 'ready').length,
        })
      }
    }

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
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 Admin Dashboard
          </h1>
          <p className="text-gray-600">Manage all restaurant orders in real-time</p>
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
