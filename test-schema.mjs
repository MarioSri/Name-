import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getSchema() {
  console.log('Fetching table schemas...\n');
  
  // Get documents table columns
  const { data: docCols, error: docErr } = await supabase.rpc('get_table_columns', { table_name: 'documents' });
  
  // Alternative: query information_schema
  const { data: docInfo } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'documents')
    .eq('table_schema', 'public');
  
  console.log('Documents columns (via information_schema):', docInfo);
  
  // Try inserting with minimal data to see what's required
  console.log('\n--- Testing Documents table insert ---');
  const { data: testDoc, error: testDocErr } = await supabase
    .from('documents')
    .insert({ title: 'Test' })
    .select();
  console.log('Insert result:', testDocErr?.message || testDoc);
  
  console.log('\n--- Testing Approval Cards table insert ---');
  const { data: testCard, error: testCardErr } = await supabase
    .from('approval_cards')
    .insert({ title: 'Test' })
    .select();
  console.log('Insert result:', testCardErr?.message || testCard);
}

getSchema().catch(console.error);
