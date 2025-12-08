# IAOMS Production-Grade Backend Architecture

## Overview

This document describes the comprehensive, production-grade backend architecture for the Integrated Administrative Office Management System (IAOMS). The architecture is designed to be scalable, maintainable, and error-free for daily production use.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              IAOMS BACKEND ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         OPERATIONS (Core Table)                          │    │
│  │  - Central hub connecting all modules                                    │    │
│  │  - Tracks every operation with status, priority, timestamps              │    │
│  │  - Links to: documents, approvals, meetings, calendar, channels          │    │
│  └─────────────────────────────┬────────────────────────────────────────────┘    │
│                                │                                                  │
│    ┌───────────────────────────┼───────────────────────────────────┐             │
│    │                           │                                   │             │
│    ▼                           ▼                                   ▼             │
│  ┌────────────────┐  ┌────────────────────┐  ┌────────────────────────┐         │
│  │  RECIPIENTS    │  │    DOCUMENTS       │  │   APPROVAL_CARDS       │         │
│  │  (Users)       │  │    + Recipients    │  │   + Recipients         │         │
│  │                │  │    + Versions      │  │   + Approvals          │         │
│  │  - Google OAuth│  │    + Attachments   │  │   + Comments           │         │
│  │  - HITAM ID    │  │                    │  │   + Signatures         │         │
│  │  - Face Auth   │  │                    │  │                        │         │
│  └───────┬────────┘  └────────┬───────────┘  └───────────┬────────────┘         │
│          │                    │                          │                       │
│          │    ┌───────────────┴───────────────┐         │                       │
│          │    │       WORKFLOW ENGINE         │         │                       │
│          │    │  - Templates                  │         │                       │
│          │    │  - Instances                  │         │                       │
│          │    │  - Escalations                │◄────────┘                       │
│          │    │  - Sequential/Parallel/       │                                  │
│          │    │    Bidirectional Routing      │                                  │
│          │    └───────────────┬───────────────┘                                  │
│          │                    │                                                  │
│    ┌─────┴────────────────────┴───────────────────────────┐                     │
│    │                                                       │                     │
│    ▼                           ▼                           ▼                     │
│  ┌────────────────┐  ┌────────────────────┐  ┌────────────────────┐             │
│  │ NOTIFICATIONS  │  │    MEETINGS        │  │    CHANNELS        │             │
│  │                │  │    + Participants  │  │    + Members       │             │
│  │ - Email        │  │    + Live Requests │  │    + Messages      │             │
│  │ - Push         │  │                    │  │    + Read Receipts │             │
│  │ - SMS          │  │                    │  │                    │             │
│  │ - WhatsApp     │  │                    │  │                    │             │
│  │ - Queue System │  │                    │  │                    │             │
│  └────────────────┘  └────────────────────┘  └────────────────────┘             │
│                                                                                  │
│    ┌───────────────────────────────────────────────────────────────┐            │
│    │                     CALENDAR_EVENTS                           │            │
│    │  + Attendees  |  + Reminders  |  + Google Calendar Sync       │            │
│    └───────────────────────────────────────────────────────────────┘            │
│                                                                                  │
│    ┌───────────────────────────────────────────────────────────────┐            │
│    │                   ANALYTICS & DASHBOARD                        │            │
│    │  - Materialized Views (mv_document_stats, mv_approval_stats)  │            │
│    │  - Real-time Counters                                         │            │
│    │  - History Cards                                              │            │
│    │  - Recent Activity                                            │            │
│    │  - Dashboard Widgets                                          │            │
│    └───────────────────────────────────────────────────────────────┘            │
│                                                                                  │
│    ┌───────────────────────────────────────────────────────────────┐            │
│    │                      AUDIT & SECURITY                          │            │
│    │  - Audit Logs  |  - Auth Sessions  |  - Face Auth Records     │            │
│    │  - Row Level Security (RLS) Policies                          │            │
│    └───────────────────────────────────────────────────────────────┘            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Database Tables Overview

