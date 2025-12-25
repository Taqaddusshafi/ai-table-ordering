'use client'

import { useState } from 'react'
import { Users, Crown, Copy, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import type { GroupMember } from '@/hooks/useGroupSession'

interface GroupOrderBannerProps {
  groupCode: string
  members: GroupMember[]
  memberName: string
  isHost: boolean
  onViewGroup: () => void
  onLeaveGroup: () => void
  className?: string
}

export default function GroupOrderBanner({
  groupCode,
  members,
  memberName,
  isHost,
  onViewGroup,
  onLeaveGroup,
  className = '',
}: GroupOrderBannerProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(groupCode)
      setCopied(true)
      toast.success('Group code copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className={`bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl overflow-hidden shadow-lg ${className}`}>
      {/* Main banner */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Group Order</span>
                {isHost && (
                  <span className="flex items-center gap-1 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-medium">
                    <Crown className="w-3 h-3" />
                    Host
                  </span>
                )}
              </div>
              <p className="text-xs text-white/70">
                {members.length} member{members.length !== 1 ? 's' : ''} • {memberName}
              </p>
            </div>
          </div>

          {/* Group code */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
          >
            <span className="font-mono font-bold tracking-wider">{groupCode}</span>
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
        >
          {expanded ? 'Hide details' : 'Show members'}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-3">
          <div className="space-y-2">
            {members.map((member, index) => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium">
                    {member.member_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{member.member_name}</span>
                  {index === 0 && (
                    <Crown className="w-3.5 h-3.5 text-yellow-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onViewGroup}
              className="flex-1 bg-white text-indigo-600 py-2.5 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              View Group Orders
            </button>
            <button
              onClick={onLeaveGroup}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title={isHost ? 'End group' : 'Leave group'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact version for header area
 */
interface GroupOrderBadgeProps {
  groupCode: string
  memberCount: number
  isHost: boolean
  onClick: () => void
}

export function GroupOrderBadge({ groupCode, memberCount, isHost, onClick }: GroupOrderBadgeProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-full transition-colors"
    >
      <Users className="w-4 h-4" />
      <span className="font-medium text-sm">{groupCode}</span>
      <span className="text-xs bg-purple-200 px-1.5 py-0.5 rounded-full">
        {memberCount}
      </span>
      {isHost && <Crown className="w-3.5 h-3.5 text-yellow-600" />}
    </button>
  )
}
