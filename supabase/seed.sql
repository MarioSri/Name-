-- ============================================================
-- IAOMS Seed Data
-- Sample data for development and testing
-- ============================================================

-- ============================================================
-- SAMPLE RECIPIENTS (Users)
-- ============================================================

INSERT INTO recipients (user_id, name, email, role, role_type, department, can_approve, approval_level, hitam_id) VALUES
  -- Leadership
  ('principal-001', 'Dr. Rajesh Kumar', 'principal@hitam.edu.in', 'principal', 'PRINCIPAL', 'ADMIN', TRUE, 1, 'HITAM-P001'),
  ('registrar-001', 'Prof. Anitha Sharma', 'registrar@hitam.edu.in', 'registrar', 'REGISTRAR', 'ADMIN', TRUE, 2, 'HITAM-R001'),
  ('dean-001', 'Dr. Suresh Reddy', 'dean@hitam.edu.in', 'dean', 'DEAN', 'ADMIN', TRUE, 2, 'HITAM-D001'),
  ('chairman-001', 'Sri Venkat Rao', 'chairman@hitam.edu.in', 'chairman', 'CHAIRMAN', 'ADMIN', TRUE, 1, 'HITAM-CH001'),
  ('director-001', 'Dr. Priya Menon', 'director@hitam.edu.in', 'director', 'DIRECTOR', 'ADMIN', TRUE, 1, 'HITAM-DR001'),
  
  -- HODs
  ('hod-cse-001', 'Dr. Srinivas Rao', 'hod.cse@hitam.edu.in', 'hod', 'HOD', 'CSE', TRUE, 3, 'HITAM-HODCSE'),
  ('hod-ece-001', 'Dr. Lakshmi Devi', 'hod.ece@hitam.edu.in', 'hod', 'HOD', 'ECE', TRUE, 3, 'HITAM-HODECE'),
  ('hod-eee-001', 'Dr. Ramesh Babu', 'hod.eee@hitam.edu.in', 'hod', 'HOD', 'EEE', TRUE, 3, 'HITAM-HODEEE'),
  ('hod-mech-001', 'Dr. Venkata Krishna', 'hod.mech@hitam.edu.in', 'hod', 'HOD', 'MECH', TRUE, 3, 'HITAM-HODMECH'),
  
  -- Program Heads
  ('ph-cse-001', 'Prof. Madhavi Latha', 'ph.cse@hitam.edu.in', 'program_head', 'PROGRAM_HEAD', 'CSE', TRUE, 4, 'HITAM-PHCSE'),
  ('ph-ece-001', 'Prof. Ravi Shankar', 'ph.ece@hitam.edu.in', 'program_head', 'PROGRAM_HEAD', 'ECE', TRUE, 4, 'HITAM-PHECE'),
  ('ph-csm-001', 'Prof. Sunitha Rani', 'ph.csm@hitam.edu.in', 'program_head', 'PROGRAM_HEAD', 'CSM', TRUE, 4, 'HITAM-PHCSM'),
  
  -- Special Roles
  ('controller-001', 'Prof. Narayana Murthy', 'controller@hitam.edu.in', 'controller_examinations', 'CONTROLLER_EXAMINATIONS', 'ADMIN', TRUE, 3, 'HITAM-COE001'),
  ('asst-dean-001', 'Dr. Kavitha Reddy', 'asstdean@hitam.edu.in', 'asst_dean_iiic', 'ASST_DEAN_IIIC', 'ADMIN', TRUE, 4, 'HITAM-AD001'),
  ('head-ops-001', 'Mr. Raju Naidu', 'headops@hitam.edu.in', 'head_operations', 'HEAD_OPERATIONS', 'OPERATIONS', TRUE, 4, 'HITAM-HO001'),
  ('librarian-001', 'Mrs. Padmaja', 'librarian@hitam.edu.in', 'librarian', 'LIBRARIAN', 'LIBRARY', TRUE, 5, 'HITAM-LIB001'),
  
  -- Faculty
  ('faculty-cse-001', 'Mr. Anil Kumar', 'anil.cse@hitam.edu.in', 'faculty', 'FACULTY', 'CSE', TRUE, 6, 'HITAM-FCSE001'),
  ('faculty-cse-002', 'Ms. Swathi Reddy', 'swathi.cse@hitam.edu.in', 'faculty', 'FACULTY', 'CSE', TRUE, 6, 'HITAM-FCSE002'),
  ('faculty-ece-001', 'Mr. Prakash Rao', 'prakash.ece@hitam.edu.in', 'faculty', 'FACULTY', 'ECE', TRUE, 6, 'HITAM-FECE001'),
  ('faculty-mech-001', 'Mr. Kiran Kumar', 'kiran.mech@hitam.edu.in', 'faculty', 'FACULTY', 'MECH', TRUE, 6, 'HITAM-FMECH001'),
  
  -- Employees
  ('emp-admin-001', 'Mr. Sanjay Gupta', 'sanjay.admin@hitam.edu.in', 'employee', 'EMPLOYEE', 'ADMIN', FALSE, 10, 'HITAM-EMP001'),
  ('emp-admin-002', 'Ms. Priya Singh', 'priya.admin@hitam.edu.in', 'employee', 'EMPLOYEE', 'ADMIN', FALSE, 10, 'HITAM-EMP002'),
  ('emp-cse-001', 'Mr. Vijay Kumar', 'vijay.cse@hitam.edu.in', 'employee', 'EMPLOYEE', 'CSE', FALSE, 10, 'HITAM-EMPCSE001'),
  ('emp-lab-001', 'Mr. Ramana Rao', 'ramana.lab@hitam.edu.in', 'employee', 'EMPLOYEE', 'CSE', FALSE, 10, 'HITAM-LAB001'),
  
  -- CDC Employees
  ('cdc-001', 'Ms. Deepa Sharma', 'deepa.cdc@hitam.edu.in', 'cdc_employee', 'CDC_EMPLOYEE', 'ADMIN', TRUE, 5, 'HITAM-CDC001'),
  
  -- Mentors
  ('mentor-001', 'Dr. Arjun Prasad', 'arjun.mentor@hitam.edu.in', 'mentor', 'MENTOR', 'CSE', TRUE, 6, 'HITAM-MNT001');

