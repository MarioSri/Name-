-- ================================================================
-- IAOMS SEED DATA - Default Recipients
-- ================================================================
-- Run this AFTER 001_create_iaoms_schema.sql
-- This creates the institutional hierarchy for the IAOMS workflow
-- ================================================================

-- ================================================================
-- INSERT INSTITUTIONAL RECIPIENTS
-- ================================================================

INSERT INTO recipients (
  user_id, 
  google_id,
  name, 
  email,
  role,
  role_type,
  department, 
  branch,
  designation,
  can_approve, 
  approval_level, 
  is_active,
  metadata
) VALUES 
-- Principal - Highest authority (Level 1)
(
  'principal-001',
  NULL,
  'Dr. Sarah Johnson',
  'principal@school.edu',
  'PRINCIPAL',
  'PRINCIPAL',
  'Administration',
  'Main Campus',
  'Principal',
  true,
  1,
  true,
  '{"office": "Main Building Room 101", "phone": "+1-555-0101"}'::jsonb
),

-- Registrar (Level 2)
(
  'registrar-001',
  NULL,
  'Mr. Robert Williams',
  'registrar@school.edu',
  'REGISTRAR',
  'REGISTRAR',
  'Administration',
  'Main Campus',
  'Registrar',
  true,
  2,
  true,
  '{"office": "Main Building Room 102", "phone": "+1-555-0102"}'::jsonb
),

-- HOD - Head of Departments (Level 3)
(
  'hod-math-001',
  NULL,
  'Dr. Emily Chen',
  'hod.math@school.edu',
  'HOD',
  'HOD',
  'Mathematics',
  'Main Campus',
  'Head of Mathematics',
  true,
  3,
  true,
  '{"office": "Science Building Room 201", "subjects": ["Algebra", "Calculus", "Statistics"]}'::jsonb
),
(
  'hod-science-001',
  NULL,
  'Mr. James Thompson',
  'hod.science@school.edu',
  'HOD',
  'HOD',
  'Science',
  'Main Campus',
  'Head of Science',
  true,
  3,
  true,
  '{"office": "Science Building Room 301", "subjects": ["Physics", "Chemistry", "Biology"]}'::jsonb
),
(
  'hod-english-001',
  NULL,
  'Ms. Maria Garcia',
  'hod.english@school.edu',
  'HOD',
  'HOD',
  'English',
  'Main Campus',
  'Head of English',
  true,
  3,
  true,
  '{"office": "Humanities Building Room 101", "subjects": ["Literature", "Writing", "Grammar"]}'::jsonb
),
(
  'hod-it-001',
  NULL,
  'Dr. David Lee',
  'hod.it@school.edu',
  'HOD',
  'HOD',
  'IT',
  'Main Campus',
  'Head of IT',
  true,
  3,
  true,
  '{"office": "Tech Building Room 401", "responsibilities": ["Systems", "Network", "Support"]}'::jsonb
),
(
  'hod-hr-001',
  NULL,
  'Ms. Lisa Brown',
  'hod.hr@school.edu',
  'HOD',
  'HOD',
  'HR',
  'Main Campus',
  'Head of Human Resources',
  true,
  3,
  true,
  '{"office": "Admin Building Room 201", "responsibilities": ["Recruitment", "Staff Welfare", "Training"]}'::jsonb
),
(
  'hod-finance-001',
  NULL,
  'Mr. Michael Davis',
  'hod.finance@school.edu',
  'HOD',
  'HOD',
  'Finance',
  'Main Campus',
  'Head of Finance',
  true,
  3,
  true,
  '{"office": "Admin Building Room 301", "responsibilities": ["Budget", "Payroll", "Accounts"]}'::jsonb
),

