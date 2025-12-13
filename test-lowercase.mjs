// Test document insert with lowercase values
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLowercaseInsert() {
  console.log('=== Testing Document Insert with lowercase values ===\n');
  
  // Test with all lowercase values
  const typeValues = ['letter', 'circular', 'report', 'memo', 'notice', 'proposal', 'request'];
  const priorityValues = ['low', 'normal', 'high', 'urgent'];
  const statusValues = ['pending', 'in_progress', 'approved', 'rejected', 'completed'];
  
  console.log('--- Testing Type Values (with priority=normal) ---');
  for (const typeVal of typeValues) {
    const testData = {
      tracking_id: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Doc',
      type: typeVal,
      priority: 'normal',
      status: 'pending',
      submitter_id: '00000000-0000-0000-0000-000000000001',
      submitter_name: 'Test User',
      submitter_role: 'user',
    };
    
    const { data, error } = await supabase
      .from('documents')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.log(`Type '${typeVal}': ❌ ${error.message}`);
    } else {
      console.log(`Type '${typeVal}': ✅ Success (id: ${data.id})`);
      // Delete test record
      await supabase.from('documents').delete().eq('id', data.id);
    }
  }

  console.log('\n--- Testing Priority Values (with type=letter) ---');
  for (const priVal of priorityValues) {
    const testData = {
      tracking_id: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Doc',
      type: 'letter',
      priority: priVal,
      status: 'pending',
      submitter_id: '00000000-0000-0000-0000-000000000001',
      submitter_name: 'Test User',
      submitter_role: 'user',
    };
    
    const { data, error } = await supabase
      .from('documents')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.log(`Priority '${priVal}': ❌ ${error.message}`);
    } else {
      console.log(`Priority '${priVal}': ✅ Success (id: ${data.id})`);
      // Delete test record
      await supabase.from('documents').delete().eq('id', data.id);
    }
  }

  console.log('\n--- Testing Status Values (with type=letter, priority=normal) ---');
  for (const statVal of statusValues) {
    const testData = {
      tracking_id: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Doc',
      type: 'letter',
      priority: 'normal',
      status: statVal,
      submitter_id: '00000000-0000-0000-0000-000000000001',
      submitter_name: 'Test User',
      submitter_role: 'user',
    };
    
    const { data, error } = await supabase
      .from('documents')
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.log(`Status '${statVal}': ❌ ${error.message}`);
    } else {
      console.log(`Status '${statVal}': ✅ Success (id: ${data.id})`);
      // Delete test record
      await supabase.from('documents').delete().eq('id', data.id);
    }
  }
  
  console.log('\n\n=== FINAL: Testing Complete Insert ===');
  const finalData = {
    tracking_id: `FINAL-${Date.now()}`,
    title: 'Final Test Document',
    description: 'This is a test document',
    type: 'letter',
    priority: 'normal',
    status: 'pending',
    submitter_id: '00000000-0000-0000-0000-000000000001',
    submitter_name: 'Test User',
    submitter_role: 'user',
  };
  
  const { data, error } = await supabase
    .from('documents')
    .insert(finalData)
    .select()
    .single();
  
  if (error) {
    console.log(`Final Insert: ❌ ${error.message}`);
  } else {
    console.log(`Final Insert: ✅ Success!`);
    console.log('Document created:', JSON.stringify(data, null, 2));
    // Keep this one for testing
  }
}

testLowercaseInsert().catch(console.error);
