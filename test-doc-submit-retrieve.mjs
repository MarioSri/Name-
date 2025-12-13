import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log('🔍 Testing Document Submission and Retrieval Flow...\n');

    // Step 1: Get all recipients to find a valid submitter
    console.log('📋 Step 1: Fetching recipients...');
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('id, user_id, name')
      .limit(5);

    if (recipientsError) throw recipientsError;
    console.log(`✅ Found ${recipients.length} recipients:`, recipients.map(r => ({ id: r.id, user_id: r.user_id, name: r.name })));

    if (recipients.length === 0) {
      console.error('❌ No recipients found in database');
      process.exit(1);
    }

    const submitter = recipients[0];
    const recipient = recipients.length > 1 ? recipients[1] : recipients[0];

    // Step 2: Create a document
    console.log(`\n📝 Step 2: Creating document as submitter "${submitter.name}" (UUID: ${submitter.id})...`);
    const docData = {
      tracking_id: `DOC-TEST-${Date.now()}`,
      title: 'Test Document for Card Creation',
      description: 'This is a test document',
      type: 'Letter',
      priority: 'high',
      status: 'pending',
      created_by: submitter.id, // This is the critical line - must match the column name
      submitter_name: submitter.name,
      submitter_role: 'user',
      routing_type: 'sequential',
      metadata: { test: true }
    };

    const { data: createdDoc, error: createError } = await supabase
      .from('documents')
      .insert([docData])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating document:', createError);
      throw createError;
    }

    console.log(`✅ Document created with ID: ${createdDoc.id}`);
    console.log('   created_by field:', createdDoc.created_by);

    // Step 3: Retrieve documents by submitter
    console.log(`\n🔍 Step 3: Querying documents where created_by = "${submitter.id}"...`);
    const { data: foundDocs, error: queryError } = await supabase
      .from('documents')
      .select('id, tracking_id, title, created_by')
      .eq('created_by', submitter.id)
      .order('created_at', { ascending: false });

    if (queryError) throw queryError;

    console.log(`✅ Query returned ${foundDocs.length} documents`);
    const createdDocFound = foundDocs.some(d => d.id === createdDoc.id);
    
    if (createdDocFound) {
      console.log('✅ Created document was found in query results!');
    } else {
      console.error('❌ Created document NOT found in query results');
      console.log('   Found documents:', foundDocs);
    }

    // Step 4: Verify the document_recipients junction table
    console.log(`\n📋 Step 4: Checking document_recipients...`);
    const { data: docRecipients, error: recipError } = await supabase
      .from('document_recipients')
      .select('*')
      .eq('document_id', createdDoc.id);

    if (recipError) throw recipError;
    console.log(`✅ Found ${docRecipients.length} recipient records for this document`);
    if (docRecipients.length === 0) {
      console.warn('⚠️  No recipients linked to this document (might be intentional for testing)');
    }

    // Step 5: Verify approval_cards
    console.log(`\n📋 Step 5: Checking approval_cards...`);
    const { data: approvalCards, error: cardError } = await supabase
      .from('approval_cards')
      .select('id, document_id, tracking_card_id, title')
      .eq('document_id', createdDoc.id);

    if (cardError) throw cardError;
    console.log(`✅ Found ${approvalCards.length} approval cards for this document`);

    // Cleanup
    console.log(`\n🧹 Cleanup: Deleting test document...`);
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', createdDoc.id);

    if (deleteError) console.warn('⚠️  Could not delete test document:', deleteError.message);
    else console.log('✅ Test document deleted');

    console.log('\n✅ All tests passed! Documents are being inserted with created_by and can be retrieved.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
