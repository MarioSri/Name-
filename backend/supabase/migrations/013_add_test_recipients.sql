-- Migration: Add test recipients for approval workflow testing
-- Run this in the Supabase SQL Editor

-- Add more recipients with valid roles
INSERT INTO recipients (user_id, name, email, role, role_type, department, can_approve, approval_level)
VALUES 
  ('principal-001', 'Dr. Rajesh Kumar', 'principal@hitam.edu.in', 'principal', 'PRINCIPAL', 'ADMIN', TRUE, 1),
  ('registrar-001', 'Prof. Anitha Sharma', 'registrar@hitam.edu.in', 'registrar', 'REGISTRAR', 'ADMIN', TRUE, 2),
  ('dean-001', 'Dr. Suresh Reddy', 'dean@hitam.edu.in', 'dean', 'DEAN', 'ADMIN', TRUE, 2),
  ('dean-cse-001', 'Dr. Venkat Rao', 'dean.cse@hitam.edu.in', 'dean', 'DEAN', 'CSE', TRUE, 3),
  ('hod-cse-001', 'Prof. Lakshmi Devi', 'hod.cse@hitam.edu.in', 'hod', 'HOD', 'CSE', TRUE, 4),
  ('faculty-001', 'Mr. Kiran Kumar', 'faculty@hitam.edu.in', 'faculty', 'FACULTY', 'CSE', FALSE, 5),
  ('faculty-002', 'Ms. Priya Sharma', 'priya@hitam.edu.in', 'faculty', 'FACULTY', 'CSE', FALSE, 5),
  ('director-001', 'Dr. Ravi Shankar', 'director@hitam.edu.in', 'director', 'DIRECTOR', 'ADMIN', TRUE, 1),
  ('chairman-001', 'Mr. Venkata Rao', 'chairman@hitam.edu.in', 'chairman', 'CHAIRMAN', 'ADMIN', TRUE, 1)
ON CONFLICT (user_id) DO NOTHING;

-- Verify recipients were added
SELECT user_id, name, role, department FROM recipients ORDER BY approval_level;