### 1. Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `operations` | Central hub for all operations | Links all modules, tracks status/priority |
| `recipients` | User management | Google OAuth, HITAM ID, Face Auth, Roles |
| `documents` | Document storage | Google Drive integration, versioning |
| `approval_cards` | Approval workflow cards | Multi-recipient routing |

### 2. Authentication Tables

| Table | Purpose |
|-------|---------|
| `recipients` | Main user table with auth methods |
| `auth_sessions` | Active session tracking |
| `face_auth_records` | Face verification history |
| `user_preferences` | User settings & preferences |
| `role_permissions` | Granular role-based permissions |

### 3. Document Management Tables

| Table | Purpose |
|-------|---------|
| `documents` | Core document data |
| `document_recipients` | Document → Recipient mapping |
| `document_versions` | Version history |
| `document_attachments` | Additional file attachments |

### 4. Workflow & Approval Tables

| Table | Purpose |
|-------|---------|
| `approval_cards` | Approval workflow cards |
| `approval_card_recipients` | Card → Recipient mapping |
| `approvals` | Approval action history |
| `workflow_templates` | Reusable workflow configs |
| `workflow_instances` | Active workflow executions |
| `escalations` | Escalated document tracking |

### 5. Notification Tables

| Table | Purpose |
|-------|---------|
| `notifications` | User notifications |
| `notification_templates` | Reusable templates |
| `notification_queue` | Async processing queue |
| `notification_subscriptions` | User subscription preferences |

### 6. Meeting & Calendar Tables

| Table | Purpose |
|-------|---------|
| `meetings` | Meeting management |
| `meeting_participants` | Attendee tracking |
| `live_meeting_requests` | Urgent meeting requests |
| `calendar_events` | Personal/shared events |
| `calendar_event_attendees` | Event attendees |

### 7. Communication Tables

| Table | Purpose |
|-------|---------|
| `channels` | Chat channels (dept, private, group) |
| `channel_members` | Channel membership |
| `messages` | Chat messages |
| `message_read_receipts` | Read tracking |

### 8. Signature & Audit Tables

| Table | Purpose |
|-------|---------|
| `comments` | Document/approval comments |
| `signatures` | Digital signatures |
| `signature_requests` | Signature collection requests |
| `audit_logs` | Complete audit trail |

### 9. Analytics & Dashboard Tables

| Table | Purpose |
|-------|---------|
| `dashboard_widgets` | User dashboard config |
| `analytics_metrics` | Computed analytics |
| `realtime_counters` | Live count values |
| `history_cards` | Completed operations |
| `recent_activity` | Recent user activity |
| `reminders` | Personal reminders |
| `notes` | Personal notes |

## Real-Time Features

### Real-Time Counters

The system maintains real-time counters that update automatically:

```sql
-- Available counters (global scope)
total_documents
pending_documents
approved_documents
rejected_documents
pending_approvals
total_meetings_today
active_users
total_messages_today
emergency_documents
documents_due_today
```

### Real-Time Subscriptions

Tables enabled for Supabase Realtime:
- `documents`
- `approval_cards`
- `notifications`
- `messages`
- `channels`
- `meetings`
- `calendar_events`
- `realtime_counters`
- `live_meeting_requests`

## Routing Types Supported

### 1. Sequential Routing
Documents flow through recipients one at a time in order.

### 2. Parallel Routing
Documents sent to all recipients simultaneously.

### 3. Reverse Routing
Documents flow from last recipient to first.

### 4. Bidirectional Routing
Parallel routing with Resend/Re-upload capability for rejected steps.

### 5. Hybrid Routing
Combination of the above based on workflow template configuration.

## Authentication Methods

### 1. Google OAuth
- Full OAuth 2.0 flow
- Token refresh support
- Profile sync

