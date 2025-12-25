'use client'

import { useState, useEffect } from 'react'
import { Trophy, Star, Gift, ChevronRight } from 'lucide-react'

interface RewardsBadgeProps {
  sessionId: string
  onOpenRewards: () => void
  className?: string
}

interface RewardsData {
  total_points: number
  tier: 'bronze' | 'silver' | 'gold'
  spin_available: boolean
  order_count: number
}

const tierConfig = {
  bronze: {
    color: 'from-amber-600 to-amber-700',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: '🥉',
  },
  silver: {
    color: 'from-gray-400 to-gray-500',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: '🥈',
  },
  gold: {
    color: 'from-yellow-400 to-yellow-500',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    icon: '🥇',
  },
}

export default function RewardsBadge({
  sessionId,
  onOpenRewards,
  className = '',
}: RewardsBadgeProps) {
  const [rewards, setRewards] = useState<RewardsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRewards = async () => {
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

    if (sessionId) {
      fetchRewards()
    }
  }, [sessionId])

  if (isLoading) {
    return (
      <div className={`w-24 h-8 bg-gray-100 rounded-xl animate-pulse ${className}`} />
    )
  }

  const tier = rewards?.tier || 'bronze'
  const config = tierConfig[tier]
  const points = rewards?.total_points || 0

  return (
    <button
      onClick={onOpenRewards}
      className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${config.color} text-white rounded-xl shadow-md hover:shadow-lg transition-all group ${className}`}
    >
      <span className="text-lg">{config.icon}</span>
      <div className="flex flex-col items-start">
        <span className="text-xs font-bold leading-none">{points} pts</span>
      </div>
      {rewards?.spin_available && (
        <span className="flex items-center justify-center w-5 h-5 bg-white/30 rounded-full animate-bounce">
          🎡
        </span>
      )}
      <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

/**
 * Simple inline points display
 */
export function PointsDisplay({ points, tier }: { points: number; tier: string }) {
  const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.bronze

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${config.bg}`}>
      <span>{config.icon}</span>
      <span className={`text-sm font-semibold ${config.text}`}>{points} pts</span>
    </div>
  )
}
