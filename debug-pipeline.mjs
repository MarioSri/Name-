// Debug script to verify the full data pipeline
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDataPipeline() {
  console.log('=== DEBUGGING DATA PIPELINE ===\n');

  // 1. Get all pending cards directly from DB
  console.log('Step 1: Raw database query...');
  const { data: rawCards, error: rawError } = await supabase
    .from('approval_cards')
    .select('*')
    .eq('status', 'pending');
  
  if (rawError) {
    console.log('❌ Error:', rawError.message);
  } else {
    console.log(`✅ Found ${rawCards?.length || 0} pending cards in database`);
  }

  // 2. Simulate what the hook does - fetch by recipient
  console.log('\nStep 2: Simulating hook query (fallback to all pending)...');
  const { data: fallbackCards, error: fallbackError } = await supabase
    .from('approval_cards')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (fallbackError) {
    console.log('❌ Error:', fallbackError.message);
  } else {
    console.log(`✅ Fallback query returned ${fallbackCards?.length || 0} cards`);
  }

  // 3. Check what fields each card has
  console.log('\nStep 3: Checking card data structure...');
  if (fallbackCards && fallbackCards.length > 0) {
    const card = fallbackCards[0];
    console.log('Card fields:');
    console.log('  id:', card.id);
    console.log('  approval_id:', card.approval_id);
    console.log('  tracking_card_id:', card.tracking_card_id);
    console.log('  title:', card.title);
    console.log('  status:', card.status);
    console.log('  submitter_name:', card.submitter_name);
    console.log('  submitter_id:', card.submitter_id);
    console.log('  recipient_names:', card.recipient_names);
    console.log('  recipient_ids:', card.recipient_ids);
    console.log('  current_recipient_id:', card.current_recipient_id);
    console.log('  current_recipient_name:', card.current_recipient_name);
    console.log('  routing_type:', card.routing_type);
    console.log('  priority:', card.priority);
    console.log('  workflow:', card.workflow ? 'exists' : 'null');
  }

  // 4. Simulate toApprovalCardData conversion
  console.log('\nStep 4: Simulating toApprovalCardData conversion...');
  const convertedCards = (fallbackCards || []).map(card => ({
    id: card.id,
    approvalId: card.approval_id,
    documentId: card.document_id,
    trackingCardId: card.tracking_card_id,
    title: card.title,
    description: card.description,
    type: card.routing_type || 'approval',
    priority: card.priority,
    status: card.status,
    submitter: card.submitter_name || 'Unknown',
    submitterId: card.submitter_id,
    recipients: card.recipient_names || [],
    recipientIds: card.recipient_ids || [],
    currentRecipientId: card.current_recipient_id,
    currentRecipientName: card.current_recipient_name,
    routingType: card.routing_type,
    isEmergency: card.priority === 'urgent',
    isParallel: card.routing_type === 'parallel',
    source: 'supabase',
    workflow: card.workflow,
    comments: '',
    createdAt: card.created_at,
    updatedAt: card.updated_at,
    supabaseId: card.id, // CRITICAL for UI display
  }));

  console.log(`Converted ${convertedCards.length} cards`);
  convertedCards.forEach((c, i) => {
    console.log(`  ${i+1}. "${c.title}" - supabaseId: ${c.supabaseId}, status: ${c.status}`);
  });

  // 5. Simulate isUserInRecipientsLocal check
  console.log('\nStep 5: Simulating UI filter (isUserInRecipientsLocal)...');
  const visibleCards = convertedCards.filter(doc => {
    // The temporary fix: if supabaseId exists and status is pending, show it
    if (doc.supabaseId && doc.status === 'pending') {
      console.log(`  ✅ "${doc.title}" - VISIBLE (supabaseId + pending)`);
      return true;
    }
    console.log(`  ❌ "${doc.title}" - HIDDEN (no supabaseId or not pending)`);
    return false;
  });

  console.log(`\n=== RESULT ===`);
  console.log(`${visibleCards.length} cards should be visible in UI`);
}

debugDataPipeline().catch(console.error);
