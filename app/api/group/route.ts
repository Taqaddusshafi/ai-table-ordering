import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Generate a random 6-character group code
 */
function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar looking characters
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * POST - Create a new group session
 */
export async function POST(request: NextRequest) {
  try {
    const { tableId, hostSessionId, hostName } = await request.json()

    if (!tableId || !hostSessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing tableId or hostSessionId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Auto-clean: End expired groups for this table
    await supabase
      .from('group_sessions')
      .update({ status: 'ended' })
      .eq('table_id', tableId)
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())

    // Auto-clean: End groups with no members (everyone left)
    const { data: emptyGroups } = await supabase
      .from('group_sessions')
      .select(`
        id,
        group_members (id)
      `)
      .eq('table_id', tableId)
      .eq('status', 'active')

    if (emptyGroups) {
      for (const g of emptyGroups) {
        const memberCount = (g as any).group_members?.length || 0
        if (memberCount === 0) {
          await supabase
            .from('group_sessions')
            .update({ status: 'ended' })
            .eq('id', g.id)
        }
      }
    }

    // Now check if there's still an active group for this table
    const { data: existingGroup } = await supabase
      .from('group_sessions')
      .select('*, group_members(id)')
      .eq('table_id', tableId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingGroup && ((existingGroup as any).group_members?.length || 0) > 0) {
      return NextResponse.json(
        { success: false, error: 'Active group already exists for this table', existingCode: existingGroup.group_code },
        { status: 409 }
      )
    }

    // Generate unique group code
    let groupCode = generateGroupCode()
    let attempts = 0
    
    while (attempts < 5) {
      const { data: codeExists } = await supabase
        .from('group_sessions')
        .select('id')
        .eq('group_code', groupCode)
        .eq('status', 'active')
        .single()

      if (!codeExists) break
      groupCode = generateGroupCode()
      attempts++
    }

    // Create group session
    const { data: groupSession, error: groupError } = await supabase
      .from('group_sessions')
      .insert({
        table_id: tableId,
        group_code: groupCode,
        host_session_id: hostSessionId,
        status: 'active',
      })
      .select()
      .single()

    if (groupError) {
      console.error('Error creating group session:', groupError)
      return NextResponse.json(
        { success: false, error: 'Failed to create group session' },
        { status: 500 }
      )
    }

    // Add host as first member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_session_id: groupSession.id,
        session_id: hostSessionId,
        member_name: hostName || 'Host',
      })

    if (memberError) {
      console.error('Error adding host as member:', memberError)
    }

    return NextResponse.json({
      success: true,
      data: {
        groupId: groupSession.id,
        groupCode: groupSession.group_code,
        tableId: groupSession.table_id,
        isHost: true,
      }
    })

  } catch (error: any) {
    console.error('Group creation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create group' },
      { status: 500 }
    )
  }
}

/**
 * GET - Get group details by code or session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupCode = searchParams.get('code')
    const groupId = searchParams.get('groupId')
    const sessionId = searchParams.get('sessionId')

    const supabase = createClient()

    let query = supabase
      .from('group_sessions')
      .select(`
        *,
        group_members (
          id,
          session_id,
          member_name,
          joined_at
        )
      `)
      .eq('status', 'active')

    if (groupCode) {
      query = query.eq('group_code', groupCode.toUpperCase())
    } else if (groupId) {
      query = query.eq('id', groupId)
    } else if (sessionId) {
      // Find group where user is a member
      const { data: membership } = await supabase
        .from('group_members')
        .select('group_session_id')
        .eq('session_id', sessionId)
        .single()

      if (membership) {
        query = query.eq('id', membership.group_session_id)
      } else {
        return NextResponse.json({ success: true, data: null })
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing code, groupId, or sessionId' },
        { status: 400 }
      )
    }

    const { data: group, error } = await query.single()

    if (error || !group) {
      return NextResponse.json({ success: true, data: null })
    }

    // Get orders for this group
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        session_id,
        member_name,
        total_amount,
        status,
        created_at,
        order_items (
          id,
          quantity,
          price,
          menu_item:menu_items (
            id,
            name
          )
        )
      `)
      .eq('group_session_id', group.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      data: {
        ...group,
        orders: orders || [],
        memberCount: group.group_members?.length || 0,
      }
    })

  } catch (error: any) {
    console.error('Get group error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Join group, leave group, or update group
 */
export async function PATCH(request: NextRequest) {
  try {
    const { action, groupCode, groupId, sessionId, memberName } = await request.json()

    const supabase = createClient()

    if (action === 'join') {
      if (!groupCode || !sessionId) {
        return NextResponse.json(
          { success: false, error: 'Missing groupCode or sessionId' },
          { status: 400 }
        )
      }

      // Find the group
      const { data: group, error: groupError } = await supabase
        .from('group_sessions')
        .select('*')
        .eq('group_code', groupCode.toUpperCase())
        .eq('status', 'active')
        .single()

      if (groupError || !group) {
        return NextResponse.json(
          { success: false, error: 'Group not found or expired' },
          { status: 404 }
        )
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_session_id', group.id)
        .eq('session_id', sessionId)
        .single()

      if (existingMember) {
        return NextResponse.json({
          success: true,
          data: {
            groupId: group.id,
            groupCode: group.group_code,
            tableId: group.table_id,
            isHost: group.host_session_id === sessionId,
            alreadyMember: true,
          }
        })
      }

      // Add as member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_session_id: group.id,
          session_id: sessionId,
          member_name: memberName || `Guest ${Math.floor(Math.random() * 100)}`,
        })

      if (memberError) {
        console.error('Error joining group:', memberError)
        return NextResponse.json(
          { success: false, error: 'Failed to join group' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          groupId: group.id,
          groupCode: group.group_code,
          tableId: group.table_id,
          isHost: false,
        }
      })
    }

    if (action === 'leave') {
      if (!groupId || !sessionId) {
        return NextResponse.json(
          { success: false, error: 'Missing groupId or sessionId' },
          { status: 400 }
        )
      }

      // Check if user is host
      const { data: group } = await supabase
        .from('group_sessions')
        .select('host_session_id')
        .eq('id', groupId)
        .single()

      if (group?.host_session_id === sessionId) {
        // Host is leaving - end the group
        await supabase
          .from('group_sessions')
          .update({ status: 'ended' })
          .eq('id', groupId)

        return NextResponse.json({
          success: true,
          data: { groupEnded: true }
        })
      }

      // Remove member
      await supabase
        .from('group_members')
        .delete()
        .eq('group_session_id', groupId)
        .eq('session_id', sessionId)

      return NextResponse.json({ success: true, data: { left: true } })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Group patch error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE - End a group session (host only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const sessionId = searchParams.get('sessionId')

    if (!groupId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing groupId or sessionId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Verify host
    const { data: group } = await supabase
      .from('group_sessions')
      .select('host_session_id')
      .eq('id', groupId)
      .single()

    if (group?.host_session_id !== sessionId) {
      return NextResponse.json(
        { success: false, error: 'Only the host can end the group' },
        { status: 403 }
      )
    }

    // End the group
    await supabase
      .from('group_sessions')
      .update({ status: 'ended' })
      .eq('id', groupId)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Group delete error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
