-- ============================================================
-- IAOMS Production-Grade Backend Schema
-- Part 10: Views, RLS Policies & Real-time Triggers
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

-- ============================================================
-- MATERIALIZED VIEWS FOR DASHBOARD
-- ============================================================

-- Document Statistics View
DROP MATERIALIZED VIEW IF EXISTS document_stats_view;
CREATE MATERIALIZED VIEW document_stats_view AS
SELECT 
  d.department,
  d.status,
  d.document_type,
  d.routing_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE d.created_at >= NOW() - INTERVAL '24 hours') as last_24h,
  COUNT(*) FILTER (WHERE d.created_at >= NOW() - INTERVAL '7 days') as last_7d,
  COUNT(*) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days') as last_30d,
  AVG(EXTRACT(EPOCH FROM (d.completed_at - d.created_at))/3600) FILTER (WHERE d.completed_at IS NOT NULL) as avg_completion_hours
FROM documents d
WHERE d.is_deleted = FALSE
GROUP BY d.department, d.status, d.document_type, d.routing_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_stats_view ON document_stats_view(department, status, document_type, routing_type);

-- Approval Statistics View
DROP MATERIALIZED VIEW IF EXISTS approval_stats_view;
CREATE MATERIALIZED VIEW approval_stats_view AS
SELECT 
  r.id as approver_id,
  r.name as approver_name,
  r.department,
  COUNT(acr.id) as total_assigned,
  COUNT(acr.id) FILTER (WHERE acr.status = 'pending') as pending_count,
  COUNT(acr.id) FILTER (WHERE acr.status = 'approved') as approved_count,
  COUNT(acr.id) FILTER (WHERE acr.status = 'rejected') as rejected_count,
  AVG(EXTRACT(EPOCH FROM (acr.action_at - acr.created_at))/3600) FILTER (WHERE acr.action_at IS NOT NULL) as avg_response_hours
FROM recipients r
LEFT JOIN approval_card_recipients acr ON r.id = acr.recipient_id
WHERE r.can_approve = TRUE
GROUP BY r.id, r.name, r.department;

CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_stats_view ON approval_stats_view(approver_id);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Operations: Users can see their own operations or department operations
DROP POLICY IF EXISTS operations_select_policy ON operations;
CREATE POLICY operations_select_policy ON operations FOR SELECT USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM recipients r 
    WHERE r.id = auth.uid() AND (
      r.role IN ('principal', 'registrar', 'dean', 'director') OR
      r.can_approve = TRUE
    )
  )
);

DROP POLICY IF EXISTS operations_insert_policy ON operations;
CREATE POLICY operations_insert_policy ON operations FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

DROP POLICY IF EXISTS operations_update_policy ON operations;
CREATE POLICY operations_update_policy ON operations FOR UPDATE USING (
  created_by = auth.uid()
);

-- Recipients: Users can see all recipients (for selection) but only edit own
DROP POLICY IF EXISTS recipients_select_policy ON recipients;
CREATE POLICY recipients_select_policy ON recipients FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS recipients_update_policy ON recipients;
CREATE POLICY recipients_update_policy ON recipients FOR UPDATE USING (
  id = auth.uid()
);

-- Documents: Based on ownership, recipient list, or department
DROP POLICY IF EXISTS documents_select_policy ON documents;
CREATE POLICY documents_select_policy ON documents FOR SELECT USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM document_recipients dr 
    WHERE dr.document_id = documents.id AND dr.recipient_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM recipients r 
    WHERE r.id = auth.uid() AND r.role IN ('principal', 'registrar', 'dean', 'director')
  )
);

DROP POLICY IF EXISTS documents_insert_policy ON documents;
CREATE POLICY documents_insert_policy ON documents FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

DROP POLICY IF EXISTS documents_update_policy ON documents;
CREATE POLICY documents_update_policy ON documents FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM document_recipients dr 
    WHERE dr.document_id = documents.id AND dr.recipient_id = auth.uid() 
    AND dr.recipient_type IN ('approver', 'reviewer')
  )
);

-- Approval Cards: Submitter or recipient
DROP POLICY IF EXISTS approval_cards_select_policy ON approval_cards;
CREATE POLICY approval_cards_select_policy ON approval_cards FOR SELECT USING (
  submitted_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM approval_card_recipients acr 
    WHERE acr.approval_card_id = approval_cards.id AND acr.recipient_id = auth.uid()
  )
);

-- Notifications: Users only see their own
DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy ON notifications FOR SELECT USING (
  recipient_id = auth.uid()
);

DROP POLICY IF EXISTS notifications_update_policy ON notifications;
CREATE POLICY notifications_update_policy ON notifications FOR UPDATE USING (
  recipient_id = auth.uid()
);

-- Messages: Channel members only
DROP POLICY IF EXISTS messages_select_policy ON messages;
CREATE POLICY messages_select_policy ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = messages.channel_id AND cm.member_id = auth.uid()
  )
);

