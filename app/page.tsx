import Link from 'next/link'
import { ArrowRight, Bot, Menu, Zap, CreditCard } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="relative">
        {/* Header Section */}
        <header className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-24">
          <div className="text-center max-w-3xl mx-auto">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-6 rounded-2xl bg-gray-900">
              <span className="text-3xl sm:text-4xl">🍽️</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              AI Table Ordering
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-600 mb-6 max-w-xl mx-auto">
              Smart restaurant ordering powered by Google Gemini AI
            </p>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 text-sm font-medium text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Manual Menu + AI Chat
            </div>
          </div>
        </header>

        {/* CTA Cards */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {/* Customer Card */}
            <Link href="/table/test-table-1">
              <div className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-900 hover:shadow-lg transition-all cursor-pointer">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-900 transition-colors">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🛎️</span>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Customer
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Browse menu and place orders
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                    Browse Menu
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                    AI Chat
                  </span>
                </div>

                <div className="flex items-center text-gray-900 font-medium text-sm group-hover:gap-2 gap-1.5 transition-all">
                  Start Ordering
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Admin Card */}
            <Link href="/admin/dashboard">
              <div className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-900 hover:shadow-lg transition-all cursor-pointer">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-900 transition-colors">
                  <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Admin
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Manage orders and menu items
                </p>

                <div className="flex items-center text-gray-900 font-medium text-sm group-hover:gap-2 gap-1.5 transition-all">
                  Open Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <Bot className="w-5 h-5 text-gray-700" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">AI Chat</h4>
              <p className="text-xs text-gray-500">Natural language ordering</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <Menu className="w-5 h-5 text-gray-700" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">Menu</h4>
              <p className="text-xs text-gray-500">Browse and add to cart</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-gray-700" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">Real-time</h4>
              <p className="text-xs text-gray-500">Live order updates</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <CreditCard className="w-5 h-5 text-gray-700" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">Payment</h4>
              <p className="text-xs text-gray-500">Razorpay & UPI</p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 text-white max-w-3xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center">
              Two Ways to Order
            </h3>

            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white/10 rounded-xl p-4 sm:p-5">
                <div className="text-3xl mb-3">📋</div>
                <h4 className="font-semibold mb-2">Browse Menu</h4>
                <ul className="space-y-1.5 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    View categories
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Add to cart
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Checkout
                  </li>
                </ul>
              </div>

              <div className="bg-white/10 rounded-xl p-4 sm:p-5">
                <div className="text-3xl mb-3">🤖</div>
                <h4 className="font-semibold mb-2">Chat with AI</h4>
                <ul className="space-y-1.5 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Talk naturally
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Get recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    Quick ordering
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Powered by Next.js, Google Gemini AI, Supabase & Razorpay
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
