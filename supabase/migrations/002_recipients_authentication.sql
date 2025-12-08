-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 2: Recipients (Users) & Authentication
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- ============================================================
-- RECIPIENTS TABLE (Core User Management)
-- ============================================================

CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) UNIQUE NOT NULL,
  
  -- Google OAuth
  google_id VARCHAR(255) UNIQUE,
  google_email VARCHAR(255),
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at TIMESTAMPTZ,
  
  -- HITAM ID + Password Login
  hitam_id VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255),
  password_salt VARCHAR(100),
  password_updated_at TIMESTAMPTZ,
  
  -- Face Authentication
  face_auth_enabled BOOLEAN DEFAULT FALSE,
  face_encoding_id VARCHAR(255),
  face_registered_at TIMESTAMPTZ,
  face_last_verified_at TIMESTAMPTZ,
  
  -- Profile Details
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  designation VARCHAR(100),
  employee_code VARCHAR(50),
  
  -- Role & Department
  role user_role NOT NULL DEFAULT 'employee',
  role_type VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE',
  department department,
  branch VARCHAR(50),
  academic_year INTEGER CHECK (academic_year >= 1 AND academic_year <= 4),
  
  -- Approval Hierarchy
  can_approve BOOLEAN DEFAULT FALSE,
  approval_level INTEGER DEFAULT 10,
  reports_to UUID REFERENCES recipients(id),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  
  -- Session Management
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  
  -- Preferences
  preferences JSONB DEFAULT '{"notifications": {"email": true, "push": true, "sms": false, "whatsapp": false}, "theme": "light", "language": "en", "timezone": "Asia/Kolkata"}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email);
CREATE INDEX IF NOT EXISTS idx_recipients_google_id ON recipients(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_hitam_id ON recipients(hitam_id) WHERE hitam_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_role ON recipients(role);
CREATE INDEX IF NOT EXISTS idx_recipients_department ON recipients(department);
CREATE INDEX IF NOT EXISTS idx_recipients_approval_level ON recipients(approval_level);
CREATE INDEX IF NOT EXISTS idx_recipients_is_active ON recipients(is_active);
CREATE INDEX IF NOT EXISTS idx_recipients_reports_to ON recipients(reports_to) WHERE reports_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_preferences ON recipients USING GIN (preferences);

ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_recipients_updated_at ON recipients;
CREATE TRIGGER update_recipients_updated_at
  BEFORE UPDATE ON recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTH SESSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,
  auth_method VARCHAR(20) NOT NULL CHECK (auth_method IN ('google', 'hitam', 'face')),
  user_agent TEXT,
  ip_address INET,
  device_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_reason VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_recipient ON auth_sessions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(is_active) WHERE is_active = TRUE;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FACE AUTHENTICATION RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS face_auth_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('success', 'failed', 'blocked')),
  confidence_score DECIMAL(5, 4),
  image_hash VARCHAR(64),
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('login', 'approval', 'signature', 'verification')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_face_auth_recipient ON face_auth_records(recipient_id);
CREATE INDEX IF NOT EXISTS idx_face_auth_status ON face_auth_records(verification_status);
CREATE INDEX IF NOT EXISTS idx_face_auth_created ON face_auth_records(created_at DESC);

-- ============================================================
-- USER PREFERENCES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID UNIQUE NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  whatsapp_notifications BOOLEAN DEFAULT FALSE,
  notification_digest VARCHAR(20) DEFAULT 'instant' CHECK (notification_digest IN ('instant', 'hourly', 'daily', 'weekly')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  compact_mode BOOLEAN DEFAULT FALSE,
  dashboard_layout JSONB DEFAULT '{}',
  default_view VARCHAR(50) DEFAULT 'dashboard',
  sidebar_collapsed BOOLEAN DEFAULT FALSE,
  default_document_type document_type DEFAULT 'letter',
  default_routing_type routing_type DEFAULT 'sequential',
  auto_save_drafts BOOLEAN DEFAULT TRUE,
  calendar_default_view VARCHAR(20) DEFAULT 'week' CHECK (calendar_default_view IN ('day', 'week', 'month')),
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '18:00',
  sound_enabled BOOLEAN DEFAULT TRUE,
  high_contrast BOOLEAN DEFAULT FALSE,
  font_size VARCHAR(10) DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROLE PERMISSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL UNIQUE,
  can_create_documents BOOLEAN DEFAULT TRUE,
  can_view_own_documents BOOLEAN DEFAULT TRUE,
  can_view_department_documents BOOLEAN DEFAULT FALSE,
  can_view_all_documents BOOLEAN DEFAULT FALSE,
  can_approve_documents BOOLEAN DEFAULT FALSE,
  can_reject_documents BOOLEAN DEFAULT FALSE,
  can_bypass_approval BOOLEAN DEFAULT FALSE,
  can_escalate_documents BOOLEAN DEFAULT FALSE,
  can_manage_workflows BOOLEAN DEFAULT FALSE,
  can_create_workflow_templates BOOLEAN DEFAULT FALSE,
  can_modify_approval_chain BOOLEAN DEFAULT FALSE,
  can_schedule_meetings BOOLEAN DEFAULT TRUE,
  can_schedule_emergency_meetings BOOLEAN DEFAULT FALSE,
  can_invite_all_users BOOLEAN DEFAULT FALSE,
  can_create_channels BOOLEAN DEFAULT FALSE,
  can_create_announcements BOOLEAN DEFAULT FALSE,
  can_moderate_channels BOOLEAN DEFAULT FALSE,
  can_view_analytics BOOLEAN DEFAULT FALSE,
  can_view_department_analytics BOOLEAN DEFAULT FALSE,
  can_view_all_analytics BOOLEAN DEFAULT FALSE,
  can_export_analytics BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  can_manage_roles BOOLEAN DEFAULT FALSE,
  can_view_audit_logs BOOLEAN DEFAULT FALSE,
  can_manage_system_settings BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Insert default role permissions (upsert)
INSERT INTO role_permissions (role, can_view_all_documents, can_approve_documents, can_reject_documents, can_bypass_approval, can_manage_workflows, can_view_all_analytics, can_manage_users, can_manage_roles) VALUES
  ('principal', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('registrar', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
  ('dean', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
  ('chairman', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
  ('director', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
  ('hod', FALSE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
  ('program_head', FALSE, TRUE, TRUE, FALSE, TRUE, FALSE, FALSE, FALSE),
  ('controller_examinations', FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('asst_dean_iiic', FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('head_operations', FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('librarian', FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('ssg', FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('cdc_employee', FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('mentor', FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('faculty', FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('employee', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (role) DO NOTHING;

