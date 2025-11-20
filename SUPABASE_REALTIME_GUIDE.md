# 🚀 Supabase Real-Time Migration Guide

Complete guide for migrating your application from localStorage to Supabase PostgreSQL with real-time synchronization.

## 📋 Table of Contents

- [Overview](#overview)
- [What's Been Implemented](#whats-been-implemented)
- [Database Schema](#database-schema)
- [Services & Hooks](#services--hooks)
- [How to Use](#how-to-use)
- [Testing](#testing)
- [Migration Steps](#migration-steps)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This migration replaces browser localStorage with Supabase PostgreSQL database, enabling:

✅ **Real-time synchronization** across all users  
✅ **Persistent storage** in the cloud  
✅ **No size limits** (localStorage is limited to ~5-10MB)  
✅ **Multi-device access** to the same data  
✅ **Row-level security** for data protection  
✅ **Automatic backups** and disaster recovery  

---

## ✅ What's Been Implemented

### 1. Database Schema (14 Tables)

All tables have been created in your Supabase database:

| Table | Purpose | Real-Time |
|-------|---------|-----------|
| `submitted_documents` | Track all submitted documents | ✅ Yes |
| `pending_approvals` | Approval cards for recipients | ✅ Yes |
| `notifications` | User notifications | ✅ Yes |
| `calendar_events` | Meetings and calendar | ✅ Yes |
| `user_preferences` | User settings | ✅ Yes |
| `emergency_submissions` | Emergency documents | ✅ Yes |
| `livemeet_requests` | Live meeting requests | ✅ Yes |
| `chat_messages` | Chat/messaging | ✅ Yes |
| `channels` | Communication channels | ✅ Yes |
| `polls` | Poll data | ✅ Yes |
| `notes_reminders` | Notes and reminders | ✅ Yes |
| `escalation_data` | Document escalation | ✅ Yes |
| `document_responses` | Document responses | ✅ Yes |

### 2. Core Services

#### SupabaseDocumentService
**File**: `src/services/SupabaseDocumentService.ts`

Handles all document and approval operations with real-time support.

**Key Features**:
- Create, read, update documents
- Manage approval cards
- Real-time subscriptions
- Workflow management
- Signature tracking

### 3. React Hooks

#### useRealTimeDocuments
**File**: `src/hooks/useRealTimeDocuments.ts`

React hook for managing documents with automatic real-time updates.

#### useRealTimeApprovals
**File**: `src/hooks/useRealTimeApprovals.ts`

React hook for managing approval cards with real-time synchronization.

---

## 🗄️ Database Schema

### submitted_documents

Stores all submitted documents (replaces `localStorage['submitted-documents']`).

```sql
CREATE TABLE submitted_documents (
    id UUID PRIMARY KEY,
    document_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    submitter_id UUID,
    submitter_name TEXT NOT NULL,
    submitted_date TIMESTAMP WITH TIME ZONE,
    priority TEXT,
    description TEXT,
    recipients TEXT[],
    recipient_ids TEXT[],
    workflow JSONB,
    source TEXT,
    routing_type TEXT,
    is_emergency BOOLEAN,
    is_parallel BOOLEAN,
    status TEXT,
    signed_by TEXT[],
    rejected_by TEXT[],
    files JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### pending_approvals

Stores approval cards for recipients (replaces `localStorage['pending-approvals']`).

```sql
CREATE TABLE pending_approvals (
    id UUID PRIMARY KEY,
    approval_id TEXT UNIQUE NOT NULL,
    tracking_card_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    title TEXT NOT NULL,
    -- ... (similar structure to submitted_documents)
);
```

**Row Level Security (RLS)**:
- Users can only see their own documents
- Recipients can only see approvals assigned to them
- Automatic security enforcement

---

## 🔧 Services & Hooks

### SupabaseDocumentService

```typescript
import { supabaseDocumentService } from '@/services/SupabaseDocumentService';

// Create a document
const document = await supabaseDocumentService.createDocument({
  document_id: 'doc-123',
  title: 'My Document',
  type: 'Letter',
  submitter_id: user.id,
  submitter_name: user.name,
  priority: 'normal',
  description: 'Document description',
  recipients: ['Principal', 'HOD'],
  recipient_ids: ['principal-id', 'hod-id'],
  source: 'document-management',
  status: 'pending',
  workflow: { /* workflow data */ }
});

// Create approval cards
await supabaseDocumentService.createApprovalCards(document);

// Get documents
const docs = await supabaseDocumentService.getDocumentsBySubmitter(userId);

// Update document
await supabaseDocumentService.updateDocument(documentId, {
  status: 'approved'
});

// Subscribe to real-time updates
const channel = supabaseDocumentService.subscribeToDocuments((payload) => {
  console.log('Document updated:', payload);
});

// Cleanup
supabaseDocumentService.unsubscribeAll();
```

### useRealTimeDocuments Hook

```typescript
import { useRealTimeDocuments } from '@/hooks/useRealTimeDocuments';

function MyComponent() {
  const {
    documents,      // Array of documents
    loading,        // Loading state
    error,          // Error state
    refetch,        // Manual refetch
    createDocument, // Create new document
    updateDocument, // Update document
    updateWorkflow, // Update workflow
    addSignature,   // Add signature
    addRejection    // Add rejection
  } = useRealTimeDocuments(true); // true = filter by submitter

  // Documents automatically update in real-time!
  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {documents.map(doc => (
        <div key={doc.id}>{doc.title}</div>
      ))}
    </div>
  );
}
```

### useRealTimeApprovals Hook

```typescript
import { useRealTimeApprovals } from '@/hooks/useRealTimeApprovals';

function ApprovalCenter() {
  const {
    approvals,                    // Array of approval cards
    loading,                      // Loading state
    error,                        // Error state
    refetch,                      // Manual refetch
    updateApprovalStatus,         // Update status
    deleteApproval,               // Delete single approval
    deleteApprovalsByTrackingId   // Delete all approvals for a document
  } = useRealTimeApprovals(user.id);

  const handleApprove = async (approvalId) => {
    await updateApprovalStatus(approvalId, 'approved');
    // Status updates in real-time across all users!
  };

  return (
    <div>
      {approvals.map(approval => (
        <div key={approval.id}>
          {approval.title}
          <button onClick={() => handleApprove(approval.approval_id)}>
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎮 How to Use

### Step 1: Update Your Components

Replace localStorage operations with hooks:

**Before (localStorage)**:
```typescript
// ❌ Old way
const docs = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
localStorage.setItem('submitted-documents', JSON.stringify(newDocs));
```

**After (Supabase)**:
```typescript
// ✅ New way
const { documents, createDocument } = useRealTimeDocuments();
await createDocument(newDocument);
// Documents automatically sync in real-time!
```

### Step 2: Create Documents

```typescript
import { useRealTimeDocuments } from '@/hooks/useRealTimeDocuments';
import { useAuth } from '@/contexts/AuthContext';

function DocumentSubmission() {
  const { user } = useAuth();
  const { createDocument } = useRealTimeDocuments();

  const handleSubmit = async (formData) => {
    const document = {
      document_id: `doc-${Date.now()}`,
      title: formData.title,
      type: formData.type,
      submitter_id: user.id,
      submitter_name: user.name,
      priority: formData.priority,
      description: formData.description,
      recipients: formData.recipients,
      recipient_ids: formData.recipientIds,
      source: 'document-management',
      routing_type: 'sequential',
      status: 'pending',
      workflow: {
        steps: formData.recipients.map((recipient, index) => ({
          name: `Step ${index + 1}`,
          assignee: recipient,
          status: index === 0 ? 'current' : 'pending'
        })),
        currentStep: 'Step 1',
        progress: 0
      }
    };

    await createDocument(document);
    // Document appears instantly for all users!
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Step 3: Display Documents

```typescript
import { useRealTimeDocuments } from '@/hooks/useRealTimeDocuments';

function DocumentList() {
  const { documents, loading, error } = useRealTimeDocuments();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {documents.map(doc => (
        <div key={doc.id}>
          <h3>{doc.title}</h3>
          <p>Status: {doc.status}</p>
          <p>Priority: {doc.priority}</p>
        </div>
      ))}
    </div>
  );
}
```

### Step 4: Handle Approvals

```typescript
import { useRealTimeApprovals } from '@/hooks/useRealTimeApprovals';
import { useAuth } from '@/contexts/AuthContext';

function ApprovalCenter() {
  const { user } = useAuth();
  const { approvals, updateApprovalStatus } = useRealTimeApprovals(user.id);

  const handleApprove = async (approvalId, documentId) => {
    // Update approval status
    await updateApprovalStatus(approvalId, 'approved');
    
    // Update document workflow
    // ... (update workflow logic)
    
    // Changes sync in real-time!
  };

  return (
    <div>
      {approvals.map(approval => (
        <div key={approval.id}>
          <h3>{approval.title}</h3>
          <button onClick={() => handleApprove(approval.approval_id, approval.document_id)}>
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🧪 Testing

### Run Test Suite

```bash
# In browser console
npm run dev

# Then in browser console:
supabaseTests.runAllTests()
```

### Manual Testing

1. **Test Document Creation**:
   ```javascript
   supabaseTests.testCreateDocument()
   ```

2. **Test Real-Time Subscription**:
   ```javascript
   supabaseTests.testRealTimeSubscription()
   ```

3. **Test Multi-User Sync**:
   - Open app in two browser windows
   - Login as different users
   - Create document in window 1
   - Verify it appears in window 2 instantly

### Verify Database

Check your Supabase dashboard:
1. Go to https://goupzmplowjbnnxmnvou.supabase.co
2. Navigate to Table Editor
3. View `submitted_documents` and `pending_approvals` tables
4. Verify data is being stored correctly

---

## 🔄 Migration Steps

### For Existing Data

1. **Backup Current Data**:
   ```javascript
   // Run in browser console
   const backup = {};
   for (let i = 0; i < localStorage.length; i++) {
     const key = localStorage.key(i);
     backup[key] = localStorage.getItem(key);
   }
   console.log(JSON.stringify(backup));
   // Save this output!
   ```

2. **Migrate Data** (script to be created):
   ```bash
   npm run migrate:localStorage
   ```

3. **Verify Migration**:
   - Check Supabase dashboard
   - Verify all documents appear
   - Test real-time functionality

4. **Clear localStorage** (optional):
   ```javascript
   localStorage.clear();
   ```

---

## 🐛 Troubleshooting

### Documents Not Appearing

**Check**:
1. User is logged in (`user.id` exists)
2. Supabase connection is active
3. RLS policies allow access
4. Check browser console for errors

**Debug**:
```javascript
import { supabaseDocumentService } from '@/services/SupabaseDocumentService';

// Check if documents exist
const docs = await supabaseDocumentService.getAllDocuments();
console.log('All documents:', docs);

// Check specific user's documents
const userDocs = await supabaseDocumentService.getDocumentsBySubmitter(userId);
console.log('User documents:', userDocs);
```

### Real-Time Not Working

**Check**:
1. Real-time is enabled in Supabase dashboard
2. Tables are added to replication
3. Network connection is stable

**Debug**:
```javascript
// Test subscription
const channel = supabaseDocumentService.subscribeToDocuments((payload) => {
  console.log('Real-time event:', payload);
});

// Create a test document
await supabaseDocumentService.createDocument({...});
// Should see console log above
```

### Permission Errors

**Check**:
1. RLS policies are configured
2. User has correct `user_id`
3. User is authenticated

**Fix**:
```sql
-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE submitted_documents DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE submitted_documents ENABLE ROW LEVEL SECURITY;
```

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Real-Time Documentation](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Migration Progress](./SUPABASE_MIGRATION_PROGRESS.md)

---

## 🎉 Next Steps

1. ✅ Database schema created
2. ✅ Core services implemented
3. ✅ React hooks created
4. ⏳ Update components to use new services
5. ⏳ Create additional services (notifications, calendar, chat)
6. ⏳ Build migration utility
7. ⏳ Test real-time functionality
8. ⏳ Deploy to production

**Ready to continue? Let's update the components to use the new Supabase services!**
