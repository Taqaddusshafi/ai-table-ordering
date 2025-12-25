'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Minus, X, ShoppingCart, Loader2, CreditCard, Banknote, Search, ChevronUp } from 'lucide-react'
import WaitTimeEstimate from './WaitTimeEstimate'

// Declare Razorpay type
declare global {
  interface Window {
    Razorpay: any
  }
}

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
  onSwitchToOrders?: () => void
  onCartChange?: (count: number) => void
}

// Lazy loading image component
function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = src
          }
        })
      },
      { rootMargin: '100px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [src])

  if (error) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-center">
          <span className="text-4xl">🍽️</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} relative overflow-hidden bg-gray-100`}>
      {!loaded && (
        <div className="absolute inset-0 skeleton" />
      )}
      <img
        ref={imgRef}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

// Clean skeleton card
function MenuItemSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="h-40 skeleton" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="flex justify-between items-center pt-2">
          <div className="skeleton w-16 h-6 rounded" />
          <div className="skeleton w-24 h-10 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export default function ManualMenu({
  tableId,
  sessionId,
  onOrderConfirmed,
  onSwitchToOrders,
  onCartChange,
}: ManualMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [razorpayAvailable, setRazorpayAvailable] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [expandedCart, setExpandedCart] = useState(false)
  const menuContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMenu()
    loadRazorpayScript()
    checkRazorpayConfig()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Notify parent of cart changes for tab badge
  useEffect(() => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
    onCartChange?.(totalItems)
  }, [cart, onCartChange])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const checkRazorpayConfig = () => {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    setRazorpayAvailable(!!keyId && !keyId.includes('your_') && !keyId.includes('dummy'))
  }

  const loadRazorpayScript = () => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }

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

  const filteredItems = menuItems.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      )
    }
    return true
  })

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
    toast.success(`Added ${item.name}`, { duration: 1500 })
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId))
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

  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty!')
      return
    }
    setShowCheckoutModal(true)
  }

  const createOrderInDatabase = async () => {
    const orderItems = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }))

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          sessionId,
          items: orderItems,
          totalAmount,
        }),
      })

      const result = await response.json()

      if (result.success) {
        return result.data.id
      } else {
        throw new Error(result.error || 'Failed to create order')
      }
    } catch (error: any) {
      throw error
    }
  }

  const handleRazorpayPayment = async (orderId: string) => {
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          orderId: orderId,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Payment gateway not available')
      }

      const razorpayOrder = result.data

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Restaurant Order',
        description: `Table #${tableId.slice(0, 8)}`,
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          toast.success('Payment successful!')
          
          await fetch('/api/orders/payment', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              paymentStatus: 'paid',
              paymentId: response.razorpay_payment_id,
            }),
          })

          setCart([])
          setShowCheckoutModal(false)
          setIsProcessingPayment(false)
          
          if (onSwitchToOrders) {
            setTimeout(() => onSwitchToOrders(), 800)
          }
        },
        prefill: {
          name: 'Customer',
          email: 'customer@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#000000',
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment cancelled')
            setIsProcessingPayment(false)
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error: any) {
      console.error('Razorpay error:', error)
      toast.error(error.message || 'Payment failed')
      setIsProcessingPayment(false)
    }
  }

  const handleConfirmOrder = async () => {
    setIsProcessingPayment(true)

    try {
      const orderId = await createOrderInDatabase()

      if (paymentMethod === 'online') {
        await handleRazorpayPayment(orderId)
      } else {
        toast.success('Order placed! Pay at counter', { duration: 3000 })
        setCart([])
        setShowCheckoutModal(false)
        setIsProcessingPayment(false)
        
        if (onSwitchToOrders) {
          setTimeout(() => onSwitchToOrders(), 800)
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order')
      setIsProcessingPayment(false)
    }
  }

  if (isLoading) {
    return (
      <div className="pb-32 sm:pb-6">
        <div className="mb-4">
          <div className="skeleton h-12 rounded-xl" />
        </div>
        <div className="mb-5 flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-10 w-20 rounded-full flex-shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MenuItemSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-36 sm:pb-6" ref={menuContainerRef}>
      {/* Search Bar */}
      <div className="mb-4 sticky top-0 z-40 bg-white/95 backdrop-blur-sm pt-2 pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu..."
            className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:outline-none transition-all text-base"
            enterKeyHint="search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-500 mt-2">
            {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-5 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {categories.map((category) => {
            const count = category === 'All' 
              ? menuItems.length 
              : menuItems.filter(item => item.category === category).length
            const isActive = selectedCategory === category
            
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category)
                  setSearchQuery('')
                }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
                <span className={`ml-1.5 text-xs ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const quantityInCart = getItemQuantityInCart(item.id)
          
          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl overflow-hidden transition-all duration-200 ${
                quantityInCart > 0 
                  ? 'ring-2 ring-gray-900 shadow-lg' 
                  : 'shadow-sm border border-gray-100 hover:shadow-md'
              }`}
            >
              {/* Image */}
              <div className="relative h-40 sm:h-44">
                {item.image_url ? (
                  <LazyImage
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span className="text-5xl">🍽️</span>
                  </div>
                )}
                
                {/* Cart badge */}
                {quantityInCart > 0 && (
                  <div className="absolute top-3 right-3 bg-gray-900 text-white px-2.5 py-1 rounded-full text-sm font-semibold">
                    {quantityInCart} added
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">
                    {item.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2 min-h-[40px]">
                  {item.description || 'Delicious dish'}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-gray-900">₹{item.price}</span>
                    <span className="text-xs text-gray-400 ml-2 bg-gray-100 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>

                  {quantityInCart === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-1.5 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => updateQuantity(item.id, quantityInCart - 1)}
                        className="w-9 h-9 bg-white text-gray-900 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center border border-gray-200"
                      >
                        {quantityInCart === 1 ? <X className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="w-8 text-center font-semibold text-gray-900">
                        {quantityInCart}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, quantityInCart + 1)}
                        className="w-9 h-9 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center"
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
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No items found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'Try different keywords' : 'Check other categories'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-900 font-semibold underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-40 right-4 sm:bottom-24 sm:right-6 z-30 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronUp className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Mobile Cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 bg-white border-t border-gray-200 shadow-2xl">
          <div className="px-4 pt-3 pb-safe">
            <button
              onClick={() => setExpandedCart(!expandedCart)}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-500">{expandedCart ? 'Hide cart' : 'View cart'}</p>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">₹{totalAmount}</p>
            </button>

            {expandedCart && (
              <div className="mb-3 max-h-48 overflow-y-auto border-t border-gray-100 pt-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">₹{item.price} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center hover:bg-gray-800"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-semibold ml-3 w-16 text-right">₹{item.price * item.quantity}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleOpenCheckout}
              className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-gray-800 transition-colors active:scale-[0.98]"
            >
              Checkout · ₹{totalAmount}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Cart */}
      {cart.length > 0 && (
        <div className="hidden sm:block mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Your Cart</h2>
                <p className="text-sm text-gray-500">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-3 mb-5 max-h-72 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">₹{item.price} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="ml-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-semibold text-gray-900 w-20 text-right">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-gray-600">Total</span>
                <span className="text-2xl font-bold text-gray-900">₹{totalAmount}</span>
              </div>
              <button
                onClick={handleOpenCheckout}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold text-base hover:bg-gray-800 transition-colors active:scale-[0.98]"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />
            
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
            </div>
            
            <div className="p-5">
              {/* Wait Time Estimate */}
              <div className="mb-4">
                <WaitTimeEstimate
                  cartItems={cart.map(item => ({ id: item.id, quantity: item.quantity }))}
                  tableId={tableId}
                  showKitchenLoad={true}
                  compact={false}
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">₹{totalAmount}</span>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  disabled={isProcessingPayment}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    paymentMethod === 'cash'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'cash' ? 'border-gray-900' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'cash' && <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />}
                  </div>
                  <Banknote className="w-5 h-5 text-gray-600" />
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900">Pay at Counter</p>
                    <p className="text-xs text-gray-500">Cash payment</p>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('online')}
                  disabled={isProcessingPayment || !razorpayAvailable}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    paymentMethod === 'online'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'online' ? 'border-gray-900' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'online' && <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />}
                  </div>
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900">Pay Online</p>
                    <p className="text-xs text-gray-500">
                      {razorpayAvailable ? 'Card, UPI, Net Banking' : 'Not available'}
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  disabled={isProcessingPayment}
                  className="flex-1 py-3.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={isProcessingPayment}
                  className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Order'
                  )}
                </button>
              </div>
            </div>
            
            <div className="pb-safe" />
          </div>
        </div>
      )}
    </div>
  )
}
