import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Testing document insert with tracking_id...\n');
  
  // Get a recipient
  const { data: recipients } = await supabase.from('recipients').select('*').limit(1);
  const recipient = recipients?.[0];
  console.log('Recipient:', recipient?.id, recipient?.name);
  
  // Try with tracking_id
  const trackingId = 'DOC-' + Date.now();
  console.log('\n--- Testing Documents insert ---');
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      tracking_id: trackingId,
      title: 'Test Document',
      description: 'Test',
      status: 'pending',
      priority: 'normal'
    })
    .select()
    .single();
  
  if (docErr) {
    console.log('Error:', docErr.message);
    console.log('Details:', docErr.details);
    console.log('Hint:', docErr.hint);
  } else {
    console.log('✅ Document created!');
    console.log('Columns returned:', Object.keys(doc));
    console.log('Doc:', doc);
  }
  
  // Try approval card with approval_id
  console.log('\n--- Testing Approval Cards insert ---');
  const approvalId = 'APPR-' + Date.now();
  const { data: card, error: cardErr } = await supabase
    .from('approval_cards')
    .insert({
      approval_id: approvalId,
      title: 'Test Card',
      description: 'Test',
      status: 'pending',
      priority: 'normal'
    })
    .select()
    .single();
  
  if (cardErr) {
    console.log('Error:', cardErr.message);
    console.log('Details:', cardErr.details);
  } else {
    console.log('✅ Card created!');
    console.log('Columns returned:', Object.keys(card));
    console.log('Card:', card);
  }
}

testInsert().catch(console.error);
