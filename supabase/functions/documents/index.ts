// Edge Function: Document Management API
// Handles: Document CRUD, file uploads, recipient management

import { createSupabaseClient } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient(req)
    const { method } = req
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // Get authenticated user
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

    // GET /documents - List documents
    if (method === 'GET' && path === 'documents') {
      const { data: documents, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_recipients(*),
          document_files(*),
          approval_cards(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: documents }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /documents/:id - Get single document
    if (method === 'GET' && path?.startsWith('documents/')) {
      const documentId = path.split('/')[1]
      
      const { data: document, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_recipients(*),
          document_files(*),
          approval_cards(*),
          comments(*),
          digital_signatures(*)
        `)
        .eq('id', documentId)
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: document }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /documents - Create document
    if (method === 'POST' && path === 'documents') {
      const body = await req.json()
      
      const { data: document, error } = await supabase
        .from('documents')
        .insert({
          tracking_id: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: body.title,
          description: body.description,
          type: body.type,
          priority: body.priority,
          submitter_id: user.id,
          submitter_name: body.submitter_name || user.email,
          submitter_role: body.submitter_role,
          routing_type: body.routing_type || 'sequential',
          is_emergency: body.is_emergency || false,
          is_parallel: body.routing_type === 'parallel',
          source: body.source || 'document-management',
          workflow: body.workflow || {},
          metadata: body.metadata || {}
        })
        .select()
        .single()

      if (error) throw error

      // Add recipients
      if (body.recipients && body.recipients.length > 0) {
        const recipientRecords = body.recipients.map((recipientId: string, index: number) => ({
          document_id: document.id,
          recipient_id: recipientId,
          recipient_name: body.recipient_names?.[index] || recipientId,
          recipient_role: body.recipient_roles?.[index] || 'employee',
          recipient_order: index + 1,
          status: index === 0 && body.routing_type === 'sequential' ? 'current' : 'pending'
        }))

        await supabase
          .from('document_recipients')
          .insert(recipientRecords)
      }

      return new Response(
        JSON.stringify({ success: true, data: document }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /documents/:id - Update document
    if (method === 'PUT' && path?.startsWith('documents/')) {
      const documentId = path.split('/')[1]
      const body = await req.json()

      const { data: document, error } = await supabase
        .from('documents')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: document }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE /documents/:id - Delete document
    if (method === 'DELETE' && path?.startsWith('documents/')) {
      const documentId = path.split('/')[1]

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Document deleted' }),
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

