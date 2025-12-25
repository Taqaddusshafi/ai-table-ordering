'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface GroupMember {
  id: string
  session_id: string
  member_name: string
  joined_at: string
}

export interface GroupOrder {
  id: string
  session_id: string
  member_name?: string
  total_amount: number
  status: string
  created_at: string
  order_items: {
    id: string
    quantity: number
    price: number
    menu_item: {
      id: string
      name: string
    }
  }[]
}

export interface GroupSession {
  id: string
  table_id: string
  group_code: string
  host_session_id: string
  status: string
  created_at: string
  expires_at: string
  group_members: GroupMember[]
  orders: GroupOrder[]
  memberCount: number
}

interface UseGroupSessionProps {
  tableId: string
  sessionId: string
}

interface UseGroupSessionReturn {
  // State
  group: GroupSession | null
  isLoading: boolean
  error: string | null
  isHost: boolean
  memberName: string
  
  // Actions
  createGroup: (hostName: string) => Promise<boolean>
  joinGroup: (code: string, memberName: string) => Promise<boolean>
  leaveGroup: () => Promise<boolean>
  endGroup: () => Promise<boolean>
  refreshGroup: () => Promise<void>
  setMemberName: (name: string) => void
  
  // Computed
  groupCode: string | null
  members: GroupMember[]
  groupOrders: GroupOrder[]
  groupTotal: number
  myOrders: GroupOrder[]
  myTotal: number
}

export function useGroupSession({ tableId, sessionId }: UseGroupSessionProps): UseGroupSessionReturn {
  const [group, setGroup] = useState<GroupSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [memberName, setMemberName] = useState<string>('')
  const subscriptionRef = useRef<any>(null)

  // Check if user is host
  const isHost = group?.host_session_id === sessionId

  // Fetch group data
  const fetchGroup = useCallback(async () => {
    try {
      const response = await fetch(`/api/group?sessionId=${sessionId}`)
      const result = await response.json()

      if (result.success && result.data) {
        setGroup(result.data)
        
        // Find current member's name
        const currentMember = result.data.group_members?.find(
          (m: GroupMember) => m.session_id === sessionId
        )
        if (currentMember) {
          setMemberName(currentMember.member_name)
        }
        
        setError(null)
      } else {
        setGroup(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // Initial fetch and subscription
  useEffect(() => {
    fetchGroup()

    // Set up real-time subscription for group changes
    const supabase = createClient()
    
    const setupSubscription = async () => {
      // First check if user is in a group
      const response = await fetch(`/api/group?sessionId=${sessionId}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const groupId = result.data.id

        // Subscribe to group_members changes
        const membersChannel = supabase
          .channel(`group_members_${groupId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'group_members',
              filter: `group_session_id=eq.${groupId}`,
            },
            () => {
              fetchGroup()
            }
          )
          .subscribe()

        // Subscribe to orders for this group
        const ordersChannel = supabase
          .channel(`group_orders_${groupId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `group_session_id=eq.${groupId}`,
            },
            () => {
              fetchGroup()
            }
          )
          .subscribe()

        // Subscribe to group session changes
        const sessionChannel = supabase
          .channel(`group_session_${groupId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'group_sessions',
              filter: `id=eq.${groupId}`,
            },
            (payload) => {
              if (payload.new && (payload.new as any).status === 'ended') {
                setGroup(null)
              } else {
                fetchGroup()
              }
            }
          )
          .subscribe()

        subscriptionRef.current = { membersChannel, ordersChannel, sessionChannel }
      }
    }

    setupSubscription()

    return () => {
      if (subscriptionRef.current) {
        const supabase = createClient()
        if (subscriptionRef.current.membersChannel) {
          supabase.removeChannel(subscriptionRef.current.membersChannel)
        }
        if (subscriptionRef.current.ordersChannel) {
          supabase.removeChannel(subscriptionRef.current.ordersChannel)
        }
        if (subscriptionRef.current.sessionChannel) {
          supabase.removeChannel(subscriptionRef.current.sessionChannel)
        }
      }
    }
  }, [sessionId, fetchGroup])

  // Create a new group
  const createGroup = async (hostName: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          hostSessionId: sessionId,
          hostName,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMemberName(hostName)
        await fetchGroup()
        return true
      } else {
        setError(result.error)
        return false
      }
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Join an existing group
  const joinGroup = async (code: string, name: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/group', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          groupCode: code,
          sessionId,
          memberName: name,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMemberName(name)
        await fetchGroup()
        return true
      } else {
        setError(result.error)
        return false
      }
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Leave the group
  const leaveGroup = async (): Promise<boolean> => {
    if (!group) return false

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/group', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          groupId: group.id,
          sessionId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setGroup(null)
        setMemberName('')
        return true
      } else {
        setError(result.error)
        return false
      }
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // End the group (host only)
  const endGroup = async (): Promise<boolean> => {
    if (!group || !isHost) return false

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/group?groupId=${group.id}&sessionId=${sessionId}`,
        { method: 'DELETE' }
      )

      const result = await response.json()

      if (result.success) {
        setGroup(null)
        return true
      } else {
        setError(result.error)
        return false
      }
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Computed values
  const groupCode = group?.group_code || null
  const members = group?.group_members || []
  const groupOrders = group?.orders || []
  const groupTotal = groupOrders.reduce((sum, order) => sum + order.total_amount, 0)
  const myOrders = groupOrders.filter(order => order.session_id === sessionId)
  const myTotal = myOrders.reduce((sum, order) => sum + order.total_amount, 0)

  return {
    group,
    isLoading,
    error,
    isHost,
    memberName,
    createGroup,
    joinGroup,
    leaveGroup,
    endGroup,
    refreshGroup: fetchGroup,
    setMemberName,
    groupCode,
    members,
    groupOrders,
    groupTotal,
    myOrders,
    myTotal,
  }
}
