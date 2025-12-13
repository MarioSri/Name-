import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testComplete() {
  console.log('Testing with ALL required fields...\n');
  
  // Get a recipient for submitter
  const { data: recipients } = await supabase.from('recipients').select('*').limit(1);
  const recipient = recipients?.[0];
  console.log('Using submitter:', recipient?.name, recipient?.id);
  
  const trackingId = 'DOC-' + Date.now();
  
  // Documents: tracking_id, type, submitter_id
  console.log('\n--- Testing Documents insert ---');
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      tracking_id: trackingId,
      title: 'Test Document',
      description: 'Test',
      type: 'letter',
      status: 'pending',
      priority: 'normal',
      routing_type: 'sequential',
      submitter_id: recipient.id
    })
    .select()
    .single();
  
  if (docErr) {
    console.log('❌ Error:', docErr.message);
    console.log('Details:', docErr.details);
  } else {
    console.log('✅ Document created!');
    console.log('Doc:', { id: doc.id, tracking_id: doc.tracking_id, title: doc.title });
  }
  
  // Approval cards: approval_id, tracking_card_id, submitter_name
  console.log('\n--- Testing Approval Cards insert ---');
  const approvalId = 'APPR-' + Date.now();
  const { data: card, error: cardErr } = await supabase
    .from('approval_cards')
    .insert({
      approval_id: approvalId,
      tracking_card_id: trackingId,
      title: 'Test Card',
      description: 'Test',
      status: 'pending',
      priority: 'normal',
      routing_type: 'sequential',
      submitter_name: recipient.name
    })
    .select()
    .single();
  
  if (cardErr) {
    console.log('❌ Error:', cardErr.message);
    console.log('Details:', cardErr.details);
  } else {
    console.log('✅ Card created!');
    console.log('Card:', { id: card.id, approval_id: card.approval_id, title: card.title });
  }
  
  // Verify
  console.log('\n📊 Final verification:');
  const { data: docs } = await supabase.from('documents').select('id, tracking_id, title');
  const { data: cards } = await supabase.from('approval_cards').select('id, approval_id, title');
  console.log('Documents:', docs?.length);
  console.log('Cards:', cards?.length);
}

testComplete().catch(console.error);
