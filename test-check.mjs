// Check existing data and try more enum values
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://armorotbfruhfcwkrhpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFybW9yb3RiZnJ1aGZjd2tyaHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQ3NDQsImV4cCI6MjA4MTExMDc0NH0.L7xMW21wpu4V6BMD7x7074mtO1Ysh_X2i3EHlvZjQpc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('=== Checking Existing Data ===\n');
  
  // Check approval_cards (working table)
  console.log('--- Approval Cards ---');
  const { data: cards, error: cardsErr } = await supabase
    .from('approval_cards')
    .select('id, title, priority, status')
    .limit(5);
  
  if (cardsErr) {
    console.log('Error:', cardsErr.message);
  } else {
    console.log('Cards found:', cards?.length || 0);
    if (cards?.length > 0) {
      console.log('Sample card priority:', cards[0].priority);
      console.log('Sample card status:', cards[0].status);
    }
  }
  
  // Check documents table columns with RPC or direct query
  console.log('\n--- Documents Table Check ---');
  const { data: docs, error: docsErr } = await supabase
    .from('documents')
    .select('id, title, type, priority, status')
    .limit(5);
  
  if (docsErr) {
    console.log('Error:', docsErr.message);
  } else {
    console.log('Documents found:', docs?.length || 0);
    if (docs && docs.length > 0) {
      console.log('Sample document type:', docs[0].type);
      console.log('Sample document priority:', docs[0].priority);
      console.log('Sample document status:', docs[0].status);
    }
  }

  // Try to get enum types from pg_type
  console.log('\n--- Checking pg_catalog for enum types ---');
  const { data: enums, error: enumErr } = await supabase.rpc('get_enum_values', {});
  if (enumErr) {
    console.log('RPC Error:', enumErr.message);
    
    // Alternative: Check existing values in approval_cards which we know works
    console.log('\nLet\'s check approval_cards column values:');
    const { data: allCards } = await supabase
      .from('approval_cards')
      .select('priority, status')
      .limit(10);
    
    if (allCards && allCards.length > 0) {
      const priorities = [...new Set(allCards.map(c => c.priority))];
      const statuses = [...new Set(allCards.map(c => c.status))];
      console.log('Unique priorities:', priorities);
      console.log('Unique statuses:', statuses);
    }
  } else {
    console.log('Enum values:', enums);
  }

  // Let's try to insert into documents WITHOUT type/priority to see required fields
  console.log('\n--- Testing Minimal Insert ---');
  const minimalData = {
    tracking_id: `MIN-${Date.now()}`,
    title: 'Minimal Test',
    submitter_id: '00000000-0000-0000-0000-000000000001',
    submitter_name: 'Test User',
    submitter_role: 'user',
  };
  
  const { data: minDoc, error: minErr } = await supabase
    .from('documents')
    .insert(minimalData)
    .select()
    .single();
  
  if (minErr) {
    console.log('Minimal insert error:', minErr.message);
    console.log('This tells us which fields have defaults vs required');
  } else {
    console.log('Minimal insert SUCCESS!');
    console.log('Default type:', minDoc.type);
    console.log('Default priority:', minDoc.priority);
    console.log('Default status:', minDoc.status);
    // Delete it
    await supabase.from('documents').delete().eq('id', minDoc.id);
  }
}

checkData().catch(console.error);
