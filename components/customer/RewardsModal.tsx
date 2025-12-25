'use client'

import { useState, useEffect } from 'react'
import { 
  X, Trophy, Star, Gift, Ticket, Clock, 
  TrendingUp, ShoppingBag, ChevronRight 
} from 'lucide-react'

interface RewardsModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  onOpenSpinWheel: () => void
}

interface Coupon {
  id: string
  code: string
  discount_type: string
  discount_value: number
  expires_at: string
  is_used: boolean
}

interface RewardsData {
  total_points: number
  lifetime_points: number
  tier: 'bronze' | 'silver' | 'gold'
  spin_available: boolean
  order_count: number
  coupons: Coupon[]
}

const tierConfig = {
  bronze: {
    name: 'Bronze',
    color: 'from-amber-600 to-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: '🥉',
    nextTier: 'silver',
    pointsToNext: 100,
    perks: ['Earn 1 point per ₹10', 'Spin wheel after orders'],
  },
  silver: {
    name: 'Silver',
    color: 'from-gray-400 to-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    icon: '🥈',
    nextTier: 'gold',
    pointsToNext: 500,
    perks: ['5% bonus points', 'Priority support', 'Exclusive offers'],
  },
  gold: {
    name: 'Gold',
    color: 'from-yellow-400 to-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: '🥇',
    nextTier: null,
    pointsToNext: null,
    perks: ['10% bonus points', 'Priority orders', 'Free delivery', 'VIP access'],
  },
}

export default function RewardsModal({
  isOpen,
  onClose,
  sessionId,
  onOpenSpinWheel,
}: RewardsModalProps) {
  const [rewards, setRewards] = useState<RewardsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const fetchRewards = async () => {
      if (!isOpen) return
      
      try {
        const response = await fetch(`/api/rewards?sessionId=${sessionId}`)
        const result = await response.json()
        if (result.success) {
          setRewards(result.data)
        }
      } catch (e) {
        console.error('Failed to fetch rewards:', e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRewards()
  }, [sessionId, isOpen])

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }

  const handleSpinClick = () => {
    onClose()
    onOpenSpinWheel()
  }

  if (!isOpen) return null

  const tier = rewards?.tier || 'bronze'
  const config = tierConfig[tier]
  const progress = config.nextTier 
    ? Math.min(100, ((rewards?.lifetime_points || 0) / config.pointsToNext!) * 100)
    : 100

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Handle bar */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header with tier */}
        <div className={`bg-gradient-to-r ${config.color} text-white px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{config.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{config.name} Member</h2>
                <p className="text-sm text-white/80">
                  {rewards?.lifetime_points || 0} lifetime points
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress to next tier */}
          {config.nextTier && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/80 mb-1">
                <span>{rewards?.lifetime_points || 0} pts</span>
                <span>{config.pointsToNext} pts for {tierConfig[config.nextTier as keyof typeof tierConfig].name}</span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Points Balance */}
              <div className={`${config.bg} ${config.border} border-2 rounded-2xl p-4 mb-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Available Points</p>
                    <p className={`text-3xl font-bold ${config.text}`}>
                      {rewards?.total_points || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      = ₹{Math.floor((rewards?.total_points || 0) / 10)} discount
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <ShoppingBag className="w-4 h-4" />
                      <span>{rewards?.order_count || 0} orders</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spin Wheel CTA */}
              {rewards?.spin_available && (
                <button
                  onClick={handleSpinClick}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-4 mb-6 flex items-center justify-between hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl animate-spin-slow">🎡</span>
                    <div className="text-left">
                      <p className="font-bold text-lg">Spin & Win!</p>
                      <p className="text-sm text-white/80">You have a free spin!</p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Tier Perks */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Your Perks
                </h3>
                <div className="space-y-2">
                  {config.perks.map((perk, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs">
                        ✓
                      </span>
                      {perk}
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Coupons */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-purple-500" />
                  Your Coupons
                </h3>

                {rewards?.coupons && rewards.coupons.length > 0 ? (
                  <div className="space-y-3">
                    {rewards.coupons.map(coupon => (
                      <div
                        key={coupon.id}
                        className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-dashed border-purple-200 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-purple-700">
                              {coupon.discount_type === 'percent' 
                                ? `${coupon.discount_value}% OFF`
                                : coupon.discount_type === 'item'
                                ? 'FREE ITEM'
                                : `₹${coupon.discount_value} OFF`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-mono font-bold hover:bg-purple-700 transition-colors"
                          >
                            {copiedCode === coupon.code ? '✓ Copied!' : coupon.code}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No coupons yet</p>
                    <p className="text-sm">Spin the wheel to win!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Safe area */}
        <div className="pb-safe" />
      </div>
    </div>
  )
}
