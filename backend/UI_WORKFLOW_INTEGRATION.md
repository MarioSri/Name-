# UI Workflow Integration Guide

This document explains how the backend integrates with UI workflows and ensures every page event triggers backend updates.

## Workflow Mapping

### 1. Document Management Page (`/documents`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Submit document | Create document record | `documents` table |
| Upload files | Create file records | `document_files` table |
| Select recipients | Create recipient records | `document_recipients` table |
| Custom file assignments | Create file assignments | `file_assignments` table |
| Submit button click | Trigger `handle_document_creation()` | Trigger function |

**Real-time Updates:**
- Document creation → Auto-creates approval cards
- Approval cards → Visible in Approval Center
- Notifications → Sent to recipients

### 2. Approval Center (`/approvals`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| View approval card | Load from `approval_cards` | `approval_cards` table |
| Approve button | Create approval record | `approvals` table |
| Reject button | Create rejection record | `approvals` table |
| Add comment | Create comment record | `comments` table |
| Share comment | Update comment shares | `comment_shares` table |
| Bypass recipient | Update bypassed recipients | `approval_cards` table |

**Workflow Progression:**
- Sequential: Moves to next recipient automatically
- Parallel: Tracks all approvals
- Reverse: Moves backward in chain
- Bi-Directional: Supports forward/backward flow

**Real-time Updates:**
- Approval action → Triggers `handle_approval_action()`
- Status change → Updates document status
- Next recipient → Receives notification

### 3. Track Documents (`/track-documents`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| View document list | Query `documents` table | `documents` table |
| Filter by status | Query with status filter | `documents` table |
| View document details | Load full document data | Multiple tables |
| View workflow progress | Load workflow instance | `workflow_instances` table |

**Real-time Updates:**
- Document status changes → Updates UI automatically
- Workflow progression → Updates progress bar
- New approvals → Updates approval history

### 4. Emergency Management (`/emergency`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Submit emergency document | Create with `is_emergency=true` | `documents` table |
| Set priority to urgent | Set `priority='urgent'` | `documents` table |
| Select parallel routing | Set `routing_type='parallel'` | `documents` table |

**Special Handling:**
- Emergency documents → Immediate notifications
- Urgent priority → High-priority notifications
- Parallel routing → All recipients notified simultaneously

### 5. Approval Routing (`/approval-routing`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Create workflow route | Insert into `workflow_routes` | `workflow_routes` table |
| Configure steps | Store steps JSON | `workflow_routes` table |
| Initiate workflow | Create workflow instance | `workflow_instances` table |

**Workflow Types:**
- Sequential → One step at a time
- Parallel → All steps simultaneously
- Reverse → Bottom-up flow
- Bi-Directional → Forward and backward

### 6. LiveMeet+ (`/approvals` → LiveMeet+ button)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Request LiveMeet+ | Create meeting request | `live_meeting_requests` table |
| Accept request | Update request status | `live_meeting_requests` table |
| Generate meeting link | Store in `meeting_link` | `live_meeting_requests` table |

**Real-time Updates:**
- Request created → Notification to target
- Request accepted → Notification to requester
- Meeting link → Available immediately

### 7. Messages (`/messages`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Create channel | Insert into `channels` | `channels` table |
| Send message | Insert into `messages` | `messages` table |
| Mark as read | Update `message_reads` | `message_reads` table |
| Auto-create channel | Trigger on document creation | `auto_create_document_channel()` |

**Auto-Channel Creation:**
- Document submitted → Auto-creates channel
- All recipients → Added as members
- Submitter → Admin of channel

### 8. Calendar (`/calendar`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Schedule meeting | Create meeting record | `calendar_meetings` table |
| Add attendees | Create attendee records | `meeting_attendees` table |
| Update meeting | Update meeting record | `calendar_meetings` table |
| Mark attendance | Update attendee status | `meeting_attendees` table |

**Real-time Updates:**
- Meeting created → Notifications to attendees
- Status changes → Updates calendar view
- Attendance → Updates meeting stats

### 9. Notifications (`/dashboard` → Notifications widget)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| View notifications | Query `notifications` | `notifications` table |
| Mark as read | Update `read` flag | `notifications` table |
| Update preferences | Update preferences | `notification_preferences` table |

**Notification Types:**
- Document submitted → `document-submitted`
- Approval required → `approval-required`
- Document approved → `document-approved`
- Comment added → `comment-added`
- Meeting scheduled → `meeting-scheduled`

### 10. Digital Signatures (`/approvals` → Sign button)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Sign with Documenso | Create signature record | `digital_signatures` table |
| Sign with Rekore | Create signature record | `digital_signatures` table |
| Store blockchain hash | Update signature record | `digital_signatures` table |

**Integration:**
- Documenso → API call → Store signature data
- Rekore Sign → API call → Store signature data
- Blockchain → Store transaction hash

### 11. Comments & Sharing (`/approvals` → Comments)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Add comment | Create comment record | `comments` table |
| Share with recipients | Create share records | `comment_shares` table |
| Share with all | Set `is_shared=true` | `comments` table |

