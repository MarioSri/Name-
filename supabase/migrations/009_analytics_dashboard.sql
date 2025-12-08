-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 9: Analytics & Dashboard
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- ============================================================
-- ANALYTICS METRICS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metric identification
  metric_name VARCHAR(100) NOT NULL,
  metric_category VARCHAR(50) NOT NULL CHECK (metric_category IN ('documents', 'approvals', 'meetings', 'users', 'channels', 'system')),
  
  -- Dimensions
  department department,
  user_id UUID REFERENCES recipients(id),
  
  -- Time period
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly', 'yearly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Values
  value_count INTEGER DEFAULT 0,
  value_sum DECIMAL(15, 2) DEFAULT 0,
  value_avg DECIMAL(15, 4) DEFAULT 0,
  value_min DECIMAL(15, 2),
  value_max DECIMAL(15, 2),
  
  -- Additional metrics
  metrics_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(metric_name, metric_category, department, user_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_analytics_name ON analytics_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_category ON analytics_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_analytics_department ON analytics_metrics(department);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_period ON analytics_metrics(period_type, period_start);

ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ANALYTICS SNAPSHOTS (Point-in-time data)
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Snapshot type
  snapshot_type VARCHAR(50) NOT NULL CHECK (snapshot_type IN ('daily_summary', 'weekly_summary', 'monthly_summary', 'department_stats', 'user_stats', 'system_health')),
  
  -- Scope
  department department,
  user_id UUID REFERENCES recipients(id),
  
  -- Snapshot data
  data JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamp
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_type ON analytics_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_snapshots_department ON analytics_snapshots(department);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON analytics_snapshots(snapshot_at DESC);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DASHBOARD WIDGETS (User dashboard configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  user_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Widget configuration
  widget_type VARCHAR(50) NOT NULL,
  widget_name VARCHAR(100) NOT NULL,
  
  -- Position & Size
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 1,
  height INTEGER DEFAULT 1,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Visibility
  is_visible BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widgets_user ON dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_widgets_type ON dashboard_widgets(widget_type);

ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RECENT DOCUMENTS (Quick access cache)
-- ============================================================

CREATE TABLE IF NOT EXISTS recent_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User
  user_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Document
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Access info
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  
  -- Action type
  action_type VARCHAR(30) DEFAULT 'view' CHECK (action_type IN ('view', 'edit', 'approve', 'sign', 'share')),
  
  UNIQUE(user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_docs_user ON recent_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_docs_accessed ON recent_documents(last_accessed_at DESC);

ALTER TABLE recent_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- REMINDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('REM-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  
  -- Owner
  user_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  
  -- Related entity
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  approval_card_id UUID REFERENCES approval_cards(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- Reminder details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Schedule
  remind_at TIMESTAMPTZ NOT NULL,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed', 'snoozed')),
  snoozed_until TIMESTAMPTZ,
  
  -- Notification channels
  notify_via TEXT[] DEFAULT ARRAY['in_app', 'push'],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- REAL-TIME COUNTS TABLE (Dashboard counters)
-- ============================================================

CREATE TABLE IF NOT EXISTS realtime_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  user_id UUID REFERENCES recipients(id) ON DELETE CASCADE,
  department department,
  
  -- Counters
  pending_approvals INTEGER DEFAULT 0,
  unread_notifications INTEGER DEFAULT 0,
  unread_messages INTEGER DEFAULT 0,
  pending_documents INTEGER DEFAULT 0,
  upcoming_meetings INTEGER DEFAULT 0,
  overdue_items INTEGER DEFAULT 0,
  
  -- Additional counts
  counts_data JSONB DEFAULT '{}',
  
  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id),
  UNIQUE(department) 
);

CREATE INDEX IF NOT EXISTS idx_realtime_counts_user ON realtime_counts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_realtime_counts_department ON realtime_counts(department) WHERE department IS NOT NULL;

ALTER TABLE realtime_counts ENABLE ROW LEVEL SECURITY;

