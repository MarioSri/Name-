-- ============================================================
-- IAOMS Complete Backend Schema
-- Covers all 17 features with proper relationships
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'principal', 'registrar', 'program-head', 'hod', 'employee', 
        'dean', 'chairman', 'director', 'controller-examinations',
        'asst-dean-iiic', 'head-operations', 'librarian', 'ssg',
        'cdc-employee', 'mentor', 'faculty'
    )),
    department TEXT,
    branch TEXT,
    avatar_url TEXT,
    phone TEXT,
    employee_id TEXT UNIQUE,
    designation TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipients table (for approval workflows)
CREATE TABLE IF NOT EXISTS public.recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    role_type TEXT NOT NULL,
    department TEXT,
    branch TEXT,
    phone TEXT,
    can_approve BOOLEAN DEFAULT FALSE,
    approval_level INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. DOCUMENT MANAGEMENT
-- ============================================================

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('Letter', 'Circular', 'Report', 'Other')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'draft', 'pending', 'submitted', 'in-review', 'approved', 
        'rejected', 'partially-approved', 'cancelled'
    )),
    submitter_id TEXT NOT NULL,
    submitter_name TEXT NOT NULL,
    submitter_role TEXT NOT NULL,
    submitted_date TIMESTAMPTZ DEFAULT NOW(),
    routing_type TEXT DEFAULT 'sequential' CHECK (routing_type IN (
        'sequential', 'parallel', 'reverse', 'bidirectional'
    )),
    is_emergency BOOLEAN DEFAULT FALSE,
    is_parallel BOOLEAN DEFAULT FALSE,
    source TEXT CHECK (source IN (
        'document-management', 'emergency-management', 'approval-chain-bypass'
    )),
    workflow JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document files table
CREATE TABLE IF NOT EXISTS public.document_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    storage_bucket TEXT DEFAULT 'documents',
    mime_type TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Document recipients (many-to-many)
CREATE TABLE IF NOT EXISTS public.document_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_role TEXT NOT NULL,
    recipient_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'current', 'completed', 'rejected', 'bypassed', 'skipped'
    )),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File assignments (recipient-based visibility)
CREATE TABLE IF NOT EXISTS public.file_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES document_files(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL,
    assigned_by TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, file_id, recipient_id)
);

-- ============================================================
-- 3. APPROVAL CHAIN & WORKFLOW
-- ============================================================

-- Approval cards table
CREATE TABLE IF NOT EXISTS public.approval_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_id TEXT UNIQUE NOT NULL,
    tracking_card_id TEXT NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    submitter_name TEXT NOT NULL,
    submitter_id TEXT NOT NULL,
    submitter_role TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'partially-approved', 'cancelled'
    )),
    routing_type TEXT DEFAULT 'sequential',
    workflow JSONB DEFAULT '{}'::jsonb,
    recipient_ids TEXT[] DEFAULT '{}',
    recipient_names TEXT[] DEFAULT '{}',
    current_recipient_id TEXT,
    current_recipient_name TEXT,
    bypassed_recipients TEXT[] DEFAULT '{}',
    resubmitted_recipients TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval card recipients
CREATE TABLE IF NOT EXISTS public.approval_card_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_card_id UUID NOT NULL REFERENCES approval_cards(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(approval_card_id, recipient_id)
);

-- Approvals table (approval actions)
CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_card_id UUID NOT NULL REFERENCES approval_cards(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    approver_id TEXT NOT NULL,
    approver_user_id TEXT NOT NULL,
    approver_name TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'requested-changes', 'escalated')),
    status TEXT NOT NULL,
    comments TEXT,
    signature_data JSONB,
    signed_at TIMESTAMPTZ,
    ip_address INET,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow routes (workflow templates)
CREATE TABLE IF NOT EXISTS public.workflow_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('sequential', 'parallel', 'reverse', 'bidirectional')),
    document_type TEXT,
    department TEXT,
    branch TEXT,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    escalation_paths JSONB DEFAULT '[]'::jsonb,
    requires_counter_approval BOOLEAN DEFAULT FALSE,
    auto_escalation JSONB DEFAULT '{"enabled": false, "timeoutHours": 24}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow instances
