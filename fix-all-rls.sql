-- =====================================================
-- FIX ALL RLS POLICIES - Run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/armorotbfruhfcwkrhpx/sql
-- =====================================================

-- Step 1: List all current policies to see what's causing recursion
SELECT 
  schemaname, 
  tablename, 
  policyname,
  qual as policy_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 2: Drop ALL policies on documents table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 3: Drop ALL policies on approval_cards table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'approval_cards'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON approval_cards', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 4: Create simple permissive policies that DON'T reference users table

-- Documents policies - simple allow all
CREATE POLICY "documents_allow_select" ON documents FOR SELECT USING (true);
CREATE POLICY "documents_allow_insert" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "documents_allow_update" ON documents FOR UPDATE USING (true);
CREATE POLICY "documents_allow_delete" ON documents FOR DELETE USING (true);

-- Approval cards policies - simple allow all
CREATE POLICY "approval_cards_allow_select" ON approval_cards FOR SELECT USING (true);
CREATE POLICY "approval_cards_allow_insert" ON approval_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "approval_cards_allow_update" ON approval_cards FOR UPDATE USING (true);
CREATE POLICY "approval_cards_allow_delete" ON approval_cards FOR DELETE USING (true);

-- Step 5: Also fix document_recipients and approval_card_recipients
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename IN ('document_recipients', 'approval_card_recipients')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

CREATE POLICY "document_recipients_allow_all" ON document_recipients FOR ALL USING (true);
CREATE POLICY "approval_card_recipients_allow_all" ON approval_card_recipients FOR ALL USING (true);

-- Step 6: Verify the check constraints on documents table
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'documents'
AND con.contype = 'c';

-- Step 7: Test insert after fixing policies
INSERT INTO documents (
    tracking_id, title, type, status, priority, routing_type,
    submitter_id, submitter_name, submitter_role
) VALUES (
    'TEST-' || extract(epoch from now())::text,
    'Test Document After Fix',
    'Letter',
    'pending',
    'Normal',
    'sequential',
    (SELECT id FROM recipients LIMIT 1),
    (SELECT name FROM recipients LIMIT 1),
    (SELECT role FROM recipients LIMIT 1)
) RETURNING *;
