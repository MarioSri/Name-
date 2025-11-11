-- Supabase Schema for Sequential Workflow System
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Documents table (replaces submitted-documents localStorage)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    submitted_by TEXT NOT NULL,
    submitted_by_name TEXT NOT NULL,
    submitted_by_department TEXT,
    submitted_by_designation TEXT,
    submitted_date TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'partially-approved')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'medium', 'high', 'urgent', 'critical')),
    is_emergency BOOLEAN DEFAULT FALSE,
    workflow JSONB NOT NULL,
    signed_by TEXT[] DEFAULT '{}',
    rejected_by TEXT[] DEFAULT '{}',
    files JSONB DEFAULT '[]',
    assignments JSONB DEFAULT '{}',
    comments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Approval cards table (replaces pending-approvals localStorage)
CREATE TABLE IF NOT EXISTS approval_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    submitter TEXT NOT NULL,
    submitted_date TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    priority TEXT DEFAULT 'normal',
    description TEXT,
    recipients TEXT[] NOT NULL,
    recipient_ids TEXT[] NOT NULL,
    files JSONB DEFAULT '[]',
    is_emergency BOOLEAN DEFAULT FALSE,
    is_parallel BOOLEAN DEFAULT FALSE,
    has_bypass BOOLEAN DEFAULT FALSE,
    source TEXT,
    routing_type TEXT,
    file_assignments JSONB DEFAULT '{}',
    is_custom_assignment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    email JSONB DEFAULT '{"enabled": true, "approvals": true, "updates": true, "reminders": true}',
    push JSONB DEFAULT '{"enabled": true, "approvals": true, "updates": true, "reminders": true}',
    sms JSONB DEFAULT '{"enabled": false, "approvals": false, "updates": false, "reminders": false}',
    whatsapp JSONB DEFAULT '{"enabled": false, "approvals": false, "updates": false, "reminders": false}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    message TEXT NOT NULL,
    date TIMESTAMP DEFAULT NOW(),
    is_shared BOOLEAN DEFAULT FALSE,
    shared_for TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_submitted_by ON documents(submitted_by);
CREATE INDEX IF NOT EXISTS idx_approval_cards_document_id ON approval_cards(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_cards_status ON approval_cards(status);
CREATE INDEX IF NOT EXISTS idx_approval_cards_recipient_ids ON approval_cards USING GIN(recipient_ids);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_cards_updated_at BEFORE UPDATE ON approval_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Enable but allow all for now
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;

-- Policies (allow all authenticated users for now)
CREATE POLICY "Allow all for authenticated users" ON documents FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON approval_cards FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON notification_preferences FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON document_comments FOR ALL USING (true);
