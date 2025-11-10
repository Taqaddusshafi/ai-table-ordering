import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// GET - Fetch menu items (supports filtering by availability)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const availableOnly = searchParams.get('available') === 'true'

    const supabase = createClient()
    
    let query = supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    // Filter by availability if requested (for customer view)
    if (availableOnly) {
      query = query.eq('available', true)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch menu' },
      { status: 500 }
    )
  }
}

// POST - Create new menu item (Admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, price, category, image_url, available } = body

    if (!name || !price || !category) {
      return NextResponse.json(
        { error: 'Name, price, and category are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        name,
        description: description || '',
        price: parseFloat(price),
        category,
        image_url: image_url || '',
        available: available !== false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update menu item (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    if (updates.price) {
      updates.price = parseFloat(updates.price)
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete menu item (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
