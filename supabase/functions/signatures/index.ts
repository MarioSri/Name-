// Edge Function: Digital Signatures API
// Handles: Documenso, Rekore Sign, blockchain signatures

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

    // POST /signatures - Create signature
    if (method === 'POST' && path === 'signatures') {
      const body = await req.json()

      // Get recipient record
      const { data: recipient } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const { data: signature, error } = await supabase
        .from('digital_signatures')
        .insert({
          document_id: body.document_id,
          approval_id: body.approval_id,
          signer_id: recipient?.id || user.id,
          signer_name: recipient?.name || user.email,
          signer_role: recipient?.role || 'employee',
          signature_data: body.signature_data,
          signature_method: body.signature_method || 'manual',
          documenso_signature_id: body.documenso_signature_id,
          rekore_signature_id: body.rekore_signature_id,
          blockchain_hash: body.blockchain_hash,
          blockchain_tx_hash: body.blockchain_tx_hash,
          certificate_url: body.certificate_url,
          audit_trail_url: body.audit_trail_url,
          ip_address: req.headers.get('x-forwarded-for') || '0.0.0.0',
          location: body.location,
          verified: body.verified || false
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: signature }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /signatures/:document_id - Get signatures for document
    if (method === 'GET' && path?.startsWith('signatures/')) {
      const documentId = path.split('/')[1]

      const { data: signatures, error } = await supabase
        .from('digital_signatures')
        .select('*')
        .eq('document_id', documentId)
        .order('signed_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, data: signatures }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /signatures/documenso - Documenso integration
    if (method === 'POST' && path === 'signatures/documenso') {
      const body = await req.json()

      // Call Documenso API (mock for now)
      const documensoResponse = {
        signatureId: `documenso_${Date.now()}`,
        certificateUrl: `https://documenso.example.com/certificates/${body.document_id}`,
        auditTrailUrl: `https://documenso.example.com/audit/${body.document_id}`,
        timestamp: new Date().toISOString()
      }

      return new Response(
        JSON.stringify({ success: true, data: documensoResponse }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /signatures/rekore - Rekore Sign integration
    if (method === 'POST' && path === 'signatures/rekore') {
      const body = await req.json()

      // Call Rekore Sign API (mock for now)
      const rekoreResponse = {
        signatureId: `rekore_${Date.now()}`,
        timestamp: new Date().toISOString(),
        verified: true
      }

      return new Response(
        JSON.stringify({ success: true, data: rekoreResponse }),
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

