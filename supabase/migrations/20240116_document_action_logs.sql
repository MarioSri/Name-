-- Create document action logs table for Sigstore Rekor audit trail
CREATE TABLE IF NOT EXISTS document_action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('approve', 'reject')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rekor_uuid TEXT NOT NULL,
  rekor_log_index BIGINT NOT NULL,
  signature_data JSONB,
  verification_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_document_action_logs_document ON document_action_logs(document_id, timestamp DESC);
CREATE INDEX idx_document_action_logs_recipient ON document_action_logs(recipient_id, timestamp DESC);
CREATE INDEX idx_document_action_logs_timestamp ON document_action_logs(timestamp DESC);
CREATE INDEX idx_document_action_logs_action_type ON document_action_logs(action_type, timestamp DESC);

-- Add comment
COMMENT ON TABLE document_action_logs IS 'Immutable audit log of all document approvals and rejections with Sigstore Rekor verification';
