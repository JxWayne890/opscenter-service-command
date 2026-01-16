-- =====================================================
-- INVITE CODE MIGRATION
-- Run this to add invite features to existing database
-- =====================================================

-- 1. Add invite_code column to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- 2. Set invite code for existing org
UPDATE organizations 
SET invite_code = 'DOGS24' 
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 3. Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'staff')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days')
);

-- 4. Disable RLS on invitations
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;

-- Done!
