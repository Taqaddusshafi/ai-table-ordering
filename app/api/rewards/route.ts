import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET - Fetch customer rewards
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get or create rewards record
    let { data: rewards, error } = await supabase
      .from('customer_rewards')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error || !rewards) {
      // Create new rewards record
      const { data: newRewards, error: createError } = await supabase
        .from('customer_rewards')
        .insert({
          session_id: sessionId,
          total_points: 0,
          lifetime_points: 0,
          tier: 'bronze',
          spin_available: false,
          order_count: 0,
        })
        .select()
        .single()

      if (createError) {
        // Table might not exist, return default
        return NextResponse.json({
          success: true,
          data: {
            total_points: 0,
            lifetime_points: 0,
            tier: 'bronze',
            spin_available: false,
            order_count: 0,
            coupons: [],
          }
        })
      }

      rewards = newRewards
    }

    // Get available coupons
    const { data: coupons } = await supabase
      .from('coupons')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      data: {
        ...rewards,
        coupons: coupons || [],
      }
    })

  } catch (error: any) {
    console.error('Get rewards error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST - Award points after order
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, orderId, orderAmount } = await request.json()

    if (!sessionId || !orderAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Calculate points (1 point per ₹10)
    const basePoints = Math.floor(orderAmount / 10)

    // Get current rewards
    let { data: rewards } = await supabase
      .from('customer_rewards')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    // Calculate tier bonus
    let bonusMultiplier = 1
    if (rewards?.tier === 'silver') bonusMultiplier = 1.05
    if (rewards?.tier === 'gold') bonusMultiplier = 1.1

    const earnedPoints = Math.floor(basePoints * bonusMultiplier)
    const newTotalPoints = (rewards?.total_points || 0) + earnedPoints
    const newLifetimePoints = (rewards?.lifetime_points || 0) + earnedPoints
    const newOrderCount = (rewards?.order_count || 0) + 1

    // Determine new tier
    let newTier = 'bronze'
    if (newLifetimePoints >= 500) newTier = 'gold'
    else if (newLifetimePoints >= 100) newTier = 'silver'

    // Update or create rewards
    if (rewards) {
      await supabase
        .from('customer_rewards')
        .update({
          total_points: newTotalPoints,
          lifetime_points: newLifetimePoints,
          tier: newTier,
          spin_available: true, // Enable spin after order
          order_count: newOrderCount,
          last_order_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
    } else {
      await supabase
        .from('customer_rewards')
        .insert({
          session_id: sessionId,
          total_points: earnedPoints,
          lifetime_points: earnedPoints,
          tier: newTier,
          spin_available: true,
          order_count: 1,
          last_order_date: new Date().toISOString(),
        })
    }

    // Log points transaction
    if (orderId) {
      await supabase
        .from('points_transactions')
        .insert({
          session_id: sessionId,
          order_id: orderId,
          points: earnedPoints,
          type: 'earned',
          description: `Earned from order of ₹${orderAmount}`,
        })
    }

    return NextResponse.json({
      success: true,
      data: {
        pointsEarned: earnedPoints,
        totalPoints: newTotalPoints,
        tier: newTier,
        spinAvailable: true,
        orderCount: newOrderCount,
      }
    })

  } catch (error: any) {
    console.error('Award points error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Use spin or redeem points
 */
export async function PATCH(request: NextRequest) {
  try {
    const { sessionId, action, couponCode, pointsToRedeem } = await request.json()

    if (!sessionId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    if (action === 'use_coupon') {
      // Apply coupon code
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('is_used', false)
        .single()

      if (couponError || !coupon) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired coupon' },
          { status: 400 }
        )
      }

      // Mark as used
      await supabase
        .from('coupons')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', coupon.id)

      return NextResponse.json({
        success: true,
        data: {
          discountType: coupon.discount_type,
          discountValue: coupon.discount_value,
        }
      })
    }

    if (action === 'redeem_points') {
      // Redeem points for discount
      const { data: rewards } = await supabase
        .from('customer_rewards')
        .select('total_points')
        .eq('session_id', sessionId)
        .single()

      if (!rewards || rewards.total_points < pointsToRedeem) {
        return NextResponse.json(
          { success: false, error: 'Insufficient points' },
          { status: 400 }
        )
      }

      // Calculate discount (10 points = ₹1)
      const discountAmount = Math.floor(pointsToRedeem / 10)

      await supabase
        .from('customer_rewards')
        .update({
          total_points: rewards.total_points - pointsToRedeem,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)

      return NextResponse.json({
        success: true,
        data: {
          pointsRedeemed: pointsToRedeem,
          discountAmount,
        }
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Rewards patch error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
