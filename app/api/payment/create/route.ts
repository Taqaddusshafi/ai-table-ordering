import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId } = await request.json()

    if (!amount || !orderId) {
      return NextResponse.json(
        { error: 'Amount and Order ID are required' },
        { status: 400 }
      )
    }

    // Check if Razorpay is configured
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // Handle missing or placeholder keys
    if (
      !keyId || 
      !keySecret || 
      keyId.includes('your_') || 
      keyId.includes('dummy') ||
      keySecret.includes('your_') ||
      keySecret.includes('dummy')
    ) {
      console.warn('Razorpay not configured - payment gateway unavailable')
      return NextResponse.json(
        { 
          error: 'Payment gateway not configured',
          message: 'Please configure Razorpay credentials to enable payments'
        },
        { status: 503 }
      )
    }

    // Dynamic import - only load Razorpay if keys are valid
    const Razorpay = (await import('razorpay')).default

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

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