**Visibility Control:**
- Private → Only author sees
- Shared with specific → Only shared recipients see
- Shared with all → All document recipients see

### 12. Dashboard (`/dashboard`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Load widgets | Query dashboard config | `dashboard_configs` table |
| Customize layout | Update layout JSON | `dashboard_configs` table |
| View stats | Query analytics | `analytics_dashboard` table |

**Widgets:**
- Documents widget → Queries `documents` table
- Calendar widget → Queries `calendar_meetings` table
- Notifications widget → Queries `notifications` table
- Analytics widget → Queries `analytics_dashboard` table

### 13. Analytics (`/analytics`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| View analytics | Query analytics data | `analytics_dashboard` table |
| Filter by period | Query with date range | `analytics_events` table |
| Export data | Query and format | Multiple tables |

**Metrics Tracked:**
- Document statistics
- Approval rates
- Processing times
- Meeting statistics
- User activity

### 14. Profile (`/profile`)

**UI Actions → Backend Updates:**

| UI Action | Backend Update | Table/Function |
|-----------|---------------|----------------|
| Update profile | Update `users` table | `users` table |
| Update preferences | Update `user_settings` | `user_settings` table |
| Update notifications | Update `notification_preferences` | `notification_preferences` table |

## Event Flow Examples

### Example 1: Document Submission Flow

```
1. User submits document in UI
   ↓
2. POST /functions/v1/documents
   ↓
3. Insert into `documents` table
   ↓
4. Trigger: handle_document_creation()
   ↓
5. Auto-create approval cards
   ↓
6. Auto-create channel
   ↓
7. Send notifications to recipients
   ↓
8. Real-time update → UI shows new document
```

### Example 2: Approval Flow (Sequential)

```
1. User approves document in UI
   ↓
2. POST /functions/v1/approvals/{id}/approve
   ↓
3. Insert into `approvals` table
   ↓
4. Trigger: handle_approval_action()
   ↓
5. Update approval card status
   ↓
6. Move to next recipient (if sequential)
   ↓
7. Update document workflow
   ↓
8. Send notification to next recipient
   ↓
9. Real-time update → UI shows updated status
```

### Example 3: Parallel Approval Flow

```
1. Document submitted with parallel routing
   ↓
2. All recipients receive approval cards simultaneously
   ↓
3. Each approval tracked independently
   ↓
4. When all approve → Document status = approved
   ↓
5. Real-time update → All UIs updated
```

## Real-time Subscriptions

### Frontend Subscription Example

```typescript
// Subscribe to document updates
const documentChannel = supabase
  .channel('document-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'documents',
    filter: `id=eq.${documentId}`
  }, (payload) => {
    // Update UI with new document status
    updateDocumentInUI(payload.new)
  })
  .subscribe()

// Subscribe to notifications
const notificationChannel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Show notification in UI
    showNotification(payload.new)
  })
  .subscribe()
```

## Backend Trigger Chain

Every UI action triggers a chain of backend updates:

```
UI Action
  ↓
Edge Function API Call
  ↓
Database Insert/Update
  ↓
Database Trigger
  ↓
Automated Actions:
  - Update related records
  - Create notifications
  - Update workflow status
  - Log analytics events
  - Create audit logs
  ↓
Real-time Broadcast
  ↓
UI Updates Automatically
```

## Testing Workflow Integration

### Test Document Submission

```typescript
// 1. Submit document
const doc = await submitDocument({
  title: 'Test Document',
  recipients: ['recipient-1', 'recipient-2'],
  routing_type: 'sequential'
})

// 2. Verify approval cards created
const cards = await getApprovalCards()
expect(cards).toHaveLength(1)

// 3. Verify notifications sent
const notifications = await getNotifications('recipient-1')
expect(notifications).toHaveLength(1)

// 4. Verify channel created
const channels = await getChannels()
expect(channels.some(c => c.document_id === doc.id)).toBe(true)
```

## Summary

Every UI page event is mapped to backend operations:

✅ **Document Management** → Creates documents, files, recipients  
✅ **Approval Center** → Creates approvals, updates workflow  
✅ **Track Documents** → Queries documents, workflow instances  
✅ **Emergency Management** → Creates emergency documents  
✅ **Workflow Routing** → Creates workflow routes, instances  
✅ **LiveMeet+** → Creates meeting requests  
✅ **Messages** → Creates channels, messages  
✅ **Calendar** → Creates meetings, attendees  
✅ **Notifications** → Creates, updates notifications  
✅ **Signatures** → Creates signature records  
✅ **Comments** → Creates comments, shares  
✅ **Dashboard** → Queries analytics, configs  
✅ **Analytics** → Logs events, queries metrics  
✅ **Profile** → Updates user settings  

All operations are:
- **Real-time** → Updates broadcast immediately
- **Audited** → All actions logged
- **Secure** → RLS policies enforced
- **Automated** → Triggers handle workflow progression

