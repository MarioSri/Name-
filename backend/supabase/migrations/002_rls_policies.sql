-- ============================================================
-- IAOMS Row Level Security (RLS) Policies
-- Comprehensive security policies for all tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_card_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS TABLE POLICIES
-- ============================================================

-- Users can view their own profile
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Principals and admins can view all users
CREATE POLICY "users_select_admin" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('principal', 'registrar', 'director')
        )
    );

-- ============================================================
-- RECIPIENTS TABLE POLICIES
-- ============================================================

-- Anyone can view recipients (needed for workflow)
CREATE POLICY "recipients_select_all" ON recipients
    FOR SELECT USING (true);

-- Authenticated users can insert recipients
CREATE POLICY "recipients_insert_authenticated" ON recipients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own recipient record
CREATE POLICY "recipients_update_own" ON recipients
    FOR UPDATE USING (
        user_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('principal', 'registrar', 'director')
        )
    );

-- ============================================================
-- DOCUMENTS TABLE POLICIES
-- ============================================================

-- Users can view documents they submitted or are recipients of
CREATE POLICY "documents_select_own_or_recipient" ON documents
    FOR SELECT USING (
        submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM document_recipients dr
            WHERE dr.document_id = documents.id
            AND dr.recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('principal', 'registrar', 'director')
        )
    );

-- Authenticated users can create documents
CREATE POLICY "documents_insert_authenticated" ON documents
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- Users can update documents they submitted or are current recipients
CREATE POLICY "documents_update_own_or_current" ON documents
    FOR UPDATE USING (
        submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM document_recipients dr
            WHERE dr.document_id = documents.id
            AND dr.recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
            AND dr.status = 'current'
        )
        OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('principal', 'registrar', 'director')
        )
    );

-- ============================================================
-- DOCUMENT FILES TABLE POLICIES
-- ============================================================

-- Users can view files for documents they have access to
CREATE POLICY "document_files_select_authorized" ON document_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_files.document_id
            AND (
                d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM document_recipients dr
                    WHERE dr.document_id = d.id
                    AND dr.recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
                )
                OR EXISTS (
                    SELECT 1 FROM file_assignments fa
                    WHERE fa.file_id = document_files.id
                    AND fa.recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
                )
            )
        )
    );

-- Document submitters can upload files
CREATE POLICY "document_files_insert_authorized" ON document_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_files.document_id
            AND d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
    );

-- ============================================================
-- DOCUMENT RECIPIENTS TABLE POLICIES
-- ============================================================

-- Users can view recipients for documents they have access to
CREATE POLICY "document_recipients_select_authorized" ON document_recipients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_recipients.document_id
            AND (
                d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
                OR document_recipients.recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
            )
        )
    );

-- Document submitters can add recipients
CREATE POLICY "document_recipients_insert_authorized" ON document_recipients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_recipients.document_id
            AND d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
    );

-- ============================================================
-- FILE ASSIGNMENTS TABLE POLICIES
-- ============================================================

-- Users can view file assignments for files they have access to
CREATE POLICY "file_assignments_select_authorized" ON file_assignments
    FOR SELECT USING (
        recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM documents d
            JOIN document_files df ON df.document_id = d.id
            WHERE df.id = file_assignments.file_id
            AND d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
    );

-- Document submitters can create file assignments
CREATE POLICY "file_assignments_insert_authorized" ON file_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN document_files df ON df.document_id = d.id
            WHERE df.id = file_assignments.file_id
            AND d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
    );

-- ============================================================
-- APPROVAL CARDS TABLE POLICIES
-- ============================================================

-- Users can view approval cards where they are recipients
CREATE POLICY "approval_cards_select_recipient" ON approval_cards
    FOR SELECT USING (
        current_recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR (SELECT id::text FROM users WHERE id = auth.uid()) = ANY(recipient_ids)
        OR submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('principal', 'registrar', 'director')
        )
    );

-- System can create approval cards (via service role)
CREATE POLICY "approval_cards_insert_system" ON approval_cards
    FOR INSERT WITH CHECK (true);

-- Current recipient can update approval cards
CREATE POLICY "approval_cards_update_current" ON approval_cards
    FOR UPDATE USING (
        current_recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('principal', 'registrar', 'director')
        )
    );

-- ============================================================
-- APPROVALS TABLE POLICIES
-- ============================================================

-- Users can view approvals for documents they have access to
CREATE POLICY "approvals_select_authorized" ON approvals
    FOR SELECT USING (
        approver_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = approvals.document_id
            AND (
                d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM document_recipients dr
                    WHERE dr.document_id = d.id
                    AND dr.recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
                )
            )
        )
    );

