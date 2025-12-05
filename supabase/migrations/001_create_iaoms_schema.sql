-- =====================================================
-- IAOMS Complete Database Schema (Normalized)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- =====================================================

-- 1. RECIPIENTS TABLE (Maps Google users to institutional roles)
CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE',
  role_type TEXT NOT NULL DEFAULT 'EMPLOYEE',
  department TEXT,
  branch TEXT,
  avatar TEXT,
  phone TEXT,
  designation TEXT,
  can_approve BOOLEAN DEFAULT false,
  approval_level INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DOCUMENTS TABLE (Tracking cards - submitted documents)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'Letter',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  submitter_id TEXT NOT NULL REFERENCES recipients(user_id) ON DELETE CASCADE,
  submitter_name TEXT NOT NULL,
  submitter_role TEXT,
  routing_type TEXT DEFAULT 'sequential',
  is_emergency BOOLEAN DEFAULT false,
  is_parallel BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'document-management',
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  workflow JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DOCUMENT_RECIPIENTS TABLE (Junction table for document recipients)
CREATE TABLE IF NOT EXISTS document_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  recipient_user_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, recipient_id)
);

-- 4. APPROVAL CARDS TABLE (Cards sent to recipients for approval)
CREATE TABLE IF NOT EXISTS approval_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id TEXT UNIQUE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  tracking_card_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'Letter',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  submitter TEXT NOT NULL,
  submitter_id TEXT,
  current_recipient_id TEXT,
  routing_type TEXT DEFAULT 'sequential',
  is_emergency BOOLEAN DEFAULT false,
  is_parallel BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'document-management',
  workflow JSONB DEFAULT '{}',
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. APPROVAL_CARD_RECIPIENTS TABLE (Junction table for approval card recipients)
CREATE TABLE IF NOT EXISTS approval_card_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_card_id UUID NOT NULL REFERENCES approval_cards(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  recipient_user_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(approval_card_id, recipient_id)
);

-- 6. APPROVALS TABLE (Individual approval actions)
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_card_id UUID NOT NULL REFERENCES approval_cards(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  approver_user_id TEXT NOT NULL,
  approver_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  comments TEXT,
  signature_url TEXT,
  signature_data JSONB,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SIGNATURES TABLE (Digital signatures)
CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  approval_id UUID REFERENCES approvals(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  signer_user_id TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signature_type TEXT DEFAULT 'drawn',
  position JSONB DEFAULT '{}',
  page_number INTEGER DEFAULT 1,
  is_verified BOOLEAN DEFAULT false,
  blockchain_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CHANNELS TABLE (Department and private chats)
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'department',
  department TEXT,
  created_by TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_delete_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CHANNEL_MEMBERS TABLE (Junction table for channel members)
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  member_user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, member_id)
);

-- 10. MESSAGES TABLE (Chat messages)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  attachments JSONB DEFAULT '[]',
  reply_to UUID REFERENCES messages(id),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. MESSAGE_READS TABLE (Track message read status)
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reader_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, reader_id)
);

-- 12. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT UNIQUE NOT NULL,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  recipient_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  category TEXT DEFAULT 'general',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. MEETINGS TABLE
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  host_user_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  meeting_url TEXT,
  meeting_type TEXT DEFAULT 'video',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. MEETING_PARTICIPANTS TABLE (Junction table for meeting participants)
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  participant_user_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  status TEXT DEFAULT 'invited',
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(meeting_id, participant_id)
);

-- 15. CALENDAR EVENTS TABLE
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  event_type TEXT DEFAULT 'event',
  color TEXT,
  recurrence_rule TEXT,
  location TEXT,
  is_private BOOLEAN DEFAULT false,
  reminder_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. EVENT_ATTENDEES TABLE (Junction table for event attendees)
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  attendee_user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  UNIQUE(event_id, attendee_id)
);

-- 17. USER_PREFERENCES TABLE (User settings and preferences)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE UNIQUE,
  user_ref_id TEXT NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. COMMENTS TABLE (Document and approval comments)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  approval_card_id UUID REFERENCES approval_cards(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email);
CREATE INDEX IF NOT EXISTS idx_recipients_role ON recipients(role);
CREATE INDEX IF NOT EXISTS idx_recipients_department ON recipients(department);
CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients(user_id);

