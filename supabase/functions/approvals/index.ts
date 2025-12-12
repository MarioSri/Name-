// Edge Function: Approval Chain API
// Handles: Approval actions, workflow progression, bypass logic

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

    // GET /approvals - Get approval cards for user
    if (method === 'GET' && path === 'approvals') {
      const { data: approvalCards, error } = await supabase
        .from('approval_cards')
        .select(`
          *,
          documents(*),
          approval_card_recipients(*),
          approvals(*)
        `)
        .or(`current_recipient_id.eq.${user.id},recipient_ids.cs.{${user.id}}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: approvalCards }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /approvals/:id/approve - Approve document
    if (method === 'POST' && path?.includes('/approve')) {
      const approvalCardId = path.split('/')[0]
      const body = await req.json()

      // Get approval card
      const { data: approvalCard, error: cardError } = await supabase
        .from('approval_cards')
        .select('*, documents(*)')
        .eq('id', approvalCardId)
        .single()

      if (cardError) throw cardError

      // Check if user is current recipient
      if (approvalCard.current_recipient_id !== user.id && 
          !approvalCard.recipient_ids.includes(user.id)) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to approve this document' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get recipient record
      const { data: recipient } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Create approval record
      const { data: approval, error: approvalError } = await supabase
        .from('approvals')
        .insert({
          approval_card_id: approvalCardId,
          document_id: approvalCard.document_id,
          approver_id: recipient?.id || user.id,
          approver_user_id: user.id,
          approver_name: recipient?.name || user.email,
          approver_role: recipient?.role || 'employee',
          action: 'approved',
          status: 'approved',
          comments: body.comments,
          signature_data: body.signature_data,
          signed_at: body.signature_data ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (approvalError) throw approvalError

      return new Response(
        JSON.stringify({ success: true, data: approval }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /approvals/:id/reject - Reject document
    if (method === 'POST' && path?.includes('/reject')) {
      const approvalCardId = path.split('/')[0]
      const body = await req.json()

      const { data: approvalCard, error: cardError } = await supabase
        .from('approval_cards')
        .select('*, documents(*)')
        .eq('id', approvalCardId)
        .single()

      if (cardError) throw cardError

      const { data: recipient } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const { data: approval, error: approvalError } = await supabase
        .from('approvals')
        .insert({
          approval_card_id: approvalCardId,
          document_id: approvalCard.document_id,
          approver_id: recipient?.id || user.id,
          approver_user_id: user.id,
          approver_name: recipient?.name || user.email,
          approver_role: recipient?.role || 'employee',
          action: 'rejected',
          status: 'rejected',
          comments: body.comments
        })
        .select()
        .single()

      if (approvalError) throw approvalError

      return new Response(
        JSON.stringify({ success: true, data: approval }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /approvals/:id/bypass - Bypass recipient
    if (method === 'POST' && path?.includes('/bypass')) {
      const approvalCardId = path.split('/')[0]
      const body = await req.json()

      // Check if user has bypass permission (principal, registrar, director)
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!['principal', 'registrar', 'director'].includes(userData?.role)) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to bypass approvals' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: approvalCard, error: cardError } = await supabase
        .from('approval_cards')
        .select('*')
        .eq('id', approvalCardId)
        .single()

      if (cardError) throw cardError

      // Add to bypassed recipients
      const bypassedRecipients = [...(approvalCard.bypassed_recipients || []), body.recipient_id]

      const { data: updatedCard, error: updateError } = await supabase
        .from('approval_cards')
        .update({
          bypassed_recipients: bypassedRecipients
        })
        .eq('id', approvalCardId)
        .select()
        .single()

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ success: true, data: updatedCard }),
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

