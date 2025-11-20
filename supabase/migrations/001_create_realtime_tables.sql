-- Migration: Create Real-Time Application Tables
-- Description: Migrate from localStorage to Supabase PostgreSQL with real-time support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SUBMITTED DOCUMENTS TABLE
-- Replaces: localStorage['submitted-documents']
-- =====================================================
CREATE TABLE IF NOT EXISTS submitted_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id TEXT UNIQUE NOT NULL, -- Original ID from localStorage
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    submitter_id TEXT REFERENCES recipients(user_id),
    submitter_name TEXT NOT NULL,
    submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    description TEXT,
    recipients TEXT[] NOT NULL,
    recipient_ids TEXT[] NOT NULL,
    workflow JSONB,
    source TEXT CHECK (source IN ('document-management', 'emergency-management', 'approval-chain-bypass')),
    routing_type TEXT CHECK (routing_type IN ('sequential', 'parallel', 'reverse', 'bidirectional')),
    is_emergency BOOLEAN DEFAULT FALSE,
    is_parallel BOOLEAN DEFAULT FALSE,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'partially-approved')) DEFAULT 'pending',
    signed_by TEXT[],
    rejected_by TEXT[],
    files JSONB, -- Array of file metadata
    metadata JSONB, -- Additional metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_submitted_docs_submitter ON submitted_documents(submitter_id);
CREATE INDEX idx_submitted_docs_status ON submitted_documents(status);
CREATE INDEX idx_submitted_docs_date ON submitted_documents(submitted_date DESC);
CREATE INDEX idx_submitted_docs_recipients ON submitted_documents USING GIN(recipient_ids);

-- =====================================================
-- PENDING APPROVALS TABLE
-- Replaces: localStorage['pending-approvals']
-- =====================================================
CREATE TABLE IF NOT EXISTS pending_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_id TEXT UNIQUE NOT NULL,
    tracking_card_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    submitter_name TEXT NOT NULL,
    submitter_id TEXT REFERENCES recipients(user_id),
    submitted_date TIMESTAMP WITH TIME ZONE,
    priority TEXT,
    description TEXT,
    recipients TEXT[],
    recipient_ids TEXT[],
    workflow JSONB,
    source TEXT,
    routing_type TEXT,
    is_emergency BOOLEAN DEFAULT FALSE,
    is_parallel BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending',
    files JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for recipient filtering
CREATE INDEX idx_pending_approvals_recipients ON pending_approvals USING GIN(recipient_ids);
CREATE INDEX idx_pending_approvals_status ON pending_approvals(status);
CREATE INDEX idx_pending_approvals_tracking ON pending_approvals(tracking_card_id);

-- =====================================================
-- NOTIFICATIONS TABLE
-- Replaces: localStorage['notifications']
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id TEXT UNIQUE NOT NULL,
    user_id TEXT REFERENCES recipients(user_id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- CALENDAR EVENTS TABLE
-- Replaces: localStorage['meetings']
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    organizer_id TEXT REFERENCES recipients(user_id),
    organizer_name TEXT NOT NULL,
    attendees TEXT[],
    attendee_ids TEXT[],
    type TEXT CHECK (type IN ('meeting', 'event', 'reminder', 'deadline')),
    status TEXT CHECK (status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_attendees ON calendar_events USING GIN(attendee_ids);
CREATE INDEX idx_calendar_events_organizer ON calendar_events(organizer_id);

-- =====================================================
-- USER PREFERENCES TABLE
-- Replaces: localStorage['user-preferences-*']
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE REFERENCES recipients(user_id),
    notification_preferences JSONB,
    ui_preferences JSONB,
    workflow_preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EMERGENCY SUBMISSIONS TABLE
-- Replaces: localStorage['emergency-submissions']
-- =====================================================
CREATE TABLE IF NOT EXISTS emergency_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id TEXT UNIQUE NOT NULL,
    document_id TEXT NOT NULL,
    submitter_id TEXT REFERENCES recipients(user_id),
    submitter_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'critical',
    recipients TEXT[],
    recipient_ids TEXT[],
    status TEXT DEFAULT 'pending',
    escalation_level INTEGER DEFAULT 0,
    escalation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emergency_submissions_status ON emergency_submissions(status);
CREATE INDEX idx_emergency_submissions_created ON emergency_submissions(created_at DESC);

-- =====================================================
-- LIVEMEET REQUESTS TABLE
-- Replaces: localStorage['livemeet-requests']
-- =====================================================
CREATE TABLE IF NOT EXISTS livemeet_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id TEXT UNIQUE NOT NULL,
    initiator_id TEXT REFERENCES recipients(user_id),
    initiator_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    recipients TEXT[],
    recipient_ids TEXT[],
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')) DEFAULT 'pending',
    meeting_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_livemeet_requests_recipients ON livemeet_requests USING GIN(recipient_ids);
CREATE INDEX idx_livemeet_requests_status ON livemeet_requests(status);

-- =====================================================
-- CHAT MESSAGES TABLE
-- Replaces: localStorage['chat-messages-*']
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT UNIQUE NOT NULL,
    channel_id TEXT NOT NULL,
    sender_id TEXT REFERENCES recipients(user_id),
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'file', 'system')) DEFAULT 'text',
    attachments JSONB,
    is_encrypted BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);

