'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ChatInterface from '@/components/customer/ChatInterface'
import OrderStatus from '@/components/customer/OrderStatus'
import { generateSessionId } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'

export default function TablePage() {
  const params = useParams()

  // Safely extract tableId from params (handles string or array)
  const tableId =
    typeof params.tableId === 'string'
      ? params.tableId
      : Array.isArray(params.tableId)
      ? params.tableId[0]
      : ''

  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    if (!tableId) return
    const storageKey = `table_${tableId}_session`
    const existingSession = localStorage.getItem(storageKey)
    if (existingSession) {
      setSessionId(existingSession)
    } else {
      const newSession = generateSessionId()
      localStorage.setItem(storageKey, newSession)
      setSessionId(newSession)
    }
  }, [tableId])

  const handleOrderConfirmed = async (items: any[], totalAmount: number) => {
    try {
      const orderData = { tableId, sessionId, items, totalAmount }
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      const result = await response.json()
      if (result.success) {
        toast.success('🎉 Order placed successfully!')
      } else {
        throw new Error(result.error || 'Failed to create order')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }

  if (!tableId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="text-xl text-red-600">No Table ID in URL</div>
          <p className="text-gray-600 mt-2">Please visit a valid table URL like /table/test-table-1</p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading table {tableId}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600 mb-3">
            Table #{tableId}
          </h1>
          <p className="text-lg text-gray-600">🤖 Order with AI or Menu • Live status</p>
          <p className="text-xs text-gray-400 mt-2 font-mono">Session: {sessionId.slice(0, 12)}...</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <ChatInterface
              tableId={tableId}
              sessionId={sessionId}
              onOrderConfirmed={handleOrderConfirmed}
            />
          </div>
          <div>
            <OrderStatus tableId={tableId} sessionId={sessionId} />
          </div>
        </div>
      </div>
    </div>
  )
}
