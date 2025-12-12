// Edge Function: Calendar Meetings & LiveMeet+ API
// Handles: Meeting scheduling, LiveMeet+ requests, calendar integration

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

    // GET /meetings - List meetings
    if (method === 'GET' && path === 'meetings') {
      const { data: meetings, error } = await supabase
        .from('calendar_meetings')
        .select(`
          *,
          meeting_attendees(*)
        `)
        .or(`created_by.eq.${user.id},meeting_attendees.user_id.eq.${user.id}`)
        .order('date', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: meetings }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /meetings - Create meeting
    if (method === 'POST' && path === 'meetings') {
      const body = await req.json()

      const { data: meeting, error } = await supabase
        .from('calendar_meetings')
        .insert({
          title: body.title,
          description: body.description,
          date: body.date,
          time: body.time,
          duration: body.duration,
          location: body.location,
          type: body.type,
          priority: body.priority || 'medium',
          category: body.category,
          created_by: user.id,
          department: body.department,
          tags: body.tags || [],
          documents: body.documents || [],
          meeting_links: body.meeting_links || {},
          recurring_pattern: body.recurring_pattern,
          notification_settings: body.notification_settings || {},
          is_recurring: body.is_recurring || false
        })
        .select()
        .single()

      if (error) throw error

      // Add attendees
      if (body.attendees && body.attendees.length > 0) {
        const attendees = body.attendees.map((attendee: any) => ({
          meeting_id: meeting.id,
          user_id: attendee.user_id || attendee.id,
          name: attendee.name,
          email: attendee.email,
          role: attendee.role,
          department: attendee.department,
          is_required: attendee.is_required || false,
          can_edit: attendee.can_edit || false
        }))

        await supabase
          .from('meeting_attendees')
          .insert(attendees)
      }

      return new Response(
        JSON.stringify({ success: true, data: meeting }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /live-meet - Create LiveMeet+ request
    if (method === 'POST' && path === 'live-meet') {
      const body = await req.json()

      const { data: request, error } = await supabase
        .from('live_meeting_requests')
        .insert({
          title: body.title,
          reason: body.reason,
          urgency: body.urgency || 'normal',
          requester_id: user.id,
          requester_name: body.requester_name || user.email,
          target_id: body.target_id,
          target_name: body.target_name,
          document_id: body.document_id,
          approval_card_id: body.approval_card_id,
          meeting_format: body.meeting_format || 'online',
          expires_at: body.expires_at
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: request }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /live-meet/:id/accept - Accept LiveMeet+ request
    if (method === 'PUT' && path?.includes('/accept')) {
      const requestId = path.split('/')[0]

      const { data: request, error } = await supabase
        .from('live_meeting_requests')
        .update({
          status: 'accepted',
          scheduled_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('target_id', user.id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: request }),
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

