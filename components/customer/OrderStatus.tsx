'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils/helpers'
import { Clock, CheckCircle, Loader2, Package, CreditCard, Receipt } from 'lucide-react'

interface OrderStatusProps {
  tableId: string
  sessionId: string
}

export default function OrderStatus({ tableId, sessionId }: OrderStatusProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!tableId || !sessionId) return
    const supabase = createClient()

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_item:menu_items(*)
          )
        `)
        .eq('table_id', tableId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (!error && data) setOrders(data)
      setIsLoading(false)
    }

    fetchOrders()

    // Realtime updates
    const channel = supabase
      .channel(`orders_session_${sessionId}_${tableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `session_id=eq.${sessionId}`,
        },
        fetchOrders
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableId, sessionId])

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; icon: any; text: string }> = {
      pending: {
        color: 'text-yellow-700',
        bg: 'bg-yellow-50 border-yellow-200',
        icon: Clock,
        text: 'Pending'
      },
      preparing: {
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
        icon: Package,
        text: 'Preparing'
      },
      ready: {
        color: 'text-green-700',
        bg: 'bg-green-50 border-green-200',
        icon: CheckCircle,
        text: 'Ready'
      },
      served: {
        color: 'text-gray-700',
        bg: 'bg-gray-50 border-gray-200',
        icon: CheckCircle,
        text: 'Served'
      },
      cancelled: {
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        icon: Clock,
        text: 'Cancelled'
      }
    }
    return configs[status] || configs.pending
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-8 sm:p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600" />
          <p className="text-sm sm:text-base text-gray-600">Loading your orders...</p>
        </div>
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-8 sm:p-12">
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Orders Yet</h3>
          <p className="text-sm sm:text-base text-gray-500">
            Start browsing our menu to place your first order!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Your Orders</h3>
        <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
          {orders.length}
        </span>
      </div>

      {/* Orders List */}
      <div className="space-y-3 sm:space-y-4">
        {orders.map((order) => {
          const statusConfig = getStatusConfig(order.status)
          const StatusIcon = statusConfig.icon

          return (
            <div
              key={order.id}
              className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Order Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                    <span className={`text-sm font-semibold ${statusConfig.color}`}>
                      {statusConfig.text}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(order.created_at)}
                  </span>
                </div>
              </div>

              {/* Order Body */}
              <div className="p-4">
                {/* Order Items */}
                <div className="mb-3">
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Items:
                  </p>
                  <div className="space-y-2">
                    {order.order_items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-lg"
                      >
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">
                            {item.quantity}× {item.menu_item?.name || 'Item'}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            @ ₹{item.price}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 mb-3">
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    Total:
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-blue-600">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>

                {/* Payment Status */}
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-600">
                    Payment:
                  </span>
                  {order.payment_status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-yellow-600">
                      <Clock className="w-4 h-4" />
                      Pending
                    </span>
                  )}
                </div>

                {/* Order ID */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Order ID: {order.id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Status Progress Bar (Optional) */}
              {order.status !== 'cancelled' && order.status !== 'served' && (
                <div className="px-4 pb-4">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        order.status === 'pending'
                          ? 'w-1/3 bg-yellow-500'
                          : order.status === 'preparing'
                          ? 'w-2/3 bg-blue-500'
                          : 'w-full bg-green-500'
                      }`}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
