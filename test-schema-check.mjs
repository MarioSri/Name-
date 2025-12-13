import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchemas() {
  console.log('Checking actual table schemas via successful card...\n');
  
  // Get existing card to see columns
  const { data: cards } = await supabase.from('approval_cards').select('*').limit(1);
  if (cards?.length) {
    console.log('=== APPROVAL_CARDS columns ===');
    Object.keys(cards[0]).forEach(col => {
      console.log(`  ${col}: ${typeof cards[0][col]} = ${JSON.stringify(cards[0][col]).substring(0, 50)}`);
    });
  }
  
  // Now try to insert a document with correct column names
  const { data: recipients } = await supabase.from('recipients').select('*').limit(1);
  const recipient = recipients?.[0];
  
  console.log('\n=== Testing document with EXACT column names ===');
  const trackingId = 'DOC-' + Date.now();
  
  // Based on the error messages and approval_cards success, try these columns:
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      tracking_id: trackingId,
      title: 'Working Test Doc',
      description: 'Test',
      type: 'Letter',  // Try capitalized
      status: 'pending',
      priority: 'low',  // lowercase
      routing_type: 'sequential',
      submitter_id: recipient.id,
      submitter_name: recipient.name,
      submitter_role: recipient.role
    })
    .select()
    .single();
  
  if (docErr) {
    console.log('Error with Letter/low:', docErr.message);
    
    // Try other combinations
    const combos = [
      { type: 'LETTER', priority: 'LOW' },
      { type: 'letter', priority: 'LOW' },
      { type: 'Letter', priority: 'LOW' },
      { type: 'Letter', priority: 'Normal' },
    ];
    
    for (const combo of combos) {
      const tid = 'DOC-' + Date.now() + Math.random();
      const { data, error } = await supabase
        .from('documents')
        .insert({
          tracking_id: tid,
          title: 'Test',
          type: combo.type,
          status: 'pending',
          priority: combo.priority,
          routing_type: 'sequential',
          submitter_id: recipient.id,
          submitter_name: recipient.name,
          submitter_role: recipient.role
        })
        .select()
        .single();
      
      if (error) {
        console.log(`❌ ${combo.type}/${combo.priority}: ${error.message.substring(0, 60)}`);
      } else {
        console.log(`✅ ${combo.type}/${combo.priority}: WORKS!`);
        console.log('Document columns:', Object.keys(data).join(', '));
        break;
      }
    }
  } else {
    console.log('✅ Document created with Letter/low');
    console.log('Document columns:', Object.keys(doc).join(', '));
  }
  
  // Final count
  const { data: docs } = await supabase.from('documents').select('*');
  console.log('\n📊 Total documents now:', docs?.length);
}

checkSchemas().catch(console.error);
