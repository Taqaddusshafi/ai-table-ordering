'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils/helpers'

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
    // Realtime updates for this session and table only
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
    return () => { supabase.removeChannel(channel) }
  }, [tableId, sessionId])

  if (isLoading) {
    return (
      <Card>
        <div className="p-10 text-center">Loading your orders...</div>
      </Card>
    )
  }
  if (!orders.length) {
    return (
      <Card>
        <div className="p-10 text-center text-gray-500">
          No orders yet for this session.<br />
          Start your order!
        </div>
      </Card>
    )
  }

  return (
    <div>
      <h3 className="font-bold mb-2">Your Orders</h3>
      {orders.map(order => (
        <Card key={order.id} className="mb-4">
          <div className="flex flex-col gap-2 p-4">
            <div>
              <span className="inline-block font-bold">Status:</span>
              <span className="ml-2 capitalize text-green-700">{order.status}</span>
            </div>
            <div>
              <span className="font-bold">Placed:</span>
              <span className="ml-2 text-sm">{formatDate(order.created_at)}</span>
            </div>
            <div className="mt-2 font-semibold">Items:</div>
            <ul className="text-sm ml-2">
              {order.order_items?.map((i: any) => (
                <li key={i.id}>
                  {i.quantity}x {i.menu_item?.name || 'Item'} @ ₹{i.price}
                  <span className="ml-2 text-gray-400">= ₹{i.price * i.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="font-bold text-lg mt-2">
              Total: <span className="text-green-600">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="text-sm">
              Payment: <span className={order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}>
                {order.payment_status === 'paid' ? '✅ Paid' : '⏳ Pending'}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
