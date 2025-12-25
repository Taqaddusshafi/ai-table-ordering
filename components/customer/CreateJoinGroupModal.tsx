'use client'

import { useState } from 'react'
import { X, Users, Copy, Check, Loader2, LogOut, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

interface CreateJoinGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (name: string) => Promise<boolean>
  onJoinGroup: (code: string, name: string) => Promise<boolean>
  isLoading?: boolean
  error?: string | null
}

export default function CreateJoinGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
  onJoinGroup,
  isLoading = false,
  error,
}: CreateJoinGroupModalProps) {
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice')
  const [name, setName] = useState('')
  const [groupCode, setGroupCode] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name')
      return
    }

    const success = await onCreateGroup(name.trim())
    if (success) {
      toast.success('Group created!')
      onClose()
      resetForm()
    }
  }

  const handleJoin = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (!groupCode.trim() || groupCode.length !== 6) {
      toast.error('Please enter a valid 6-character code')
      return
    }

    const success = await onJoinGroup(groupCode.trim().toUpperCase(), name.trim())
    if (success) {
      toast.success('Joined group!')
      onClose()
      resetForm()
    }
  }

  const resetForm = () => {
    setMode('choice')
    setName('')
    setGroupCode('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden animate-slide-up">
        {/* Handle bar for mobile */}
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Group Order</h2>
              <p className="text-xs text-gray-500">Order together, split the bill</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {mode === 'choice' && (
            <div className="space-y-3">
              <p className="text-gray-600 text-sm mb-4">
                Ordering with friends? Create a group to let everyone order on their own device!
              </p>

              <button
                onClick={() => setMode('create')}
                className="w-full p-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5" />
                Create New Group
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full p-4 bg-gray-100 text-gray-900 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Join Existing Group
              </button>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('choice')}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← Back
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:outline-none transition-colors"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  This will be shown to other group members
                </p>
              </div>

              <button
                onClick={handleCreate}
                disabled={isLoading || !name.trim()}
                className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Create Group
                  </>
                )}
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('choice')}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← Back
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Code
                </label>
                <input
                  type="text"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="Enter 6-character code"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:outline-none transition-colors text-center text-xl font-mono tracking-widest uppercase"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Ask your friend for the group code
                </p>
              </div>

              <button
                onClick={handleJoin}
                disabled={isLoading || !name.trim() || groupCode.length !== 6}
                className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Join Group
                  </>
                )}
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

/**
 * Group code display component with copy functionality
 */
interface GroupCodeDisplayProps {
  code: string
  className?: string
}

export function GroupCodeDisplay({ code, className = '' }: GroupCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Code copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors ${className}`}
    >
      <span className="font-mono font-bold text-lg tracking-wider text-gray-900">
        {code}
      </span>
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4 text-gray-500" />
      )}
    </button>
  )
}
