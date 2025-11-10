'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import { Clock, CheckCircle, Loader2, Package, CreditCard, Receipt, XCircle, AlertCircle, Edit, Plus, Minus, X, Save } from 'lucide-react'

interface OrderStatusProps {
  tableId: string
  sessionId: string
}

export default function OrderStatus({ tableId, sessionId }: OrderStatusProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null) // ✅ FIXED
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editedItems, setEditedItems] = useState<any[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

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

  const canModifyOrder = (order: any) => {
    if (order.status !== 'pending') return false
    
    const orderTime = new Date(order.created_at).getTime()
    const now = new Date().getTime()
    const minutesElapsed = (now - orderTime) / 1000 / 60
    
    return minutesElapsed <= 2
  }

  const getTimeRemaining = (order: any) => {
    const orderTime = new Date(order.created_at).getTime()
    const now = new Date().getTime()
    const minutesElapsed = (now - orderTime) / 1000 / 60
    const secondsRemaining = Math.max(0, Math.floor((2 - minutesElapsed) * 60))
    
    const mins = Math.floor(secondsRemaining / 60)
    const secs = secondsRemaining % 60
    
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleEditOrder = (order: any) => {
    setEditingOrderId(order.id)
    setEditedItems(order.order_items.map((item: any) => ({
      id: item.menu_item.id,
      name: item.menu_item.name,
      price: item.price,
      quantity: item.quantity,
    })))
  }

  const updateEditQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setEditedItems(prev => prev.filter(i => i.id !== itemId))
      return
    }
    setEditedItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, quantity } : i)
    )
  }

  const handleSaveEdit = async (orderId: string) => {
    if (editedItems.length === 0) {
      toast.error('Order must have at least one item')
      return
    }

    setSavingEdit(true)

    try {
      const totalAmount = editedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, items: editedItems, totalAmount }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Order updated successfully!')
        setEditingOrderId(null)
        setEditedItems([])
      } else {
        throw new Error(result.error || 'Failed to update order')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingOrderId(null)
    setEditedItems([])
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return

    setCancellingOrderId(orderId)

    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'cancel' }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Order cancelled successfully!')
      } else {
        throw new Error(result.error || 'Failed to cancel order')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCancellingOrderId(null)
    }
  }

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
        icon: XCircle,
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
      {orders.map((order) => {
        const statusConfig = getStatusConfig(order.status)
        const StatusIcon = statusConfig.icon
        const canModify = canModifyOrder(order)
        const isEditing = editingOrderId === order.id

        const displayItems = isEditing ? editedItems : order.order_items
        const displayTotal = isEditing 
          ? editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
          : order.total_amount

        return (
          <div
            key={order.id}
            className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 overflow-hidden hover:shadow-lg transition-all"
          >
            {/* Order Header */}
            <div className={`${statusConfig.bg} px-4 py-3 border-b-2 ${statusConfig.bg.replace('bg-', 'border-')}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                  <span className={`text-sm font-bold ${statusConfig.color}`}>
                    {statusConfig.text}
                  </span>
                  {isEditing && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Editing
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600">
                  {formatDate(order.created_at)}
                </span>
              </div>
            </div>

            {/* Order Body */}
            <div className="p-4">
              {/* Modify Warning */}
              {canModify && !isEditing && (
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800">
                      Time remaining: {getTimeRemaining(order)}
                    </p>
                    <p className="text-xs text-blue-700">
                      You can edit or cancel this order within 2 minutes
                    </p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="mb-3">
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Items:
                </p>
                <div className="space-y-2">
                  {isEditing ? (
                    // Edit Mode
                    editedItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 text-sm">
                            {item.name}
                          </span>
                          <span className="text-xs text-gray-500 block">
                            ₹{item.price} each
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateEditQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                          >
                            {item.quantity === 1 ? <X className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          </button>
                          <span className="w-8 text-center font-bold text-blue-600">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateEditQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-semibold text-gray-900 ml-2">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))
                  ) : (
                    // View Mode
                    order.order_items?.map((item: any) => (
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
                    ))
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 mb-3">
                <span className="text-base sm:text-lg font-bold text-gray-900">
                  Total:
                </span>
                <span className="text-lg sm:text-xl font-bold text-blue-600">
                  ₹{displayTotal}
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {isEditing ? (
                  // Edit Mode Actions
                  <>
                    <button
                      onClick={() => handleSaveEdit(order.id)}
                      disabled={savingEdit || editedItems.length === 0}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {savingEdit ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={savingEdit}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 active:scale-95"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  // View Mode Actions
                  <>
                    {/* Payment Status */}
                    <div className="flex items-center gap-2 flex-1">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      {order.payment_status === 'paid' ? (
                        <span className="text-xs sm:text-sm font-semibold text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Paid
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-semibold text-yellow-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </div>

                    {canModify && (
                      <>
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="flex-1 sm:flex-initial bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Order
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrderId === order.id}
                          className="flex-1 sm:flex-initial bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          {cancellingOrderId === order.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              Cancel
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
