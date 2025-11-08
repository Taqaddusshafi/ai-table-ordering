import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId } = await request.json()

    if (!amount || !orderId) {
      return NextResponse.json(
        { error: 'Amount and Order ID are required' },
        { status: 400 }
      )
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: orderId,
    }

    const razorpayOrder = await razorpay.orders.create(options)

    return NextResponse.json({
      success: true,
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    })
  } catch (error: any) {
    console.error('Payment Create Error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment', details: error.message },
      { status: 500 }
    )
  }
}
