'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Minus, X, ShoppingCart, Loader2 } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  available: boolean
}

interface CartItem extends MenuItem {
  quantity: number
}

interface ManualMenuProps {
  tableId: string
  sessionId: string
  onOrderConfirmed: (items: any[], totalAmount: number) => void
}

export default function ManualMenu({
  tableId,
  sessionId,
  onOrderConfirmed,
}: ManualMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  useEffect(() => {
    fetchMenu()
  }, [])

  const fetchMenu = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('category')

    if (!error && data) {
      setMenuItems(data)
    } else {
      toast.error('Failed to load menu')
    }
    setIsLoading(false)
  }

  const categories = ['All', ...new Set(menuItems.map((item) => item.category))]

  const filteredItems =
    selectedCategory === 'All'
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory)

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    toast.success(`Added to cart!`, { icon: '🛒', duration: 1000 })
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId))
    toast.success('Removed', { duration: 1000 })
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    setCart((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    )
  }

  const getItemQuantityInCart = (itemId: string) => {
    const item = cart.find((i) => i.id === itemId)
    return item ? item.quantity : 0
  }

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty!')
      return
    }

    const orderItems = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }))

    onOrderConfirmed(orderItems, totalAmount)
    setCart([])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Loading menu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32 sm:pb-6">
      {/* Sticky Category Filter */}
      <div className="sticky top-0 sm:top-0 z-30 bg-gradient-to-b from-blue-50 via-blue-50 to-transparent pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {categories.map((category) => {
            const count = category === 'All' 
              ? menuItems.length 
              : menuItems.filter(item => item.category === category).length
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105 ring-2 ring-blue-200'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200 hover:border-blue-300'
                }`}
              >
                {category}
                <span className={`ml-1.5 text-xs ${
                  selectedCategory === category ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  ({count})
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredItems.map((item) => {
          const quantityInCart = getItemQuantityInCart(item.id)
          
          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl sm:rounded-2xl border-2 overflow-hidden hover:shadow-xl transition-all duration-300 ${
                quantityInCart > 0 ? 'border-blue-400 shadow-lg' : 'border-gray-200'
              }`}
            >
              {/* Image */}
              {item.image_url && (
                <div className="relative h-36 sm:h-44 bg-gray-100">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {quantityInCart > 0 && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg animate-bounce">
                      {quantityInCart} in cart
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-3 sm:p-4">
                <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 line-clamp-1">
                  {item.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 h-8 sm:h-10">
                  {item.description || 'Delicious item'}
                </p>

                {/* Price & Add/Update Controls */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg sm:text-xl font-bold text-blue-600">
                    ₹{item.price}
                  </span>

                  {quantityInCart === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.id, quantityInCart - 1)}
                        className="w-8 h-8 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center font-bold active:scale-90"
                      >
                        {quantityInCart === 1 ? <X className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="w-8 text-center font-bold text-blue-600">
                        {quantityInCart}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, quantityInCart + 1)}
                        className="w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center font-bold active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <p className="text-5xl sm:text-6xl mb-4">🍽️</p>
          <p className="text-gray-600 text-sm sm:text-base">No items in this category</p>
        </div>
      )}

      {/* Floating Cart (Mobile) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t-2 border-gray-200 shadow-2xl z-50 animate-slide-up backdrop-blur-sm bg-opacity-95">
          <div className="px-4 py-3">
            {/* Cart Summary */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                </div>
                <span className="font-bold text-gray-900">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </span>
              </div>
              <span className="font-bold text-xl text-blue-600">₹{totalAmount}</span>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold text-base hover:shadow-xl transition-all active:scale-95"
            >
              Place Order 🎉
            </button>
          </div>
        </div>
      )}

      {/* Desktop Cart */}
      {cart.length > 0 && (
        <div className="hidden sm:block mt-6 bg-white rounded-xl sm:rounded-2xl border-2 border-blue-200 shadow-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your Cart</h2>
          </div>

          {/* Cart Items */}
          <div className="space-y-3 mb-4 max-h-64 sm:max-h-80 overflow-y-auto">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    ₹{item.price} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-blue-600">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="ml-1 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total & Checkout */}
          <div className="border-t-2 border-blue-100 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-lg sm:text-xl text-gray-900">Total:</span>
              <span className="font-bold text-2xl sm:text-3xl text-blue-600">
                ₹{totalAmount}
              </span>
            </div>
            <button
              onClick={handlePlaceOrder}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all active:scale-95"
            >
              Place Order 🎉
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