CREATE INDEX IF NOT EXISTS idx_documents_submitter ON documents(submitter_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_tracking ON documents(tracking_id);

CREATE INDEX IF NOT EXISTS idx_document_recipients_doc ON document_recipients(document_id);
CREATE INDEX IF NOT EXISTS idx_document_recipients_recipient ON document_recipients(recipient_id);

CREATE INDEX IF NOT EXISTS idx_approval_cards_recipient ON approval_cards(current_recipient_id);
CREATE INDEX IF NOT EXISTS idx_approval_cards_tracking ON approval_cards(tracking_card_id);
CREATE INDEX IF NOT EXISTS idx_approval_cards_status ON approval_cards(status);
CREATE INDEX IF NOT EXISTS idx_approval_cards_document ON approval_cards(document_id);

CREATE INDEX IF NOT EXISTS idx_approval_card_recipients_card ON approval_card_recipients(approval_card_id);
CREATE INDEX IF NOT EXISTS idx_approval_card_recipients_recipient ON approval_card_recipients(recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_approvals_card ON approvals(approval_card_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(approver_user_id);

CREATE INDEX IF NOT EXISTS idx_signatures_document ON signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signer ON signatures(signer_user_id);

CREATE INDEX IF NOT EXISTS idx_channels_department ON channels(department);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_member ON channel_members(member_user_id);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_meetings_host ON meetings(host_user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_participant ON meeting_participants(participant_user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_attendee ON event_attendees(attendee_user_id);

CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(document_id);
CREATE INDEX IF NOT EXISTS idx_comments_approval ON comments(approval_card_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_user_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_card_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (Allow all for anon - adjust for production)
-- =====================================================
DROP POLICY IF EXISTS "recipients_all" ON recipients;
DROP POLICY IF EXISTS "documents_all" ON documents;
DROP POLICY IF EXISTS "document_recipients_all" ON document_recipients;
DROP POLICY IF EXISTS "approval_cards_all" ON approval_cards;
DROP POLICY IF EXISTS "approval_card_recipients_all" ON approval_card_recipients;
DROP POLICY IF EXISTS "approvals_all" ON approvals;
DROP POLICY IF EXISTS "signatures_all" ON signatures;
DROP POLICY IF EXISTS "channels_all" ON channels;
DROP POLICY IF EXISTS "channel_members_all" ON channel_members;
DROP POLICY IF EXISTS "messages_all" ON messages;
DROP POLICY IF EXISTS "message_reads_all" ON message_reads;
DROP POLICY IF EXISTS "notifications_all" ON notifications;
DROP POLICY IF EXISTS "meetings_all" ON meetings;
DROP POLICY IF EXISTS "meeting_participants_all" ON meeting_participants;
DROP POLICY IF EXISTS "calendar_events_all" ON calendar_events;
DROP POLICY IF EXISTS "event_attendees_all" ON event_attendees;
DROP POLICY IF EXISTS "user_preferences_all" ON user_preferences;
DROP POLICY IF EXISTS "comments_all" ON comments;

CREATE POLICY "recipients_all" ON recipients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "documents_all" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "document_recipients_all" ON document_recipients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "approval_cards_all" ON approval_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "approval_card_recipients_all" ON approval_card_recipients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "approvals_all" ON approvals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "signatures_all" ON signatures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "channels_all" ON channels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "channel_members_all" ON channel_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "messages_all" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "message_reads_all" ON message_reads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "notifications_all" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "meetings_all" ON meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "meeting_participants_all" ON meeting_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "calendar_events_all" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "event_attendees_all" ON event_attendees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "user_preferences_all" ON user_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "comments_all" ON comments FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- ENABLE REALTIME FOR ALL TABLES
-- =====================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'recipients', 'documents', 'document_recipients', 
    'approval_cards', 'approval_card_recipients', 'approvals', 'signatures',
    'channels', 'channel_members', 'messages', 'message_reads',
    'notifications', 'meetings', 'meeting_participants',
    'calendar_events', 'event_attendees', 'user_preferences', 'comments'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'recipients', 'documents', 'approval_cards', 'channels', 
    'messages', 'meetings', 'calendar_events', 'user_preferences', 'comments'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
  END LOOP;
END $$;
