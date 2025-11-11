# 🚀 Supabase Integration Setup Guide

## ✅ What's Been Added

1. **Database Schema** (`backend/supabase-workflow-schema.sql`)
2. **Supabase Client** (`src/lib/supabase.ts`)
3. **Workflow Service** (`src/services/SupabaseWorkflowService.ts`)
4. **Environment Variables** (`.env`)
5. **Package Dependency** (`@supabase/supabase-js`)

---

## 📋 Setup Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Database Schema
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `goupzmplowjbnnxmnvou`
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy entire content from `backend/supabase-workflow-schema.sql`
6. Paste and click **Run**

**Expected Result**: ✅ Tables created successfully

### Step 3: Verify Tables
In SQL Editor, run:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Tables**:
- ✅ documents
- ✅ approval_cards
- ✅ notification_preferences
- ✅ document_comments

### Step 4: Test Connection
In browser console (F12):
```javascript
import { supabase } from './src/lib/supabase';
const { data, error } = await supabase.from('documents').select('count');
console.log('Connection test:', data, error);
```

**Expected**: No error, returns count

---

## 🔄 Migration from localStorage

### Current State (localStorage)
```javascript
// Old way
localStorage.setItem('submitted-documents', JSON.stringify(docs));
const docs = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
```

### New State (Supabase)
```javascript
// New way
import { supabaseWorkflowService } from '@/services/SupabaseWorkflowService';

// Create document
await supabaseWorkflowService.createDocument(doc);

// Get documents
const docs = await supabaseWorkflowService.getDocuments(userId);

// Update document
await supabaseWorkflowService.updateDocument(docId, updates);
```

---

## 📊 Database Schema Overview

### documents table
```sql
- id (UUID, primary key)
- title (text)
- type (text)
- status (pending/approved/rejected)
- workflow (jsonb) - stores workflow steps
- signed_by (text[]) - array of signers
- files (jsonb) - file metadata
- ... more fields
```

### approval_cards table
```sql
- id (UUID, primary key)
- document_id (UUID, foreign key)
- recipient_ids (text[]) - array of recipient IDs
- status (pending/approved/rejected)
- files (jsonb)
- ... more fields
```

### notification_preferences table
```sql
- user_id (text, unique)
- email (jsonb) - email preferences
- push (jsonb) - push preferences
- sms (jsonb) - SMS preferences
- whatsapp (jsonb) - WhatsApp preferences
```

---

## 🔔 Real-time Updates

Supabase provides real-time subscriptions:

```javascript
// Subscribe to approval card changes
const subscription = supabaseWorkflowService.subscribeToApprovalCards(
  recipientId,
  (payload) => {
    console.log('Change received:', payload);
    // Update UI automatically
  }
);

// Unsubscribe when done
subscription.unsubscribe();
```

---

## 🔐 Security (Row Level Security)

Current setup: **Allow all authenticated users**

For production, update policies in Supabase Dashboard:

```sql
-- Example: Users can only see their own documents
CREATE POLICY "Users see own documents" ON documents
  FOR SELECT USING (auth.uid()::text = submitted_by);

-- Example: Recipients see only their approval cards
CREATE POLICY "Recipients see own cards" ON approval_cards
  FOR SELECT USING (auth.uid()::text = ANY(recipient_ids));
```

---

## 🚀 Next Steps

### Option 1: Keep localStorage (Current)
- No changes needed
- Works offline
- Limited to browser storage

### Option 2: Migrate to Supabase (Recommended)
1. Update `Documents.tsx` to use `supabaseWorkflowService`
2. Update `Approvals.tsx` to use `supabaseWorkflowService`
3. Update `TrackDocuments.tsx` to use `supabaseWorkflowService`
4. Remove localStorage calls
5. Add real-time subscriptions

---

## 📝 Example Migration

### Before (localStorage):
```typescript
// Documents.tsx - handleDocumentSubmit
const existingCards = JSON.parse(localStorage.getItem('submitted-documents') || '[]');
existingCards.unshift(trackingCard);
localStorage.setItem('submitted-documents', JSON.stringify(existingCards));
```

### After (Supabase):
```typescript
// Documents.tsx - handleDocumentSubmit
import { supabaseWorkflowService } from '@/services/SupabaseWorkflowService';

const document = await supabaseWorkflowService.createDocument({
  title: data.title,
  type: data.documentTypes[0],
  submitted_by: user.id,
  submitted_by_name: currentUserName,
  workflow: {
    currentStep: workflowSteps[1].name,
    progress: 0,
    steps: workflowSteps,
    recipients: data.recipients
  },
  files: serializedFiles,
  status: 'pending'
});

// Create approval card
await supabaseWorkflowService.createApprovalCard({
  document_id: document.id,
  title: data.title,
  recipient_ids: data.recipients,
  recipients: recipientNames,
  files: serializedFiles,
  status: 'pending'
});
```

---

## ✅ Benefits of Supabase

1. **Persistent Storage** - Data survives browser clear
2. **Real-time Updates** - Automatic UI sync across tabs/devices
3. **Scalability** - Handle thousands of documents
4. **Backup & Recovery** - Automatic backups
5. **Query Performance** - Indexed searches
6. **Multi-user Support** - Concurrent access
7. **Security** - Row Level Security policies

---

## 🐛 Troubleshooting

### Connection Error
```
Error: Invalid API key
```
**Fix**: Check `.env` file has correct `VITE_SUPABASE_ANON_KEY`

### Table Not Found
```
Error: relation "documents" does not exist
```
**Fix**: Run `supabase-workflow-schema.sql` in SQL Editor

### CORS Error
```
Error: CORS policy blocked
```
**Fix**: Add your domain to Supabase Dashboard → Settings → API → CORS

---

## 📞 Support

**Supabase Dashboard**: https://supabase.com/dashboard/project/goupzmplowjbnnxmnvou

**Connection String**: 
```
postgresql://postgres.goupzmplowjbnnxmnvou:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

**Status**: ✅ Ready to use (schema created, client configured)
**Next**: Run schema in Supabase SQL Editor
