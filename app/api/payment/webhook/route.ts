import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const payload = JSON.parse(body)
    const { event, payload: eventPayload } = payload

    console.log('Razorpay webhook event:', event)

    // Handle payment success
    if (event === 'payment.captured') {
      const payment = eventPayload.payment.entity
      const orderId = payment.notes?.order_id || payment.order_id
      const paymentId = payment.id

      console.log('Payment captured:', { orderId, paymentId })

      const supabase = createClient()

      // Get order details for notification
      const { data: order } = await supabase
        .from('orders')
        .select('table_id, session_id, total_amount')
        .eq('id', orderId)
        .single()

      // Update order with payment info
      const { error } = await supabase
        .from('orders')
        .update({
          payment_id: paymentId,
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (error) {
        console.error('Error updating order payment:', error)
        return NextResponse.json(
          { error: 'Failed to update order' },
          { status: 500 }
        )
      }

      // Send notification to customer
      if (order) {
        await supabase.from('notifications').insert({
          user_type: 'customer',
          table_id: order.table_id,
          session_id: order.session_id,
          order_id: orderId,
          title: '💰 Payment Successful',
          message: `Your payment of ₹${order.total_amount} was successful. Thank you!`, // ✅ FIXED: Removed /100
          type: 'success',
          is_read: false,
        })

        // Notify admin
        await supabase.from('notifications').insert({
          user_type: 'admin',
          table_id: order.table_id,
          session_id: order.session_id,
          order_id: orderId,
          title: '💳 Payment Received',
          message: `Payment of ₹${order.total_amount} received for Table #${order.table_id.slice(0, 8)}`, // ✅ FIXED: Removed /100
          type: 'success',
          is_read: false,
        })
      }

      console.log('✅ Payment processed successfully')
    }

    // Handle payment failure
    if (event === 'payment.failed') {
      const payment = eventPayload.payment.entity
      const orderId = payment.notes?.order_id || payment.order_id

      const supabase = createClient()

      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      console.log('❌ Payment failed for order:', orderId)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Payment Webhook Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}
