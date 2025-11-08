export interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  category: string
  image_url?: string
  available: boolean
  created_at?: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  price: number
  menu_item?: MenuItem
}

export interface Order {
  id: string
  table_id: string
  session_id: string
  total_amount: number
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed'
  payment_id?: string
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export interface Table {
  id: string
  table_number: number
  qr_code_url?: string
  status: 'available' | 'occupied' | 'reserved'
  created_at?: string
}

export interface AIResponse {
  message: string
  items: {
    id: string
    name: string
    quantity: number
    price: number
  }[]
  action: 'confirm' | 'payment' | 'add_item' | 'remove_item' | 'status' | 'clarify'
  total_amount: number
  needs_clarification: boolean
}
