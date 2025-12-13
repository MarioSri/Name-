import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTypes() {
  console.log('Testing different type values for documents...\n');
  
  const { data: recipients } = await supabase.from('recipients').select('*').limit(1);
  const recipient = recipients?.[0];
  
  // Common document types to try
  const types = ['letter', 'Letter', 'LETTER', 'circular', 'report', 'memo', 'document', 'approval', 'request', 'application'];
  
  for (const type of types) {
    const trackingId = 'DOC-' + Date.now() + '-' + type;
    const { data, error } = await supabase
      .from('documents')
      .insert({
        tracking_id: trackingId,
        title: 'Test Doc ' + type,
        type: type,
        status: 'pending',
        priority: 'low',
        routing_type: 'sequential',
        submitter_id: recipient.id,
        submitter_name: recipient.name,
        submitter_role: recipient.role
      })
      .select()
      .single();
    
    if (error) {
      const msg = error.message;
      if (msg.includes('type_check')) console.log(`❌ Type "${type}": INVALID TYPE`);
      else if (msg.includes('priority_check')) console.log(`❌ Type "${type}": (type ok, priority invalid)`);
      else console.log(`❌ Type "${type}": ${msg.substring(0, 60)}`);
    } else {
      console.log(`✅ Type "${type}": VALID - Doc created: ${data.id}`);
    }
  }
  
  const { data: docs } = await supabase.from('documents').select('id, title, type, priority');
  console.log('\n📊 Documents created:', docs?.length);
  if (docs?.length) docs.forEach(d => console.log(` - ${d.type}: ${d.title}`));
}

testTypes().catch(console.error);
