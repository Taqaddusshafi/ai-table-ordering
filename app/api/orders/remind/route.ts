import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_item:menu_items(*))')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if order is still pending
    if (order.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Can only remind for pending orders' },
        { status: 400 }
      )
    }

    // Check if 10 minutes have passed since last reminder or order creation
    const lastTime = order.last_reminder_at || order.created_at
    const timeSinceLastReminder = Date.now() - new Date(lastTime).getTime()
    const minutesSinceLastReminder = timeSinceLastReminder / 1000 / 60

    if (minutesSinceLastReminder < 10) {
      const timeLeft = Math.ceil(10 - minutesSinceLastReminder)
      return NextResponse.json(
        { 
          success: false, 
          error: `Please wait ${timeLeft} more minute${timeLeft !== 1 ? 's' : ''} before sending another reminder` 
        },
        { status: 400 }
      )
    }

    // Update order with reminder timestamp and count
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        last_reminder_at: new Date().toISOString(),
        reminder_count: (order.reminder_count || 0) + 1
      })
      .eq('id', orderId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder sent to admin',
      reminderCount: (order.reminder_count || 0) + 1
    })
  } catch (error: any) {
    console.error('Reminder error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send reminder' },
      { status: 500 }
    )
  }
}