CREATE TABLE IF NOT EXISTS public.workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workflow_route_id UUID REFERENCES workflow_routes(id),
    current_step_id TEXT,
    current_step_index INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'active', 'completed', 'rejected', 'escalated', 'paused'
    )),
    history JSONB DEFAULT '[]'::jsonb,
    initiated_by TEXT NOT NULL,
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- 4. APPROVER COMMENTS & SHARING
-- ============================================================

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    approval_card_id UUID REFERENCES approval_cards(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    content TEXT NOT NULL,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with TEXT[] DEFAULT '{}', -- recipient IDs or 'all'
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Comment shares (for granular sharing control)
CREATE TABLE IF NOT EXISTS public.comment_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    shared_with_id TEXT NOT NULL,
    shared_by TEXT NOT NULL,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, shared_with_id)
);

-- ============================================================
-- 5. DIGITAL SIGNATURES
-- ============================================================

-- Digital signatures table
CREATE TABLE IF NOT EXISTS public.digital_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    approval_id UUID REFERENCES approvals(id),
    signer_id TEXT NOT NULL,
    signer_name TEXT NOT NULL,
    signer_role TEXT NOT NULL,
    signature_data TEXT NOT NULL, -- Base64 encoded
    signature_method TEXT CHECK (signature_method IN ('documenso', 'rekore-sign', 'manual')),
    documenso_signature_id TEXT,
    rekore_signature_id TEXT,
    blockchain_hash TEXT,
    blockchain_tx_hash TEXT,
    certificate_url TEXT,
    audit_trail_url TEXT,
    ip_address INET,
    location JSONB, -- {latitude, longitude}
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Signature requests
CREATE TABLE IF NOT EXISTS public.signature_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    requested_by TEXT NOT NULL,
    target_users TEXT[] NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'completed', 'expired', 'cancelled'
    )),
    signatures JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. LIVEMEET+
-- ============================================================

-- Live meeting requests
CREATE TABLE IF NOT EXISTS public.live_meeting_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    reason TEXT,
    urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'immediate')),
    requester_id TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    approval_card_id UUID REFERENCES approval_cards(id) ON DELETE CASCADE,
    meeting_format TEXT CHECK (meeting_format IN ('online', 'in-person', 'hybrid')),
    meeting_link TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'rejected', 'expired', 'completed'
    )),
    expires_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. MESSAGES & CHANNELS
-- ============================================================

-- Channels table
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'department', 'private', 'group', 'announcement', 
        'document-thread', 'approval', 'general'
    )),
    department TEXT,
    branch TEXT,
    target_roles TEXT[],
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    is_readonly BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    auto_delete_enabled BOOLEAN DEFAULT FALSE,
    auto_delete_days INTEGER,
    settings JSONB DEFAULT '{}'::jsonb,
    pinned_messages TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel members
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    notification_level TEXT DEFAULT 'all' CHECK (notification_level IN ('all', 'mentions', 'none')),
    UNIQUE(channel_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT UNIQUE NOT NULL,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN (
        'text', 'file', 'image', 'document', 'signature-request',
        'poll', 'system', 'thread-reply', 'status-update',
        'meeting-request', 'ai-summary', 'approval_request', 
        'document_share', 'notification'
    )),
    content TEXT NOT NULL,
    thread_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    reactions JSONB DEFAULT '[]'::jsonb,
    mentions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Message reads
CREATE TABLE IF NOT EXISTS public.message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    action TEXT DEFAULT 'read' CHECK (action IN ('read', 'skipped', 'ignored')),
    UNIQUE(message_id, user_id)
);

-- ============================================================
-- 8. CALENDAR MEETINGS
-- ============================================================

