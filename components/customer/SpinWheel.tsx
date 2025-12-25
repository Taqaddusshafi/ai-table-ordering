'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Gift, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

interface Prize {
  id: number
  name: string
  color: string
}

interface SpinResult {
  prize: Prize & { type: string; value: number }
  couponCode: string | null
  expiresIn: string
}

interface SpinWheelProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  onPrizeWon?: (prize: SpinResult) => void
}

const SPIN_DURATION = 5000 // 5 seconds
const TOTAL_ROTATIONS = 5 // Full rotations before landing

export default function SpinWheel({
  isOpen,
  onClose,
  sessionId,
  onPrizeWon,
}: SpinWheelProps) {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [rotation, setRotation] = useState(0)
  const wheelRef = useRef<HTMLDivElement>(null)

  // Fetch prizes on mount
  useEffect(() => {
    const fetchPrizes = async () => {
      try {
        const response = await fetch('/api/rewards/spin')
        const data = await response.json()
        if (data.success) {
          setPrizes(data.data.prizes)
        }
      } catch (e) {
        // Use default prizes
        setPrizes([
          { id: 1, name: '5% Off', color: '#3B82F6' },
          { id: 2, name: '10% Off', color: '#22C55E' },
          { id: 3, name: '15% Off', color: '#F59E0B' },
          { id: 4, name: 'Free Dessert', color: '#EC4899' },
          { id: 5, name: '2x Points', color: '#8B5CF6' },
          { id: 6, name: 'Try Again', color: '#6B7280' },
        ])
      }
    }
    fetchPrizes()
  }, [])

  const handleSpin = async () => {
    if (isSpinning) return

    setIsSpinning(true)
    setResult(null)

    try {
      const response = await fetch('/api/rewards/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error || 'Failed to spin')
        setIsSpinning(false)
        return
      }

      // Calculate rotation to land on winning prize
      const prizeIndex = prizes.findIndex(p => p.id === data.data.prize.id)
      const segmentAngle = 360 / prizes.length
      const prizeAngle = segmentAngle * prizeIndex
      
      // Calculate final rotation (multiple rotations + prize position)
      // Adjust so pointer lands in middle of segment
      const finalRotation = 
        TOTAL_ROTATIONS * 360 + 
        (360 - prizeAngle) + 
        (segmentAngle / 2) +
        Math.random() * (segmentAngle * 0.4) // Add some randomness within segment

      setRotation(prev => prev + finalRotation)

      // Wait for spin to complete
      setTimeout(() => {
        setResult(data.data)
        setIsSpinning(false)
        onPrizeWon?.(data.data)
      }, SPIN_DURATION)

    } catch (e) {
      console.error('Spin error:', e)
      toast.error('Failed to spin the wheel')
      setIsSpinning(false)
    }
  }

  if (!isOpen) return null

  const segmentAngle = prizes.length > 0 ? 360 / prizes.length : 60

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <h2 className="font-bold text-xl">Spin & Win!</h2>
              <p className="text-sm text-white/80">Try your luck for rewards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wheel Container */}
        <div className="p-6 flex flex-col items-center">
          {/* Pointer */}
          <div className="relative z-10 -mb-4">
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-purple-600 drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <div className="relative w-72 h-72">
            <div
              ref={wheelRef}
              className="w-full h-full rounded-full border-8 border-purple-600 shadow-2xl overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning 
                  ? `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` 
                  : 'none',
              }}
            >
              {prizes.map((prize, index) => (
                <div
                  key={prize.id}
                  className="absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left flex items-center justify-center"
                  style={{
                    transform: `rotate(${index * segmentAngle}deg) skewY(${90 - segmentAngle}deg)`,
                    backgroundColor: prize.color,
                  }}
                >
                  <span
                    className="text-white font-bold text-xs absolute"
                    style={{
                      transform: `skewY(${-(90 - segmentAngle)}deg) rotate(${segmentAngle / 2}deg)`,
                      top: '35%',
                      left: '25%',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                    }}
                  >
                    {prize.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-purple-600">
              <Gift className="w-6 h-6 text-purple-600" />
            </div>
          </div>

          {/* Result Display */}
          {result && (
            <div className="mt-6 text-center animate-bounce-in">
              <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-lg">
                <p className="text-lg font-bold">🎉 You won!</p>
                <p className="text-2xl font-black">{result.prize.name}</p>
                {result.couponCode && (
                  <div className="mt-2 bg-white/20 rounded-lg px-3 py-1">
                    <p className="text-xs">Use code:</p>
                    <p className="font-mono font-bold text-lg">{result.couponCode}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spin Button */}
          {!result && (
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className={`mt-6 px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
                isSpinning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
              }`}
            >
              {isSpinning ? '🎡 Spinning...' : '🎰 SPIN NOW!'}
            </button>
          )}

          {/* Close after win */}
          {result && (
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
