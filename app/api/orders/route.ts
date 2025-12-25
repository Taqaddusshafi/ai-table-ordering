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
    const { tableId, sessionId, items, totalAmount, groupSessionId, memberName } = await request.json()
    console.log('Order POST received:', { tableId, sessionId, items, totalAmount, groupSessionId, memberName })

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

    // Build order data with optional group fields
    const orderData: any = {
      table_id: tableId,
      session_id: sessionId,
      total_amount: totalAmount,
      status: 'pending',
      payment_status: 'pending',
    }

    // Add group session info if provided
    if (groupSessionId) {
      orderData.group_session_id = groupSessionId
    }
    if (memberName) {
      orderData.member_name = memberName
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
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

// 🧩 PATCH — update order status (admin) or cancel order (customer)
export async function PATCH(request: NextRequest) {
  try {
    const { orderId, status, action } = await request.json()
    console.log('PATCH request received:', { orderId, status, action })

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('table_id, session_id, total_amount, status, created_at')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ✅ Customer cancellation logic
    if (action === 'cancel') {
      // Check if order can be cancelled (within 2 minutes and status is pending)
      const orderTime = new Date(order.created_at).getTime()
      const now = new Date().getTime()
      const minutesElapsed = (now - orderTime) / 1000 / 60

      if (minutesElapsed > 2) {
        return NextResponse.json(
          { error: 'Order can only be cancelled within 2 minutes of placement' },
          { status: 400 }
        )
      }

      if (order.status !== 'pending') {
        return NextResponse.json(
          { error: 'Order has already been processed and cannot be cancelled' },
          { status: 400 }
        )
      }

      // Cancel order
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (updateError) throw updateError

      // Notify admin
      await createNotification(supabase, {
        userType: 'admin',
        tableId: order.table_id,
        sessionId: order.session_id,
        orderId,
        title: '❌ Order Cancelled',
        message: `Order from Table #${order.table_id.slice(0, 8)} was cancelled by customer`,
        type: 'warning',
      })

      // Notify customer
      await createNotification(supabase, {
        userType: 'customer',
        tableId: order.table_id,
        sessionId: order.session_id,
        orderId,
        title: '❌ Order Cancelled',
        message: 'Your order has been cancelled successfully',
        type: 'info',
      })

      return NextResponse.json({ success: true, message: 'Order cancelled' })
    }

    // ✅ Admin status update logic
    if (status) {
      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (updateError) throw updateError

      // Send notification to customer based on status
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
          message: 'Your order has been cancelled by staff.',
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

      console.log(`✅ Order ${orderId} updated to status: ${status}`)
      return NextResponse.json({ success: true, status })
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 })
  } catch (error: any) {
    console.error('PATCH Error:', error)
    return NextResponse.json(
      { error: 'Failed to update order', details: error.message },
      { status: 500 }
    )
  }
}

// 🧩 DELETE — customer cancel order (alternative method)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // Use PATCH with action='cancel' instead
    return PATCH(new NextRequest(request.url, {
      method: 'PATCH',
      body: JSON.stringify({ orderId, action: 'cancel' }),
      headers: { 'Content-Type': 'application/json' },
    }))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


// Add this to your existing route.ts file

// 🧩 PUT — Edit order items (customer within 2 minutes)
export async function PUT(request: NextRequest) {
  try {
    const { orderId, items, totalAmount } = await request.json()
    console.log('PUT request received:', { orderId, items, totalAmount })

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing orderId or items' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get order details
    const { data: order } = await supabase
      .from('orders')
      .select('table_id, session_id, status, created_at')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order can be edited (within 2 minutes and status is pending)
    const orderTime = new Date(order.created_at).getTime()
    const now = new Date().getTime()
    const minutesElapsed = (now - orderTime) / 1000 / 60

    if (minutesElapsed > 2) {
      return NextResponse.json(
        { error: 'Order can only be edited within 2 minutes of placement' },
        { status: 400 }
      )
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order has already been processed and cannot be edited' },
        { status: 400 }
      )
    }

    // Delete existing order items
    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)

    // Insert new order items
    const orderItems = items.map((item: any) => ({
      order_id: orderId,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // Update order total
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) throw updateError

    // Notify admin
    await createNotification(supabase, {
      userType: 'admin',
      tableId: order.table_id,
      sessionId: order.session_id,
      orderId,
      title: '🔄 Order Updated',
      message: `Order from Table #${order.table_id.slice(0, 8)} was modified - New total: ₹${totalAmount}`,
      type: 'info',
    })

    // Notify customer
    await createNotification(supabase, {
      userType: 'customer',
      tableId: order.table_id,
      sessionId: order.session_id,
      orderId,
      title: '✅ Order Updated',
      message: 'Your order has been updated successfully',
      type: 'success',
    })

    console.log(`✅ Order ${orderId} updated successfully`)
    return NextResponse.json({ success: true, message: 'Order updated' })
  } catch (error: any) {
    console.error('PUT Error:', error)
    return NextResponse.json(
      { error: 'Failed to update order', details: error.message },
      { status: 500 }
    )
  }
}