-- Program Heads (Level 4)
(
  'program-head-001',
  NULL,
  'Ms. Jennifer Wilson',
  'program.academic@school.edu',
  'PROGRAM_HEAD',
  'PROGRAM_HEAD',
  'Academic Affairs',
  'Main Campus',
  'Academic Program Head',
  true,
  4,
  true,
  '{"office": "Main Building Room 103", "focus": "Academic Programs"}'::jsonb
),
(
  'program-head-002',
  NULL,
  'Mr. Christopher Martinez',
  'program.student@school.edu',
  'PROGRAM_HEAD',
  'PROGRAM_HEAD',
  'Student Affairs',
  'Main Campus',
  'Student Affairs Head',
  true,
  4,
  true,
  '{"office": "Student Center Room 101", "focus": "Student Welfare"}'::jsonb
),
(
  'program-head-003',
  NULL,
  'Ms. Amanda Taylor',
  'program.events@school.edu',
  'PROGRAM_HEAD',
  'PROGRAM_HEAD',
  'Events',
  'Main Campus',
  'Events Program Head',
  true,
  4,
  true,
  '{"office": "Main Building Room 104", "focus": "School Events"}'::jsonb
),

-- Employees / Teachers (Level 5)
(
  'employee-001',
  NULL,
  'Mr. Daniel Anderson',
  'daniel.anderson@school.edu',
  'EMPLOYEE',
  'EMPLOYEE',
  'Mathematics',
  'Main Campus',
  'Senior Mathematics Teacher',
  false,
  5,
  true,
  '{"classroom": "Science Building Room 202", "subjects": ["Algebra II", "Pre-Calculus"]}'::jsonb
),
(
  'employee-002',
  NULL,
  'Ms. Rachel Thomas',
  'rachel.thomas@school.edu',
  'EMPLOYEE',
  'EMPLOYEE',
  'Science',
  'Main Campus',
  'Physics Teacher',
  false,
  5,
  true,
  '{"classroom": "Science Building Room 302", "subjects": ["Physics", "AP Physics"]}'::jsonb
),
(
  'employee-003',
  NULL,
  'Mr. Kevin Jackson',
  'kevin.jackson@school.edu',
  'EMPLOYEE',
  'EMPLOYEE',
  'English',
  'Main Campus',
  'English Literature Teacher',
  false,
  5,
  true,
  '{"classroom": "Humanities Building Room 102", "subjects": ["English Literature", "Creative Writing"]}'::jsonb
),
(
  'employee-004',
  NULL,
  'Ms. Patricia White',
  'patricia.white@school.edu',
  'EMPLOYEE',
  'EMPLOYEE',
  'Administration',
  'Main Campus',
  'Administrative Assistant',
  false,
  5,
  true,
  '{"office": "Main Building Reception", "responsibilities": ["Front Desk", "Appointments"]}'::jsonb
),
(
  'employee-005',
  NULL,
  'Mr. Steven Harris',
  'steven.harris@school.edu',
  'EMPLOYEE',
  'EMPLOYEE',
  'IT',
  'Main Campus',
  'IT Support Specialist',
  false,
  5,
  true,
  '{"office": "Tech Building Room 402", "responsibilities": ["Technical Support", "Equipment"]}'::jsonb
),
(
  'employee-006',
  NULL,
  'Ms. Nancy Clark',
  'nancy.clark@school.edu',
  'EMPLOYEE',
  'EMPLOYEE',
  'Library',
  'Main Campus',
  'Librarian',
  false,
  5,
  true,
  '{"office": "Library Main Floor", "responsibilities": ["Resources", "Research Support"]}'::jsonb
)

ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  role_type = EXCLUDED.role_type,
  department = EXCLUDED.department,
  branch = EXCLUDED.branch,
  designation = EXCLUDED.designation,
  can_approve = EXCLUDED.can_approve,
  approval_level = EXCLUDED.approval_level,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- ================================================================
-- CREATE DEFAULT COMMUNICATION CHANNELS
-- ================================================================

INSERT INTO channels (
  channel_id,
  name,
  type,
  department,
  description,
  created_by,
  is_active
) VALUES 
(
  'channel-admin',
  'Administration',
  'department',
  'Administration',
  'Official channel for administrative staff',
  'principal-001',
  true
),
(
  'channel-math',
  'Mathematics Department',
  'department',
  'Mathematics',
  'Channel for mathematics department discussions',
  'hod-math-001',
  true
),
(
  'channel-science',
  'Science Department',
  'department',
  'Science',
  'Channel for science department discussions',
  'hod-science-001',
  true
),
(
  'channel-english',
  'English Department',
  'department',
  'English',
  'Channel for English department discussions',
  'hod-english-001',
  true
),
(
  'channel-it',
  'IT Department',
  'department',
  'IT',
  'Channel for IT department discussions',
  'hod-it-001',
  true
),
(
  'channel-hr',
  'HR Department',
  'department',
  'HR',
  'Channel for HR department discussions',
  'hod-hr-001',
  true
),
(
  'channel-finance',
  'Finance Department',
  'department',
  'Finance',
  'Channel for finance department discussions',
  'hod-finance-001',
  true
),
(
  'channel-announcements',
  'All Staff Announcements',
  'announcement',
  NULL,
  'School-wide announcements for all staff',
  'principal-001',
  true
),
(
  'channel-emergency',
  'Emergency Broadcasts',
  'emergency',
  NULL,
  'Emergency communications channel',
  'principal-001',
  true
)

