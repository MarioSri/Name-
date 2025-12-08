-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 4: Approval Workflow
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- ============================================================
-- APPROVAL CARDS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS approval_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('AC-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Card Details
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Routing Configuration
  routing_type routing_type NOT NULL DEFAULT 'sequential',
  
  -- Status & Priority
  status operation_status NOT NULL DEFAULT 'pending',
  priority priority_level NOT NULL DEFAULT 'normal',
  
  -- Submitter
  submitted_by UUID NOT NULL REFERENCES recipients(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Current Approval State
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 1,
  current_approver_id UUID REFERENCES recipients(id),
  
  -- Bypass
  allow_bypass BOOLEAN DEFAULT FALSE,
  bypassed_by UUID REFERENCES recipients(id),
  bypassed_at TIMESTAMPTZ,
  bypass_reason TEXT,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  final_status operation_status,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approval_cards_operation ON approval_cards(operation_id);
CREATE INDEX IF NOT EXISTS idx_approval_cards_document ON approval_cards(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_cards_status ON approval_cards(status);
CREATE INDEX IF NOT EXISTS idx_approval_cards_submitted_by ON approval_cards(submitted_by);
CREATE INDEX IF NOT EXISTS idx_approval_cards_current_approver ON approval_cards(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_cards_created_at ON approval_cards(created_at DESC);

ALTER TABLE approval_cards ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_approval_cards_updated_at ON approval_cards;
CREATE TRIGGER update_approval_cards_updated_at
  BEFORE UPDATE ON approval_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- APPROVAL CARD RECIPIENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS approval_card_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_card_id UUID NOT NULL REFERENCES approval_cards(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Role & Order
  recipient_type VARCHAR(30) NOT NULL CHECK (recipient_type IN ('approver', 'reviewer', 'cc', 'final_approver')),
  approval_order INTEGER NOT NULL DEFAULT 1,
  
  -- Status
  status operation_status DEFAULT 'pending',
  action_taken VARCHAR(20) CHECK (action_taken IN ('approved', 'rejected', 'forwarded', 'bypassed', 'escalated')),
  action_at TIMESTAMPTZ,
  
  -- Comments
  comments TEXT,
  
  -- Notifications
  notified_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(approval_card_id, recipient_id, approval_order)
);

CREATE INDEX IF NOT EXISTS idx_ac_recipients_card ON approval_card_recipients(approval_card_id);
CREATE INDEX IF NOT EXISTS idx_ac_recipients_recipient ON approval_card_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_ac_recipients_status ON approval_card_recipients(status);
CREATE INDEX IF NOT EXISTS idx_ac_recipients_order ON approval_card_recipients(approval_order);

ALTER TABLE approval_card_recipients ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- APPROVALS TABLE (Individual approval actions)
-- ============================================================

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_card_id UUID NOT NULL REFERENCES approval_cards(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES recipients(id),
  
  -- Action
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'forwarded', 'returned', 'bypassed', 'escalated')),
  
  -- Details
  comments TEXT,
  signature_id UUID,
  
  -- Step info
  step_number INTEGER NOT NULL,
  
  -- Face verification
  face_verified BOOLEAN DEFAULT FALSE,
  face_verification_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_card ON approvals(approval_card_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_action ON approvals(action);
CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- WORKFLOW TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Configuration
  routing_type routing_type NOT NULL DEFAULT 'sequential',
  document_types document_type[] DEFAULT '{}',
  departments department[] DEFAULT '{}',
  
  -- Steps (JSONB array)
  steps JSONB NOT NULL DEFAULT '[]',
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  allow_bypass BOOLEAN DEFAULT FALSE,
  auto_escalate BOOLEAN DEFAULT FALSE,
  escalation_hours INTEGER DEFAULT 48,
  
  -- Owner
  created_by UUID REFERENCES recipients(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_workflow_templates_routing ON workflow_templates(routing_type);

ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- WORKFLOW ROUTES (Dynamic routing rules)
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  
  -- Route Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Conditions (JSONB for flexibility)
  conditions JSONB NOT NULL DEFAULT '{}',
  
  -- Route Type
  route_type routing_type NOT NULL,
  
  -- Steps
  approver_ids UUID[] NOT NULL DEFAULT '{}',
  approval_order INTEGER[] DEFAULT '{}',
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_routes_template ON workflow_routes(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_routes_active ON workflow_routes(is_active);

ALTER TABLE workflow_routes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- WORKFLOW INSTANCES (Running workflows)
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workflow_templates(id),
  approval_card_id UUID REFERENCES approval_cards(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  
  -- Current State
  current_step INTEGER DEFAULT 1,
  status operation_status DEFAULT 'in_progress',
  
  -- Snapshot of steps at creation
  steps_snapshot JSONB NOT NULL DEFAULT '[]',
  
  -- Execution log
  execution_log JSONB DEFAULT '[]',
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_template ON workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_card ON workflow_instances(approval_card_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);

ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;

