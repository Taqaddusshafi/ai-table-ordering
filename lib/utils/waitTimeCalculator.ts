/**
 * Wait Time Calculator Utility
 * Calculates estimated preparation time based on kitchen load and menu items
 */

export interface WaitTimeResult {
  minMinutes: number
  maxMinutes: number
  kitchenLoad: 'low' | 'medium' | 'high' | 'very-high'
  queuePosition: number
  formattedTime: string
}

export interface OrderItem {
  id: string
  name?: string
  quantity: number
  prep_time_minutes?: number
}

export interface PendingOrder {
  id: string
  status: string
  created_at: string
  order_items?: {
    quantity: number
    menu_item?: {
      prep_time_minutes?: number
    }
  }[]
}

// Default prep times by category (in minutes)
const DEFAULT_PREP_TIMES: Record<string, number> = {
  'Beverages': 3,
  'Drinks': 3,
  'Appetizers': 8,
  'Starters': 8,
  'Salads': 5,
  'Main Course': 15,
  'Mains': 15,
  'Pizza': 12,
  'Pasta': 10,
  'Burgers': 10,
  'Desserts': 5,
  'default': 10,
}

/**
 * Get kitchen load level based on pending orders count
 */
export function getKitchenLoad(pendingOrdersCount: number): WaitTimeResult['kitchenLoad'] {
  if (pendingOrdersCount <= 3) return 'low'
  if (pendingOrdersCount <= 6) return 'medium'
  if (pendingOrdersCount <= 10) return 'high'
  return 'very-high'
}

/**
 * Get load multiplier for wait time calculation
 */
function getLoadMultiplier(load: WaitTimeResult['kitchenLoad']): number {
  switch (load) {
    case 'low': return 1.0
    case 'medium': return 1.3
    case 'high': return 1.6
    case 'very-high': return 2.0
    default: return 1.0
  }
}

/**
 * Calculate base prep time for order items
 */
export function calculateBasePrepTime(
  items: OrderItem[],
  menuItems?: { id: string; prep_time_minutes?: number; category?: string }[]
): number {
  if (!items || items.length === 0) return 0

  let maxPrepTime = 0
  let additionalTime = 0

  items.forEach((item, index) => {
    // Find menu item details if available
    const menuItem = menuItems?.find(m => m.id === item.id)
    const prepTime = item.prep_time_minutes || 
                     menuItem?.prep_time_minutes || 
                     DEFAULT_PREP_TIMES[menuItem?.category || 'default'] ||
                     DEFAULT_PREP_TIMES['default']

    // First item sets the base time, additional items add partial time
    // (kitchen can prepare some items in parallel)
    if (index === 0) {
      maxPrepTime = prepTime * item.quantity
    } else {
      // Add 30% of prep time for additional items (parallel cooking)
      additionalTime += prepTime * item.quantity * 0.3
    }
  })

  return Math.ceil(maxPrepTime + additionalTime)
}

/**
 * Calculate queue wait time based on pending orders
 */
export function calculateQueueTime(pendingOrders: PendingOrder[]): number {
  if (!pendingOrders || pendingOrders.length === 0) return 0

  let totalQueueTime = 0

  pendingOrders.forEach(order => {
    if (order.status === 'pending') {
      // Estimate time for each pending order
      const orderPrepTime = order.order_items?.reduce((sum, item) => {
        const prepTime = item.menu_item?.prep_time_minutes || DEFAULT_PREP_TIMES['default']
        return sum + prepTime * item.quantity * 0.5 // 50% since kitchen works in parallel
      }, 0) || 5

      totalQueueTime += Math.min(orderPrepTime, 10) // Cap at 10 mins per order in queue
    } else if (order.status === 'preparing') {
      // Already preparing, add reduced time
      totalQueueTime += 3
    }
  })

  return Math.ceil(totalQueueTime)
}

/**
 * Main function to calculate estimated wait time
 */
export function calculateWaitTime(
  orderItems: OrderItem[],
  pendingOrders: PendingOrder[],
  menuItems?: { id: string; prep_time_minutes?: number; category?: string }[]
): WaitTimeResult {
  const pendingCount = pendingOrders?.length || 0
  const kitchenLoad = getKitchenLoad(pendingCount)
  const loadMultiplier = getLoadMultiplier(kitchenLoad)

  // Calculate base prep time for the order
  const basePrepTime = calculateBasePrepTime(orderItems, menuItems)

  // Calculate queue time from pending orders
  const queueTime = calculateQueueTime(pendingOrders)

  // Apply load multiplier
  const adjustedPrepTime = Math.ceil(basePrepTime * loadMultiplier)

  // Calculate min and max estimates
  const minMinutes = Math.max(3, Math.ceil((queueTime + adjustedPrepTime) * 0.8))
  const maxMinutes = Math.ceil((queueTime + adjustedPrepTime) * 1.2)

  // Format the time string
  const formattedTime = formatWaitTime(minMinutes, maxMinutes)

  return {
    minMinutes,
    maxMinutes,
    kitchenLoad,
    queuePosition: pendingCount + 1,
    formattedTime,
  }
}

/**
 * Format wait time as a readable string
 */
export function formatWaitTime(minMinutes: number, maxMinutes?: number): string {
  if (maxMinutes && maxMinutes !== minMinutes) {
    if (minMinutes < 60 && maxMinutes < 60) {
      return `${minMinutes}-${maxMinutes} mins`
    } else if (minMinutes >= 60) {
      const minHours = Math.floor(minMinutes / 60)
      const maxHours = Math.ceil(maxMinutes / 60)
      return `${minHours}-${maxHours} hr${maxHours > 1 ? 's' : ''}`
    } else {
      return `${minMinutes} mins - 1 hr`
    }
  }

  if (minMinutes < 60) {
    return `~${minMinutes} mins`
  } else {
    const hours = Math.floor(minMinutes / 60)
    const mins = minMinutes % 60
    return mins > 0 ? `~${hours}h ${mins}m` : `~${hours} hr${hours > 1 ? 's' : ''}`
  }
}

/**
 * Get a friendly message based on kitchen load
 */
export function getKitchenLoadMessage(load: WaitTimeResult['kitchenLoad']): string {
  switch (load) {
    case 'low':
      return 'Kitchen is ready! Quick preparation expected.'
    case 'medium':
      return 'Moderate activity in the kitchen.'
    case 'high':
      return 'Kitchen is busy. Thanks for your patience!'
    case 'very-high':
      return 'Very high demand. Your patience is appreciated!'
    default:
      return ''
  }
}

/**
 * Get color classes for kitchen load indicator
 */
export function getKitchenLoadColors(load: WaitTimeResult['kitchenLoad']): {
  bg: string
  text: string
  icon: string
} {
  switch (load) {
    case 'low':
      return { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' }
    case 'medium':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500' }
    case 'high':
      return { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500' }
    case 'very-high':
      return { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-500' }
  }
}
