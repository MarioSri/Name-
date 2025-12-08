# Migration Application Guide

The MCP connection is read-only (`supabase_read_only_user`), so migrations must be applied manually through the **Supabase Dashboard SQL Editor**.

## Quick Start

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)

### Step 2: Apply Migrations in Order

**IMPORTANT:** Apply migrations in exact numerical order (001 → 010). Each migration depends on the previous one.

#### Migration Files Location
```
supabase/migrations/
├── 001_core_operations_and_enums.sql     ✅ ALREADY APPLIED
├── 002_recipients_authentication.sql      ⏳ APPLY NEXT
├── 003_documents_storage.sql
├── 004_approval_workflow.sql
├── 005_notifications_system.sql
├── 006_meetings_calendar.sql
├── 007_channels_messages.sql
├── 008_comments_signatures_audit.sql
├── 009_analytics_dashboard.sql
└── 010_realtime_views_rls.sql
```

### Step 3: Apply Each Migration

For each migration file:

1. **Open the SQL file** from `supabase/migrations/` folder
2. **Copy the entire content**
3. **Paste into Supabase SQL Editor**
4. **Click "Run"** (or press Ctrl+Enter)
5. **Verify success** - you should see green checkmarks
6. **Proceed to next migration**

### Step 4: Apply Seed Data (Optional)

After all migrations are applied:
1. Open `supabase/seed.sql`
2. Copy and paste into SQL Editor
3. Run to populate with sample data

## Verification Queries

After applying all migrations, run these queries to verify:

### Check All Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Tables (30+):**
- operations
- recipients
- auth_sessions
- face_auth_records
- user_preferences
- role_permissions
- documents
- document_recipients
- document_files
- document_versions
- approval_cards
- approval_card_recipients
- approvals
- workflow_templates
- workflow_routes
- workflow_instances
- notifications
- notification_preferences
- notification_queue
- notification_templates
- meetings
- meeting_participants
- calendar_events
- event_attendees
- live_meeting_requests
- channels
- channel_members
- messages
- message_reactions
- message_read_status
- comments
- digital_signatures
- signature_requests
- audit_logs
- history_cards
- analytics_metrics
- analytics_snapshots
- dashboard_widgets
- recent_documents
- reminders

### Check All Enums Exist
```sql
SELECT typname 
FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;
```

### Check Row Counts After Seed
```sql
SELECT 
  'recipients' as table_name, COUNT(*) as count FROM recipients
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'approval_cards', COUNT(*) FROM approval_cards
UNION ALL
SELECT 'channels', COUNT(*) FROM channels
ORDER BY table_name;
```

## Troubleshooting

### Error: "relation already exists"
The migration was already partially applied. You can either:
1. Drop the table and re-run: `DROP TABLE IF EXISTS table_name CASCADE;`
2. Skip the CREATE TABLE statement and run only remaining statements

### Error: "type already exists"
Skip the CREATE TYPE statement - the enum already exists.

### Error: "function update_updated_at_column does not exist"
Migration 001 wasn't applied. Apply it first - it creates the shared trigger function.

### Error: "column violates check constraint"
Data validation failed. Check the inserted data matches the enum values.

## Alternative: Supabase CLI

If you prefer CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Post-Migration Steps

After successful migration:

1. **Generate TypeScript Types**
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
   ```

2. **Verify Real-time Subscriptions**
   - Test with Supabase Studio > Realtime Inspector

3. **Update Frontend Services**
   - The services in `src/services/` should now work with the new schema

## Support

If you encounter issues:
1. Check Supabase Dashboard > Logs
2. Verify table relationships with Schema Visualizer
3. Review RLS policies if access is denied