-- Approvers can create approval records
CREATE POLICY "approvals_insert_approver" ON approvals
    FOR INSERT WITH CHECK (
        approver_id = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- ============================================================
-- COMMENTS TABLE POLICIES
-- ============================================================

-- Users can view comments for documents they have access to
CREATE POLICY "comments_select_authorized" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = comments.document_id
            AND (
                d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM document_recipients dr
                    WHERE dr.document_id = d.id
                    AND dr.recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
                )
                OR comments.is_shared = true
                OR 'all' = ANY(comments.shared_with)
                OR (SELECT id::text FROM users WHERE id = auth.uid()) = ANY(comments.shared_with)
                OR EXISTS (
                    SELECT 1 FROM comment_shares cs
                    WHERE cs.comment_id = comments.id
                    AND cs.shared_with_id = (SELECT id::text FROM users WHERE id = auth.uid())
                )
            )
        )
    );

-- Users can create comments for documents they have access to
CREATE POLICY "comments_insert_authorized" ON comments
    FOR INSERT WITH CHECK (
        author_id = (SELECT id::text FROM users WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = comments.document_id
            AND (
                d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM document_recipients dr
                    WHERE dr.document_id = d.id
                    AND dr.recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
                )
            )
        )
    );

-- Users can update their own comments
CREATE POLICY "comments_update_own" ON comments
    FOR UPDATE USING (author_id = (SELECT id::text FROM users WHERE id = auth.uid()));

-- Users can delete their own comments
CREATE POLICY "comments_delete_own" ON comments
    FOR DELETE USING (author_id = (SELECT id::text FROM users WHERE id = auth.uid()));

-- ============================================================
-- DIGITAL SIGNATURES TABLE POLICIES
-- ============================================================

-- Users can view signatures for documents they have access to
CREATE POLICY "digital_signatures_select_authorized" ON digital_signatures
    FOR SELECT USING (
        signer_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = digital_signatures.document_id
            AND (
                d.submitter_id = (SELECT id::text FROM users WHERE id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM document_recipients dr
                    WHERE dr.document_id = d.id
                    AND dr.recipient_id = (SELECT id::text FROM users WHERE id = auth.uid())
                )
            )
        )
    );

-- Signers can create signature records
CREATE POLICY "digital_signatures_insert_signer" ON digital_signatures
    FOR INSERT WITH CHECK (
        signer_id = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- ============================================================
-- LIVE MEETING REQUESTS TABLE POLICIES
-- ============================================================

-- Users can view meeting requests they sent or received
CREATE POLICY "live_meeting_requests_select_own" ON live_meeting_requests
    FOR SELECT USING (
        requester_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR target_id = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- Users can create meeting requests
CREATE POLICY "live_meeting_requests_insert_authenticated" ON live_meeting_requests
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND requester_id = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- Requesters and targets can update meeting requests
CREATE POLICY "live_meeting_requests_update_own" ON live_meeting_requests
    FOR UPDATE USING (
        requester_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR target_id = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- ============================================================
-- CHANNELS TABLE POLICIES
-- ============================================================

-- Users can view channels they are members of or public channels
CREATE POLICY "channels_select_member" ON channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = channels.id
            AND cm.user_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
        OR is_private = false
        OR created_by = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- Authenticated users can create channels
CREATE POLICY "channels_insert_authenticated" ON channels
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND created_by = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- Channel admins and creators can update channels
CREATE POLICY "channels_update_admin" ON channels
    FOR UPDATE USING (
        created_by = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = channels.id
            AND cm.user_id = (SELECT id::text FROM users WHERE id = auth.uid())
            AND cm.role IN ('admin', 'moderator')
        )
    );

-- ============================================================
-- CHANNEL MEMBERS TABLE POLICIES
-- ============================================================

-- Users can view members of channels they belong to
CREATE POLICY "channel_members_select_member" ON channel_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members cm2
            WHERE cm2.channel_id = channel_members.channel_id
            AND cm2.user_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
    );

-- Channel admins can add members
CREATE POLICY "channel_members_insert_admin" ON channel_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = channel_members.channel_id
            AND cm.user_id = (SELECT id::text FROM users WHERE id = auth.uid())
            AND cm.role IN ('admin', 'moderator')
        )
    );

-- ============================================================
-- MESSAGES TABLE POLICIES
-- ============================================================

-- Users can view messages in channels they belong to
CREATE POLICY "messages_select_member" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = messages.channel_id
            AND cm.user_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
    );

