-- Recipients table for real user data
CREATE TABLE IF NOT EXISTS recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    branch TEXT,
    year TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_recipients_role ON recipients(role);
CREATE INDEX IF NOT EXISTS idx_recipients_branch ON recipients(branch);

-- Trigger for updated_at
CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON recipients FOR ALL USING (true);

-- Insert sample recipients (replace with your real data)
INSERT INTO recipients (user_id, name, email, role, department, branch) VALUES
-- Leadership
('principal-dr-robert', 'Dr. Robert Principal', 'principal@hitam.org', 'Principal', 'Administration', NULL),
('registrar-prof-sarah', 'Prof. Sarah Registrar', 'registrar@hitam.org', 'Registrar', 'Administration', NULL),
('dean-dr-maria', 'Dr. Maria Dean', 'dean@hitam.org', 'Dean', 'Academic Affairs', NULL),

-- HODs
('hod-dr-cse', 'Dr. CSE HOD', 'hod.cse@hitam.org', 'HOD', 'CSE Department', 'CSE'),
('hod-dr-ece', 'Dr. ECE HOD', 'hod.ece@hitam.org', 'HOD', 'ECE Department', 'ECE'),
('hod-dr-eee', 'Dr. EEE HOD', 'hod.eee@hitam.org', 'HOD', 'EEE Department', 'EEE'),
('hod-dr-mech', 'Dr. MECH HOD', 'hod.mech@hitam.org', 'HOD', 'MECH Department', 'MECH'),

-- Program Heads
('program-head-cse', 'Prof. CSE Head', 'program.cse@hitam.org', 'Program Department Head', 'CSE Department', 'CSE'),
('program-head-ece', 'Prof. ECE Head', 'program.ece@hitam.org', 'Program Department Head', 'ECE Department', 'ECE')

ON CONFLICT (user_id) DO NOTHING;
