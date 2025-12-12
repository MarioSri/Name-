// Edge Function: Analytics Dashboard API
// Handles: Analytics data, dashboard metrics, reporting

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

    // GET /analytics/dashboard - Get dashboard metrics
    if (method === 'GET' && path === 'dashboard') {
      const periodStart = url.searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const periodEnd = url.searchParams.get('end') || new Date().toISOString().split('T')[0]

      // Get user role for filtering
      const { data: userData } = await supabase
        .from('users')
        .select('role, department')
        .eq('id', user.id)
        .single()

      // Document stats
      let documentQuery = supabase
        .from('documents')
        .select('status, type, priority, created_at')

      if (userData?.role !== 'principal' && userData?.role !== 'registrar') {
        documentQuery = documentQuery.or(`submitter_id.eq.${user.id},document_recipients.recipient_id.eq.${user.id}`)
      }

      const { data: documents } = await documentQuery
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd)

      // Calculate metrics
      const metrics = {
        totalDocuments: documents?.length || 0,
        approved: documents?.filter((d: any) => d.status === 'approved').length || 0,
        rejected: documents?.filter((d: any) => d.status === 'rejected').length || 0,
        pending: documents?.filter((d: any) => d.status === 'pending' || d.status === 'submitted').length || 0,
        byType: {},
        byPriority: {},
        byDepartment: {}
      }

      documents?.forEach((doc: any) => {
        metrics.byType[doc.type] = (metrics.byType[doc.type] || 0) + 1
        metrics.byPriority[doc.priority] = (metrics.byPriority[doc.priority] || 0) + 1
      })

      // Meeting stats
      const { data: meetings } = await supabase
        .from('calendar_meetings')
        .select('status, date')
        .gte('date', periodStart)
        .lte('date', periodEnd)

      const meetingStats = {
        total: meetings?.length || 0,
        completed: meetings?.filter((m: any) => m.status === 'completed').length || 0,
        scheduled: meetings?.filter((m: any) => m.status === 'scheduled').length || 0
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            documentStats: metrics,
            meetingStats,
            period: { start: periodStart, end: periodEnd }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /analytics/events - Log analytics event
    if (method === 'POST' && path === 'events') {
      const body = await req.json()

      const { data: event, error } = await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          event_type: body.event_type,
          event_category: body.event_category,
          document_id: body.document_id,
          metadata: body.metadata || {}
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: event }),
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

