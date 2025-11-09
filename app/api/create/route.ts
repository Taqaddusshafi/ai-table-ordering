import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Use SERVICE ROLE key for admin operations (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Add this to your .env
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(req: NextRequest) {
  try {
    // IMPORTANT: Add your own secret key check here for security
    const { secret, email, password } = await req.json()

    // Replace 'your-super-secret-key' with your actual secret
    if (secret !== process.env.ADMIN_CREATE_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw authError

    // Add to admin_users table
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({ email })

    if (adminError) throw adminError

    return NextResponse.json({
      success: true,
      message: `Admin account created for ${email}`,
    })
  } catch (error: any) {
    console.error('Admin creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
