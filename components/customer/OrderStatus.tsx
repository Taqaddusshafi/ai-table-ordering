'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'
import { 
  Clock, CheckCircle, Loader2, Package, CreditCard, Receipt, XCircle, 
  AlertCircle, Edit, Plus, Minus, X, Save, ShoppingCart, Search, Bell, 
  RefreshCw, ChefHat, Utensils
} from 'lucide-react'

interface OrderStatusProps {
  tableId: string
  sessionId: string
}

// Clean skeleton component
function OrderSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-3 w-32 rounded" />
            </div>
          </div>
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <div className="skeleton w-16 h-5" />
          <div className="skeleton w-20 h-6" />
        </div>
      </div>
    </div>
  )
}

// Status progress bar
function StatusProgress({ currentStatus }: { currentStatus: string }) {
  const steps = [
    { id: 'pending', label: 'Received' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'ready', label: 'Ready' },
  ]
  
  const statusOrder = ['pending', 'preparing', 'ready', 'served']
  const currentIndex = statusOrder.indexOf(currentStatus)
  
  if (currentStatus === 'cancelled' || currentStatus === 'served') {
    return null
  }

  return (
    <div className="flex items-center gap-1 mb-4">
      {steps.map((step, index) => {
        const stepIndex = statusOrder.indexOf(step.id)
        const isCompleted = stepIndex < currentIndex
        const isCurrent = stepIndex === currentIndex
        
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-full h-1.5 rounded-full ${
                isCompleted 
                  ? 'bg-green-500' 
                  : isCurrent 
                    ? 'bg-gray-900' 
                    : 'bg-gray-200'
              }`} />
              <span className={`text-xs mt-1.5 font-medium ${
                isCompleted ? 'text-green-600' : isCurrent ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
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
    toast.success('Refreshed', { duration: 1500 })
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
        toast.success(`Reminder sent (${result.reminderCount})`, { duration: 3000 })
      } else {
        throw new Error(result.error || 'Failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed')
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
      toast.success(`+1 ${menuItem.name}`)
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
        toast.success('Order updated')
        setEditingOrderId(null)
        setEditedItems([])
        setShowAddItemModal(false)
        setSearchQuery('')
      } else {
        throw new Error(result.error || 'Failed')
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
    if (!confirm('Cancel this order?')) return

    setCancellingOrderId(orderId)

    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'cancel' }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Order cancelled')
      } else {
        throw new Error(result.error || 'Failed')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCancellingOrderId(null)
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { 
      bg: string; 
      text: string;
      icon: any; 
      label: string;
    }> = {
      pending: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: Clock,
        label: 'Pending'
      },
      preparing: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        icon: ChefHat,
        label: 'Preparing'
      },
      ready: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        icon: Utensils,
        label: 'Ready'
      },
      served: {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        icon: CheckCircle,
        label: 'Served'
      },
      cancelled: {
        bg: 'bg-red-50',
        text: 'text-red-600',
        icon: XCircle,
        label: 'Cancelled'
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
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No Orders</h3>
        <p className="text-gray-500">Place your first order from the menu</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Your Orders</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {orders.map((order) => {
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
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${statusConfig.bg} rounded-xl flex items-center justify-center`}>
                    <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
                  </div>
                  <div>
                    <p className={`font-semibold ${statusConfig.text}`}>{statusConfig.label}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                  </div>
                </div>
                {isEditing && (
                  <span className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-full font-medium">
                    Editing
                  </span>
                )}
              </div>

              {/* Status Progress */}
              <StatusProgress currentStatus={order.status} />

              {/* Modify Timer */}
              {canModify && !isEditing && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800">
                      <span className="font-mono font-bold text-base">{timeRemaining}</span>
                      <span className="ml-1.5">to modify order</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="px-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Items</p>
                {isEditing && (
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 hover:bg-gray-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                {isEditing ? (
                  editedItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-sm text-gray-500">₹{item.price} each</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateEditQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100"
                        >
                          {item.quantity === 1 ? <X className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateEditQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center hover:bg-gray-800"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-medium text-gray-900 w-16 text-right">₹{item.price * item.quantity}</p>
                    </div>
                  ))
                ) : (
                  order.order_items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {item.quantity}× {item.menu_item?.name || 'Item'}
                        </p>
                        <p className="text-sm text-gray-500">₹{item.price} each</p>
                      </div>
                      <p className="font-medium text-gray-900">₹{item.price * item.quantity}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="font-medium text-gray-600">Total</span>
                <span className="text-xl font-bold text-gray-900">₹{displayTotal}</span>
              </div>

              {/* Reminder */}
              {order.status === 'pending' && !isEditing && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Remind Kitchen</span>
                    {order.reminder_count > 0 && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        {order.reminder_count} sent
                      </span>
                    )}
                  </div>
                  
                  {canSendReminder(order) ? (
                    <button
                      onClick={() => handleSendReminder(order.id)}
                      disabled={sendingReminderId === order.id}
                      className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      {sendingReminderId === order.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4" />
                          Send Reminder
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-1.5">
                      Next reminder in <span className="font-mono font-medium">{getTimeUntilNextReminder(order)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Payment Status */}
              <div className="mt-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                {order.payment_status === 'paid' ? (
                  <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Paid
                  </span>
                ) : (
                  <span className="text-sm font-medium text-amber-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Payment Pending
                  </span>
                )}
              </div>

              {/* Actions */}
              {(isEditing || canModify) && (
                <div className="mt-4 flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(order.id)}
                        disabled={savingEdit || editedItems.length === 0}
                        className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        {savingEdit ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={savingEdit}
                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingOrderId === order.id}
                        className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-50"
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
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Add Items Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />
            
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Add Items</h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false)
                  setSearchQuery('')
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-900 focus:outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">No items found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMenuItems.map((item) => {
                    const inOrder = editedItems.find(i => i.id === item.id)
                    
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                          inOrder ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">₹{item.price}</span>
                            <span className="text-xs text-gray-400">{item.category}</span>
                          </div>
                          {inOrder && (
                            <p className="text-xs text-gray-600 mt-0.5">{inOrder.quantity} in order</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddItemToOrder(item)}
                          className="w-9 h-9 bg-gray-900 text-white rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors flex-shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowAddItemModal(false)
                  setSearchQuery('')
                }}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
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