-- ============================================================
-- SAMPLE USER PREFERENCES
-- ============================================================

INSERT INTO user_preferences (recipient_id, theme, language)
SELECT id, 'light', 'en' FROM recipients;

-- ============================================================
-- SAMPLE WORKFLOW TEMPLATES
-- ============================================================

INSERT INTO workflow_templates (template_id, name, description, document_type, routing_type, steps, created_by) VALUES
  ('WFT-LEAVE-001', 'Leave Application Workflow', 'Standard workflow for leave applications', 'application', 'sequential',
   '[
     {"order": 1, "role": "program_head", "action_required": "approve", "is_optional": false, "timeout_hours": 24},
     {"order": 2, "role": "hod", "action_required": "approve", "is_optional": false, "timeout_hours": 24},
     {"order": 3, "role": "registrar", "action_required": "approve", "is_optional": false, "timeout_hours": 48}
   ]'::JSONB,
   (SELECT id FROM recipients WHERE user_id = 'registrar-001')),
   
  ('WFT-CIRCULAR-001', 'Circular Distribution Workflow', 'Workflow for distributing circulars', 'circular', 'parallel',
   '[
     {"order": 1, "role": "hod", "action_required": "acknowledge", "is_optional": false, "timeout_hours": 48}
   ]'::JSONB,
   (SELECT id FROM recipients WHERE user_id = 'principal-001')),
   
  ('WFT-PROPOSAL-001', 'Budget Proposal Workflow', 'Multi-step approval for budget proposals', 'proposal', 'sequential',
   '[
     {"order": 1, "role": "hod", "action_required": "approve", "is_optional": false, "timeout_hours": 48},
     {"order": 2, "role": "dean", "action_required": "approve", "is_optional": false, "timeout_hours": 48},
     {"order": 3, "role": "registrar", "action_required": "approve", "is_optional": false, "timeout_hours": 48},
     {"order": 4, "role": "principal", "action_required": "approve", "is_optional": false, "timeout_hours": 72}
   ]'::JSONB,
   (SELECT id FROM recipients WHERE user_id = 'registrar-001'));

-- ============================================================
-- SAMPLE CHANNELS
-- ============================================================

INSERT INTO channels (channel_id, name, description, type, department, members, member_ids, created_by, created_by_name) VALUES
  ('dept-cse', 'CSE Department', 'Official channel for CSE department', 'department', 'CSE',
   ARRAY['Dr. Srinivas Rao', 'Prof. Madhavi Latha', 'Mr. Anil Kumar', 'Ms. Swathi Reddy'],
   ARRAY['hod-cse-001', 'ph-cse-001', 'faculty-cse-001', 'faculty-cse-002'],
   (SELECT id FROM recipients WHERE user_id = 'hod-cse-001'), 'Dr. Srinivas Rao'),
   
  ('dept-ece', 'ECE Department', 'Official channel for ECE department', 'department', 'ECE',
   ARRAY['Dr. Lakshmi Devi', 'Prof. Ravi Shankar', 'Mr. Prakash Rao'],
   ARRAY['hod-ece-001', 'ph-ece-001', 'faculty-ece-001'],
   (SELECT id FROM recipients WHERE user_id = 'hod-ece-001'), 'Dr. Lakshmi Devi'),
   
  ('announcements', 'Institution Announcements', 'Official announcements from management', 'announcement', NULL,
   ARRAY[]::TEXT[], ARRAY[]::TEXT[],
   (SELECT id FROM recipients WHERE user_id = 'principal-001'), 'Dr. Rajesh Kumar'),
   
  ('hods-group', 'HODs Group', 'Private group for all HODs', 'group', NULL,
   ARRAY['Dr. Srinivas Rao', 'Dr. Lakshmi Devi', 'Dr. Ramesh Babu', 'Dr. Venkata Krishna'],
   ARRAY['hod-cse-001', 'hod-ece-001', 'hod-eee-001', 'hod-mech-001'],
   (SELECT id FROM recipients WHERE user_id = 'registrar-001'), 'Prof. Anitha Sharma');

