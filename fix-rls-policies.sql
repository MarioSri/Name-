-- Fix RLS Policy Recursion Issue
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/armorotbfruhfcwkrhpx/sql

-- ============================================
-- OPTION 1: Disable RLS temporarily (for testing)
-- ============================================
-- ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE approval_cards DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_recipients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE approval_card_recipients DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OPTION 2: Fix the policies (recommended)
-- ============================================

-- First, let's see what policies exist
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename IN ('documents', 'approval_cards', 'users');

-- Drop all policies on affected tables
DROP POLICY IF EXISTS "Enable read access for all users" ON documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON documents;
DROP POLICY IF EXISTS "Enable update for users based on created_by" ON documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can create documents" ON documents;

DROP POLICY IF EXISTS "Enable read access for all users" ON approval_cards;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON approval_cards;
DROP POLICY IF EXISTS "Enable update for approvers" ON approval_cards;

-- Create simple permissive policies that don't cause recursion
-- These allow all operations for authenticated and anonymous users

-- Documents table policies
CREATE POLICY "documents_select_all" ON documents 
  FOR SELECT USING (true);

CREATE POLICY "documents_insert_all" ON documents 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "documents_update_all" ON documents 
  FOR UPDATE USING (true);

CREATE POLICY "documents_delete_all" ON documents 
  FOR DELETE USING (true);

-- Approval cards table policies  
CREATE POLICY "approval_cards_select_all" ON approval_cards 
  FOR SELECT USING (true);

CREATE POLICY "approval_cards_insert_all" ON approval_cards 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "approval_cards_update_all" ON approval_cards 
  FOR UPDATE USING (true);

CREATE POLICY "approval_cards_delete_all" ON approval_cards 
  FOR DELETE USING (true);

-- Document recipients table policies
CREATE POLICY "document_recipients_select_all" ON document_recipients 
  FOR SELECT USING (true);

CREATE POLICY "document_recipients_insert_all" ON document_recipients 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "document_recipients_update_all" ON document_recipients 
  FOR UPDATE USING (true);

-- Approval card recipients table policies
CREATE POLICY "approval_card_recipients_select_all" ON approval_card_recipients 
  FOR SELECT USING (true);

CREATE POLICY "approval_card_recipients_insert_all" ON approval_card_recipients 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "approval_card_recipients_update_all" ON approval_card_recipients 
  FOR UPDATE USING (true);

-- Verify policies are updated
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('documents', 'approval_cards', 'document_recipients', 'approval_card_recipients');
