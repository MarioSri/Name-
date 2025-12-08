-- Fix RLS Policies to allow anonymous access for development
-- This migration adds INSERT/UPDATE/DELETE policies for tables that need them
-- Run this in Supabase SQL Editor or via Supabase CLI

-- ==========================================
-- DOCUMENTS TABLE
-- ==========================================

-- Allow any authenticated or anon user to insert documents (for development)
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
CREATE POLICY "documents_insert_anon" ON documents
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to select documents (for development)
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
CREATE POLICY "documents_select_anon" ON documents
    FOR SELECT
    USING (true);

-- Allow anyone to update documents (for development)
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
CREATE POLICY "documents_update_anon" ON documents
    FOR UPDATE
    USING (true);

-- ==========================================
-- DOCUMENT_RECIPIENTS TABLE
-- ==========================================

-- Enable RLS (if not already)
ALTER TABLE document_recipients ENABLE ROW LEVEL SECURITY;

-- Allow all operations on document_recipients
CREATE POLICY "document_recipients_select_anon" ON document_recipients
    FOR SELECT USING (true);

CREATE POLICY "document_recipients_insert_anon" ON document_recipients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "document_recipients_update_anon" ON document_recipients
    FOR UPDATE USING (true);

CREATE POLICY "document_recipients_delete_anon" ON document_recipients
    FOR DELETE USING (true);

-- ==========================================
-- APPROVAL_CARDS TABLE
-- ==========================================

-- Allow insert on approval_cards
DROP POLICY IF EXISTS "approval_cards_select_policy" ON approval_cards;
CREATE POLICY "approval_cards_select_anon" ON approval_cards
    FOR SELECT USING (true);

CREATE POLICY "approval_cards_insert_anon" ON approval_cards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "approval_cards_update_anon" ON approval_cards
    FOR UPDATE USING (true);

CREATE POLICY "approval_cards_delete_anon" ON approval_cards
    FOR DELETE USING (true);

-- ==========================================
-- APPROVAL_CARD_RECIPIENTS TABLE
-- ==========================================

-- Enable RLS (if not already)
ALTER TABLE approval_card_recipients ENABLE ROW LEVEL SECURITY;

-- Allow all operations on approval_card_recipients
CREATE POLICY "approval_card_recipients_select_anon" ON approval_card_recipients
    FOR SELECT USING (true);

CREATE POLICY "approval_card_recipients_insert_anon" ON approval_card_recipients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "approval_card_recipients_update_anon" ON approval_card_recipients
    FOR UPDATE USING (true);

CREATE POLICY "approval_card_recipients_delete_anon" ON approval_card_recipients
    FOR DELETE USING (true);

-- ==========================================
-- APPROVALS TABLE (for recording approval actions)
-- ==========================================

-- Enable RLS (if not already)
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_select_anon" ON approvals
    FOR SELECT USING (true);

CREATE POLICY "approvals_insert_anon" ON approvals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "approvals_update_anon" ON approvals
    FOR UPDATE USING (true);

-- ==========================================
-- NOTIFICATIONS TABLE
-- ==========================================

CREATE POLICY "notifications_insert_anon" ON notifications
    FOR INSERT WITH CHECK (true);

-- ==========================================
-- RECIPIENTS TABLE - Add insert policy
-- ==========================================

CREATE POLICY "recipients_insert_anon" ON recipients
    FOR INSERT WITH CHECK (true);

-- ==========================================
-- OPERATIONS TABLE
-- ==========================================

CREATE POLICY "operations_select_anon" ON operations
    FOR SELECT USING (true);

CREATE POLICY "operations_insert_anon" ON operations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "operations_update_anon" ON operations
    FOR UPDATE USING (true);
