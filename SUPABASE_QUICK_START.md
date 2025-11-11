# ⚡ Supabase Quick Start (2 Minutes)

## Step 1: Install (30 seconds)
```bash
npm install
```

## Step 2: Run Schema (1 minute)
1. Open: https://supabase.com/dashboard/project/goupzmplowjbnnxmnvou/sql
2. Click "New Query"
3. Copy ALL from `backend/supabase-workflow-schema.sql`
4. Paste and click "Run"
5. See: "Success. No rows returned"

## Step 3: Verify (30 seconds)
Run in SQL Editor:
```sql
SELECT COUNT(*) FROM documents;
```
Expected: Returns 0 (table exists, empty)

## ✅ Done!

Your database is ready. The app still uses localStorage by default.

---

## 🔄 To Use Supabase (Optional)

Replace in `Documents.tsx`:
```typescript
// OLD
localStorage.setItem('submitted-documents', JSON.stringify(docs));

// NEW
import { supabaseWorkflowService } from '@/services/SupabaseWorkflowService';
await supabaseWorkflowService.createDocument(doc);
```

---

## 📊 What You Got

- ✅ 4 database tables created
- ✅ Indexes for fast queries
- ✅ Real-time subscriptions ready
- ✅ Service layer implemented
- ✅ Environment configured

---

## 🐛 Troubleshooting

**Error: "relation does not exist"**
→ Run schema in SQL Editor

**Error: "Invalid API key"**
→ Check `.env` file exists

**Error: "npm install fails"**
→ Delete `node_modules` and `package-lock.json`, run again

---

**That's it! 2 minutes total.** 🚀