-- Calendar meetings table
CREATE TABLE IF NOT EXISTS public.calendar_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration INTEGER NOT NULL, -- minutes
    location TEXT,
    type TEXT NOT NULL CHECK (type IN ('online', 'physical', 'hybrid')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'postponed'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT CHECK (category IN (
        'academic', 'administrative', 'financial', 'recruitment',
        'disciplinary', 'emergency', 'social', 'training', 'other'
    )),
    created_by TEXT NOT NULL,
    department TEXT,
    tags TEXT[] DEFAULT '{}',
    documents TEXT[] DEFAULT '{}',
    meeting_links JSONB DEFAULT '{}'::jsonb,
    recurring_pattern JSONB,
    approval_workflow JSONB,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    attendance JSONB DEFAULT '[]'::jsonb,
    mom_template TEXT,
    parent_meeting_id UUID REFERENCES calendar_meetings(id) ON DELETE SET NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting attendees
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES calendar_meetings(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    status TEXT DEFAULT 'invited' CHECK (status IN (
        'invited', 'accepted', 'declined', 'tentative', 'no-response'
    )),
    response_time TIMESTAMPTZ,
    is_required BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    join_time TIMESTAMPTZ,
    leave_time TIMESTAMPTZ,
    duration INTEGER, -- minutes
    attendance_status TEXT CHECK (attendance_status IN (
        'present', 'absent', 'late', 'early_leave'
    )),
    UNIQUE(meeting_id, user_id)
);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'document-submitted', 'document-approved', 'document-rejected',
        'approval-required', 'comment-added', 'signature-requested',
        'meeting-scheduled', 'meeting-reminder', 'channel-message',
        'mention', 'system', 'emergency'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    approval_card_id UUID REFERENCES approval_cards(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES calendar_meetings(id) ON DELETE CASCADE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    email JSONB DEFAULT '{"enabled": true, "approvals": true, "updates": true, "reminders": true}'::jsonb,
    push JSONB DEFAULT '{"enabled": true, "approvals": true, "updates": true, "reminders": true}'::jsonb,
    sms JSONB DEFAULT '{"enabled": false, "approvals": false, "updates": false, "reminders": false}'::jsonb,
    whatsapp JSONB DEFAULT '{"enabled": false, "approvals": false, "updates": false, "reminders": false}'::jsonb,
    channels JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. DASHBOARD WIDGETS
-- ============================================================

-- Dashboard configurations
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    widgets JSONB DEFAULT '[]'::jsonb,
    layout JSONB DEFAULT '{}'::jsonb,
    theme JSONB DEFAULT '{}'::jsonb,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. ANALYTICS
-- ============================================================

-- Analytics events
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    event_type TEXT NOT NULL,
    event_category TEXT,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics dashboard data (materialized view cache)
CREATE TABLE IF NOT EXISTS public.analytics_dashboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    document_stats JSONB DEFAULT '{}'::jsonb,
    workflow_stats JSONB DEFAULT '{}'::jsonb,
    meeting_stats JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period_start, period_end)
);

-- ============================================================
-- 12. PROFILE & SETTINGS
-- ============================================================

-- User settings
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    preferences JSONB DEFAULT '{}'::jsonb,
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. AUDIT LOG
-- ============================================================

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_submitter ON documents(submitter_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_tracking_id ON documents(tracking_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_priority ON documents(priority);

-- Document recipients indexes
CREATE INDEX IF NOT EXISTS idx_document_recipients_doc ON document_recipients(document_id);
CREATE INDEX IF NOT EXISTS idx_document_recipients_recipient ON document_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_document_recipients_status ON document_recipients(status);

-- Approval cards indexes
CREATE INDEX IF NOT EXISTS idx_approval_cards_tracking ON approval_cards(tracking_card_id);
CREATE INDEX IF NOT EXISTS idx_approval_cards_status ON approval_cards(status);
CREATE INDEX IF NOT EXISTS idx_approval_cards_current_recipient ON approval_cards(current_recipient_id);
CREATE INDEX IF NOT EXISTS idx_approval_cards_recipient_ids ON approval_cards USING GIN(recipient_ids);

-- Approvals indexes
CREATE INDEX IF NOT EXISTS idx_approvals_card ON approvals(approval_card_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Calendar meetings indexes
CREATE INDEX IF NOT EXISTS idx_meetings_date ON calendar_meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON calendar_meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON calendar_meetings(created_by);

-- Meeting attendees indexes
CREATE INDEX IF NOT EXISTS idx_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_attendees_user ON meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_attendees_status ON meeting_attendees(status);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_documents_title_search ON documents USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING GIN(to_tsvector('english', content));

-- ============================================================
-- FUNCTIONS FOR UPDATED_AT TIMESTAMPS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_cards_updated_at BEFORE UPDATE ON approval_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_meetings_updated_at BEFORE UPDATE ON calendar_meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_configs_updated_at BEFORE UPDATE ON dashboard_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

