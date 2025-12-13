import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAll() {
  console.log('Testing with ALL required fields including submitter_role...\n');
  
  const { data: recipients } = await supabase.from('recipients').select('*').limit(1);
  const recipient = recipients?.[0];
  console.log('Recipient:', recipient);
  
  const trackingId = 'DOC-' + Date.now();
  
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
      submitter_id: recipient.id,
      submitter_name: recipient.name,
      submitter_role: recipient.role || recipient.role_type || 'user'
    })
    .select()
    .single();
  
  if (docErr) {
    console.log('❌ Error:', docErr.message);
  } else {
    console.log('✅ DOCUMENT CREATED!');
    console.log('Doc:', doc);
  }
  
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
      submitter_id: recipient.id,
      submitter_name: recipient.name,
      submitter_role: recipient.role || recipient.role_type || 'user'
    })
    .select()
    .single();
  
  if (cardErr) {
    console.log('❌ Error:', cardErr.message);
  } else {
    console.log('✅ CARD CREATED!');
    console.log('Card:', card);
  }
  
  // Verify
  const { data: docs } = await supabase.from('documents').select('*');
  const { data: cards } = await supabase.from('approval_cards').select('*');
  console.log('\n📊 FINAL COUNT: Documents:', docs?.length, 'Cards:', cards?.length);
}

testAll().catch(console.error);
