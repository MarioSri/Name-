import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing with service role or bypassing RLS...');
  
  // Try querying without RLS (this won't work with anon key, but let's see the schema)
  const { data: columns, error: colError } = await supabase
    .from('documents')
    .select('*')
    .limit(1);
  
  console.log('Documents query result:', { data: columns, error: colError?.message });
  
  // Check if there's a users table causing the issue
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  console.log('Users table result:', { data: users, error: userError?.message });
}

test().catch(console.error);
