'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import { Clock, CheckCircle, Loader2, Package, CreditCard, Receipt, XCircle, AlertCircle, Edit, Plus, Minus, X, Save, ShoppingCart, Search, Bell, RefreshCw } from 'lucide-react'

interface OrderStatusProps {
  tableId: string
  sessionId: string
}

// Skeleton component for order cards
function OrderSkeleton() {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden animate-pulse">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="skeleton w-24 h-5 rounded-full" />
          <div className="skeleton w-32 h-4" />
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <div className="skeleton w-16 h-6" />
          <div className="skeleton w-20 h-6" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton flex-1 h-10 rounded-lg" />
          <div className="skeleton flex-1 h-10 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default function OrderStatus({ tableId, sessionId }: OrderStatusProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editedItems, setEditedItems] = useState<any[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null)

  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const fetchOrders = useCallback(async () => {
    const supabase = createClient()
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
    setIsRefreshing(false)
  }, [tableId, sessionId])

  useEffect(() => {
    if (!tableId || !sessionId) return

    fetchOrders()

    const supabase = createClient()
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
  }, [tableId, sessionId, fetchOrders])

  // Fetch menu items when edit mode is activated
  useEffect(() => {
    if (editingOrderId) {
      fetchMenuItems()
    }
  }, [editingOrderId])

  const fetchMenuItems = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('name')

    if (!error && data) {
      setMenuItems(data)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchOrders()
    toast.success('Refreshed!', { duration: 1500 })
  }

  const canModifyOrder = (order: any) => {
    if (order.status !== 'pending') return false
    
    const orderTime = new Date(order.created_at).getTime()
    const minutesElapsed = (currentTime - orderTime) / 1000 / 60
    
    return minutesElapsed <= 2
  }

  const getTimeRemaining = (order: any) => {
    const orderTime = new Date(order.created_at).getTime()
    const minutesElapsed = (currentTime - orderTime) / 1000 / 60
    const secondsRemaining = Math.max(0, Math.floor((2 - minutesElapsed) * 60))
    
    const mins = Math.floor(secondsRemaining / 60)
    const secs = secondsRemaining % 60
    
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const canSendReminder = (order: any) => {
    if (order.status !== 'pending') return false
    
    const lastTime = order.last_reminder_at || order.created_at
    const timeSince = (currentTime - new Date(lastTime).getTime()) / 1000 / 60
    
    return timeSince >= 10
  }

  const getTimeUntilNextReminder = (order: any) => {
    const lastTime = order.last_reminder_at || order.created_at
    const timeSince = (currentTime - new Date(lastTime).getTime()) / 1000 / 60
    const timeLeft = Math.max(0, 10 - timeSince)
    
    const mins = Math.floor(timeLeft)
    const secs = Math.floor((timeLeft - mins) * 60)
    
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSendReminder = async (orderId: string) => {
    setSendingReminderId(orderId)
    
    try {
      const response = await fetch('/api/orders/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })

      const result = await response.json()

      if (result.success) {
        const ordinal = result.reminderCount === 1 ? 'st' : result.reminderCount === 2 ? 'nd' : result.reminderCount === 3 ? 'rd' : 'th'
        toast.success(`✅ Reminder sent to admin! (${result.reminderCount}${ordinal} reminder)`, {
          duration: 4000
        })
      } else {
        throw new Error(result.error || 'Failed to send reminder')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reminder')
    } finally {
      setSendingReminderId(null)
    }
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

  const handleAddItemToOrder = (menuItem: any) => {
    const existing = editedItems.find(i => i.id === menuItem.id)
    
    if (existing) {
      setEditedItems(prev =>
        prev.map(i => i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i)
      )
      toast.success(`Increased ${menuItem.name} quantity`)
    } else {
      setEditedItems(prev => [...prev, {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
      }])
      toast.success(`Added ${menuItem.name}`)
    }
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
        setShowAddItemModal(false)
        setSearchQuery('')
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
    setShowAddItemModal(false)
    setSearchQuery('')
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

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <OrderSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-8 sm:p-12 animate-fade-in">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Orders Yet</h3>
          <p className="text-base text-gray-500">
            Start browsing our menu to place your first order!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors touch-feedback"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {orders.map((order, orderIndex) => {
        const statusConfig = getStatusConfig(order.status)
        const StatusIcon = statusConfig.icon
        const canModify = canModifyOrder(order)
        const isEditing = editingOrderId === order.id
        const timeRemaining = getTimeRemaining(order)

        const displayItems = isEditing ? editedItems : order.order_items
        const displayTotal = isEditing 
          ? editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
          : order.total_amount

        return (
          <div
            key={order.id}
            className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all animate-fade-in-up"
            style={{ animationDelay: `${orderIndex * 0.1}s` }}
          >
            {/* Order Header */}
            <div className={`${statusConfig.bg} px-4 py-3 border-b-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                  <span className={`text-sm font-bold ${statusConfig.color}`}>
                    {statusConfig.text}
                  </span>
                  {isEditing && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full animate-pulse">
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
              {/* Modify Warning - Real-time countdown */}
              {canModify && !isEditing && (
                <div className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-3 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800">
                      Time remaining: <span className="text-lg font-mono bg-blue-100 px-2 py-0.5 rounded">{timeRemaining}</span>
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      You can edit or cancel this order within 2 minutes
                    </p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Items:
                  </p>
                  {isEditing && (
                    <button
                      onClick={() => setShowAddItemModal(true)}
                      className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-blue-700 transition-all touch-feedback"
                    >
                      <Plus className="w-4 h-4" />
                      Add Items
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {isEditing ? (
                    editedItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 bg-blue-50 p-3 rounded-xl border border-blue-200"
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
                            className="w-9 h-9 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center touch-feedback"
                          >
                            {item.quantity === 1 ? <X className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          </button>
                          <span className="w-8 text-center font-bold text-blue-600">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateEditQuantity(item.id, item.quantity + 1)}
                            className="w-9 h-9 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center touch-feedback"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-semibold text-gray-900 ml-2 text-sm">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))
                  ) : (
                    order.order_items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-xl"
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
              <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100 mb-4">
                <span className="text-lg font-bold text-gray-900">
                  Total:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  ₹{displayTotal}
                </span>
              </div>

              {/* Reminder Button for Pending Orders */}
              {order.status === 'pending' && !isEditing && (
                <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-semibold text-gray-600">
                        Admin Reminder
                      </span>
                    </div>
                    {order.reminder_count > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                        {order.reminder_count} sent
                      </span>
                    )}
                  </div>
                  
                  {canSendReminder(order) ? (
                    <button
                      onClick={() => handleSendReminder(order.id)}
                      disabled={sendingReminderId === order.id}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg touch-feedback"
                    >
                      {sendingReminderId === order.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4" />
                          Remind Admin
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500">
                        Next reminder available in{' '}
                        <span className="font-mono font-semibold text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded">
                          {getTimeUntilNextReminder(order)}
                        </span>
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Send a notification to admin if order is taking too long
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(order.id)}
                      disabled={savingEdit || editedItems.length === 0}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-feedback-strong"
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
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 touch-feedback"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      {order.payment_status === 'paid' ? (
                        <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Paid
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-yellow-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Pending Payment
                        </span>
                      )}
                    </div>

                    {canModify && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all touch-feedback"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Order
                        </button>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrderId === order.id}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-feedback"
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
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Add Items Modal - Mobile Optimized */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up sm:animate-scale-in fixed-bottom-safe sm:relative">
            {/* Drag handle for mobile */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
            
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">Add Items to Order</h3>
                <button
                  onClick={() => {
                    setShowAddItemModal(false)
                    setSearchQuery('')
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-feedback"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-base"
                  autoFocus
                  enterKeyHint="search"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-full transition-colors touch-feedback"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {searchQuery && (
                <p className="text-xs text-gray-500 mt-2">
                  Found {filteredMenuItems.length} item{filteredMenuItems.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 scroll-momentum">
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {searchQuery ? 'No items found matching your search' : 'No items available'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMenuItems.map((item) => {
                    const inOrder = editedItems.find(i => i.id === item.id)
                    
                    return (
                      <div
                        key={item.id}
                        className={`border-2 rounded-xl p-4 transition-all touch-feedback ${
                          inOrder ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {item.name}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-blue-600">
                                ₹{item.price}
                              </p>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {item.category}
                              </span>
                            </div>
                            {inOrder && (
                              <p className="text-xs text-blue-600 font-semibold mt-1">
                                In order: {inOrder.quantity}×
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddItemToOrder(item)}
                            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all touch-feedback flex-shrink-0"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <button
                onClick={() => {
                  setShowAddItemModal(false)
                  setSearchQuery('')
                }}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all touch-feedback-strong"
              >
                Done ({editedItems.length} items)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
