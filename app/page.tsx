import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-200 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-200 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-6xl w-full">
          {/* Header Section */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-block mb-6">
              <div className="text-8xl mb-4 animate-bounce">🍽️</div>
            </div>
            <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 mb-4">
              AI Table Ordering
            </h1>
            <p className="text-2xl text-gray-700 max-w-2xl mx-auto">
              Experience the future of dining with{' '}
              <span className="font-bold text-emerald-600">Google Gemini AI</span>
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-cyan-100 px-6 py-3 rounded-full">
              <span className="text-sm font-bold text-emerald-700">✨ NEW:</span>
              <span className="text-sm text-gray-700">Manual Menu + AI Chat Ordering</span>
            </div>
          </div>

          {/* CTA Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Link href="/table/test-table-1">
              <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform">🛎️</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Customer</h3>
                  <p className="text-gray-600 mb-4">Start your AI-powered ordering experience</p>
                  
                  {/* NEW: Dual ordering badges */}
                  <div className="flex gap-2 mb-4">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">📋 Browse Menu</span>
                    <span className="text-xs bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full font-semibold">🤖 AI Chat</span>
                  </div>
                  
                  <div className="flex items-center text-emerald-600 font-semibold">
                    Scan & Order
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/admin/dashboard">
              <div className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform">📊</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Admin</h3>
                  <p className="text-gray-600 mb-4">Manage orders and track performance</p>
                  <div className="flex items-center text-blue-600 font-semibold">
                    Dashboard
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Features Grid - Updated */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">🤖</div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">AI Chat</h4>
              <p className="text-gray-600">Natural conversation with Gemini AI for seamless ordering</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">📋</div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Manual Menu</h4>
              <p className="text-gray-600">Browse categories, add to cart, and checkout easily</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">⚡</div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Real-time</h4>
              <p className="text-gray-600">Live order updates powered by Supabase</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">💳</div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Easy Payment</h4>
              <p className="text-gray-600">Secure Razorpay & UPI integration</p>
            </div>
          </div>

          {/* NEW: Ordering Methods Showcase */}
          <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-3xl shadow-2xl p-8 md:p-12 mb-16 text-white">
            <div className="text-center mb-8">
              <h3 className="text-4xl font-bold mb-3">🎯 Two Ways to Order</h3>
              <p className="text-emerald-100 text-lg">Choose the method that works best for you</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="text-5xl mb-4">📋</div>
                <h4 className="text-2xl font-bold mb-3">Browse & Select</h4>
                <ul className="space-y-2 text-emerald-50">
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    View categorized menu items
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Add items to cart
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Adjust quantities easily
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Review before checkout
                  </li>
                </ul>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="text-5xl mb-4">🤖</div>
                <h4 className="text-2xl font-bold mb-3">Chat with AI</h4>
                <ul className="space-y-2 text-emerald-50">
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Talk naturally to place orders
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Get menu recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Ask questions about dishes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-300">✓</span>
                    Fast, conversational ordering
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Setup Checklist */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">✅ Quick Setup</h3>
              <p className="text-gray-600">Get started in 4 easy steps</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
                <div className="flex-1">
                  <h5 className="font-bold text-gray-900 mb-1">Get FREE Gemini API Key</h5>
                  <p className="text-gray-600 text-sm">
                    Visit{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-medium">
                      Google AI Studio
                    </a>
                    {' '}and create your free API key
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
                <div className="flex-1">
                  <h5 className="font-bold text-gray-900 mb-1">Set up Supabase Database</h5>
                  <p className="text-gray-600 text-sm">
                    Create a project at{' '}
                    <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                      Supabase
                    </a>
                    {' '}and run the SQL schema
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center font-bold text-lg">3</div>
                <div className="flex-1">
                  <h5 className="font-bold text-gray-900 mb-1">Configure Environment Variables</h5>
                  <p className="text-gray-600 text-sm">
                    Add your API keys to <code className="bg-gray-100 px-2 py-1 rounded text-xs">.env.local</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center font-bold text-lg">4</div>
                <div className="flex-1">
                  <h5 className="font-bold text-gray-900 mb-1">Start Ordering! 🚀</h5>
                  <p className="text-gray-600 text-sm">
                    Click "Customer" above to test both ordering methods
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-gray-500 text-sm">
            <p>Powered by Next.js 15, Google Gemini AI, Supabase & Razorpay</p>
          </div>
        </div>
      </div>
    </div>
  )
}
