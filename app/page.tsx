import Link from 'next/link'
import { ArrowRight, Sparkles, Menu, Bot, Zap, CreditCard, CheckCircle } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-200/30 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-200/30 to-transparent rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {/* Header Section */}
        <header className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo/Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl animate-bounce-slow">
              <span className="text-4xl sm:text-5xl">🍽️</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 sm:mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                AI Table Ordering
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Experience the future of dining with{' '}
              <span className="font-bold text-blue-600">Google Gemini AI</span>
            </p>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-white rounded-full shadow-lg border border-blue-100">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="text-xs sm:text-sm font-semibold text-gray-700">
                Manual Menu + AI Chat Ordering
              </span>
            </div>
          </div>
        </header>

        {/* CTA Cards */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20">
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Customer Card */}
            <Link href="/table/test-table-1">
              <div className="group relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-4 sm:mb-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:scale-110 transition-transform">
                    <span className="text-3xl sm:text-4xl">🛎️</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Customer
                  </h3>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                    Start your AI-powered ordering experience
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium">
                      📋 Browse Menu
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-medium">
                      🤖 AI Chat
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center text-blue-600 font-semibold text-sm sm:text-base group-hover:gap-3 gap-2 transition-all">
                    Scan & Order
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Admin Card */}
            <Link href="/admin/dashboard">
              <div className="group relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden border border-gray-100">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-4 sm:mb-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 group-hover:scale-110 transition-transform">
                    <span className="text-3xl sm:text-4xl">📊</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Admin
                  </h3>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                    Manage orders and track performance
                  </p>

                  {/* CTA */}
                  <div className="flex items-center text-purple-600 font-semibold text-sm sm:text-base group-hover:gap-3 gap-2 transition-all">
                    Dashboard
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">AI Chat</h4>
              <p className="text-sm sm:text-base text-gray-600">Natural conversation with Gemini AI for seamless ordering</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                <Menu className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Manual Menu</h4>
              <p className="text-sm sm:text-base text-gray-600">Browse categories, add to cart, and checkout easily</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Real-time</h4>
              <p className="text-sm sm:text-base text-gray-600">Live order updates powered by Supabase</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-pink-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Easy Payment</h4>
              <p className="text-sm sm:text-base text-gray-600">Secure Razorpay & UPI integration</p>
            </div>
          </div>
        </section>

        {/* Ordering Methods Showcase */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 text-white max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-12">
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
                🎯 Two Ways to Order
              </h3>
              <p className="text-base sm:text-lg md:text-xl text-blue-100">
                Choose the method that works best for you
              </p>
            </div>

            {/* Methods Grid */}
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              {/* Manual Ordering */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-5 sm:p-6 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📋</div>
                <h4 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Browse & Select</h4>
                <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-blue-50">
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 flex-shrink-0" />
                    <span>View categorized menu items</span>
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 flex-shrink-0" />
                    <span>Add items to cart</span>
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 flex-shrink-0" />
                    <span>Adjust quantities easily</span>
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 flex-shrink-0" />
                    <span>Review before checkout</span>
                  </li>
                </ul>
              </div>

              {/* AI Ordering */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-5 sm:p-6 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🤖</div>
                <h4 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Chat with AI</h4>
                <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-blue-50">
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 flex-shrink-0" />
                    <span>Talk naturally to place orders</span>
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 flex-shrink-0" />
                    <span>Get menu recommendations</span>
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 flex-shrink-0" />
                    <span>Ask questions about dishes</span>
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 flex-shrink-0" />
                    <span>Fast, conversational ordering</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              Powered by Next.js 15, Google Gemini AI, Supabase & Razorpay
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
