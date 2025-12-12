// Edge Function: Comments & Sharing API
// Handles: Approver comments, sharing, thread management

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

    // GET /comments/:document_id - Get comments for document
    if (method === 'GET' && path?.startsWith('comments/')) {
      const documentId = path.split('/')[1]

      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('document_id', documentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: comments }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /comments - Create comment
    if (method === 'POST' && path === 'comments') {
      const body = await req.json()

      const { data: recipient } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          document_id: body.document_id,
          approval_card_id: body.approval_card_id,
          author_id: recipient?.id || user.id,
          author_name: recipient?.name || user.email,
          author_role: recipient?.role || 'employee',
          content: body.content,
          is_shared: body.is_shared || false,
          shared_with: body.shared_with || [],
          parent_comment_id: body.parent_comment_id,
          attachments: body.attachments || []
        })
        .select()
        .single()

      if (error) throw error

      // Create comment shares if shared_with specified
      if (body.shared_with && body.shared_with.length > 0) {
        const shares = body.shared_with.map((sharedId: string) => ({
          comment_id: comment.id,
          shared_with_id: sharedId,
          shared_by: user.id
        }))

        await supabase
          .from('comment_shares')
          .insert(shares)
      }

      return new Response(
        JSON.stringify({ success: true, data: comment }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT /comments/:id/share - Share comment
    if (method === 'PUT' && path?.includes('/share')) {
      const commentId = path.split('/')[0]
      const body = await req.json()

      // Update comment sharing
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .update({
          is_shared: true,
          shared_with: body.shared_with || ['all']
        })
        .eq('id', commentId)
        .select()
        .single()

      if (commentError) throw commentError

      // Create share records
      if (body.shared_with && body.shared_with.length > 0) {
        const shares = body.shared_with
          .filter((id: string) => id !== 'all')
          .map((sharedId: string) => ({
            comment_id: commentId,
            shared_with_id: sharedId,
            shared_by: user.id
          }))

        if (shares.length > 0) {
          await supabase
            .from('comment_shares')
            .insert(shares)
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: comment }),
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

