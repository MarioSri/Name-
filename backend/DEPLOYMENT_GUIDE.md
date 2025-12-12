# IAOMS Backend Deployment Guide

## Quick Start

### Prerequisites
- Supabase account and project
- Supabase CLI installed (`npm install -g supabase`)
- Node.js 18+ installed

### Step 1: Initialize Supabase Project

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

### Step 2: Run Database Migrations

```bash
# Navigate to migrations directory
cd backend/supabase/migrations

# Run migrations in order
supabase db push

# Or run manually in Supabase SQL Editor:
# 1. Copy contents of 001_complete_iaoms_schema.sql
# 2. Copy contents of 002_rls_policies.sql
# 3. Copy contents of 003_triggers_and_functions.sql
```

### Step 3: Deploy Edge Functions

```bash
# Deploy all functions
cd ../../supabase/functions

supabase functions deploy documents
supabase functions deploy approvals
supabase functions deploy workflows
supabase functions deploy messages
supabase functions deploy meetings
supabase functions deploy signatures
supabase functions deploy comments
supabase functions deploy notifications
supabase functions deploy analytics
supabase functions deploy dashboard
```

### Step 4: Configure Environment Variables

In Supabase Dashboard > Settings > Edge Functions, add:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_ANON_KEY` - Your anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin ops)

### Step 5: Set Up Webhooks (Optional)

In Supabase Dashboard > Database > Webhooks:

1. **Document Status Changed**
   - Table: `documents`
   - Event: `UPDATE` (on `status` column)
   - URL: Your webhook endpoint

2. **Approval Action**
   - Table: `approvals`
   - Event: `INSERT`
   - URL: Your webhook endpoint

3. **Notification Created**
   - Table: `notifications`
   - Event: `INSERT`
   - URL: Your notification service endpoint

## Testing the Backend

### Test Document Creation

```bash
curl -X POST https://your-project.supabase.co/functions/v1/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Document",
    "type": "Letter",
    "priority": "high",
    "recipients": ["recipient-1"],
    "routing_type": "sequential"
  }'
```

### Test Approval

```bash
curl -X POST https://your-project.supabase.co/functions/v1/approvals/{cardId}/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Approved"
  }'
```

## API Endpoints Reference

### Documents
- `GET /functions/v1/documents` - List documents
- `GET /functions/v1/documents/:id` - Get document
- `POST /functions/v1/documents` - Create document
- `PUT /functions/v1/documents/:id` - Update document
- `DELETE /functions/v1/documents/:id` - Delete document

### Approvals
- `GET /functions/v1/approvals` - Get approval cards
- `POST /functions/v1/approvals/:id/approve` - Approve
- `POST /functions/v1/approvals/:id/reject` - Reject
- `POST /functions/v1/approvals/:id/bypass` - Bypass (admin)

### Workflows
- `GET /functions/v1/workflows` - List workflows
- `POST /functions/v1/workflows` - Create workflow
- `POST /functions/v1/workflows/:id/initiate` - Initiate workflow

### Messages
- `GET /functions/v1/channels` - List channels
- `POST /functions/v1/channels` - Create channel
- `GET /functions/v1/channels/:id/messages` - Get messages
- `POST /functions/v1/channels/:id/messages` - Send message

### Meetings
- `GET /functions/v1/meetings` - List meetings
- `POST /functions/v1/meetings` - Create meeting
- `POST /functions/v1/live-meet` - Create LiveMeet+ request
- `PUT /functions/v1/live-meet/:id/accept` - Accept request

### Signatures
- `POST /functions/v1/signatures` - Create signature
- `GET /functions/v1/signatures/:document_id` - Get signatures
- `POST /functions/v1/signatures/documenso` - Documenso integration
- `POST /functions/v1/signatures/rekore` - Rekore Sign integration

### Comments
- `GET /functions/v1/comments/:document_id` - Get comments
- `POST /functions/v1/comments` - Create comment
- `PUT /functions/v1/comments/:id/share` - Share comment

### Notifications
- `GET /functions/v1/notifications` - Get notifications
- `PUT /functions/v1/notifications/:id/read` - Mark as read
- `PUT /functions/v1/notifications/read-all` - Mark all as read
- `GET /functions/v1/notifications/preferences` - Get preferences
- `PUT /functions/v1/notifications/preferences` - Update preferences

### Analytics
- `GET /functions/v1/analytics/dashboard` - Get dashboard metrics
- `POST /functions/v1/analytics/events` - Log event

### Dashboard
- `GET /functions/v1/dashboard/config` - Get config
- `PUT /functions/v1/dashboard/config` - Update config

## Real-time Subscriptions

### Subscribe to Document Updates

```typescript
const channel = supabase
  .channel('document-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'documents',
    filter: `id=eq.${documentId}`
  }, (payload) => {
    console.log('Document updated:', payload.new)
  })
  .subscribe()
```

### Subscribe to Notifications

```typescript
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('New notification:', payload.new)
  })
  .subscribe()
```

## Troubleshooting

### Migration Errors
- Check if tables already exist
- Verify RLS policies are correct
- Check for foreign key constraints

### Edge Function Errors
- Check function logs in Supabase Dashboard
- Verify authentication token
- Check CORS headers

### RLS Policy Issues
- Test policies with different user roles
- Check user authentication
- Verify user_id matches

### Trigger Errors
- Check trigger function syntax
- Verify table references
- Check for circular dependencies

## Next Steps

1. **Configure External Services**
   - Set up email service (SendGrid, AWS SES)
   - Configure SMS service (Twilio)
   - Set up WhatsApp API
   - Configure Documenso/Rekore Sign

2. **Set Up Monitoring**
   - Enable Supabase monitoring
   - Set up error tracking
   - Configure alerts

3. **Performance Optimization**
   - Review query performance
   - Add indexes as needed
   - Optimize Edge Functions

4. **Security Hardening**
   - Review RLS policies
   - Enable audit logging
   - Set up backup strategy

