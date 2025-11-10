import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// 🧩 Update payment status (Cash or Gateway)
export async function PATCH(request: NextRequest) {
  try {
    const { orderId, paymentStatus, paymentMethod, paymentId } = await request.json()
    console.log('Payment PATCH received:', { orderId, paymentStatus, paymentMethod, paymentId })

    if (!orderId || !paymentStatus) {
      return NextResponse.json(
        { error: 'Missing orderId or paymentStatus' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('table_id, session_id, total_amount, status')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update payment status
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    }

    // Store payment method/ID based on type
    if (paymentStatus === 'paid') {
      if (paymentId) {
        // Razorpay or other gateway payment
        updateData.payment_id = paymentId
      } else if (paymentMethod === 'cash') {
        // Cash payment
        updateData.payment_id = 'cash'
      } else {
        updateData.payment_id = paymentMethod || 'unknown'
      }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) throw updateError

    // Send notification to customer
    if (paymentStatus === 'paid') {
      const paymentMethodText = updateData.payment_id === 'cash' ? 'cash' : 'online'
      
      await supabase.from('notifications').insert({
        user_type: 'customer',
        table_id: order.table_id,
        session_id: order.session_id,
        order_id: orderId,
        title: '💰 Payment Received',
        message: `Payment of ₹${order.total_amount} received via ${paymentMethodText}. Thank you!`,
        type: 'success',
        is_read: false,
      })
    }

    console.log(`✅ Order ${orderId} payment updated to: ${paymentStatus}`)
    return NextResponse.json({ success: true, paymentStatus, paymentMethod: updateData.payment_id })
  } catch (error: any) {
    console.error('Payment PATCH Error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment', details: error.message },
      { status: 500 }
    )
  }
}
