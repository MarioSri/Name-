// Edge Function: Workflow Routing API
// Handles: Sequential, Parallel, Reverse, Bi-Directional workflows

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

    // GET /workflows - List workflow routes
    if (method === 'GET' && path === 'workflows') {
      const { data: workflows, error } = await supabase
        .from('workflow_routes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: workflows }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /workflows - Create workflow route
    if (method === 'POST' && path === 'workflows') {
      const body = await req.json()

      const { data: workflow, error } = await supabase
        .from('workflow_routes')
        .insert({
          name: body.name,
          description: body.description,
          type: body.type,
          document_type: body.document_type,
          department: body.department,
          branch: body.branch,
          steps: body.steps,
          escalation_paths: body.escalation_paths || [],
          requires_counter_approval: body.requires_counter_approval || false,
          auto_escalation: body.auto_escalation || { enabled: false, timeoutHours: 24 },
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: workflow }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /workflows/:id/initiate - Initiate workflow instance
    if (method === 'POST' && path?.includes('/initiate')) {
      const workflowRouteId = path.split('/')[0]
      const body = await req.json()

      const { data: workflowRoute, error: routeError } = await supabase
        .from('workflow_routes')
        .select('*')
        .eq('id', workflowRouteId)
        .single()

      if (routeError) throw routeError

      const { data: instance, error: instanceError } = await supabase
        .from('workflow_instances')
        .insert({
          document_id: body.document_id,
          workflow_route_id: workflowRouteId,
          current_step_id: workflowRoute.steps[0]?.id,
          current_step_index: 0,
          status: 'active',
          history: [],
          initiated_by: user.id
        })
        .select()
        .single()

      if (instanceError) throw instanceError

      return new Response(
        JSON.stringify({ success: true, data: instance }),
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

