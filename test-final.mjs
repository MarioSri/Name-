import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFinalInsert() {
  console.log('Testing with ALL required fields...\n');
  
  const trackingId = 'DOC-' + Date.now();
  
  // Documents needs: tracking_id, type
  console.log('--- Testing Documents insert ---');
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      tracking_id: trackingId,
      title: 'Test Document',
      description: 'Test',
      type: 'letter',
      status: 'pending',
      priority: 'normal',
      routing_type: 'sequential'
    })
    .select()
    .single();
  
  if (docErr) {
    console.log('❌ Error:', docErr.message);
  } else {
    console.log('✅ Document created!');
    console.log('Doc ID:', doc.id);
    console.log('All columns:', Object.keys(doc).join(', '));
  }
  
  // Approval cards needs: approval_id, tracking_card_id
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
      routing_type: 'sequential'
    })
    .select()
    .single();
  
  if (cardErr) {
    console.log('❌ Error:', cardErr.message);
  } else {
    console.log('✅ Card created!');
    console.log('Card ID:', card.id);
    console.log('All columns:', Object.keys(card).join(', '));
  }
  
  // Verify data
  console.log('\n📊 Final verification:');
  const { data: docs } = await supabase.from('documents').select('id, tracking_id, title, status');
  const { data: cards } = await supabase.from('approval_cards').select('id, approval_id, title, status');
  console.log('Documents:', docs);
  console.log('Cards:', cards);
}

testFinalInsert().catch(console.error);
