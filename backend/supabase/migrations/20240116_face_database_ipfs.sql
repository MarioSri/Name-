-- Create face_database table for IPFS hash storage
CREATE TABLE IF NOT EXISTS face_database (
    user_id VARCHAR(255) PRIMARY KEY,
    ipfs_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_face_database_user_id ON face_database(user_id);
CREATE INDEX IF NOT EXISTS idx_face_database_ipfs_hash ON face_database(ipfs_hash);

-- Add RLS policies
ALTER TABLE face_database ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own face data
CREATE POLICY "Users can manage their own face data" ON face_database
    FOR ALL USING (auth.uid()::text = user_id);

-- Allow service role to access all face data
CREATE POLICY "Service role can access all face data" ON face_database
    FOR ALL USING (auth.role() = 'service_role');