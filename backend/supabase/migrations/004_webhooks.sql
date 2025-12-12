-- ============================================================
-- IAOMS Webhooks Configuration
-- Database webhooks for external integrations
-- ============================================================

-- Note: Webhooks are typically configured in Supabase Dashboard
-- This file documents the webhook endpoints and their purposes

-- ============================================================
-- WEBHOOK ENDPOINTS TO CONFIGURE IN SUPABASE DASHBOARD
-- ============================================================

/*
1. Document Status Changed Webhook
   Table: documents
   Event: UPDATE (status column)
   URL: https://your-backend.com/webhooks/document-status-changed
   Purpose: Notify external systems when document status changes
   Payload: { document_id, old_status, new_status, document_data }

2. Approval Action Webhook
   Table: approvals
   Event: INSERT
   URL: https://your-backend.com/webhooks/approval-action
   Purpose: Trigger external approval workflows
   Payload: { approval_id, document_id, approver_id, action, comments }

3. Digital Signature Webhook
   Table: digital_signatures
   Event: INSERT
   URL: https://your-backend.com/webhooks/signature-completed
   Purpose: Integrate with Documenso/Rekore Sign
   Payload: { signature_id, document_id, signer_id, signature_method }

4. Meeting Scheduled Webhook
   Table: calendar_meetings
   Event: INSERT
   URL: https://your-backend.com/webhooks/meeting-scheduled
   Purpose: Sync with Google Calendar, Outlook, etc.
   Payload: { meeting_id, title, date, time, attendees }

5. LiveMeet+ Request Webhook
   Table: live_meeting_requests
   Event: INSERT
   URL: https://your-backend.com/webhooks/live-meet-request
   Purpose: Create Google Meet/Zoom links
   Payload: { request_id, requester_id, target_id, urgency }

6. Notification Created Webhook
   Table: notifications
   Event: INSERT
   URL: https://your-backend.com/webhooks/notification-created
   Purpose: Send email/SMS/WhatsApp notifications
   Payload: { notification_id, user_id, type, title, message }

7. Comment Created Webhook
   Table: comments
   Event: INSERT
   URL: https://your-backend.com/webhooks/comment-created
   Purpose: Notify document recipients of new comments
   Payload: { comment_id, document_id, author_id, content }

8. Message Created Webhook
   Table: messages
   Event: INSERT
   URL: https://your-backend.com/webhooks/message-created
   Purpose: Real-time messaging updates
   Payload: { message_id, channel_id, sender_id, content }

9. Analytics Event Webhook
   Table: analytics_events
   Event: INSERT
   URL: https://your-backend.com/webhooks/analytics-event
   Purpose: Send analytics to external systems
   Payload: { event_id, user_id, event_type, metadata }
*/

-- ============================================================
-- FUNCTION: Webhook Payload Builder
-- ============================================================

CREATE OR REPLACE FUNCTION build_webhook_payload(
    table_name TEXT,
    event_type TEXT,
    record_data JSONB
) RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'table', table_name,
        'event', event_type,
        'timestamp', NOW(),
        'data', record_data
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- EXAMPLE: Webhook Trigger Function
-- ============================================================

-- This is an example - actual webhooks are configured via Supabase Dashboard
-- or using pg_net extension for HTTP requests

CREATE OR REPLACE FUNCTION notify_webhook(
    webhook_url TEXT,
    payload JSONB
) RETURNS void AS $$
BEGIN
    -- Use pg_net extension to make HTTP request
    -- This requires pg_net extension to be enabled
    -- PERFORM net.http_post(
    --     url := webhook_url,
    --     headers := '{"Content-Type": "application/json"}'::jsonb,
    --     body := payload::text
    -- );
    
    -- For now, log the webhook call (implement actual HTTP call in application layer)
    RAISE NOTICE 'Webhook: % - Payload: %', webhook_url, payload;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- WEBHOOK CONFIGURATION NOTES
-- ============================================================

/*
To configure webhooks in Supabase:

1. Go to Database > Webhooks in Supabase Dashboard
2. Click "Create a new webhook"
3. Configure:
   - Table: Select the table to monitor
   - Events: Select INSERT, UPDATE, or DELETE
   - HTTP Request:
     * URL: Your webhook endpoint URL
     * Method: POST
     * Headers: Add Authorization header if needed
     * Body: Select "JSON" and use {{TABLE}}.{{EVENT}} variables

Example webhook body template:
{
  "table": "{{TABLE}}",
  "event": "{{EVENT}}",
  "data": {{TABLE}},
  "timestamp": "{{TIMESTAMP}}"
}

For real-time webhooks using Supabase Realtime:
- Use Supabase Realtime subscriptions in the frontend
- Or use Supabase Edge Functions as webhook handlers
- Or use external webhook services (Zapier, Make.com, etc.)
*/