-- Add channel members
INSERT INTO channel_members (channel_id, member_id, member_user_id, member_name, role)
SELECT 
  c.id,
  r.id,
  r.user_id,
  r.name,
  CASE WHEN r.user_id LIKE 'hod%' THEN 'admin' ELSE 'member' END
FROM channels c
CROSS JOIN recipients r
WHERE c.channel_id = 'dept-cse' AND r.department = 'CSE';

-- ============================================================
-- SAMPLE DOCUMENTS (for testing)
-- ============================================================

INSERT INTO documents (
  tracking_id, title, description, type, priority, status,
  submitter_id, submitter_user_id, submitter_name, submitter_role, submitter_department,
  routing_type, source, is_emergency
) VALUES
  ('DOC-2024-001', 'Leave Application - Annual Leave Request', 'Request for 5 days annual leave from Dec 15-20', 'application', 'normal', 'pending',
   (SELECT id FROM recipients WHERE user_id = 'faculty-cse-001'), 'faculty-cse-001', 'Mr. Anil Kumar', 'faculty', 'CSE',
   'sequential', 'document_management', FALSE),
   
  ('DOC-2024-002', 'Lab Equipment Proposal', 'Proposal for new computer lab equipment for CSE department', 'proposal', 'high', 'pending',
   (SELECT id FROM recipients WHERE user_id = 'hod-cse-001'), 'hod-cse-001', 'Dr. Srinivas Rao', 'hod', 'CSE',
   'sequential', 'document_management', FALSE),
   
  ('DOC-2024-003', 'Emergency Infrastructure Report', 'Urgent report on classroom maintenance requirements', 'report', 'urgent', 'pending',
   (SELECT id FROM recipients WHERE user_id = 'head-ops-001'), 'head-ops-001', 'Mr. Raju Naidu', 'head_operations', 'OPERATIONS',
   'parallel', 'emergency_management', TRUE),
   
  ('DOC-2024-004', 'Academic Calendar Circular', 'Circular regarding academic calendar updates for 2024', 'circular', 'normal', 'approved',
   (SELECT id FROM recipients WHERE user_id = 'registrar-001'), 'registrar-001', 'Prof. Anitha Sharma', 'registrar', 'ADMIN',
   'parallel', 'document_management', FALSE);

-- Add document recipients
INSERT INTO document_recipients (
  document_id, recipient_id, recipient_user_id, recipient_name, recipient_role, recipient_department,
  order_index, is_current, status
)
SELECT 
  d.id,
  r.id,
  r.user_id,
  r.name,
  r.role,
  r.department,
  1,
  TRUE,
  'pending'
FROM documents d, recipients r
WHERE d.tracking_id = 'DOC-2024-001' AND r.user_id = 'ph-cse-001';

INSERT INTO document_recipients (
  document_id, recipient_id, recipient_user_id, recipient_name, recipient_role, recipient_department,
  order_index, is_current, status
)
SELECT 
  d.id,
  r.id,
  r.user_id,
  r.name,
  r.role,
  r.department,
  2,
  FALSE,
  'pending'
FROM documents d, recipients r
WHERE d.tracking_id = 'DOC-2024-001' AND r.user_id = 'hod-cse-001';

-- ============================================================
-- SAMPLE APPROVAL CARDS
-- ============================================================

INSERT INTO approval_cards (
  approval_id, document_id, tracking_card_id, title, description,
  type, priority, status, submitter, submitter_id, submitter_user_id,
  current_recipient_id, current_recipient_user_id, routing_type, source
)
SELECT
  'APR-2024-001',
  d.id,
  d.tracking_id,
  d.title,
  d.description,
  d.type,
  d.priority,
  'pending',
  d.submitter_name,
  d.submitter_id,
  d.submitter_user_id,
  (SELECT id FROM recipients WHERE user_id = 'ph-cse-001'),
  'ph-cse-001',
  d.routing_type,
  d.source
FROM documents d
WHERE d.tracking_id = 'DOC-2024-001';

-- ============================================================
-- SAMPLE MEETINGS
-- ============================================================