-- =====================================================
-- CHANNELS TABLE
-- Replaces: localStorage['channels']
-- =====================================================
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('direct', 'group', 'public', 'private')) DEFAULT 'group',
    creator_id TEXT REFERENCES recipients(user_id),
    members TEXT[],
    member_ids TEXT[],
    auto_delete_enabled BOOLEAN DEFAULT FALSE,
    auto_delete_hours INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_channels_members ON channels USING GIN(member_ids);

-- =====================================================
-- POLLS TABLE
-- Replaces: localStorage['polls']
-- =====================================================
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    creator_id TEXT REFERENCES recipients(user_id),
    creator_name TEXT NOT NULL,
    options JSONB NOT NULL,
    votes JSONB DEFAULT '[]'::jsonb,
    voters TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    ends_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_polls_active ON polls(is_active, ends_at);

-- =====================================================
-- NOTES AND REMINDERS TABLE
-- Replaces: localStorage['notes'], localStorage['reminders']
-- =====================================================
CREATE TABLE IF NOT EXISTS notes_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id TEXT UNIQUE NOT NULL,
    user_id TEXT REFERENCES recipients(user_id),
    type TEXT CHECK (type IN ('note', 'reminder')) NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    priority TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    reminder_time TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notes_reminders_user ON notes_reminders(user_id, type);
CREATE INDEX idx_notes_reminders_time ON notes_reminders(reminder_time);

-- =====================================================
-- ESCALATION DATA TABLE
-- Replaces: localStorage['escalation-*']
-- =====================================================
CREATE TABLE IF NOT EXISTS escalation_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id TEXT NOT NULL,
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    escalated_to TEXT[],
    escalated_to_ids TEXT[],
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escalation_data_document ON escalation_data(document_id);

-- =====================================================
-- DOCUMENT RESPONSES TABLE
-- Replaces: localStorage['document-responses-*']
-- =====================================================
CREATE TABLE IF NOT EXISTS document_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id TEXT NOT NULL,
    recipient_id TEXT REFERENCES recipients(user_id),
    recipient_name TEXT NOT NULL,
    response_type TEXT CHECK (response_type IN ('approve', 'reject', 'comment', 'bypass')),
    response_text TEXT,
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_document_responses_document ON document_responses(document_id);
CREATE INDEX idx_document_responses_recipient ON document_responses(recipient_id);

-- =====================================================
-- ENABLE REAL-TIME FOR ALL TABLES
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE submitted_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE livemeet_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE channels;
ALTER PUBLICATION supabase_realtime ADD TABLE polls;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE submitted_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE livemeet_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_responses ENABLE ROW LEVEL SECURITY;

-- Submitted Documents Policies
CREATE POLICY "Users can view their submitted documents"
    ON submitted_documents FOR SELECT
    USING (submitter_id = auth.uid() OR auth.uid()::text = ANY(recipient_ids));

