-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 11: Enable Realtime for Tables (NOT materialized views)
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- Note: Materialized views (document_stats_view, approval_stats_view) 
-- CANNOT be added to realtime - only regular tables can be replicated

-- Safely enable realtime for each table individually
-- Using DO blocks to handle cases where table is already in publication

DO $$
BEGIN
  -- operations
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE operations;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already added
  END;
  
  -- documents
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE documents;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- document_recipients
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE document_recipients;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- approval_cards
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE approval_cards;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- approval_card_recipients
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE approval_card_recipients;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- notifications
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- messages
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- channels
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE channels;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- channel_members
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- meetings
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- meeting_participants
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE meeting_participants;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- realtime_counts
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE realtime_counts;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- recipients
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE recipients;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- analytics_metrics
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE analytics_metrics;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  -- analytics_snapshots
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE analytics_snapshots;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

END $$;

-- ============================================================
-- IMPORTANT: Materialized views are NOT realtime-capable
-- To get "realtime" stats, use regular tables with triggers
-- ============================================================

-- Create a regular table for realtime approval stats cache
CREATE TABLE IF NOT EXISTS approval_stats_cache (
  approver_id UUID PRIMARY KEY REFERENCES recipients(id),
  approver_name VARCHAR(255),
  department department,
  total_assigned INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  avg_response_hours DECIMAL(10,2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a regular table for realtime document stats cache
CREATE TABLE IF NOT EXISTS document_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department department,
  status operation_status,
  document_type document_type,
  routing_type routing_type,
  count INTEGER DEFAULT 0,
  last_24h INTEGER DEFAULT 0,
  last_7d INTEGER DEFAULT 0,
  last_30d INTEGER DEFAULT 0,
  avg_completion_hours DECIMAL(10,2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (department, status, document_type, routing_type)
);

-- Enable realtime on the cache tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE approval_stats_cache;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE document_stats_cache;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Function to refresh approval stats cache (call this instead of refreshing materialized view)
CREATE OR REPLACE FUNCTION refresh_approval_stats_cache()
RETURNS void AS $$
BEGIN
  INSERT INTO approval_stats_cache (
    approver_id, approver_name, department, total_assigned, 
    pending_count, approved_count, rejected_count, avg_response_hours, updated_at
  )
  SELECT 
    r.id,
    r.name,
    r.department,
    COUNT(acr.id)::INTEGER,
    COUNT(acr.id) FILTER (WHERE acr.status = 'pending')::INTEGER,
    COUNT(acr.id) FILTER (WHERE acr.status = 'approved')::INTEGER,
    COUNT(acr.id) FILTER (WHERE acr.status = 'rejected')::INTEGER,
    AVG(EXTRACT(EPOCH FROM (acr.action_at - acr.created_at))/3600),
    NOW()
  FROM recipients r
  LEFT JOIN approval_card_recipients acr ON r.id = acr.recipient_id
  WHERE r.can_approve = TRUE
  GROUP BY r.id, r.name, r.department
  ON CONFLICT (approver_id) DO UPDATE SET
    approver_name = EXCLUDED.approver_name,
    department = EXCLUDED.department,
    total_assigned = EXCLUDED.total_assigned,
    pending_count = EXCLUDED.pending_count,
    approved_count = EXCLUDED.approved_count,
    rejected_count = EXCLUDED.rejected_count,
    avg_response_hours = EXCLUDED.avg_response_hours,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh document stats cache
CREATE OR REPLACE FUNCTION refresh_document_stats_cache()
RETURNS void AS $$
BEGIN
  -- Clear and repopulate
  DELETE FROM document_stats_cache;
  
  INSERT INTO document_stats_cache (
    department, status, document_type, routing_type,
    count, last_24h, last_7d, last_30d, avg_completion_hours, updated_at
  )
  SELECT 
    d.department,
    d.status,
    d.document_type,
    d.routing_type,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE d.created_at >= NOW() - INTERVAL '24 hours')::INTEGER,
    COUNT(*) FILTER (WHERE d.created_at >= NOW() - INTERVAL '7 days')::INTEGER,
    COUNT(*) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days')::INTEGER,
    AVG(EXTRACT(EPOCH FROM (d.completed_at - d.created_at))/3600),
    NOW()
  FROM documents d
  WHERE d.is_deleted = FALSE
  GROUP BY d.department, d.status, d.document_type, d.routing_type;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on cache tables
ALTER TABLE approval_stats_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_stats_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access to cache tables for authenticated users
DROP POLICY IF EXISTS approval_stats_cache_select ON approval_stats_cache;
CREATE POLICY approval_stats_cache_select ON approval_stats_cache FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS document_stats_cache_select ON document_stats_cache;
CREATE POLICY document_stats_cache_select ON document_stats_cache FOR SELECT USING (TRUE);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_approval_stats_cache_dept ON approval_stats_cache(department);
CREATE INDEX IF NOT EXISTS idx_document_stats_cache_dept ON document_stats_cache(department);
CREATE INDEX IF NOT EXISTS idx_document_stats_cache_status ON document_stats_cache(status);
