import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// 🧩 Create new order (already working)
export async function POST(request: NextRequest) {
  try {
    const { tableId, sessionId, items, totalAmount } = await request.json()
    console.log('Order POST received:', { tableId, sessionId, items, totalAmount })

    if (!tableId || !items || !Array.isArray(items) || items.length === 0 || !sessionId) {
      return NextResponse.json(
        { error: 'Missing table, items, or session' },
        { status: 400 }
      )
    }

    for (const item of items) {
      if (!item.id || !item.name || typeof item.price !== 'number' || !item.quantity) {
        return NextResponse.json(
          { error: 'Invalid menu item in order', details: item },
          { status: 400 }
        )
      }
    }

    const sum = items.reduce(
      (acc, item) => acc + (item.price ?? 0) * (item.quantity ?? 1),
      0
    )
    if (Math.abs(sum - totalAmount) > 0.01) {
      return NextResponse.json(
        { error: 'Order total does not match item sum', expected: sum, got: totalAmount },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        table_id: tableId,
        session_id: sessionId,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order', cause: orderError },
        { status: 500 }
      )
    }

    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      return NextResponse.json(
        { error: 'Failed to create order items', cause: itemsError },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: order })
  } catch (error: any) {
    console.error('Orders POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to create order', details: error.message },
      { status: 500 }
    )
  }
}

// 🧩 PATCH — update order status from admin panel
export async function PATCH(request: NextRequest) {
  try {
    const { orderId, status } = await request.json()
    console.log('PATCH request received:', { orderId, status })

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing orderId or status' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (updateError) {
      console.error('Supabase update error:', updateError)
      throw updateError
    }

    console.log(`✅ Order ${orderId} updated to status: ${status}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('PATCH Error:', error)
    return NextResponse.json(
      { error: 'Failed to update order', details: error.message },
      { status: 500 }
    )
  }
}
