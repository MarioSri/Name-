-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 5: Notifications System
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('NOTIF-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  
  -- Recipient
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Type & Priority
  notification_type notification_type NOT NULL,
  priority priority_level DEFAULT 'normal',
  
  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Rich content
  data JSONB DEFAULT '{}',
  action_url TEXT,
  image_url TEXT,
  
  -- Related entities
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  approval_card_id UUID REFERENCES approval_cards(id) ON DELETE SET NULL,
  
  -- Sender (optional - for system notifications)
  sender_id UUID REFERENCES recipients(id),
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  
  -- Delivery
  channels_sent TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTIFICATION PREFERENCES (Per-user settings)
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID UNIQUE NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Channel preferences per notification type
  -- Structure: { "approval_request": ["email", "push"], "meeting_scheduled": ["email"] }
  channel_preferences JSONB DEFAULT '{
    "approval_request": ["email", "push", "in_app"],
    "approval_granted": ["email", "push", "in_app"],
    "approval_rejected": ["email", "push", "in_app"],
    "document_submitted": ["email", "in_app"],
    "document_updated": ["in_app"],
    "comment_added": ["push", "in_app"],
    "meeting_scheduled": ["email", "push", "in_app"],
    "meeting_reminder": ["push", "in_app"],
    "message_received": ["push", "in_app"],
    "escalation": ["email", "push", "sms", "in_app"],
    "emergency": ["email", "push", "sms", "whatsapp", "in_app"],
    "system": ["in_app"],
    "reminder": ["push", "in_app"]
  }',
  
  -- Global settings
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  
  -- Contact info for external channels
  phone_number VARCHAR(20),
  whatsapp_number VARCHAR(20),
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  quiet_hours_timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  
  -- Digest settings
  digest_enabled BOOLEAN DEFAULT FALSE,
  digest_frequency VARCHAR(20) DEFAULT 'daily' CHECK (digest_frequency IN ('hourly', 'daily', 'weekly')),
  digest_time TIME DEFAULT '08:00',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- NOTIFICATION QUEUE (For async processing)
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery details
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'whatsapp', 'in_app')),
  recipient_contact VARCHAR(255) NOT NULL,
  
  -- Content
  subject VARCHAR(255),
  body TEXT NOT NULL,
  template_id VARCHAR(100),
  template_data JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  
  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- External references
  external_id VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_channel ON notification_queue(channel);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_next_attempt ON notification_queue(next_attempt_at) WHERE status = 'pending';

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTIFICATION TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) UNIQUE NOT NULL,
  
  -- Template details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  notification_type notification_type NOT NULL,
  
  -- Content templates (supports variables like {{name}}, {{document_title}})
  email_subject VARCHAR(255),
  email_body TEXT,
  push_title VARCHAR(100),
  push_body VARCHAR(255),
  sms_body VARCHAR(160),
  whatsapp_template_id VARCHAR(100),
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Available variables documentation
  available_variables TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(notification_type);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Insert default notification templates
INSERT INTO notification_templates (template_key, name, notification_type, email_subject, email_body, push_title, push_body) VALUES
  ('approval_request', 'Approval Request', 'approval_request', 
   'Action Required: {{document_title}} needs your approval',
   'Dear {{recipient_name}},\n\n{{sender_name}} has submitted "{{document_title}}" for your approval.\n\nPlease review and take action.\n\nBest regards,\nIAOMS System',
   'Approval Required',
   '{{sender_name}} needs your approval for {{document_title}}'),
  ('approval_granted', 'Approval Granted', 'approval_granted',
   'Approved: {{document_title}}',
   'Dear {{recipient_name}},\n\nYour document "{{document_title}}" has been approved by {{approver_name}}.\n\nBest regards,\nIAOMS System',
   'Document Approved',
   '{{document_title}} has been approved'),
  ('approval_rejected', 'Approval Rejected', 'approval_rejected',
   'Rejected: {{document_title}}',
   'Dear {{recipient_name}},\n\nYour document "{{document_title}}" has been rejected by {{approver_name}}.\n\nReason: {{rejection_reason}}\n\nBest regards,\nIAOMS System',
   'Document Rejected',
   '{{document_title}} has been rejected'),
  ('meeting_scheduled', 'Meeting Scheduled', 'meeting_scheduled',
   'Meeting Invitation: {{meeting_title}}',
   'Dear {{recipient_name}},\n\nYou have been invited to a meeting.\n\nTitle: {{meeting_title}}\nDate: {{meeting_date}}\nTime: {{meeting_time}}\n\nBest regards,\nIAOMS System',
   'New Meeting',
   '{{meeting_title}} on {{meeting_date}}'),
  ('emergency', 'Emergency Alert', 'emergency',
   'URGENT: {{title}}',
   'EMERGENCY ALERT\n\n{{message}}\n\nPlease respond immediately.\n\nIAOMS System',
   'EMERGENCY',
   '{{title}} - Respond immediately')
ON CONFLICT (template_key) DO NOTHING;

