-- Migration: Update HOD face_encoding_id with Pinata IPFS hash
-- Date: 2024-12-08
-- Description: Sets the IPFS hash for HOD's face authentication

-- Update HOD's face_encoding_id with Pinata IPFS hash
UPDATE recipients 
SET 
  face_encoding_id = 'bafkreidl4tgaeevni24ssj4ncxdtmidcv5agkw5c7chn6mnuokp5gur7le',
  face_auth_enabled = true,
  face_registered_at = NOW()
WHERE user_id = 'hod-001';

-- Log the update
DO $$
BEGIN
  RAISE NOTICE 'Updated face_encoding_id for hod-001 with IPFS hash: bafkreidl4tgaeevni24ssj4ncxdtmidcv5agkw5c7chn6mnuokp5gur7le';
END $$;
