# IAOMS Backend Architecture Documentation

## Overview

This document describes the complete backend architecture for the IAOMS (Institutional Operations and Management System) built on Supabase. The backend covers all 17 core features with comprehensive database schema, Row Level Security (RLS) policies, Edge Functions, triggers, and webhooks.

## Architecture Components

### 1. Database Schema (`001_complete_iaoms_schema.sql`)

Complete PostgreSQL schema with tables for all features:

#### Core Tables
- **users** - User profiles extending Supabase auth
- **recipients** - Approval workflow recipients
- **documents** - Document management
- **document_files** - File attachments
- **document_recipients** - Many-to-many document recipients
- **file_assignments** - Recipient-based file visibility

#### Approval & Workflow Tables
- **approval_cards** - Approval cards for approval center
- **approval_card_recipients** - Recipients for each approval card
- **approvals** - Approval actions (approve/reject)
- **workflow_routes** - Workflow templates
- **workflow_instances** - Active workflow instances

#### Communication Tables
- **channels** - Chat channels
- **channel_members** - Channel membership
- **messages** - Chat messages
- **message_reads** - Message read receipts

#### Meeting Tables
- **calendar_meetings** - Calendar meetings
- **meeting_attendees** - Meeting attendees
- **live_meeting_requests** - LiveMeet+ requests

#### Other Tables
- **comments** - Approver comments
- **comment_shares** - Comment sharing
- **digital_signatures** - Digital signatures (Documenso/Rekore)
- **signature_requests** - Signature requests
- **notifications** - Notifications
- **notification_preferences** - User notification preferences
- **dashboard_configs** - Dashboard widget configurations
- **analytics_events** - Analytics events
- **analytics_dashboard** - Cached analytics data
- **user_settings** - User settings
- **audit_logs** - Audit trail

### 2. Row Level Security (`002_rls_policies.sql`)

Comprehensive RLS policies ensuring:
- Users can only access their own data
- Document recipients can view documents they're assigned to
- Approval cards visible only to current recipients
- Channel members can only see their channels
- Admins (principal, registrar, director) have elevated access

### 3. Database Triggers (`003_triggers_and_functions.sql`)

Automated workflow functions:

#### Key Triggers:
1. **handle_document_creation** - Auto-creates approval cards and notifications
2. **handle_document_status_update** - Moves workflow to next step on approval
3. **handle_approval_action** - Processes approval/rejection and updates workflow
4. **handle_comment_creation** - Notifies recipients of new comments
5. **handle_message_creation** - Notifies channel members of new messages
6. **handle_meeting_creation** - Notifies meeting attendees
7. **handle_live_meeting_request** - Creates LiveMeet+ notifications
8. **auto_create_document_channel** - Auto-creates channels for documents
9. **update_analytics_on_document_event** - Logs analytics events

### 4. Supabase Edge Functions

Serverless API endpoints:

#### `/functions/documents` - Document Management
- `GET /documents` - List documents
- `GET /documents/:id` - Get document
- `POST /documents` - Create document
- `PUT /documents/:id` - Update document
- `DELETE /documents/:id` - Delete document

#### `/functions/approvals` - Approval Chain
- `GET /approvals` - Get approval cards for user
- `POST /approvals/:id/approve` - Approve document
- `POST /approvals/:id/reject` - Reject document
- `POST /approvals/:id/bypass` - Bypass recipient (admin only)

#### `/functions/workflows` - Workflow Routing
- `GET /workflows` - List workflow routes
- `POST /workflows` - Create workflow route
- `POST /workflows/:id/initiate` - Initiate workflow instance

#### `/functions/messages` - Messages & Channels
- `GET /channels` - List user's channels
- `POST /channels` - Create channel
- `GET /channels/:id/messages` - Get messages
- `POST /channels/:id/messages` - Send message

#### `/functions/meetings` - Calendar & LiveMeet+
- `GET /meetings` - List meetings
- `POST /meetings` - Create meeting
- `POST /live-meet` - Create LiveMeet+ request
- `PUT /live-meet/:id/accept` - Accept LiveMeet+ request

#### `/functions/signatures` - Digital Signatures
- `POST /signatures` - Create signature
- `GET /signatures/:document_id` - Get signatures for document
- `POST /signatures/documenso` - Documenso integration
- `POST /signatures/rekore` - Rekore Sign integration

#### `/functions/comments` - Comments & Sharing
- `GET /comments/:document_id` - Get comments
- `POST /comments` - Create comment
- `PUT /comments/:id/share` - Share comment

