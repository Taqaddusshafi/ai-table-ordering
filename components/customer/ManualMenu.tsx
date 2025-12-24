'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Minus, X, ShoppingCart, Loader2, CreditCard, Banknote, Search, ChevronUp } from 'lucide-react'

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
}

// Lazy loading image component with skeleton
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
      <div className={`${className} bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center`}>
        <span className="text-4xl">🍽️</span>
      </div>
    )
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {/* Skeleton placeholder */}
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

// Skeleton card component
function MenuItemSkeleton() {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-100 overflow-hidden animate-pulse">
      <div className="h-36 sm:h-44 skeleton" />
      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="skeleton skeleton-text w-3/4 h-5" />
          <div className="skeleton w-16 h-5 rounded-full" />
        </div>
        <div className="skeleton skeleton-text w-full h-4" />
        <div className="skeleton skeleton-text w-2/3 h-4" />
        <div className="flex justify-between items-center pt-2">
          <div className="skeleton w-16 h-6" />
          <div className="skeleton w-20 h-10 rounded-lg" />
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
  const categoryRef = useRef<HTMLDivElement>(null)
  const menuContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMenu()
    loadRazorpayScript()
    checkRazorpayConfig()
  }, [])

  // Show scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // Filter items by search query and category
  const filteredItems = menuItems.filter((item) => {
    // Apply category filter
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false
    }

    // Apply search filter
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
    toast.success(`Added to cart!`, { icon: '🛒', duration: 1500 })
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

  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty!')
      return
    }
    setShowCheckoutModal(true)
  }

  // Create order in database
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
        return result.data.id // Return order ID
      } else {
        throw new Error(result.error || 'Failed to create order')
      }
    } catch (error: any) {
      throw error
    }
  }

  // Handle Razorpay payment
  const handleRazorpayPayment = async (orderId: string) => {
    try {
      // Create Razorpay order
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

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Restaurant Order',
        description: `Table #${tableId.slice(0, 8)}`,
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          // Payment successful
          toast.success('Payment successful! 🎉')
          
          // Update order with payment info
          await fetch('/api/orders/payment', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              paymentStatus: 'paid',
              paymentId: response.razorpay_payment_id,
            }),
          })

          // Clear cart and close modal
          setCart([])
          setShowCheckoutModal(false)
          setIsProcessingPayment(false)
          
          // Switch to orders tab
          toast.success('Order placed successfully!', { icon: '🎉', duration: 3000 })
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
          color: '#3B82F6',
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
      // Create order in database first
      const orderId = await createOrderInDatabase()

      if (paymentMethod === 'online') {
        // Handle online payment with Razorpay
        await handleRazorpayPayment(orderId)
      } else {
        // Handle cash payment
        toast.success('Order placed! Please pay at counter', { icon: '💵', duration: 3000 })
        setCart([])
        setShowCheckoutModal(false)
        setIsProcessingPayment(false)
        
        // Switch to orders tab after short delay
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
        {/* Search skeleton */}
        <div className="mb-4">
          <div className="skeleton h-12 rounded-xl" />
        </div>
        {/* Category skeleton */}
        <div className="mb-4 flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-10 w-24 rounded-full flex-shrink-0" />
          ))}
        </div>
        {/* Menu items skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MenuItemSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-36 sm:pb-6" ref={menuContainerRef}>
      {/* Search Bar - Mobile Optimized */}
      <div className="mb-4 sticky top-0 z-40 bg-gradient-to-b from-blue-50 via-blue-50/95 to-blue-50/0 pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none transition-all text-base bg-white shadow-sm touch-feedback"
            enterKeyHint="search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors touch-feedback"
              aria-label="Clear search"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-2 ml-1">
            Found {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Category Filter - Horizontal Scroll */}
      <div ref={categoryRef} className="mb-5 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar scroll-x-mobile pb-1">
          {categories.map((category, index) => {
            const count = category === 'All' 
              ? menuItems.length 
              : menuItems.filter(item => item.category === category).length
            
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category)
                  setSearchQuery('') // Clear search when changing category
                }}
                className={`flex-shrink-0 px-5 py-3 rounded-full text-sm font-bold transition-all duration-200 touch-feedback no-select ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-[1.02] ring-2 ring-blue-200'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200 active:bg-gray-200'
                } ${index === 0 ? 'animate-fade-in' : ''}`}
                style={{ animationDelay: `${index * 0.03}s` }}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item, index) => {
          const quantityInCart = getItemQuantityInCart(item.id)
          
          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 card-interactive animate-fade-in-up ${
                quantityInCart > 0 ? 'border-blue-400 shadow-lg ring-2 ring-blue-100' : 'border-gray-100'
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Image with lazy loading */}
              {item.image_url && (
                <div className="relative h-40 sm:h-48 bg-gray-100">
                  <LazyImage
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full"
                  />
                  {quantityInCart > 0 && (
                    <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg animate-bounce-in">
                      {quantityInCart} in cart
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1 flex-1">
                    {item.name}
                  </h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full whitespace-nowrap font-medium">
                    {item.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                  {item.description || 'Delicious item'}
                </p>

                {/* Price & Add/Update Controls */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl font-bold text-blue-600">
                    ₹{item.price}
                  </span>

                  {quantityInCart === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 touch-feedback-strong"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 bg-blue-50 rounded-xl p-1.5">
                      <button
                        onClick={() => updateQuantity(item.id, quantityInCart - 1)}
                        className="w-10 h-10 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center font-bold touch-feedback"
                        aria-label={quantityInCart === 1 ? 'Remove from cart' : 'Decrease quantity'}
                      >
                        {quantityInCart === 1 ? <X className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="w-10 text-center font-bold text-blue-600 text-lg">
                        {quantityInCart}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, quantityInCart + 1)}
                        className="w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center font-bold touch-feedback"
                        aria-label="Increase quantity"
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
        <div className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-gray-600 text-lg font-semibold mb-1">
            {searchQuery ? 'No items found' : 'No items in this category'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery ? 'Try searching with different keywords' : 'Browse other categories'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 font-semibold text-sm hover:underline touch-feedback"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-36 right-4 sm:bottom-24 sm:right-6 z-30 w-12 h-12 bg-white border-2 border-gray-200 rounded-full shadow-lg flex items-center justify-center touch-feedback animate-fade-in"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6 text-gray-600" />
        </button>
      )}

      {/* Floating Cart (Mobile) - Enhanced with iOS Safe Area */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t-2 border-gray-200 shadow-2xl z-50 animate-slide-up fixed-bottom-safe">
          <div className="px-4 pt-3 pb-2">
            {/* Expandable cart preview */}
            <button
              onClick={() => setExpandedCart(!expandedCart)}
              className="w-full flex items-center justify-between mb-3 touch-feedback"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </p>
                  <p className="text-xs text-gray-500">Tap to {expandedCart ? 'hide' : 'view'} cart</p>
                </div>
              </div>
              <span className="font-bold text-2xl text-blue-600">₹{totalAmount}</span>
            </button>

            {/* Expanded cart items */}
            {expandedCart && (
              <div className="mb-3 max-h-48 overflow-y-auto scroll-momentum border-t border-gray-100 pt-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">₹{item.price} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center touch-feedback"
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center touch-feedback"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleOpenCheckout}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all touch-feedback-strong"
            >
              Continue to Payment 🎉
            </button>
          </div>
        </div>
      )}

      {/* Desktop Cart */}
      {cart.length > 0 && (
        <div className="hidden sm:block mt-6 bg-white rounded-2xl border-2 border-blue-200 shadow-lg p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
          </div>

          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto scroll-momentum">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ₹{item.price} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-9 h-9 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center touch-feedback"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-blue-600">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-9 h-9 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center touch-feedback"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="ml-1 text-red-500 hover:text-red-700 transition-colors p-1 touch-feedback"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-blue-100 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-xl text-gray-900">Total:</span>
              <span className="font-bold text-3xl text-blue-600">
                ₹{totalAmount}
              </span>
            </div>
            <button
              onClick={handleOpenCheckout}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all touch-feedback-strong"
            >
              Continue to Payment 🎉
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal - Mobile Optimized */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6 animate-slide-up sm:animate-scale-in fixed-bottom-safe sm:relative">
            {/* Drag handle for mobile */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose Payment Method</h2>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Items</span>
                <span className="font-semibold">{totalItems}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-blue-600">₹{totalAmount}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setPaymentMethod('cash')}
                disabled={isProcessingPayment}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 touch-feedback ${
                  paymentMethod === 'cash'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'cash' ? 'border-blue-600' : 'border-gray-300'
                }`}>
                  {paymentMethod === 'cash' && (
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  )}
                </div>
                <Banknote className="w-6 h-6 text-gray-700" />
                <div className="text-left flex-1">
                  <p className="font-bold text-gray-900">Pay at Counter</p>
                  <p className="text-xs text-gray-500">Pay with cash when collecting order</p>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('online')}
                disabled={isProcessingPayment || !razorpayAvailable}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 touch-feedback ${
                  paymentMethod === 'online'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'online' ? 'border-blue-600' : 'border-gray-300'
                }`}>
                  {paymentMethod === 'online' && (
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  )}
                </div>
                <CreditCard className="w-6 h-6 text-gray-700" />
                <div className="text-left flex-1">
                  <p className="font-bold text-gray-900">Pay Online</p>
                  <p className="text-xs text-gray-500">
                    {razorpayAvailable ? 'Pay now with card/UPI (Razorpay)' : 'Not available yet'}
                  </p>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckoutModal(false)}
                disabled={isProcessingPayment}
                className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 touch-feedback"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={isProcessingPayment}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 touch-feedback-strong"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
