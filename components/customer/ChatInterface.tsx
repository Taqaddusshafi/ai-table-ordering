'use client'

import { useState, useRef, useEffect } from 'react'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
  data?: any
}

interface ChatInterfaceProps {
  tableId: string
  sessionId: string
  onOrderConfirmed: (items: any[], totalAmount: number) => void
}

// Helper function to calculate total
function calcTotal(items: any[]) {
  if (!items || !Array.isArray(items)) return 0
  return items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (i.quantity ?? 1),
    0
  )
}

export default function ChatInterface({
  tableId,
  sessionId,
  onOrderConfirmed,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "👋 Hi! I'm your AI ordering assistant. What would you like to order today?",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastValidItems, setLastValidItems] = useState<any[]>([])
  const lastTotal = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          tableId,
          sessionId,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Invalid response from AI')
      }

      const aiResponse = result.data

      // ✅ Remember last valid items (if AI returned them)
      if (aiResponse.items && aiResponse.items.length > 0) {
        setLastValidItems(aiResponse.items)
        lastTotal.current =
          aiResponse.total_amount && aiResponse.total_amount > 0
            ? aiResponse.total_amount
            : calcTotal(aiResponse.items)
      }

      // ✅ Append AI message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: aiResponse.message || 'I’m ready to take your order!',
          data: aiResponse,
        },
      ])

      // ✅ Handle AI actions
      if (aiResponse.action === 'payment') {
        const itemsForPayment =
          aiResponse.items?.length > 0 ? aiResponse.items : lastValidItems

        const total =
          aiResponse.total_amount && aiResponse.total_amount > 0
            ? aiResponse.total_amount
            : calcTotal(itemsForPayment)

        if (itemsForPayment.length > 0) {
          onOrderConfirmed(itemsForPayment, total)
        } else {
          toast.error('No items found to confirm your order.')
        }
      } else if (aiResponse.action === 'confirm') {
        toast.success('Say "yes" or "confirm" to place your order!', {
          icon: '🛒',
          duration: 4000,
        })
      } else if (aiResponse.action === 'clarify') {
        toast('Could you please clarify your order?', { icon: '🤔' })
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      toast.error('AI assistant failed to respond properly.')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Sorry, I'm having trouble understanding. Could you rephrase your order?",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl">
        <h2 className="text-xl font-bold">🤖 AI Ordering Assistant</h2>
        <p className="text-sm opacity-90">Powered by Google Gemini 2.5</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-green-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {/* Order Summary */}
              {message.data?.items?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="font-semibold mb-2">📋 Order Summary:</p>
                  {message.data.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-sm flex justify-between mb-1"
                    >
                      <span>
                        {item.quantity}× {item.name || 'Item'}
                      </span>
                      <span className="font-semibold">
                        ₹{Number((item.price || 0) * (item.quantity || 1))}
                      </span>
                    </div>
                  ))}
                  <div className="text-sm font-bold flex justify-between mt-2 pt-2 border-t border-gray-300">
                    <span>Total:</span>
                    <span className="text-green-600">
                      ₹
                      {message.data.total_amount && message.data.total_amount > 0
                        ? message.data.total_amount
                        : calcTotal(message.data.items)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 p-4 rounded-2xl rounded-bl-none">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your order here..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            variant="primary"
          >
            {isLoading ? '...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