#### `/functions/notifications` - Notifications
- `GET /notifications` - Get user notifications
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/read-all` - Mark all as read
- `GET /notifications/preferences` - Get preferences
- `PUT /notifications/preferences` - Update preferences

#### `/functions/analytics` - Analytics Dashboard
- `GET /analytics/dashboard` - Get dashboard metrics
- `POST /analytics/events` - Log analytics event

#### `/functions/dashboard` - Dashboard Widgets
- `GET /dashboard/config` - Get dashboard config
- `PUT /dashboard/config` - Update dashboard config

### 5. Webhooks (`004_webhooks.sql`)

Configure in Supabase Dashboard for:
- Document status changes
- Approval actions
- Digital signatures
- Meeting scheduling
- LiveMeet+ requests
- Notifications
- Comments
- Messages
- Analytics events

## Feature Coverage

### ✅ 1. Document Management
- Full CRUD operations
- File uploads and storage
- Document tracking
- Status management

### ✅ 2. Emergency Management
- Emergency flag on documents
- Priority routing
- Immediate notifications

### ✅ 3. Approval Chain with Bypass
- Sequential, parallel, reverse, bidirectional routing
- Bypass functionality for admins
- Workflow progression automation

### ✅ 4. Workflow Routing
- Sequential: One recipient at a time
- Parallel: All recipients simultaneously
- Reverse: Bottom-up approval
- Bi-Directional: Forward and backward flow

### ✅ 5. Document Tracking
- Complete audit trail
- Status tracking
- Progress monitoring

### ✅ 6. Approval Center + History
- Approval cards for pending approvals
- Approval history
- Status tracking

### ✅ 7. LiveMeet+
- Meeting request creation
- Urgency levels
- Integration with calendar

### ✅ 8. Messages + Channels
- Channel creation
- Real-time messaging
- Auto-channel creation for documents
- Thread replies

### ✅ 9. Notifications
- Multi-channel notifications (email, push, SMS, WhatsApp)
- User preferences
- Real-time updates

### ✅ 10. Approver Comments + Sharing
- Comments on documents
- Granular sharing control
- Thread support

### ✅ 11. Digital Signatures
- Documenso integration
- Rekore Sign integration
- Blockchain hashing support
- Signature verification

### ✅ 12. Recipient-based Document Visibility
- File assignments
- Custom visibility per recipient
- Role-based access

### ✅ 13. Calendar Meetings
- Meeting scheduling
- Attendee management
- Recurring meetings
- Calendar integration

### ✅ 14. Dashboard Widgets
- Customizable widgets
- Role-based dashboards
- Layout configuration

### ✅ 15. Real-time Update Triggers
- Database triggers for all events
- Real-time notifications
- Workflow automation

### ✅ 16. Profiles Settings
- User profile management
- Notification preferences
- Theme and language settings

### ✅ 17. Analytics Dashboard
- Document statistics
- Workflow metrics
- Meeting analytics
- Performance tracking

## Deployment Instructions

### 1. Run Migrations

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Run files in order:
# 1. 001_complete_iaoms_schema.sql
# 2. 002_rls_policies.sql
# 3. 003_triggers_and_functions.sql
# 4. 004_webhooks.sql (documentation only)
```

### 2. Deploy Edge Functions

```bash
# Deploy all functions
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

### 3. Configure Webhooks

In Supabase Dashboard:
1. Go to Database > Webhooks
2. Create webhooks for each event type
3. Configure HTTP endpoints

### 4. Environment Variables

Set in Supabase Dashboard > Settings > Edge Functions:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

## API Usage Examples

### Create Document
```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Document Title',
    type: 'Letter',
    priority: 'high',
    recipients: ['recipient-1', 'recipient-2'],
    routing_type: 'sequential'
  })
})
```

### Approve Document
```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/approvals/{cardId}/approve', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    comments: 'Approved'
  })
})
```

## Real-time Subscriptions

Use Supabase Realtime for live updates:

```typescript
const channel = supabase
  .channel('documents')
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

## Security Considerations

1. **RLS Policies**: All tables have RLS enabled
2. **Authentication**: All Edge Functions require authentication
3. **Authorization**: Role-based access control
4. **Audit Logging**: All critical actions logged
5. **Input Validation**: Validate all inputs in Edge Functions

## Performance Optimization

1. **Indexes**: Comprehensive indexes on all foreign keys and frequently queried columns
2. **Materialized Views**: Analytics dashboard uses cached data
3. **Connection Pooling**: Supabase handles connection pooling
4. **Caching**: Use Supabase cache for frequently accessed data

## Monitoring

- Use Supabase Dashboard for monitoring
- Check Edge Function logs
- Monitor database performance
- Track webhook delivery
- Review audit logs

## Support

For issues or questions:
1. Check Supabase logs
2. Review database triggers
3. Verify RLS policies
4. Check Edge Function logs
5. Review webhook configurations

