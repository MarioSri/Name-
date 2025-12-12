// Edge Function: Messages & Channels API
// Handles: Channel management, messaging, real-time updates

import { createSupabaseClient } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient(req)
    const { method } = req
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /channels - List user's channels
    if (method === 'GET' && path === 'channels') {
      const { data: channels, error } = await supabase
        .from('channels')
        .select(`
          *,
          channel_members!inner(user_id)
        `)
        .eq('channel_members.user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: channels }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /channels - Create channel
    if (method === 'POST' && path === 'channels') {
      const body = await req.json()

      const channelId = `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          channel_id: channelId,
          name: body.name,
          description: body.description,
          type: body.type || 'group',
          department: body.department,
          document_id: body.document_id,
          created_by: user.id,
          is_private: body.is_private || false,
          settings: body.settings || {}
        })
        .select()
        .single()

      if (error) throw error

      // Add creator as admin
      await supabase
        .from('channel_members')
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          role: 'admin'
        })

      // Add members if provided
      if (body.members && body.members.length > 0) {
        const members = body.members.map((memberId: string) => ({
          channel_id: channel.id,
          user_id: memberId,
          role: 'member'
        }))

        await supabase
          .from('channel_members')
          .insert(members)
      }

      return new Response(
        JSON.stringify({ success: true, data: channel }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /channels/:id/messages - Get messages
    if (method === 'GET' && path?.includes('/messages')) {
      const channelId = path.split('/')[0]
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      // Verify user is member
      const { data: member } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .single()

      if (!member) {
        return new Response(
          JSON.stringify({ error: 'Not a member of this channel' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: messages }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /channels/:id/messages - Send message
    if (method === 'POST' && path?.includes('/messages')) {
      const channelId = path.split('/')[0]
      const body = await req.json()

      // Verify user is member
      const { data: member } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .single()

      if (!member) {
        return new Response(
          JSON.stringify({ error: 'Not a member of this channel' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          message_id: messageId,
          channel_id: channelId,
          sender_id: user.id,
          sender_name: body.sender_name || user.email,
          type: body.type || 'text',
          content: body.content,
          thread_id: body.thread_id,
          parent_message_id: body.parent_message_id,
          metadata: body.metadata || {},
          attachments: body.attachments || [],
          mentions: body.mentions || []
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

