-- =====================================================
-- A DOG'S WORLD - COMPLETE DATABASE SETUP
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  industry text NOT NULL,
  invite_code text UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 6)),
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Invitations Table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'staff')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days')
);

-- Profiles Table (Staff/Users) - NO auth.users constraint for demo
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  avatar_url text,
  hourly_rate numeric(10, 2),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  role_type text NOT NULL,
  is_open boolean DEFAULT false,
  notes text,
  status text CHECK (status IN ('active', 'published', 'draft', 'approved', 'pending_approval', 'completed')) DEFAULT 'draft',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Time Entries Table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  shift_id uuid REFERENCES shifts(id),
  clock_in timestamp with time zone NOT NULL,
  clock_out timestamp with time zone,
  break_start timestamp with time zone,
  break_end timestamp with time zone,
  total_break_minutes integer DEFAULT 0,
  location_data jsonb,
  status text CHECK (status IN ('active', 'pending_approval', 'approved', 'rejected')) DEFAULT 'active',
  manager_notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Availability Table
CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time,
  end_time time,
  is_unavailable boolean DEFAULT false,
  date_specific date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Time Off Requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text CHECK (type IN ('paid', 'unpaid', 'sick', 'holiday')) NOT NULL,
  reason text,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  manager_notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shift Swaps
CREATE TABLE IF NOT EXISTS shift_swaps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  shift_id uuid REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'claimed')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  group_id text,
  content text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  content_raw text NOT NULL,
  tags text[] DEFAULT array[]::text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Communication Templates
CREATE TABLE IF NOT EXISTS comm_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  subject text,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Staffing Ratios
CREATE TABLE IF NOT EXISTS staffing_ratios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  zone_name text NOT NULL,
  staff_count integer NOT NULL DEFAULT 1,
  dog_count integer NOT NULL DEFAULT 15,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Staffing Rules
CREATE TABLE IF NOT EXISTS staffing_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  rule_config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_shifts_org ON shifts(organization_id);
CREATE INDEX IF NOT EXISTS idx_shifts_time ON shifts(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_avail_user ON availability(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_comm_templates_org ON comm_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_staffing_ratios_org ON staffing_ratios(organization_id);
CREATE INDEX IF NOT EXISTS idx_staffing_rules_org ON staffing_rules(organization_id);

-- =====================================================
-- DISABLE RLS FOR DEMO MODE
-- =====================================================

ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE comm_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_ratios DISABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE pay_stubs DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Organization (with fixed invite code for demo)
INSERT INTO organizations (id, name, slug, industry, invite_code, settings)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A Dog''s World', 'adogs-world', 'pet_care', 'DOGS24', '{"timezone": "America/Chicago"}')
ON CONFLICT (id) DO UPDATE SET invite_code = 'DOGS24';

-- Staff Profiles
INSERT INTO profiles (id, organization_id, email, full_name, role, status, hourly_rate, avatar_url)
VALUES
  ('d0c2c1e8-76a0-4c4f-9e79-5e7b57855680', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'sarah@adogs.world', 'Sarah Jenkins', 'owner', 'active', 45.00, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
  ('e1d3d2f9-87b1-5d5e-0f80-6f8c68966791', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'mark@adogs.world', 'Mark Thompson', 'staff', 'active', 22.00, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
  ('f2e4e3a0-98c2-6e6f-1a91-7a9d79077802', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'jessica@adogs.world', 'Jessica Lee', 'staff', 'active', 20.00, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'),
  ('a3f5f4b1-09d3-7f7a-2b02-8b0e80188913', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'david@adogs.world', 'David Chen', 'manager', 'active', 28.00, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150')
ON CONFLICT (id) DO NOTHING;

-- Staffing Ratios
INSERT INTO staffing_ratios (organization_id, zone_name, staff_count, dog_count)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Daycare', 1, 15),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Boarding', 1, 25),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Suites', 1, 10)
ON CONFLICT DO NOTHING;

-- Sample Shifts for Today
INSERT INTO shifts (organization_id, user_id, start_time, end_time, role_type, status, is_open)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0c2c1e8-76a0-4c4f-9e79-5e7b57855680', NOW()::date + TIME '08:00', NOW()::date + TIME '16:00', 'Director', 'published', false),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e1d3d2f9-87b1-5d5e-0f80-6f8c68966791', NOW()::date + TIME '07:00', NOW()::date + TIME '15:00', 'Kennel Attendant', 'published', false),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, NOW()::date + INTERVAL '1 day' + TIME '12:00', NOW()::date + INTERVAL '1 day' + TIME '20:00', 'Kennel Attendant', 'published', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a3f5f4b1-09d3-7f7a-2b02-8b0e80188913', NOW()::date + INTERVAL '1 day' + TIME '09:00', NOW()::date + INTERVAL '1 day' + TIME '17:00', 'Manager', 'published', false);

-- =====================================================
-- DONE! Refresh the app at localhost:3000
-- =====================================================
