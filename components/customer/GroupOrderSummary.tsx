'use client'

import { useState } from 'react'
import { 
  X, Users, Crown, ChevronRight, Receipt, 
  CreditCard, Loader2, Check, SplitSquareHorizontal 
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { GroupMember, GroupOrder } from '@/hooks/useGroupSession'

interface GroupOrderSummaryProps {
  isOpen: boolean
  onClose: () => void
  groupCode: string
  members: GroupMember[]
  orders: GroupOrder[]
  groupTotal: number
  myTotal: number
  mySessionId: string
  isHost: boolean
  onLeaveGroup: () => void
  onEndGroup: () => void
}

type SplitMode = 'individual' | 'equal' | 'custom'

export default function GroupOrderSummary({
  isOpen,
  onClose,
  groupCode,
  members,
  orders,
  groupTotal,
  myTotal,
  mySessionId,
  isHost,
  onLeaveGroup,
  onEndGroup,
}: GroupOrderSummaryProps) {
  const [splitMode, setSplitMode] = useState<SplitMode>('individual')
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  if (!isOpen) return null

  // Calculate split amounts
  const equalSplit = members.length > 0 ? Math.ceil(groupTotal / members.length) : 0

  // Get orders by member
  const ordersByMember = members.map(member => {
    const memberOrders = orders.filter(o => o.session_id === member.session_id)
    const total = memberOrders.reduce((sum, o) => sum + o.total_amount, 0)
    return {
      ...member,
      orders: memberOrders,
      total,
      isMe: member.session_id === mySessionId,
    }
  })

  const handleLeaveOrEnd = () => {
    if (isHost) {
      onEndGroup()
    } else {
      onLeaveGroup()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Handle bar for mobile */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">Group Orders</h2>
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {groupCode}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {members.length} member{members.length !== 1 ? 's' : ''} • ₹{groupTotal} total
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Split Mode Selector */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-2">Split Method</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSplitMode('individual')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                splitMode === 'individual'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              Pay Own
            </button>
            <button
              onClick={() => setSplitMode('equal')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                splitMode === 'equal'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              Split Equal
            </button>
          </div>
        </div>

        {/* Orders by Member */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            {ordersByMember.map((member, index) => (
              <div
                key={member.id}
                className={`rounded-xl border-2 overflow-hidden ${
                  member.isMe ? 'border-purple-200 bg-purple-50/50' : 'border-gray-100'
                }`}
              >
                {/* Member Header */}
                <div className="px-4 py-3 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      member.isMe 
                        ? 'bg-purple-200 text-purple-700' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {member.member_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">
                        {member.member_name}
                        {member.isMe && <span className="text-purple-600 ml-1">(You)</span>}
                      </span>
                      {index === 0 && (
                        <Crown className="w-3.5 h-3.5 text-yellow-500 inline ml-1.5" />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      ₹{splitMode === 'equal' ? equalSplit : member.total}
                    </p>
                    {splitMode === 'equal' && member.total !== equalSplit && (
                      <p className="text-xs text-gray-500">
                        ordered ₹{member.total}
                      </p>
                    )}
                  </div>
                </div>

                {/* Member's Orders */}
                {member.orders.length > 0 ? (
                  <div className="px-4 pb-3 space-y-2">
                    {member.orders.map(order => (
                      <div key={order.id} className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'ready' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {order.status}
                          </span>
                          <span className="font-medium text-gray-900">₹{order.total_amount}</span>
                        </div>
                        <div className="space-y-1">
                          {order.order_items?.map(item => (
                            <div key={item.id} className="flex justify-between text-sm text-gray-600">
                              <span>{item.quantity}× {item.menu_item?.name || 'Item'}</span>
                              <span>₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 pb-3">
                    <p className="text-sm text-gray-400 text-center py-2">No orders yet</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-5 bg-white">
          {/* Total Summary */}
          <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm text-gray-600">
                {splitMode === 'equal' ? 'Your share (equal split)' : 'Your total'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{splitMode === 'equal' ? equalSplit : myTotal}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Group Total</p>
              <p className="text-lg font-semibold text-gray-700">₹{groupTotal}</p>
            </div>
          </div>

          {/* Actions */}
          {showLeaveConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-gray-600 mb-3">
                {isHost 
                  ? 'End group for everyone?' 
                  : 'Leave this group order?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveOrEnd}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  {isHost ? 'End Group' : 'Leave'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isHost ? 'End' : 'Leave'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Continue Ordering
              </button>
            </div>
          )}
        </div>

        {/* Safe area padding */}
        <div className="pb-safe" />
      </div>
    </div>
  )
}
