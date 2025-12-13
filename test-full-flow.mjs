// Full flow test: Create approval card and verify it can be fetched
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fullFlowTest() {
  console.log('=== FULL FLOW TEST ===\n');
  
  // Step 1: Get available recipients
  console.log('Step 1: Fetching recipients...');
  const { data: recipients, error: recipientsError } = await supabase
    .from('recipients')
    .select('id, user_id, name, role')
    .limit(3);
  
  if (recipientsError) {
    console.log('❌ Error fetching recipients:', recipientsError.message);
    return;
  }
  
  console.log(`✅ Found ${recipients.length} recipients:`);
  recipients.forEach(r => console.log(`   - ${r.name} (${r.user_id}) - ${r.role}`));
  
  if (recipients.length < 2) {
    console.log('❌ Need at least 2 recipients for full test');
    return;
  }
  
  // Step 2: Create an approval card
  console.log('\nStep 2: Creating approval card...');
  const timestamp = Date.now();
  const submitter = recipients[0];
  const approver = recipients[1];
  
  const cardData = {
    approval_id: `APPR-TEST-${timestamp}`,
    tracking_card_id: `DOC-TEST-${timestamp}`,
    document_id: null,
    title: 'Test Document for UI Cards',
    description: 'This is a test to verify UI cards appear',
    submitter_name: submitter.name,
    submitter_id: submitter.id,
    submitter_role: submitter.role || 'user',
    priority: 'normal',
    status: 'pending',
    routing_type: 'sequential',
    workflow: {},
    recipient_ids: [approver.id],
    recipient_names: [approver.name],
    current_recipient_id: approver.id,
    current_recipient_name: approver.name,
    bypassed_recipients: [],
    resubmitted_recipients: [],
  };
  
  const { data: card, error: cardError } = await supabase
    .from('approval_cards')
    .insert(cardData)
    .select()
    .single();
  
  if (cardError) {
    console.log('❌ Error creating card:', cardError.message);
    return;
  }
  
  console.log('✅ Card created successfully!');
  console.log(`   ID: ${card.id}`);
  console.log(`   Approval ID: ${card.approval_id}`);
  console.log(`   Title: ${card.title}`);
  console.log(`   Current Recipient: ${card.current_recipient_name}`);
  
  // Step 3: Fetch all approval cards
  console.log('\nStep 3: Fetching all approval cards...');
  const { data: allCards, error: fetchError } = await supabase
    .from('approval_cards')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.log('❌ Error fetching cards:', fetchError.message);
    return;
  }
  
  console.log(`✅ Found ${allCards.length} approval cards:`);
  allCards.forEach(c => {
    console.log(`   - ${c.title} | Status: ${c.status} | Recipient: ${c.current_recipient_name || 'N/A'}`);
  });
  
  // Step 4: Fetch cards for specific recipient
  console.log(`\nStep 4: Fetching cards for recipient ${approver.name}...`);
  const { data: recipientCards, error: recipientFetchError } = await supabase
    .from('approval_cards')
    .select('*')
    .eq('current_recipient_id', approver.id);
  
  if (recipientFetchError) {
    console.log('❌ Error:', recipientFetchError.message);
  } else {
    console.log(`✅ Found ${recipientCards.length} cards for ${approver.name}`);
  }
  
  // Step 5: Check document insert (may fail due to RLS)
  console.log('\nStep 5: Testing document insert (may fail due to RLS)...');
  const docData = {
    tracking_id: `DOC-TEST-${timestamp}`,
    title: 'Test Document',
    type: 'Letter',
    priority: 'medium',
    status: 'pending',
    submitter_id: submitter.id,
    submitter_name: submitter.name,
    submitter_role: 'user',
  };
  
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert(docData)
    .select()
    .single();
  
  if (docError) {
    console.log(`⚠️ Document insert failed: ${docError.message}`);
    console.log('   This is expected if RLS has infinite recursion on users table.');
    console.log('   Run FIX_ALL_RLS_POLICIES.sql in Supabase SQL Editor to fix.');
  } else {
    console.log('✅ Document created:', doc.id);
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Approval Cards: ${allCards.length} (working ✅)`);
  console.log(`Documents: ${docError ? 'blocked by RLS ⚠️' : 'working ✅'}`);
  console.log('\nUI cards should now appear for approval_cards!');
  console.log('If documents are blocked, run FIX_ALL_RLS_POLICIES.sql to fix RLS.');
}

fullFlowTest().catch(console.error);
