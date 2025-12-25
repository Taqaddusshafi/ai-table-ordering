'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, ChefHat, Flame, AlertTriangle } from 'lucide-react'
import { 
  getKitchenLoadColors, 
  type WaitTimeResult 
} from '@/lib/utils/waitTimeCalculator'

interface WaitTimeEstimateProps {
  // For cart items (pre-order estimate)
  cartItems?: { id: string; quantity: number }[]
  // For existing order
  orderId?: string
  // Table ID for context
  tableId?: string
  // Compact mode for inline display
  compact?: boolean
  // Show kitchen load indicator
  showKitchenLoad?: boolean
  // Custom class name
  className?: string
  // Auto refresh interval in ms (default: 30000)
  refreshInterval?: number
}

interface WaitTimeData extends WaitTimeResult {
  message?: string
  ordersAhead?: number
  orderStatus?: string
}

export default function WaitTimeEstimate({
  cartItems,
  orderId,
  tableId,
  compact = false,
  showKitchenLoad = true,
  className = '',
  refreshInterval = 30000,
}: WaitTimeEstimateProps) {
  const [waitTime, setWaitTime] = useState<WaitTimeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWaitTime = useCallback(async () => {
    try {
      let url = '/api/wait-time?'
      
      if (orderId) {
        url += `orderId=${orderId}`
      } else if (cartItems && cartItems.length > 0) {
        url += `items=${encodeURIComponent(JSON.stringify(cartItems))}`
      } else {
        // Just get kitchen status
        url += `tableId=${tableId || 'general'}`
      }

      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setWaitTime(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wait time')
    } finally {
      setIsLoading(false)
    }
  }, [orderId, cartItems, tableId])

  useEffect(() => {
    fetchWaitTime()

    // Set up auto-refresh
    const interval = setInterval(fetchWaitTime, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchWaitTime, refreshInterval])

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (error || !waitTime) {
    return null // Gracefully hide on error
  }

  const loadColors = getKitchenLoadColors(waitTime.kitchenLoad)

  // Get appropriate icon based on kitchen load
  const LoadIcon = () => {
    switch (waitTime.kitchenLoad) {
      case 'low':
        return <ChefHat className={`w-4 h-4 ${loadColors.icon}`} />
      case 'medium':
        return <Clock className={`w-4 h-4 ${loadColors.icon}`} />
      case 'high':
        return <Flame className={`w-4 h-4 ${loadColors.icon}`} />
      case 'very-high':
        return <AlertTriangle className={`w-4 h-4 ${loadColors.icon}`} />
      default:
        return <Clock className={`w-4 h-4 ${loadColors.icon}`} />
    }
  }

  // Compact mode - single line
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`p-1.5 rounded-lg ${loadColors.bg}`}>
          <Clock className={`w-3.5 h-3.5 ${loadColors.icon}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">
          ~{waitTime.formattedTime}
        </span>
      </div>
    )
  }

  // Full mode - card with details
  return (
    <div className={`${loadColors.bg} rounded-xl p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm`}>
            <Clock className={`w-5 h-5 ${loadColors.icon}`} />
          </div>
          <div>
            <p className={`font-semibold ${loadColors.text}`}>
              Est. Wait: {waitTime.formattedTime}
            </p>
            {waitTime.ordersAhead !== undefined && (
              <p className="text-sm text-gray-600">
                {waitTime.ordersAhead === 0 
                  ? 'Your order is next!' 
                  : `${waitTime.ordersAhead} order${waitTime.ordersAhead > 1 ? 's' : ''} ahead`
                }
              </p>
            )}
          </div>
        </div>

        {showKitchenLoad && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80`}>
            <LoadIcon />
            <span className={`text-xs font-medium capitalize ${loadColors.text}`}>
              {waitTime.kitchenLoad}
            </span>
          </div>
        )}
      </div>

      {waitTime.message && (
        <p className="text-sm text-gray-600 mt-2 pl-[52px]">
          {waitTime.message}
        </p>
      )}

      {/* Progress indicator for queue position */}
      {waitTime.queuePosition && waitTime.queuePosition > 1 && (
        <div className="mt-3 pl-[52px]">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Queue position: #{waitTime.queuePosition}</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                waitTime.kitchenLoad === 'low' ? 'bg-green-500' :
                waitTime.kitchenLoad === 'medium' ? 'bg-yellow-500' :
                waitTime.kitchenLoad === 'high' ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ 
                width: `${Math.max(10, 100 - (waitTime.queuePosition - 1) * 15)}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Kitchen status badge - minimal version for headers
 */
export function KitchenStatusBadge({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<{ kitchenLoad: WaitTimeResult['kitchenLoad']; count: number } | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/wait-time')
        const result = await response.json()
        if (result.success) {
          setStatus({
            kitchenLoad: result.data.kitchenLoad,
            count: result.data.pendingOrdersCount || 0,
          })
        }
      } catch (e) {
        // Silently fail
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!status) return null

  const colors = getKitchenLoadColors(status.kitchenLoad)

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg} ${className}`}>
      <ChefHat className={`w-3.5 h-3.5 ${colors.icon}`} />
      <span className={`text-xs font-medium capitalize ${colors.text}`}>
        {status.kitchenLoad}
      </span>
      {status.count > 0 && (
        <span className={`text-xs ${colors.text} opacity-75`}>
          ({status.count})
        </span>
      )}
    </div>
  )
}
