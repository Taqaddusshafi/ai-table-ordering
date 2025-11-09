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

  // Safely extract tableId from params
  const tableId =
    typeof params.tableId === 'string'
      ? params.tableId
      : Array.isArray(params.tableId)
      ? params.tableId[0]
      : ''

  const [sessionId, setSessionId] = useState('')
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual')

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
          <p className="text-gray-600 mt-2">
            Please visit a valid table URL like /table/test-table-1
          </p>
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600 mb-3">
            Table #{tableId}
          </h1>
          <p className="text-lg text-gray-600">
            🤖 Order with AI or Menu • Live status
          </p>
          <p className="text-xs text-gray-400 mt-2 font-mono">
            Session: {sessionId.slice(0, 12)}...
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-4 px-6 font-bold text-lg transition-all duration-200 ${
                  activeTab === 'manual'
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white border-b-4 border-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className="inline-block mr-2">📋</span>
                Browse Menu
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-4 px-6 font-bold text-lg transition-all duration-200 ${
                  activeTab === 'ai'
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white border-b-4 border-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className="inline-block mr-2">🤖</span>
                AI Assistant
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {activeTab === 'manual' ? (
              <ManualMenu
                tableId={tableId}
                sessionId={sessionId}
                onOrderConfirmed={handleOrderConfirmed}
              />
            ) : (
              <ChatInterface
                tableId={tableId}
                sessionId={sessionId}
                onOrderConfirmed={handleOrderConfirmed}
              />
            )}
          </div>

          {/* Order Status Sidebar */}
          <div className="lg:col-span-1">
            <OrderStatus tableId={tableId} sessionId={sessionId} />
          </div>
        </div>
      </div>
    </div>
  )
}