-- Channel members can send messages
CREATE POLICY "messages_insert_member" ON messages
    FOR INSERT WITH CHECK (
        sender_id = (SELECT id::text FROM users WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = messages.channel_id
            AND cm.user_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
    );

-- Users can update their own messages
CREATE POLICY "messages_update_own" ON messages
    FOR UPDATE USING (sender_id = (SELECT id::text FROM users WHERE id = auth.uid()));

-- Users can delete their own messages
CREATE POLICY "messages_delete_own" ON messages
    FOR DELETE USING (sender_id = (SELECT id::text FROM users WHERE id = auth.uid()));

-- ============================================================
-- CALENDAR MEETINGS TABLE POLICIES
-- ============================================================

-- Users can view meetings they created or are attendees of
CREATE POLICY "calendar_meetings_select_own" ON calendar_meetings
    FOR SELECT USING (
        created_by = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM meeting_attendees ma
            WHERE ma.meeting_id = calendar_meetings.id
            AND ma.user_id = (SELECT id::text FROM users WHERE id = auth.uid())
        )
    );

-- Authenticated users can create meetings
CREATE POLICY "calendar_meetings_insert_authenticated" ON calendar_meetings
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND created_by = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- Meeting creators and attendees can update meetings
CREATE POLICY "calendar_meetings_update_own" ON calendar_meetings
    FOR UPDATE USING (
        created_by = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM meeting_attendees ma
            WHERE ma.meeting_id = calendar_meetings.id
            AND ma.user_id = (SELECT id::text FROM users WHERE id = auth.uid())
            AND ma.can_edit = true
        )
    );

-- ============================================================
-- MEETING ATTENDEES TABLE POLICIES
-- ============================================================

-- Users can view attendees for meetings they have access to
CREATE POLICY "meeting_attendees_select_authorized" ON meeting_attendees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM calendar_meetings cm
            WHERE cm.id = meeting_attendees.meeting_id
            AND (
                cm.created_by = (SELECT id::text FROM users WHERE id = auth.uid())
                OR meeting_attendees.user_id = (SELECT id::text FROM users WHERE id = auth.uid())
            )
        )
    );

-- Meeting creators can add attendees
CREATE POLICY "meeting_attendees_insert_creator" ON meeting_attendees
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM calendar_meetings cm
            WHERE cm.id = meeting_attendees.meeting_id
            AND cm.created_by = (SELECT id::text FROM users WHERE id = auth.uid())
        )
    );

-- Attendees can update their own status
CREATE POLICY "meeting_attendees_update_own" ON meeting_attendees
    FOR UPDATE USING (
        user_id = (SELECT id::text FROM users WHERE id = auth.uid())
    );

-- ============================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================

-- Users can view their own notifications
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT USING (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

-- System can create notifications (via service role)
CREATE POLICY "notifications_insert_system" ON notifications
    FOR INSERT WITH CHECK (true);

-- Users can update their own notifications
CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE USING (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

-- ============================================================
-- NOTIFICATION PREFERENCES TABLE POLICIES
-- ============================================================

-- Users can view and update their own preferences
CREATE POLICY "notification_preferences_select_own" ON notification_preferences
    FOR SELECT USING (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

CREATE POLICY "notification_preferences_insert_own" ON notification_preferences
    FOR INSERT WITH CHECK (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

CREATE POLICY "notification_preferences_update_own" ON notification_preferences
    FOR UPDATE USING (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

-- ============================================================
-- DASHBOARD CONFIGS TABLE POLICIES
-- ============================================================

-- Users can view and update their own dashboard config
CREATE POLICY "dashboard_configs_select_own" ON dashboard_configs
    FOR SELECT USING (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

CREATE POLICY "dashboard_configs_insert_own" ON dashboard_configs
    FOR INSERT WITH CHECK (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

CREATE POLICY "dashboard_configs_update_own" ON dashboard_configs
    FOR UPDATE USING (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

-- ============================================================
-- USER SETTINGS TABLE POLICIES
-- ============================================================

-- Users can view and update their own settings
CREATE POLICY "user_settings_select_own" ON user_settings
    FOR SELECT USING (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

CREATE POLICY "user_settings_insert_own" ON user_settings
    FOR INSERT WITH CHECK (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

CREATE POLICY "user_settings_update_own" ON user_settings
    FOR UPDATE USING (user_id = (SELECT id::text FROM users WHERE id = auth.uid()));

-- ============================================================
-- ANALYTICS TABLE POLICIES
-- ============================================================

-- Users can view their own analytics
CREATE POLICY "analytics_events_select_own" ON analytics_events
    FOR SELECT USING (
        user_id = (SELECT id::text FROM users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('principal', 'registrar', 'director')
        )
    );

-- System can create analytics events
CREATE POLICY "analytics_events_insert_system" ON analytics_events
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- AUDIT LOG TABLE POLICIES
-- ============================================================

-- Only admins can view audit logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('principal', 'registrar', 'director')
        )
    );

-- System can create audit logs
CREATE POLICY "audit_logs_insert_system" ON audit_logs
    FOR INSERT WITH CHECK (true);