CREATE POLICY "Users can insert their own documents"
    ON submitted_documents FOR INSERT
    WITH CHECK (submitter_id = auth.uid());

CREATE POLICY "Users can update their own documents"
    ON submitted_documents FOR UPDATE
    USING (submitter_id = auth.uid() OR auth.uid()::text = ANY(recipient_ids));

-- Pending Approvals Policies
CREATE POLICY "Users can view approvals assigned to them"
    ON pending_approvals FOR SELECT
    USING (auth.uid()::text = ANY(recipient_ids));

CREATE POLICY "System can insert approvals"
    ON pending_approvals FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Recipients can update approvals"
    ON pending_approvals FOR UPDATE
    USING (auth.uid()::text = ANY(recipient_ids));

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Calendar Events Policies
CREATE POLICY "Users can view events they're invited to"
    ON calendar_events FOR SELECT
    USING (organizer_id = auth.uid() OR auth.uid()::text = ANY(attendee_ids));

CREATE POLICY "Users can create events"
    ON calendar_events FOR INSERT
    WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update their events"
    ON calendar_events FOR UPDATE
    USING (organizer_id = auth.uid());

-- User Preferences Policies
CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    USING (user_id = auth.uid());

-- Emergency Submissions Policies
CREATE POLICY "All authenticated users can view emergency submissions"
    ON emergency_submissions FOR SELECT
    USING (auth.uid()::text = ANY(recipient_ids) OR submitter_id = auth.uid());

CREATE POLICY "Users can create emergency submissions"
    ON emergency_submissions FOR INSERT
    WITH CHECK (submitter_id = auth.uid());

-- LiveMeet Requests Policies
CREATE POLICY "Users can view meeting requests for them"
    ON livemeet_requests FOR SELECT
    USING (initiator_id = auth.uid() OR auth.uid()::text = ANY(recipient_ids));

CREATE POLICY "Users can create meeting requests"
    ON livemeet_requests FOR INSERT
    WITH CHECK (initiator_id = auth.uid());

CREATE POLICY "Users can update their meeting requests"
    ON livemeet_requests FOR UPDATE
    USING (initiator_id = auth.uid() OR auth.uid()::text = ANY(recipient_ids));

-- Chat Messages Policies
CREATE POLICY "Channel members can view messages"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM channels
            WHERE channels.channel_id = chat_messages.channel_id
            AND auth.uid()::text = ANY(channels.member_ids)
        )
    );

CREATE POLICY "Channel members can send messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM channels
            WHERE channels.channel_id = chat_messages.channel_id
            AND auth.uid()::text = ANY(channels.member_ids)
        )
    );

-- Channels Policies
CREATE POLICY "Members can view their channels"
    ON channels FOR SELECT
    USING (auth.uid()::text = ANY(member_ids));

CREATE POLICY "Users can create channels"
    ON channels FOR INSERT
    WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their channels"
    ON channels FOR UPDATE
    USING (creator_id = auth.uid());

-- Polls Policies
CREATE POLICY "All users can view active polls"
    ON polls FOR SELECT
    USING (is_active = true);

CREATE POLICY "Users can create polls"
    ON polls FOR INSERT
    WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their polls"
    ON polls FOR UPDATE
    USING (creator_id = auth.uid());

-- Notes and Reminders Policies
CREATE POLICY "Users can view their own notes and reminders"
    ON notes_reminders FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own notes and reminders"
    ON notes_reminders FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notes and reminders"
    ON notes_reminders FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes and reminders"
    ON notes_reminders FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_submitted_documents_updated_at BEFORE UPDATE ON submitted_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_approvals_updated_at BEFORE UPDATE ON pending_approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_submissions_updated_at BEFORE UPDATE ON emergency_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_livemeet_requests_updated_at BEFORE UPDATE ON livemeet_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON polls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_reminders_updated_at BEFORE UPDATE ON notes_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalation_data_updated_at BEFORE UPDATE ON escalation_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