INSERT INTO meetings (
  meeting_id, title, description, agenda,
  host_id, host_user_id, host_name,
  scheduled_start, scheduled_end, duration_minutes,
  meeting_type, meeting_platform, meeting_url,
  status, priority
) VALUES
  ('MTG-2024-001', 'Weekly HOD Meeting', 'Weekly coordination meeting for all HODs', 
   '1. Department updates\n2. Student concerns\n3. Infrastructure needs\n4. Any other business',
   (SELECT id FROM recipients WHERE user_id = 'principal-001'), 'principal-001', 'Dr. Rajesh Kumar',
   NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '2 hours', 120,
   'online', 'google_meet', 'https://meet.google.com/abc-defg-hij',
   'scheduled', 'normal'),
   
  ('MTG-2024-002', 'CSE Department Faculty Meeting', 'Monthly department meeting',
   '1. Academic progress\n2. Research updates\n3. Lab requirements',
   (SELECT id FROM recipients WHERE user_id = 'hod-cse-001'), 'hod-cse-001', 'Dr. Srinivas Rao',
   NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '1 hour', 60,
   'hybrid', 'zoom', 'https://zoom.us/j/123456789',
   'scheduled', 'normal');

-- Add meeting participants
INSERT INTO meeting_participants (
  meeting_id, participant_id, participant_user_id, participant_name, participant_email, participant_role,
  is_required, is_organizer
)
SELECT 
  m.id,
  r.id,
  r.user_id,
  r.name,
  r.email,
  r.role,
  TRUE,
  r.user_id = 'principal-001'
FROM meetings m, recipients r
WHERE m.meeting_id = 'MTG-2024-001' AND r.role = 'hod';

-- ============================================================
-- SAMPLE NOTIFICATIONS
-- ============================================================

INSERT INTO notifications (
  recipient_id, recipient_user_id, title, message, type, category, priority,
  document_id, action_url
)
SELECT 
  r.id,
  r.user_id,
  'New Approval Request: Leave Application',
  'Mr. Anil Kumar has submitted a leave application for your approval.',
  'approval_request',
  'approval',
  'normal',
  (SELECT id FROM documents WHERE tracking_id = 'DOC-2024-001'),
  '/approvals'
FROM recipients r
WHERE r.user_id = 'ph-cse-001';

INSERT INTO notifications (
  recipient_id, recipient_user_id, title, message, type, category, priority,
  meeting_id, action_url
)
SELECT 
  r.id,
  r.user_id,
  'Meeting Scheduled: Weekly HOD Meeting',
  'You have been invited to the Weekly HOD Meeting on ' || TO_CHAR(NOW() + INTERVAL '2 days', 'Mon DD, YYYY'),
  'meeting_scheduled',
  'meeting',
  'normal',
  (SELECT id FROM meetings WHERE meeting_id = 'MTG-2024-001'),
  '/calendar'
FROM recipients r
WHERE r.role = 'hod';

-- ============================================================
-- SAMPLE CALENDAR EVENTS
-- ============================================================

INSERT INTO calendar_events (
  event_id, title, description,
  owner_id, owner_user_id,
  start_time, end_time, all_day,
  event_type, color, is_recurring
)
SELECT 
  'EVT-2024-001',
  'Weekly HOD Meeting',
  'Weekly coordination meeting',
  r.id,
  r.user_id,
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '2 days' + INTERVAL '2 hours',
  FALSE,
  'meeting',
  '#3b82f6',
  TRUE
FROM recipients r
WHERE r.user_id = 'principal-001';

-- ============================================================
-- UPDATE COUNTERS WITH INITIAL VALUES
-- ============================================================

UPDATE realtime_counters SET current_value = (SELECT COUNT(*) FROM documents WHERE is_deleted = FALSE) WHERE counter_name = 'total_documents';
UPDATE realtime_counters SET current_value = (SELECT COUNT(*) FROM documents WHERE status = 'pending' AND is_deleted = FALSE) WHERE counter_name = 'pending_documents';
UPDATE realtime_counters SET current_value = (SELECT COUNT(*) FROM documents WHERE status = 'approved' AND is_deleted = FALSE) WHERE counter_name = 'approved_documents';
UPDATE realtime_counters SET current_value = (SELECT COUNT(*) FROM documents WHERE status = 'rejected' AND is_deleted = FALSE) WHERE counter_name = 'rejected_documents';
UPDATE realtime_counters SET current_value = (SELECT COUNT(*) FROM approval_cards WHERE status = 'pending' AND is_deleted = FALSE) WHERE counter_name = 'pending_approvals';
UPDATE realtime_counters SET current_value = (SELECT COUNT(*) FROM documents WHERE is_emergency = TRUE AND is_deleted = FALSE) WHERE counter_name = 'emergency_documents';
