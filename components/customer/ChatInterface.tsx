'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Send, Bot, User, Loader2, ShoppingBag } from 'lucide-react'

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
      content: "👋 Hi! I'm your AI ordering assistant. What would you like to order today?",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastValidItems, setLastValidItems] = useState<any[]>([])
  const lastTotal = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

      if (aiResponse.items && aiResponse.items.length > 0) {
        setLastValidItems(aiResponse.items)
        lastTotal.current =
          aiResponse.total_amount && aiResponse.total_amount > 0
            ? aiResponse.total_amount
            : calcTotal(aiResponse.items)
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: aiResponse.message || 'Im ready to take your order',
          data: aiResponse,
        },
      ])

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
          content: "Sorry, I'm having trouble understanding. Could you rephrase your order?",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] sm:h-[500px] lg:h-[600px] bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-base sm:text-lg">AI Assistant</h3>
            <p className="text-xs sm:text-sm text-blue-100">Powered by Gemini 2.5</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-white">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-2 sm:gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* Avatar - Assistant */}
            {message.role === 'assistant' && (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-md ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
              }`}
            >
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>

              {/* Order Summary */}
              {message.data?.items && message.data.items.length > 0 && (
                <div className={`mt-3 pt-3 border-t ${
                  message.role === 'user' ? 'border-white/30' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="w-4 h-4" />
                    <p className="font-semibold text-sm">Order Summary:</p>
                  </div>
                  <div className="space-y-2">
                    {message.data.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className={`text-xs sm:text-sm p-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-white/10'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {item.quantity}× {item.name || 'Item'}
                          </span>
                          <span className="font-bold">
                            ₹{Number((item.price || 0) * (item.quantity || 1))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`flex justify-between items-center mt-2 pt-2 border-t text-sm sm:text-base font-bold ${
                    message.role === 'user' ? 'border-white/30' : 'border-gray-200'
                  }`}>
                    <span>Total:</span>
                    <span className={message.role === 'user' ? 'text-yellow-300' : 'text-blue-600'}>
                      ₹{message.data.total_amount && message.data.total_amount > 0
                        ? message.data.total_amount
                        : calcTotal(message.data.items)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar - User */}
            {message.role === 'user' && (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-3 sm:p-4 bg-white">
        <div className="flex gap-2 sm:gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your order here..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        
        {/* Quick Actions (Optional) */}
        <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setInput('Show me the menu')}
            disabled={isLoading}
            className="flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
          >
            📋 Show Menu
          </button>
          <button
            onClick={() => setInput('What do you recommend?')}
            disabled={isLoading}
            className="flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
          >
            ⭐ Recommend
          </button>
          <button
            onClick={() => setInput('I want a pizza')}
            disabled={isLoading}
            className="flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
          >
            🍕 Pizza
          </button>
        </div>
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
