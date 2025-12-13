import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing Supabase connection...');
  
  // Test recipients table
  const { data: recipients, error: recError } = await supabase.from('recipients').select('*').limit(5);
  console.log('Recipients:', recipients?.length || 0, 'Error:', recError?.message || 'none');
  if (recipients?.length > 0) {
    console.log('Sample recipients:', recipients.map(r => ({ id: r.id, name: r.name, user_id: r.user_id })));
  }
  
  // Test documents table  
  const { data: docs, error: docError } = await supabase.from('documents').select('*').limit(5);
  console.log('Documents:', docs?.length || 0, 'Error:', docError?.message || 'none');
  if (docs?.length > 0) {
    console.log('Sample docs:', docs.map(d => ({ id: d.id, title: d.title, created_by: d.created_by })));
  }
  
  // Test approval_cards table
  const { data: cards, error: cardError } = await supabase.from('approval_cards').select('*').limit(5);
  console.log('Approval Cards:', cards?.length || 0, 'Error:', cardError?.message || 'none');
  if (cards?.length > 0) {
    console.log('Sample cards:', cards.map(c => ({ id: c.id, title: c.title, status: c.status })));
  }
}

test().catch(console.error);
