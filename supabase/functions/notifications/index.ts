// Edge Function: Notifications API
// Handles: Notification management, preferences, delivery

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

    // GET /notifications - Get user notifications
    if (method === 'GET' && path === 'notifications') {
      const read = url.searchParams.get('read')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (read !== null) {
        query = query.eq('read', read === 'true')
      }

      const { data: notifications, error } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: notifications }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /notifications/:id/read - Mark as read
    if (method === 'PUT' && path?.includes('/read')) {
      const notificationId = path.split('/')[0]

      const { data: notification, error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: notification }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /notifications/read-all - Mark all as read
    if (method === 'PUT' && path === 'read-all') {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'All notifications marked as read' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /notifications/preferences - Get preferences
    if (method === 'GET' && path === 'preferences') {
      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      // Return defaults if not found
      if (!preferences) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              email: { enabled: true, approvals: true, updates: true, reminders: true },
              push: { enabled: true, approvals: true, updates: true, reminders: true },
              sms: { enabled: false, approvals: false, updates: false, reminders: false },
              whatsapp: { enabled: false, approvals: false, updates: false, reminders: false }
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: preferences }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /notifications/preferences - Update preferences
    if (method === 'PUT' && path === 'preferences') {
      const body = await req.json()

      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          email: body.email,
          push: body.push,
          sms: body.sms,
          whatsapp: body.whatsapp,
          channels: body.channels || {}
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: preferences }),
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

