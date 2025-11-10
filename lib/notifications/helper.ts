import { createClient } from '@/lib/supabase/client'

export async function createNotification({
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
}) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_type: userType,
      table_id: tableId,
      session_id: sessionId,
      order_id: orderId,
      title,
      message,
      type,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create notification:', error)
    return null
  }

  return data
}

export async function markAsRead(notificationId: string) {
  const supabase = createClient()
  
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
}
