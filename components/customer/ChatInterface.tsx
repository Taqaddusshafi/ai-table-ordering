'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
      content: "Hi! I'm your AI assistant. What would you like to order?",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastValidItems, setLastValidItems] = useState<any[]>([])
  const lastTotal = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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
        throw new Error(result.error || 'Invalid response')
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
          content: aiResponse.message || 'Ready to take your order',
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
          toast.error('No items to confirm')
        }
      } else if (aiResponse.action === 'confirm') {
        toast.success('Say "confirm" to place your order')
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      toast.error('Failed to get response')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I couldn't understand. Please try again.",
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

  const handleQuickAction = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden h-[calc(100vh-200px)] sm:h-[500px]">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-gray-900" />
        </div>
        <div>
          <h3 className="font-medium text-white text-sm">AI Assistant</h3>
          <p className="text-xs text-gray-400">Powered by Gemini</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 bg-green-500/20 px-2.5 py-1 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-2.5 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-gray-900 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {message.data?.items && message.data.items.length > 0 && (
                <div className={`mt-3 pt-3 border-t ${
                  message.role === 'user' ? 'border-gray-700' : 'border-gray-100'
                }`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <p className="font-medium text-xs">Order Summary</p>
                  </div>
                  <div className="space-y-1.5">
                    {message.data.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className={`text-xs p-2 rounded-lg ${
                          message.role === 'user' ? 'bg-gray-800' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>{item.quantity}× {item.name || 'Item'}</span>
                          <span className="font-medium">₹{Number((item.price || 0) * (item.quantity || 1))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`flex justify-between items-center mt-2 pt-2 border-t text-sm font-medium ${
                    message.role === 'user' ? 'border-gray-700' : 'border-gray-100'
                  }`}>
                    <span>Total</span>
                    <span className={message.role === 'user' ? 'text-green-400' : 'text-gray-900'}>
                      ₹{message.data.total_amount && message.data.total_amount > 0
                        ? message.data.total_amount
                        : calcTotal(message.data.items)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-100 px-3 py-2 bg-white">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => handleQuickAction('Show me the menu')}
            disabled={isLoading}
            className="flex-shrink-0 text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Show Menu
          </button>
          <button
            onClick={() => handleQuickAction('What do you recommend?')}
            disabled={isLoading}
            className="flex-shrink-0 text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Recommendations
          </button>
          <button
            onClick={() => handleQuickAction('I want to order a pizza')}
            disabled={isLoading}
            className="flex-shrink-0 text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Order Pizza
          </button>
          <button
            onClick={() => handleQuickAction('Confirm my order')}
            disabled={isLoading}
            className="flex-shrink-0 text-xs px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 font-medium"
          >
            Confirm
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your order..."
            disabled={isLoading}
            enterKeyHint="send"
            autoComplete="off"
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-gray-900 text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
