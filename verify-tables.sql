-- Verification script to check if all tables exist
-- Run this in Supabase SQL Editor to verify tables were created

-- Check core tables
SELECT 'users' as table_name, COUNT(*) as exists FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'
UNION ALL
SELECT 'recipients', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipients'
UNION ALL
SELECT 'documents', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents'
UNION ALL
SELECT 'document_files', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_files'
UNION ALL
SELECT 'document_recipients', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_recipients'
UNION ALL
SELECT 'approval_cards', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'approval_cards'
UNION ALL
SELECT 'approvals', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'approvals'
UNION ALL
SELECT 'workflow_routes', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_routes'
UNION ALL
SELECT 'workflow_instances', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflow_instances'
UNION ALL
SELECT 'comments', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments'
UNION ALL
SELECT 'digital_signatures', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'digital_signatures'
UNION ALL
SELECT 'live_meeting_requests', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_meeting_requests'
UNION ALL
SELECT 'channels', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'channels'
UNION ALL
SELECT 'messages', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages'
UNION ALL
SELECT 'calendar_meetings', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_meetings'
UNION ALL
SELECT 'notifications', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications'
UNION ALL
SELECT 'dashboard_configs', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dashboard_configs'
UNION ALL
SELECT 'analytics_events', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_events'
UNION ALL
SELECT 'user_settings', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings'
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs';

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

