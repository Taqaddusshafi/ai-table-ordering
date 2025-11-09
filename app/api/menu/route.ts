import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('category')

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch menu' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: menuItems })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
