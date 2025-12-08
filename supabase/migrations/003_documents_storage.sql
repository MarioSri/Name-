-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 3: Documents & Storage
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('DOC-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  
  -- Document Details
  title VARCHAR(500) NOT NULL,
  description TEXT,
  content TEXT,
  document_type document_type NOT NULL DEFAULT 'letter',
  
  -- Routing & Workflow
  routing_type routing_type NOT NULL DEFAULT 'sequential',
  
  -- Status & Priority
  status operation_status NOT NULL DEFAULT 'draft',
  priority priority_level NOT NULL DEFAULT 'normal',
  
  -- Owner
  created_by UUID NOT NULL REFERENCES recipients(id),
  department department,
  
  -- Google Drive Integration
  google_drive_file_id VARCHAR(255),
  google_drive_folder_id VARCHAR(255),
  google_drive_url TEXT,
  
  -- File Info
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size BIGINT,
  file_url TEXT,
  
  -- Version Control
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES documents(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Deadlines
  due_date DATE,
  reminder_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES recipients(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_operation ON documents(operation_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_due_date ON documents(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN (tags);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DOCUMENT RECIPIENTS (Junction Table)
-- ============================================================

CREATE TABLE IF NOT EXISTS document_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Role in document workflow
  recipient_type VARCHAR(30) NOT NULL CHECK (recipient_type IN ('to', 'cc', 'bcc', 'approver', 'reviewer', 'viewer')),
  
  -- Approval specific
  approval_order INTEGER,
  approval_status operation_status DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Access tracking
  has_viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  
  -- Notifications
  notified_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(document_id, recipient_id, recipient_type)
);

CREATE INDEX IF NOT EXISTS idx_doc_recipients_document ON document_recipients(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_recipients_recipient ON document_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_doc_recipients_type ON document_recipients(recipient_type);
CREATE INDEX IF NOT EXISTS idx_doc_recipients_status ON document_recipients(approval_status);

ALTER TABLE document_recipients ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DOCUMENT FILES (Multiple files per document)
-- ============================================================

CREATE TABLE IF NOT EXISTS document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- File Details
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  file_extension VARCHAR(20),
  
  -- Storage
  storage_path TEXT,
  storage_provider VARCHAR(50) DEFAULT 'supabase',
  
  -- Google Drive
  google_drive_file_id VARCHAR(255),
  google_drive_url TEXT,
  
  -- Preview
  thumbnail_url TEXT,
  preview_url TEXT,
  
  -- Version
  version INTEGER DEFAULT 1,
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES recipients(id)
);

CREATE INDEX IF NOT EXISTS idx_doc_files_document ON document_files(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_files_type ON document_files(file_type);

ALTER TABLE document_files ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DOCUMENT VERSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Content snapshot
  title VARCHAR(500),
  content TEXT,
  
  -- File reference
  file_id UUID REFERENCES document_files(id),
  
  -- Change tracking
  change_summary TEXT,
  changed_by UUID REFERENCES recipients(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_number ON document_versions(version_number);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