ON CONFLICT (channel_id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  department = EXCLUDED.department,
  description = EXCLUDED.description,
  updated_at = now();

-- ================================================================
-- ADD CHANNEL MEMBERS (Add all recipients to their department channels)
-- ================================================================

-- Add members to Administration channel
INSERT INTO channel_members (channel_id, member_id, member_user_id, role)
SELECT 
  c.id,
  r.id,
  r.user_id,
  CASE WHEN r.role = 'PRINCIPAL' THEN 'admin' ELSE 'member' END
FROM channels c
CROSS JOIN recipients r
WHERE c.channel_id = 'channel-admin'
AND r.department = 'Administration'
ON CONFLICT (channel_id, member_id) DO NOTHING;

-- Add members to Mathematics channel
INSERT INTO channel_members (channel_id, member_id, member_user_id, role)
SELECT 
  c.id,
  r.id,
  r.user_id,
  CASE WHEN r.role = 'HOD' THEN 'admin' ELSE 'member' END
FROM channels c
CROSS JOIN recipients r
WHERE c.channel_id = 'channel-math'
AND r.department = 'Mathematics'
ON CONFLICT (channel_id, member_id) DO NOTHING;

-- Add members to Science channel
INSERT INTO channel_members (channel_id, member_id, member_user_id, role)
SELECT 
  c.id,
  r.id,
  r.user_id,
  CASE WHEN r.role = 'HOD' THEN 'admin' ELSE 'member' END
FROM channels c
CROSS JOIN recipients r
WHERE c.channel_id = 'channel-science'
AND r.department = 'Science'
ON CONFLICT (channel_id, member_id) DO NOTHING;

-- Add members to English channel
INSERT INTO channel_members (channel_id, member_id, member_user_id, role)
SELECT 
  c.id,
  r.id,
  r.user_id,
  CASE WHEN r.role = 'HOD' THEN 'admin' ELSE 'member' END
FROM channels c
CROSS JOIN recipients r
WHERE c.channel_id = 'channel-english'
AND r.department = 'English'
ON CONFLICT (channel_id, member_id) DO NOTHING;

-- Add members to IT channel
INSERT INTO channel_members (channel_id, member_id, member_user_id, role)
SELECT 
  c.id,
  r.id,
  r.user_id,
  CASE WHEN r.role = 'HOD' THEN 'admin' ELSE 'member' END
FROM channels c
CROSS JOIN recipients r
WHERE c.channel_id = 'channel-it'
AND r.department = 'IT'
ON CONFLICT (channel_id, member_id) DO NOTHING;

-- Add ALL recipients to Announcements channel
INSERT INTO channel_members (channel_id, member_id, member_user_id, role)
SELECT 
  c.id,
  r.id,
  r.user_id,
  CASE WHEN r.role IN ('PRINCIPAL', 'REGISTRAR') THEN 'admin' ELSE 'member' END
FROM channels c
CROSS JOIN recipients r
WHERE c.channel_id = 'channel-announcements'
ON CONFLICT (channel_id, member_id) DO NOTHING;

-- Add ALL recipients to Emergency channel
INSERT INTO channel_members (channel_id, member_id, member_user_id, role)
SELECT 
  c.id,
  r.id,
  r.user_id,
  CASE WHEN r.role = 'PRINCIPAL' THEN 'admin' ELSE 'member' END
FROM channels c
CROSS JOIN recipients r
WHERE c.channel_id = 'channel-emergency'
ON CONFLICT (channel_id, member_id) DO NOTHING;
