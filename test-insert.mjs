import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing document creation...');
  
  // Get a recipient to use as created_by
  const { data: recipients } = await supabase.from('recipients').select('*').limit(1);
  const testRecipient = recipients?.[0];
  
  if (!testRecipient) {
    console.log('No recipients found!');
    return;
  }
  
  console.log('Using recipient:', testRecipient.name, testRecipient.id);
  
  // Try to create a test document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      title: 'Test Document ' + Date.now(),
      description: 'Test document created via script',
      document_type: 'letter',
      priority: 'normal',
      status: 'pending',
      created_by: testRecipient.id,
      routing_type: 'sequential',
      metadata: { test: true }
    })
    .select()
    .single();
  
  if (docError) {
    console.log('❌ Error creating document:', docError);
  } else {
    console.log('✅ Document created:', doc);
  }
  
  // Try to create a test approval card
  const { data: card, error: cardError } = await supabase
    .from('approval_cards')
    .insert({
      card_id: 'TEST-' + Date.now(),
      title: 'Test Approval Card ' + Date.now(),
      description: 'Test card created via script',
      priority: 'normal',
      status: 'pending',
      submitted_by: testRecipient.id,
      current_approver_id: testRecipient.id,
      routing_type: 'sequential',
      metadata: { test: true }
    })
    .select()
    .single();
  
  if (cardError) {
    console.log('❌ Error creating approval card:', cardError);
  } else {
    console.log('✅ Approval card created:', card);
  }
  
  // Now check what's in the tables
  const { data: docs } = await supabase.from('documents').select('*');
  const { data: cards } = await supabase.from('approval_cards').select('*');
  
  console.log('\n📊 Final counts:');
  console.log('Documents:', docs?.length || 0);
  console.log('Approval Cards:', cards?.length || 0);
}

test().catch(console.error);
