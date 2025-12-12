// Edge Function: Dashboard Widgets API
// Handles: Dashboard configuration, widget management

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

    // GET /dashboard/config - Get dashboard config
    if (method === 'GET' && path === 'config') {
      const { data: config, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      // Return defaults if not found
      if (!config) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              role: userData?.role || 'employee',
              widgets: [],
              layout: { columns: 3, rows: 4, gap: 16 },
              theme: {},
              permissions: {}
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: config }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /dashboard/config - Update dashboard config
    if (method === 'PUT' && path === 'config') {
      const body = await req.json()

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const { data: config, error } = await supabase
        .from('dashboard_configs')
        .upsert({
          user_id: user.id,
          role: userData?.role || 'employee',
          widgets: body.widgets || [],
          layout: body.layout || {},
          theme: body.theme || {},
          permissions: body.permissions || {}
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: config }),
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

