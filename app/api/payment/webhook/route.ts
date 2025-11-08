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
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const payload = JSON.parse(body)
    const { event, payload: eventPayload } = payload

    // Handle payment success
    if (event === 'payment.captured') {
      const { order_id, id: payment_id } = eventPayload.payment.entity

      const supabase = await createClient() // FIXED: Added await

      // Update order with payment info
      const { error } = await supabase
        .from('orders')
        .update({
          payment_id,
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order_id)

      if (error) {
        console.error('Error updating order payment:', error)
        return NextResponse.json(
          { error: 'Failed to update order' },
          { status: 500 }
        )
      }
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