DROP POLICY IF EXISTS messages_insert_policy ON messages;
CREATE POLICY messages_insert_policy ON messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = channel_id AND cm.member_id = auth.uid()
  )
);

-- Channels: Members or public channels
DROP POLICY IF EXISTS channels_select_policy ON channels;
CREATE POLICY channels_select_policy ON channels FOR SELECT USING (
  is_private = FALSE OR
  EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = channels.id AND cm.member_id = auth.uid()
  )
);

-- ============================================================
-- REAL-TIME TRIGGER FUNCTIONS
-- ============================================================

-- Function to update realtime counts
CREATE OR REPLACE FUNCTION update_realtime_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_department department;
BEGIN
  -- Determine affected user/department based on table
  IF TG_TABLE_NAME = 'notifications' THEN
    v_user_id := COALESCE(NEW.recipient_id, OLD.recipient_id);
  ELSIF TG_TABLE_NAME = 'approval_card_recipients' THEN
    v_user_id := COALESCE(NEW.recipient_id, OLD.recipient_id);
  ELSIF TG_TABLE_NAME = 'messages' THEN
    -- Update all channel members
    NULL; -- Handle separately
  END IF;
  
  -- Update counts for user if applicable
  IF v_user_id IS NOT NULL THEN
    INSERT INTO realtime_counts (user_id, pending_approvals, unread_notifications, unread_messages)
    SELECT 
      v_user_id,
      (SELECT COUNT(*) FROM approval_card_recipients WHERE recipient_id = v_user_id AND status = 'pending'),
      (SELECT COUNT(*) FROM notifications WHERE recipient_id = v_user_id AND is_read = FALSE),
      (SELECT COUNT(*) FROM channel_members cm 
       JOIN messages m ON m.channel_id = cm.channel_id 
       WHERE cm.member_id = v_user_id AND m.created_at > cm.last_read_at)
    ON CONFLICT (user_id) DO UPDATE SET
      pending_approvals = EXCLUDED.pending_approvals,
      unread_notifications = EXCLUDED.unread_notifications,
      unread_messages = EXCLUDED.unread_messages,
      updated_at = NOW();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for realtime count updates
DROP TRIGGER IF EXISTS trigger_notification_counts ON notifications;
CREATE TRIGGER trigger_notification_counts
  AFTER INSERT OR UPDATE OR DELETE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_realtime_counts();

DROP TRIGGER IF EXISTS trigger_approval_counts ON approval_card_recipients;
CREATE TRIGGER trigger_approval_counts
  AFTER INSERT OR UPDATE OR DELETE ON approval_card_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_realtime_counts();

-- ============================================================
-- FUNCTION: Refresh Materialized Views
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY document_stats_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY approval_stats_view;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SUPABASE REALTIME CONFIGURATION
-- Enable realtime for key tables
-- ============================================================

-- Note: Run these commands in Supabase Dashboard > Database > Replication
-- or use the Supabase CLI/API

-- ALTER PUBLICATION supabase_realtime ADD TABLE operations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE documents;
-- ALTER PUBLICATION supabase_realtime ADD TABLE approval_cards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE approval_card_recipients;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE channels;
-- ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
-- ALTER PUBLICATION supabase_realtime ADD TABLE realtime_counts;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get user's pending items count
CREATE OR REPLACE FUNCTION get_user_pending_counts(p_user_id UUID)
RETURNS TABLE (
  pending_approvals BIGINT,
  pending_documents BIGINT,
  unread_notifications BIGINT,
  upcoming_meetings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM approval_card_recipients WHERE recipient_id = p_user_id AND status = 'pending')::BIGINT,
    (SELECT COUNT(*) FROM documents WHERE created_by = p_user_id AND status IN ('draft', 'pending'))::BIGINT,
    (SELECT COUNT(*) FROM notifications WHERE recipient_id = p_user_id AND is_read = FALSE)::BIGINT,
    (SELECT COUNT(*) FROM meeting_participants mp 
     JOIN meetings m ON m.id = mp.meeting_id 
     WHERE mp.participant_id = p_user_id AND m.start_time > NOW() AND m.start_time < NOW() + INTERVAL '7 days')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get department statistics
CREATE OR REPLACE FUNCTION get_department_stats(p_department department)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_documents', (SELECT COUNT(*) FROM documents WHERE department = p_department AND is_deleted = FALSE),
    'pending_approvals', (SELECT COUNT(*) FROM approval_cards ac 
                          JOIN documents d ON d.id = ac.document_id 
                          WHERE d.department = p_department AND ac.status = 'pending'),
    'active_users', (SELECT COUNT(*) FROM recipients WHERE department = p_department AND is_active = TRUE),
    'total_channels', (SELECT COUNT(*) FROM channels WHERE department = p_department AND is_archived = FALSE)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

