'use client'

import LoginForm from '@/components/admin/LoginForm'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Check if user is admin
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('email')
          .eq('email', session.user.email)
          .single()

        if (adminData) {
          router.push('/admin/dashboard')
          return
        }
      }
      setChecking(false)
    }

    checkAuth()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <LoginForm />
    </div>
  )
}
