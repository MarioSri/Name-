// Test document insert with CORRECT values from schema
// type IN ('Letter', 'Circular', 'Report', 'Other')
// priority IN ('low', 'medium', 'high', 'urgent')
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCorrectValues() {
  console.log('=== Testing Document Insert with CORRECT Schema Values ===\n');
  
  // Based on SQL: 
  // type TEXT NOT NULL CHECK (type IN ('Letter', 'Circular', 'Report', 'Other'))
  // priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
  
  const testData = {
    tracking_id: `TEST-FINAL-${Date.now()}`,
    title: 'Test Document',
    description: 'Testing correct schema values',
    type: 'Letter',      // Capitalized
    priority: 'medium',  // lowercase
    status: 'pending',
    submitter_id: '00000000-0000-0000-0000-000000000001',
    submitter_name: 'Test User',
    submitter_role: 'user',
    routing_type: 'sequential',
  };
  
  console.log('Inserting with:', testData);
  
  const { data, error } = await supabase
    .from('documents')
    .insert(testData)
    .select()
    .single();
  
  if (error) {
    console.log('❌ Error:', error.message);
    console.log('   Code:', error.code);
    console.log('   Details:', error.details);
  } else {
    console.log('✅ SUCCESS! Document created:');
    console.log('   ID:', data.id);
    console.log('   Document ID:', data.document_id);
    console.log('   Type:', data.type);
    console.log('   Priority:', data.priority);
    console.log('   Status:', data.status);
    
    // Now let's count documents and approval_cards
    const { count: docCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });
    const { count: cardCount } = await supabase
      .from('approval_cards')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n=== Current Database State ===');
    console.log('Documents:', docCount);
    console.log('Approval Cards:', cardCount);
  }
}

testCorrectValues().catch(console.error);
