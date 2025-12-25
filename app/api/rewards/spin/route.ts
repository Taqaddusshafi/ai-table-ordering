import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Spin wheel prizes with probabilities
const PRIZES = [
  { id: 1, name: '5% Off', type: 'percent', value: 5, probability: 0.30, color: '#3B82F6' },
  { id: 2, name: '10% Off', type: 'percent', value: 10, probability: 0.20, color: '#22C55E' },
  { id: 3, name: '15% Off', type: 'percent', value: 15, probability: 0.10, color: '#F59E0B' },
  { id: 4, name: 'Free Dessert', type: 'item', value: 100, probability: 0.05, color: '#EC4899' },
  { id: 5, name: '2x Points', type: 'bonus', value: 2, probability: 0.15, color: '#8B5CF6' },
  { id: 6, name: 'Try Again', type: 'none', value: 0, probability: 0.20, color: '#6B7280' },
]

/**
 * Generate a random coupon code
 */
function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Select a prize based on weighted probabilities
 */
function selectPrize(): typeof PRIZES[0] {
  const random = Math.random()
  let cumulative = 0

  for (const prize of PRIZES) {
    cumulative += prize.probability
    if (random <= cumulative) {
      return prize
    }
  }

  return PRIZES[PRIZES.length - 1] // Fallback
}

/**
 * POST - Spin the wheel
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if spin is available
    const { data: rewards, error: rewardsError } = await supabase
      .from('customer_rewards')
      .select('spin_available')
      .eq('session_id', sessionId)
      .single()

    if (rewardsError) {
      // Table might not exist, allow spin anyway for demo
      console.log('Rewards table not found, allowing spin for demo')
    } else if (rewards && !rewards.spin_available) {
      return NextResponse.json(
        { success: false, error: 'No spin available. Place an order first!' },
        { status: 400 }
      )
    }

    // Select prize
    const prize = selectPrize()

    // If prize is not "Try Again", create a coupon
    let couponCode = null
    if (prize.type !== 'none') {
      couponCode = generateCouponCode()
      
      // Set expiry to 7 days from now
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      try {
        await supabase
          .from('coupons')
          .insert({
            session_id: sessionId,
            code: couponCode,
            discount_type: prize.type,
            discount_value: prize.value,
            min_order_amount: prize.type === 'percent' ? 200 : 0,
            expires_at: expiresAt.toISOString(),
          })
      } catch (e) {
        console.error('Failed to create coupon:', e)
      }
    }

    // Disable spin after use
    try {
      await supabase
        .from('customer_rewards')
        .update({ spin_available: false, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId)
    } catch (e) {
      console.error('Failed to update spin status:', e)
    }

    return NextResponse.json({
      success: true,
      data: {
        prize: {
          id: prize.id,
          name: prize.name,
          type: prize.type,
          value: prize.value,
          color: prize.color,
        },
        couponCode,
        expiresIn: '7 days',
        allPrizes: PRIZES.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
        })),
      }
    })

  } catch (error: any) {
    console.error('Spin wheel error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET - Get spin wheel configuration
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      prizes: PRIZES.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
      })),
    }
  })
}