### 2. HITAM ID + Password
- Institutional ID login
- bcrypt password hashing
- Password expiry tracking

### 3. Face Authentication
- DeepFace integration
- Confidence scoring
- Multi-purpose verification (login, approval, signature)

## Storage Integration

### Google Drive
- File storage via Google Drive API
- Drive file ID tracking
- Web view/download links
- Folder organization

### Local References
- File metadata in Supabase
- URL references
- File hashes for integrity

## Notification Channels

1. **Email** - SMTP integration
2. **Push** - Web push notifications
3. **SMS** - Optional SMS gateway
4. **WhatsApp** - Optional WhatsApp Business API

## Security Features

### Row Level Security (RLS)
Every table has RLS policies for:
- Data isolation by user
- Role-based access
- Department-based visibility

### Audit Trail
Complete logging of:
- User actions
- Data changes (old/new values)
- IP addresses
- User agents

### Session Management
- Token-based authentication
- Session expiry
- Multi-device tracking
- Forced logout capability

## Migration Files

Apply migrations in order:

1. `001_core_operations_and_enums.sql` - Core tables and enum types
2. `002_recipients_authentication.sql` - User management
3. `003_documents_storage.sql` - Document tables
4. `004_approval_workflow.sql` - Approval system
5. `005_notifications_system.sql` - Notifications
6. `006_meetings_calendar.sql` - Meetings & calendar
7. `007_channels_messages.sql` - Chat system
8. `008_comments_signatures_audit.sql` - Comments, signatures, audit
9. `009_analytics_dashboard.sql` - Analytics & dashboard
10. `010_realtime_views_rls.sql` - Real-time & security

## API Endpoints (Recommended)

### Documents
- `POST /api/documents` - Create document
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Approvals
- `GET /api/approvals` - Get pending approvals
- `POST /api/approvals/:id/approve` - Approve
- `POST /api/approvals/:id/reject` - Reject
- `POST /api/approvals/:id/forward` - Forward

### Analytics (Real-time)
- `GET /api/analytics/counters` - Get real-time counts
- `GET /api/analytics/dashboard` - Dashboard data
- `WS /realtime/counters` - WebSocket for live updates

## Performance Optimizations

1. **Indexes** - Strategic indexes on all foreign keys and common queries
2. **Materialized Views** - Pre-computed analytics
3. **Connection Pooling** - Supabase built-in pooling
4. **Trigger-based Updates** - Real-time counter updates via triggers
5. **Pagination** - Built-in support for large datasets

## Scalability Considerations

1. **Horizontal Scaling** - Stateless design
2. **Read Replicas** - Supported by Supabase
3. **Caching Layer** - Redis recommended for high-traffic
4. **CDN** - Static assets via CDN
5. **Queue System** - Notification queue for async processing

## Monitoring & Alerting

Recommended monitoring:
- Database connection pool
- Query performance
- Real-time subscription count
- Notification delivery rate
- Error rates

## Backup & Recovery

1. **Automatic Backups** - Daily Supabase backups
2. **Point-in-Time Recovery** - Available on paid plans
3. **Migration Version Control** - All changes tracked

## Environment Variables Required

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Testing Strategy

1. **Unit Tests** - Service layer tests
2. **Integration Tests** - API endpoint tests
3. **E2E Tests** - Full workflow tests
4. **Load Tests** - Performance benchmarks

## Deployment Checklist

- [ ] Apply all migrations in order
- [ ] Run seed.sql for initial data
- [ ] Configure environment variables
- [ ] Enable RLS policies
- [ ] Set up real-time subscriptions
- [ ] Configure notification services
- [ ] Test all authentication methods
- [ ] Verify Google Drive integration
- [ ] Set up monitoring
- [ ] Configure backups

## Support

For issues or questions:
1. Check the audit logs for errors
2. Review Supabase dashboard for query performance
3. Monitor real-time subscription status
4. Check notification queue for delivery issues
