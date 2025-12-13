import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPriorities() {
  console.log('Testing different priority values for documents...\n');
  
  const { data: recipients } = await supabase.from('recipients').select('*').limit(1);
  const recipient = recipients?.[0];
  
  const priorities = ['low', 'medium', 'high', 'urgent', 'emergency', 'normal', 'LOW', 'MEDIUM', 'HIGH'];
  
  for (const priority of priorities) {
    const trackingId = 'DOC-' + Date.now() + '-' + priority;
    const { data, error } = await supabase
      .from('documents')
      .insert({
        tracking_id: trackingId,
        title: 'Test Doc ' + priority,
        type: 'letter',
        status: 'pending',
        priority: priority,
        routing_type: 'sequential',
        submitter_id: recipient.id,
        submitter_name: recipient.name,
        submitter_role: recipient.role
      })
      .select()
      .single();
    
    if (error) {
      console.log(`❌ Priority "${priority}": ${error.message.includes('priority') ? 'INVALID' : error.message}`);
    } else {
      console.log(`✅ Priority "${priority}": VALID - Doc created: ${data.id}`);
    }
  }
  
  // Final check
  const { data: docs } = await supabase.from('documents').select('id, title, priority');
  const { data: cards } = await supabase.from('approval_cards').select('id, title, priority');
  console.log('\n📊 FINAL: Documents:', docs?.length, 'Cards:', cards?.length);
  if (docs?.length) console.log('Docs:', docs);
}

testPriorities().catch(console.error);
