import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Helper function to create notifications
async function createNotification(
  supabase: any,
  {
    userType,
    tableId,
    sessionId,
    orderId,
    title,
    message,
    type = 'info',
  }: {
    userType: 'customer' | 'admin'
    tableId?: string
    sessionId?: string
    orderId?: string
    title: string
    message: string
    type?: 'info' | 'success' | 'warning' | 'error'
  }
) {
  try {
    await supabase.from('notifications').insert({
      user_type: userType,
      table_id: tableId,
      session_id: sessionId,
      order_id: orderId,
      title,
      message,
      type,
      is_read: false,
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

// 🧩 Create new order
export async function POST(request: NextRequest) {
  try {
    const { tableId, sessionId, items, totalAmount } = await request.json()
    console.log('Order POST received:', { tableId, sessionId, items, totalAmount })

    // Validation
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

    // Create order
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

    // Create order items
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

    // ✅ Send notification to admin
    await createNotification(supabase, {
      userType: 'admin',
      tableId,
      sessionId,
      orderId: order.id,
      title: '🔔 New Order',
      message: `New order received from Table #${tableId.slice(0, 8)} - ₹${totalAmount}`,
      type: 'info',
    })

    // ✅ Send confirmation to customer
    await createNotification(supabase, {
      userType: 'customer',
      tableId,
      sessionId,
      orderId: order.id,
      title: '✅ Order Placed',
      message: `Your order for ₹${totalAmount} has been received and is being prepared!`,
      type: 'success',
    })

    console.log('✅ Order created successfully:', order.id)
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

    // Get order details for notification
    const { data: order } = await supabase
      .from('orders')
      .select('table_id, session_id, total_amount')
      .eq('id', orderId)
      .single()

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (updateError) {
      console.error('Supabase update error:', updateError)
      throw updateError
    }

    // ✅ Send notification to customer based on status
    if (order) {
      const statusMessages: Record<string, { title: string; message: string; type: 'info' | 'success' | 'warning' }> = {
        preparing: {
          title: '👨‍🍳 Order Being Prepared',
          message: 'Your order is now being prepared by our chef!',
          type: 'info',
        },
        ready: {
          title: '✅ Order Ready',
          message: 'Your order is ready! Please collect it.',
          type: 'success',
        },
        served: {
          title: '🍽️ Bon Appétit',
          message: 'Enjoy your meal!',
          type: 'success',
        },
        cancelled: {
          title: '❌ Order Cancelled',
          message: 'Your order has been cancelled. Please contact staff if you have questions.',
          type: 'warning',
        },
      }

      const notification = statusMessages[status]
      if (notification) {
        await createNotification(supabase, {
          userType: 'customer',
          tableId: order.table_id,
          sessionId: order.session_id,
          orderId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
        })
      }
    }

    console.log(`✅ Order ${orderId} updated to status: ${status}`)
    return NextResponse.json({ success: true, status })
  } catch (error: any) {
    console.error('PATCH Error:', error)
    return NextResponse.json(
      { error: 'Failed to update order', details: error.message },
      { status: 500 }
    )
  }
}
