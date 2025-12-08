-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 8: Comments, Signatures & Audit
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- ============================================================
-- COMMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('CMT-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  
  -- Parent entity (one of these should be set)
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  approval_card_id UUID REFERENCES approval_cards(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  
  -- Author
  author_id UUID NOT NULL REFERENCES recipients(id),
  
  -- Content
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'rich_text', 'markdown')),
  
  -- Reply
  parent_comment_id UUID REFERENCES comments(id),
  reply_count INTEGER DEFAULT 0,
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  
  -- Mentions
  mentions UUID[] DEFAULT '{}',
  
  -- Edit tracking
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  
  -- Resolution (for document/approval comments)
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES recipients(id),
  resolved_at TIMESTAMPTZ,
  
  -- Visibility
  is_internal BOOLEAN DEFAULT FALSE,
  
  -- Deletion
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES recipients(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_approval ON comments(approval_card_id) WHERE approval_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_meeting ON comments(meeting_id) WHERE meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DIGITAL SIGNATURES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('SIG-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  
  -- Document being signed
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  approval_card_id UUID REFERENCES approval_cards(id),
  
  -- Signer
  signer_id UUID NOT NULL REFERENCES recipients(id),
  
  -- Signature Type
  signature_type VARCHAR(30) NOT NULL CHECK (signature_type IN ('approval', 'acknowledgment', 'witness', 'notary', 'final')),
  
  -- Signature Data
  signature_image TEXT,
  signature_data JSONB DEFAULT '{}',
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verification_method VARCHAR(30) CHECK (verification_method IN ('face', 'otp', 'password', 'biometric', 'documenso', 'rekor')),
  verified_at TIMESTAMPTZ,
  
  -- Face verification
  face_verification_id UUID REFERENCES face_auth_records(id),
  
  -- External signing services
  documenso_signature_id VARCHAR(255),
  rekor_log_id VARCHAR(255),
  
  -- Blockchain (if using Rekor/transparency log)
  blockchain_hash VARCHAR(255),
  blockchain_timestamp TIMESTAMPTZ,
  
  -- Certificate
  certificate_data TEXT,
  certificate_issuer VARCHAR(255),
  certificate_valid_until TIMESTAMPTZ,
  
  -- IP/Device
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signatures_document ON digital_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_approval ON digital_signatures(approval_card_id) WHERE approval_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signatures_signer ON digital_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_signatures_verified ON digital_signatures(is_verified);
CREATE INDEX IF NOT EXISTS idx_signatures_created_at ON digital_signatures(created_at DESC);

ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SIGNATURE REQUESTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('SIGREQ-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  
  -- Document
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Requester & Signer
  requested_by UUID NOT NULL REFERENCES recipients(id),
  requested_from UUID NOT NULL REFERENCES recipients(id),
  
  -- Request details
  signature_type VARCHAR(30) NOT NULL CHECK (signature_type IN ('approval', 'acknowledgment', 'witness', 'notary', 'final')),
  message TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired', 'cancelled')),
  
  -- Response
  signature_id UUID REFERENCES digital_signatures(id),
  declined_reason TEXT,
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  
  -- Reminders
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sig_requests_document ON signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_sig_requests_from ON signature_requests(requested_from);
CREATE INDEX IF NOT EXISTS idx_sig_requests_status ON signature_requests(status);

ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('LOG-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  
  -- Actor
  actor_id UUID REFERENCES recipients(id),
  actor_type VARCHAR(20) DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'api', 'scheduler')),
  
  -- Action
  action VARCHAR(50) NOT NULL,
  action_category VARCHAR(30) CHECK (action_category IN ('create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'sign', 'share', 'export', 'system')),
  
  -- Target entity
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_name VARCHAR(255),
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  changes JSONB DEFAULT '{}',
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  request_id VARCHAR(100),
  
  -- Additional info
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(action_category);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HISTORY CARDS TABLE (User activity timeline)
-- ============================================================

CREATE TABLE IF NOT EXISTS history_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  user_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Activity type
  activity_type VARCHAR(50) NOT NULL,
  
  -- Related entities
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  approval_card_id UUID REFERENCES approval_cards(id) ON DELETE SET NULL,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  
  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Visual
  icon VARCHAR(50),
  color VARCHAR(20),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_cards_user ON history_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_history_cards_type ON history_cards(activity_type);
CREATE INDEX IF NOT EXISTS idx_history_cards_created_at ON history_cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_cards_document ON history_cards(document_id) WHERE document_id IS NOT NULL;

ALTER TABLE history_cards ENABLE ROW LEVEL SECURITY;

