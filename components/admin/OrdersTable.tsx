'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils/helpers'
import type { Order } from '@/types'
import toast from 'react-hot-toast'
import { DollarSign, Loader2, CheckCircle } from 'lucide-react'

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchOrders = async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_item:menu_items (*)
          )
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (!error && data) {
        setOrders(data as any)
      }
      setLoading(false)
    }

    fetchOrders()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [filter])

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          status: newStatus,
        }),
      })

      if (response.ok) {
        toast.success(`Order status updated to ${newStatus}`)
      } else {
        throw new Error('Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update order status')
    }
  }

  const handleMarkPaid = async (orderId: string) => {
    setUpdatingPaymentId(orderId)

    try {
      const response = await fetch('/api/orders/payment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentStatus: 'paid',
          paymentMethod: 'cash',
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('💰 Payment marked as paid (Cash)')
      } else {
        throw new Error(result.error || 'Failed to update payment')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUpdatingPaymentId(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      preparing: 'bg-blue-100 text-blue-800 border-blue-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      served: 'bg-gray-100 text-gray-800 border-gray-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'preparing', 'ready', 'served'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filter === status
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'all' && ` (${orders.length})`}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-gray-600 text-lg">No orders found</p>
            <p className="text-sm text-gray-500 mt-2">
              Orders will appear here when customers place them
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order) => (
            <Card key={order.id} className="animate-fade-in hover:shadow-xl transition-shadow">
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">Table #{order.table_id.slice(0, 8)}</h3>
                  <p className="text-xs text-gray-500">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>

              {/* Order Items */}
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {order.order_items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm bg-gray-50 p-2 rounded"
                  >
                    <span className="font-medium">
                      {item.quantity}x {item.menu_item?.name || 'Unknown item'}
                    </span>
                    <span className="text-gray-600">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="pt-3 border-t flex justify-between items-center mb-4">
                <span className="font-bold">Total</span>
                <span className="font-bold text-xl text-green-600">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>

              {/* Payment Status - ENHANCED */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">Payment Status</span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1 ${
                      order.payment_status === 'paid'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                    }`}
                  >
                    {order.payment_status === 'paid' ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        PAID
                      </>
                    ) : (
                      <>
                        💳 PENDING
                      </>
                    )}
                  </span>
                </div>
                
                {/* Payment Method Display */}
                {order.payment_id && order.payment_status === 'paid' && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>Method:</span>
                    <span className="font-semibold text-gray-700">
                      {order.payment_id === 'cash' ? '💵 Cash' : `💳 ${order.payment_id}`}
                    </span>
                  </div>
                )}
                
                {/* Mark as Paid Button */}
                {order.payment_status === 'pending' && (
                  <button
                    onClick={() => handleMarkPaid(order.id)}
                    disabled={updatingPaymentId === order.id}
                    className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {updatingPaymentId === order.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        Mark as Paid (Cash)
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {order.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      🍳 Start Preparing
                    </Button>
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      variant="danger"
                      size="sm"
                      className="w-full"
                    >
                      ❌ Cancel Order
                    </Button>
                  </>
                )}

                {order.status === 'preparing' && (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    variant="success"
                    size="sm"
                    className="w-full"
                  >
                    ✅ Mark as Ready
                  </Button>
                )}

                {order.status === 'ready' && (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'served')}
                    variant="primary"
                    size="sm"
                    className="w-full"
                  >
                    🍽️ Mark as Served
                  </Button>
                )}

                {order.status === 'served' && (
                  <div className="text-center py-2 text-green-600 font-semibold">
                    ✓ Order Completed
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
