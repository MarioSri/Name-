-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 1: Core Operations Table & ENUM Types
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES (Create only if not exists)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'principal', 'registrar', 'dean', 'chairman', 'director',
    'hod', 'program_head', 'controller_examinations', 'asst_dean_iiic',
    'head_operations', 'librarian', 'ssg', 'cdc_employee', 'mentor',
    'faculty', 'employee'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE department AS ENUM (
    'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL',
    'CSM', 'CSO', 'CSD', 'CSC',
    'ADMIN', 'LIBRARY', 'OPERATIONS', 'FINANCE', 'HR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'letter', 'circular', 'report', 'memo', 'notice',
    'proposal', 'request', 'application', 'certificate',
    'meeting_minutes', 'policy', 'announcement', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM (
    'low', 'normal', 'high', 'urgent', 'emergency'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE operation_status AS ENUM (
    'draft', 'pending', 'in_progress', 'submitted',
    'under_review', 'approved', 'rejected', 'completed',
    'cancelled', 'escalated', 'bypassed', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE routing_type AS ENUM (
    'sequential', 'parallel', 'reverse', 'bidirectional', 'hybrid'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE source_type AS ENUM (
    'document_management', 'emergency_management',
    'approval_chain', 'livemeet', 'channels',
    'documenso', 'rekor_sign', 'calendar', 'api'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'approval_request', 'approval_granted', 'approval_rejected',
    'document_submitted', 'document_updated', 'comment_added',
    'meeting_scheduled', 'meeting_reminder', 'message_received',
    'escalation', 'emergency', 'system', 'reminder'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE meeting_type AS ENUM (
    'in_person', 'online', 'hybrid',
    'google_meet', 'zoom', 'teams'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE channel_type AS ENUM (
    'department', 'private', 'group', 'announcement',
    'document_thread', 'approval_thread'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- CORE OPERATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('OP-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  operation_type VARCHAR(50) NOT NULL,
  source source_type NOT NULL DEFAULT 'document_management',
  status operation_status NOT NULL DEFAULT 'pending',
  priority priority_level NOT NULL DEFAULT 'normal',
  created_by UUID NOT NULL,
  created_by_user_id VARCHAR(100) NOT NULL,
  document_id UUID,
  approval_card_id UUID,
  meeting_id UUID,
  calendar_event_id UUID,
  channel_id UUID,
  message_id UUID,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  drive_file_id VARCHAR(255),
  drive_folder_id VARCHAR(255),
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  last_viewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_priority ON operations(priority);
CREATE INDEX IF NOT EXISTS idx_operations_created_by ON operations(created_by);
CREATE INDEX IF NOT EXISTS idx_operations_source ON operations(source);
CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_document ON operations(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_approval ON operations(approval_card_id) WHERE approval_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_meeting ON operations(meeting_id) WHERE meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_metadata ON operations USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_operations_tags ON operations USING GIN (tags);

-- Enable RLS
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_operations_updated_at ON operations;
CREATE TRIGGER update_operations_updated_at
  BEFORE UPDATE ON operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

