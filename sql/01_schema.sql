-- =====================================================
-- OPSCENTER - MASTER DATABASE SETUP
-- =====================================================
-- This is the complete database schema for OpsCenterNow.
-- Run this in Supabase SQL Editor to set up a fresh database.
-- Last updated: 2026-02-06
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  industry text NOT NULL,
  invite_code text UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 6)),
  client_invite_code text DEFAULT 'PET24',
  pay_period text CHECK (pay_period IN ('weekly', 'biweekly', 'monthly')) DEFAULT 'weekly',
  pay_period_start_day integer CHECK (pay_period_start_day BETWEEN 0 AND 6) DEFAULT 1,
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

-- Profiles Table (Staff/Users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  avatar_url text,
  hourly_rate numeric(10, 2),
  schedule_config jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id), -- Links to Supabase Auth
  full_name text NOT NULL,
  email text,
  phone_primary text,
  phone_secondary text,
  address text,
  city text,
  state text,
  zip text,
  access_code text,
  notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  vet_clinic_name text,
  vet_clinic_phone text,
  status text CHECK (status IN ('active', 'inactive', 'banned')) DEFAULT 'active',
  last_visit_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pets Table
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  breed text,
  age integer,
  weight numeric(5,2),
  gender text CHECK (gender IN ('male', 'female')),
  is_spayed_neutered boolean DEFAULT false,
  avatar_url text,
  medical_alerts text[] DEFAULT array[]::text[],
  behavior_tags text[] DEFAULT array[]::text[],
  dietary_restrictions text[] DEFAULT array[]::text[],
  feeding_instructions text,
  medication_instructions text,
  behavior_notes text,
  status text CHECK (status IN ('active', 'inactive', 'deceased')) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pet Assignments (Links pets to staff)
CREATE TABLE IF NOT EXISTS pet_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(pet_id, staff_id)
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
  status text CHECK (status IN ('active', 'published', 'draft', 'approved', 'pending_approval', 'rejected', 'completed')) DEFAULT 'draft',
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
  breaks jsonb DEFAULT '[]'::jsonb,
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

-- Messages (Internal Comms)
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL, -- Can be profiles.id OR clients.id
  recipient_id uuid,
  group_id text,
  content text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pay Stubs
CREATE TABLE IF NOT EXISTS pay_stubs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text CHECK (status IN ('draft', 'approved', 'released')) DEFAULT 'draft',
  total_hours numeric(10, 2) DEFAULT 0,
  gross_pay numeric(10, 2) DEFAULT 0,
  approved_by uuid REFERENCES profiles(id),
  released_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, period_start, period_end)
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
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients(full_name, email);
CREATE INDEX IF NOT EXISTS idx_pets_org ON pets(organization_id);
CREATE INDEX IF NOT EXISTS idx_pets_client ON pets(client_id);
CREATE INDEX IF NOT EXISTS idx_pet_assignments_staff ON pet_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_pet_assignments_pet ON pet_assignments(pet_id);
CREATE INDEX IF NOT EXISTS idx_shifts_org ON shifts(organization_id);
CREATE INDEX IF NOT EXISTS idx_shifts_time ON shifts(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_avail_user ON availability(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_pay_stubs_user ON pay_stubs(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_stubs_org ON pay_stubs(organization_id);
CREATE INDEX IF NOT EXISTS idx_pay_stubs_period ON pay_stubs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_comm_templates_org ON comm_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_staffing_ratios_org ON staffing_ratios(organization_id);
CREATE INDEX IF NOT EXISTS idx_staffing_rules_org ON staffing_rules(organization_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_stubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE comm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Messages: Allow authenticated users to read/write
DROP POLICY IF EXISTS "Allow authenticated reads" ON messages;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON messages;
DROP POLICY IF EXISTS "Unified send messages policy" ON messages;
DROP POLICY IF EXISTS "Unified view messages policy" ON messages;
DROP POLICY IF EXISTS "Users can view messages sent to them or their group" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Allow authenticated reads" ON messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts" ON messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Profiles: Users can read org profiles, update own
DROP POLICY IF EXISTS "Users can view org profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

CREATE POLICY "Users can view org profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Allow profile creation" ON profiles
  FOR INSERT WITH CHECK (true);

-- Clients: Staff can manage clients
DROP POLICY IF EXISTS "Staff can manage clients" ON clients;
DROP POLICY IF EXISTS "Clients can view own profile" ON clients;

CREATE POLICY "Staff can manage clients" ON clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "Clients can view own profile" ON clients
  FOR SELECT USING (user_id = auth.uid());

-- Pets: Staff can manage pets
DROP POLICY IF EXISTS "Staff can manage pets" ON pets;
DROP POLICY IF EXISTS "Clients can view own pets" ON pets;

CREATE POLICY "Staff can manage pets" ON pets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "Clients can view own pets" ON pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients WHERE clients.id = pets.client_id AND clients.user_id = auth.uid()
    )
  );

-- Pet Assignments: Staff can manage, clients can view their pets
DROP POLICY IF EXISTS "Staff can manage assignments" ON pet_assignments;
DROP POLICY IF EXISTS "Clients can view their pet assignments" ON pet_assignments;

CREATE POLICY "Staff can manage assignments" ON pet_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager', 'staff'))
  );

CREATE POLICY "Clients can view their pet assignments" ON pet_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pets 
      JOIN clients ON clients.id = pets.client_id
      WHERE pets.id = pet_assignments.pet_id
      AND clients.user_id = auth.uid()
    )
  );

-- Pay Stubs: Managers manage, staff view own released
DROP POLICY IF EXISTS "Managers can manage pay stubs" ON pay_stubs;
DROP POLICY IF EXISTS "Staff can view their own released pay stubs" ON pay_stubs;

CREATE POLICY "Managers can manage pay stubs" ON pay_stubs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND organization_id = pay_stubs.organization_id 
      AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Staff can view their own released pay stubs" ON pay_stubs
  FOR SELECT USING (user_id = auth.uid() AND status = 'released');

-- =====================================================
-- DONE! Database is ready.
-- =====================================================
