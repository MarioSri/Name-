// Test document insert with correct column names
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDocumentInsert() {
  console.log('=== Testing Document Insert ===\n');
  
  // First, let's check what valid enum values exist
  console.log('Checking documents table structure...');
  
  // Try to get column info
  const { data: cols, error: colError } = await supabase
    .from('documents')
    .select('*')
    .limit(0);
  
  console.log('Column check error:', colError?.message || 'None');
  
  // Try different type values
  const typeValues = ['Letter', 'letter', 'LETTER', 'Circular', 'circular', 'Document', 'document'];
  const priorityValues = ['Normal', 'normal', 'NORMAL', 'High', 'high', 'Urgent', 'urgent', 'Low', 'low'];
  
  console.log('\n--- Testing Type Values ---');
  for (const typeVal of typeValues) {
    const testData = {
      tracking_id: `TEST-TYPE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Doc',
      type: typeVal,
      priority: 'Normal',
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
  
  console.log('\n--- Testing Priority Values ---');
  for (const priVal of priorityValues) {
    const testData = {
      tracking_id: `TEST-PRI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Doc',
      type: 'Letter', // Assume this works
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
  
  console.log('\n--- Testing Status Values ---');
  const statusValues = ['pending', 'Pending', 'PENDING', 'approved', 'Approved', 'rejected', 'Rejected'];
  for (const statVal of statusValues) {
    const testData = {
      tracking_id: `TEST-STAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Doc',
      type: 'Letter',
      priority: 'Normal',
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
}

testDocumentInsert().catch(console.error);
