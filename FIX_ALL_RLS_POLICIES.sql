-- ========================================
-- FIX RLS POLICIES FOR ALL TABLES
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. Fix USERS table RLS (causing infinite recursion)
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;
DROP POLICY IF EXISTS "users_public_read" ON users;
DROP POLICY IF EXISTS "users_public_access" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON users;

-- Temporarily disable RLS for users table (allow all access)
CREATE POLICY "users_public_access" ON users FOR ALL USING (true) WITH CHECK (true);

-- 2. Fix DOCUMENTS table RLS
DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;
DROP POLICY IF EXISTS "documents_public_access" ON documents;

CREATE POLICY "documents_public_access" ON documents FOR ALL USING (true) WITH CHECK (true);

-- 3. Fix RECIPIENTS table RLS  
DROP POLICY IF EXISTS "recipients_select" ON recipients;
DROP POLICY IF EXISTS "recipients_insert" ON recipients;
DROP POLICY IF EXISTS "recipients_update" ON recipients;
DROP POLICY IF EXISTS "recipients_delete" ON recipients;
DROP POLICY IF EXISTS "recipients_public_access" ON recipients;

CREATE POLICY "recipients_public_access" ON recipients FOR ALL USING (true) WITH CHECK (true);

-- 4. Fix DOCUMENT_RECIPIENTS table RLS
DROP POLICY IF EXISTS "document_recipients_select" ON document_recipients;
DROP POLICY IF EXISTS "document_recipients_insert" ON document_recipients;
DROP POLICY IF EXISTS "document_recipients_update" ON document_recipients;
DROP POLICY IF EXISTS "document_recipients_delete" ON document_recipients;
DROP POLICY IF EXISTS "document_recipients_public_access" ON document_recipients;

CREATE POLICY "document_recipients_public_access" ON document_recipients FOR ALL USING (true) WITH CHECK (true);

-- 5. Ensure approval_cards RLS is good (should already be fixed)
DROP POLICY IF EXISTS "approval_cards_public_access" ON approval_cards;
CREATE POLICY "approval_cards_public_access" ON approval_cards FOR ALL USING (true) WITH CHECK (true);

-- 6. Fix approval_card_recipients RLS
DROP POLICY IF EXISTS "approval_card_recipients_public_access" ON approval_card_recipients;
CREATE POLICY "approval_card_recipients_public_access" ON approval_card_recipients FOR ALL USING (true) WITH CHECK (true);

-- Verify the changes
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
