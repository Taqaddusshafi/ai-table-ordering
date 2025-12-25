import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  calculateWaitTime, 
  getKitchenLoad, 
  getKitchenLoadMessage,
  type OrderItem 
} from '@/lib/utils/waitTimeCalculator'

export const runtime = 'nodejs'

/**
 * GET - Calculate wait time for cart items or existing order
 * Query params:
 *   - items: JSON array of cart items (for pre-order estimate)
 *   - orderId: Order ID (for existing order wait time)
 *   - tableId: Table ID (required for kitchen load calculation)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemsParam = searchParams.get('items')
    const orderId = searchParams.get('orderId')
    const tableId = searchParams.get('tableId')

    const supabase = createClient()

    // Get pending orders count for kitchen load calculation (simple query without prep_time_minutes)
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        order_items (
          quantity
        )
      `)
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true })

    if (pendingError) {
      console.error('Error fetching pending orders:', pendingError)
    }

    const pendingOrdersList = (pendingOrders || []) as any[]

    // Get menu items for category lookup (without prep_time_minutes which may not exist)
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, category')
      .eq('available', true)

    // If menuError, just continue without menu data
    if (menuError) {
      console.error('Error fetching menu items:', menuError)
    }

    let orderItems: OrderItem[] = []

    // If orderId provided, get items from existing order
    if (orderId) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          order_items (
            quantity,
            menu_item_id
          )
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        )
      }

      orderItems = (order.order_items as any[])?.map((item: any) => ({
        id: item.menu_item_id || '',
        quantity: item.quantity,
      })) || []

      // For existing orders, find position in queue
      const queuePosition = pendingOrdersList.findIndex((o: any) => o.id === orderId)
      const ordersAhead = queuePosition >= 0 
        ? pendingOrdersList.slice(0, queuePosition)
        : pendingOrdersList.filter((o: any) => new Date(o.created_at) < new Date(order.created_at))

      const waitTime = calculateWaitTime(
        orderItems,
        ordersAhead as any,
        menuItems as any || undefined
      )

      return NextResponse.json({
        success: true,
        data: {
          ...waitTime,
          orderId,
          orderStatus: order.status,
          ordersAhead: ordersAhead.length,
          message: getKitchenLoadMessage(waitTime.kitchenLoad),
        }
      })
    }

    // If items provided, calculate for cart items
    if (itemsParam) {
      try {
        orderItems = JSON.parse(itemsParam)
      } catch (e) {
        return NextResponse.json(
          { success: false, error: 'Invalid items format' },
          { status: 400 }
        )
      }

      const waitTime = calculateWaitTime(
        orderItems,
        pendingOrdersList as any,
        menuItems as any || undefined
      )

      return NextResponse.json({
        success: true,
        data: {
          ...waitTime,
          message: getKitchenLoadMessage(waitTime.kitchenLoad),
        }
      })
    }

    // Just return kitchen load status
    const kitchenLoad = getKitchenLoad(pendingOrdersList.length)

    return NextResponse.json({
      success: true,
      data: {
        kitchenLoad,
        pendingOrdersCount: pendingOrdersList.length,
        message: getKitchenLoadMessage(kitchenLoad),
      }
    })

  } catch (error: any) {
    console.error('Wait time calculation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate wait time' },
      { status: 500 }
    )
  }
}

