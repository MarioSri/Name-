/**
 * Test Real-Time Supabase Integration
 * 
 * This file demonstrates how to test the real-time document synchronization
 * Run this in your browser console to test the integration
 */

// Test 1: Create a document
async function testCreateDocument() {
    const { supabaseDocumentService } = await import('./src/services/SupabaseDocumentService');

    const testDoc = {
        document_id: `test-doc-${Date.now()}`,
        title: 'Test Document - Real-Time Sync',
        type: 'Letter',
        submitter_id: 'test-user-id',
        submitter_name: 'Test User',
        priority: 'normal',
        description: 'Testing real-time synchronization with Supabase',
        recipients: ['Principal', 'HOD'],
        recipient_ids: ['principal-id', 'hod-id'],
        source: 'document-management',
        routing_type: 'sequential',
        status: 'pending',
        workflow: {
            steps: [
                { name: 'Step 1', assignee: 'HOD', status: 'current' },
                { name: 'Step 2', assignee: 'Principal', status: 'pending' }
            ],
            currentStep: 'Step 1',
            progress: 0
        }
    };

    try {
        const created = await supabaseDocumentService.createDocument(testDoc);
        console.log('✅ Document created:', created);

        // Create approval cards
        await supabaseDocumentService.createApprovalCards(created);
        console.log('✅ Approval cards created');

        return created;
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Test 2: Subscribe to real-time updates
async function testRealTimeSubscription() {
    const { supabaseDocumentService } = await import('./src/services/SupabaseDocumentService');

    console.log('🔔 Subscribing to document changes...');

    const channel = supabaseDocumentService.subscribeToDocuments((payload) => {
        console.log('📡 Real-time update received:', payload);

        if (payload.eventType === 'INSERT') {
            console.log('✨ New document:', payload.new);
        } else if (payload.eventType === 'UPDATE') {
            console.log('🔄 Document updated:', payload.new);
        } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Document deleted:', payload.old);
        }
    });

    console.log('✅ Subscribed! Try creating a document in another tab to see real-time updates.');

    return channel;
}

// Test 3: Get documents
async function testGetDocuments(submitterId) {
    const { supabaseDocumentService } = await import('./src/services/SupabaseDocumentService');

    try {
        const docs = await supabaseDocumentService.getDocumentsBySubmitter(submitterId);
        console.log(`✅ Found ${docs.length} documents for submitter:`, submitterId);
        console.table(docs.map(d => ({
            id: d.document_id,
            title: d.title,
            status: d.status,
            priority: d.priority
        })));
        return docs;
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Test 4: Get approval cards
async function testGetApprovals(recipientId) {
    const { supabaseDocumentService } = await import('./src/services/SupabaseDocumentService');

    try {
        const approvals = await supabaseDocumentService.getApprovalsByRecipient(recipientId);
        console.log(`✅ Found ${approvals.length} approval cards for recipient:`, recipientId);
        console.table(approvals.map(a => ({
            id: a.approval_id,
            title: a.title,
            status: a.status,
            submitter: a.submitter_name
        })));
        return approvals;
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Test 5: Update document status
async function testUpdateStatus(documentId, newStatus) {
    const { supabaseDocumentService } = await import('./src/services/SupabaseDocumentService');

    try {
        await supabaseDocumentService.updateDocumentStatus(documentId, newStatus);
        console.log(`✅ Document ${documentId} status updated to:`, newStatus);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Supabase Real-Time Tests...\n');

    // Test 1: Subscribe to real-time updates
    console.log('📍 Test 1: Real-Time Subscription');
    await testRealTimeSubscription();
    console.log('\n');

    // Test 2: Create a document
    console.log('📍 Test 2: Create Document');
    const doc = await testCreateDocument();
    console.log('\n');

    // Wait a bit for real-time to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Get documents
    console.log('📍 Test 3: Get Documents');
    await testGetDocuments('test-user-id');
    console.log('\n');

    // Test 4: Get approvals
    console.log('📍 Test 4: Get Approval Cards');
    await testGetApprovals('principal-id');
    console.log('\n');

    // Test 5: Update status
    if (doc) {
        console.log('📍 Test 5: Update Document Status');
        await testUpdateStatus(doc.document_id, 'approved');
        console.log('\n');
    }

    console.log('✅ All tests completed!');
    console.log('\n💡 Open another browser tab and run these tests to see real-time synchronization!');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.supabaseTests = {
        testCreateDocument,
        testRealTimeSubscription,
        testGetDocuments,
        testGetApprovals,
        testUpdateStatus,
        runAllTests
    };

    console.log('✅ Supabase tests loaded!');
    console.log('Run: supabaseTests.runAllTests() to start testing');
}

export {
    testCreateDocument,
    testRealTimeSubscription,
    testGetDocuments,
    testGetApprovals,
    testUpdateStatus,
    runAllTests
};
