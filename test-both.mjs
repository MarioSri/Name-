import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWithBoth() {
  console.log('Testing with BOTH submitter_id AND submitter_name...\n');
  
  const { data: recipients } = await supabase.from('recipients').select('*').limit(1);
  const recipient = recipients?.[0];
  console.log('Using submitter:', recipient?.name, recipient?.id);
  
  const trackingId = 'DOC-' + Date.now();
  
  // Documents: tracking_id, type, submitter_id, submitter_name
  console.log('\n--- Testing Documents insert ---');
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      tracking_id: trackingId,
      title: 'Test Document',
      description: 'Test description',
      type: 'letter',
      status: 'pending',
      priority: 'normal',
      routing_type: 'sequential',
      submitter_id: recipient.id,
      submitter_name: recipient.name
    })
    .select()
    .single();
  
  if (docErr) {
    console.log('❌ Error:', docErr.message);
    console.log('Details:', docErr.details);
  } else {
    console.log('✅ DOCUMENT CREATED!');
    console.log('All columns in documents table:', Object.keys(doc).join(', '));
  }
  
  // Approval cards: approval_id, tracking_card_id, submitter_id, submitter_name
  console.log('\n--- Testing Approval Cards insert ---');
  const approvalId = 'APPR-' + Date.now();
  const { data: card, error: cardErr } = await supabase
    .from('approval_cards')
    .insert({
      approval_id: approvalId,
      tracking_card_id: trackingId,
      title: 'Test Card',
      description: 'Test description',
      status: 'pending',
      priority: 'normal',
      routing_type: 'sequential',
      submitter_id: recipient.id,
      submitter_name: recipient.name
    })
    .select()
    .single();
  
  if (cardErr) {
    console.log('❌ Error:', cardErr.message);
    console.log('Details:', cardErr.details);
  } else {
    console.log('✅ APPROVAL CARD CREATED!');
    console.log('All columns in approval_cards table:', Object.keys(card).join(', '));
  }
  
  // Final verification
  console.log('\n📊 Final verification:');
  const { data: docs } = await supabase.from('documents').select('*');
  const { data: cards } = await supabase.from('approval_cards').select('*');
  console.log('Documents count:', docs?.length);
  console.log('Cards count:', cards?.length);
  if (docs?.length) console.log('Sample doc:', docs[0]);
  if (cards?.length) console.log('Sample card:', cards[0]);
}

testWithBoth().catch(console.error);
