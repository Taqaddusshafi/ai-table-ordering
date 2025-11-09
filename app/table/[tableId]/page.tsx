'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ChatInterface from '@/components/customer/ChatInterface'
import ManualMenu from '@/components/customer/ManualMenu'
import OrderStatus from '@/components/customer/OrderStatus'
import { generateSessionId } from '@/lib/utils/helpers'
import toast from 'react-hot-toast'

export default function TablePage() {
  const params = useParams()

  const tableId =
    typeof params.tableId === 'string'
      ? params.tableId
      : Array.isArray(params.tableId)
      ? params.tableId[0]
      : ''

  const [sessionId, setSessionId] = useState('')
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'orders'>('manual')

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
        setActiveTab('orders') // Auto-switch to Orders tab
      } else {
        throw new Error(result.error || 'Failed to create order')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
    }
  }

  if (!tableId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4 text-center">
        <div>
          <div className="text-lg sm:text-xl text-red-600">No Table ID in URL</div>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Please visit a valid table URL like /table/test-table-1
          </p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4 text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">
            Loading table {tableId}...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600 mb-2 sm:mb-3 break-words">
            Table #{tableId}
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            📋 Browse • 🤖 AI • 🧾 Orders — all in one place
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-2 font-mono">
            Session: {sessionId.slice(0, 12)}...
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex flex-col sm:flex-row border-b border-gray-200">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold sm:font-bold text-base sm:text-lg transition-all duration-200 ${
                  activeTab === 'manual'
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className="inline-block mr-1 sm:mr-2">📋</span>
                Browse Menu
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold sm:font-bold text-base sm:text-lg transition-all duration-200 ${
                  activeTab === 'ai'
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className="inline-block mr-1 sm:mr-2">🤖</span>
                AI Assistant
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 font-semibold sm:font-bold text-base sm:text-lg transition-all duration-200 ${
                  activeTab === 'orders'
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className="inline-block mr-1 sm:mr-2">🧾</span>
                My Orders
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-6 min-h-[400px]">
          {activeTab === 'manual' && (
            <ManualMenu
              tableId={tableId}
              sessionId={sessionId}
              onOrderConfirmed={handleOrderConfirmed}
            />
          )}

          {activeTab === 'ai' && (
            <ChatInterface
              tableId={tableId}
              sessionId={sessionId}
              onOrderConfirmed={handleOrderConfirmed}
            />
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 className="text-2xl font-bold text-green-700 mb-4 text-center sm:text-left">
                🧾 Your Active Orders
              </h2>
              <div className="border-t border-gray-200 pt-4">
                <OrderStatus tableId={tableId} sessionId={sessionId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
