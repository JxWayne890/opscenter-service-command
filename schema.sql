-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Organizations Table
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  industry text not null,
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles Table (Users)
create table profiles (
  id uuid primary key, -- Removed 'references auth.users' to allow managed staff without logins
  organization_id uuid references organizations(id) on delete cascade not null,
  email text not null,
  full_name text not null,
  role text not null check (role in ('owner', 'manager', 'staff')),
  avatar_url text,
  hourly_rate numeric(10, 2), -- Added for payroll est
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Shifts Table (Scheduled Work)
create table shifts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade, -- Nullable for Open Shifts
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  role_type text not null, -- Position/Role required
  is_open boolean default false,
  notes text,
  status text check (status in ('active', 'published', 'draft')) default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Time Entries Table (Actual Work / Punch Clock)
create table time_entries (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  shift_id uuid references shifts(id), -- Optional link to scheduled shift
  clock_in timestamp with time zone not null,
  clock_out timestamp with time zone,
  break_start timestamp with time zone,
  break_end timestamp with time zone,
  total_break_minutes integer default 0,
  location_data jsonb, -- Store lat/long or IP
  status text check (status in ('active', 'pending_approval', 'approved', 'rejected')) default 'active',
  manager_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Availability Table
create table availability (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  day_of_week integer check (day_of_week between 0 and 6), -- 0=Sunday
  start_time time, -- working hours start
  end_time time, -- working hours end
  is_unavailable boolean default false,
  date_specific date, -- If set, overrides recurring rule for this date
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Time Off Requests
create table time_off_requests (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  type text check (type in ('paid', 'unpaid', 'sick', 'holiday')) not null,
  reason text,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  manager_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Shift Swaps / Coverage
create table shift_swaps (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  requester_id uuid references profiles(id) on delete cascade not null,
  shift_id uuid references shifts(id) on delete cascade not null,
  recipient_id uuid references profiles(id) on delete cascade, -- Null = offered to anyone
  status text check (status in ('pending', 'approved', 'rejected', 'claimed')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages (Internal Comms)
create table messages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  recipient_id uuid references profiles(id) on delete cascade, -- Null = Group Message
  group_id text, -- e.g., 'shift_123' or 'managers'
  content text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Knowledge Base (Legacy/Optional for Phase 1 but kept for parity if needed)
create table knowledge_entries (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  category text not null,
  title text not null,
  content_raw text not null,
  tags text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Communication Templates Table (New)
create table comm_templates (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  category text not null,
  name text not null,
  subject text,
  body text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Scheduling Copilot Tables

create table staffing_ratios (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  zone_name text not null, -- 'Daycare', 'Boarding', 'Suites'
  staff_count integer not null default 1,
  dog_count integer not null default 15, -- e.g. 1 staff per 15 dogs
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table staffing_rules (
   id uuid primary key default uuid_generate_v4(),
   organization_id uuid references organizations(id) on delete cascade not null,
   name text not null, -- 'Overnight Safety'
   rule_config jsonb not null, -- { "min_staff": 2, "roles": ["handler", "lead"] }
   is_active boolean default true,
   created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes
create index idx_profiles_org on profiles(organization_id);
create index idx_shifts_org on shifts(organization_id);
create index idx_shifts_time on shifts(start_time, end_time);
create index idx_time_entries_user on time_entries(user_id);
create index idx_time_entries_active on time_entries(user_id) where status = 'active';
create index idx_avail_user on availability(user_id);
create index idx_messages_group on messages(group_id);
create index idx_comm_templates_org on comm_templates(organization_id);
create index idx_staffing_ratios_org on staffing_ratios(organization_id);
create index idx_staffing_rules_org on staffing_rules(organization_id);

-- RLS
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table shifts enable row level security;
alter table time_entries enable row level security;
alter table availability enable row level security;
alter table time_off_requests enable row level security;
alter table shift_swaps enable row level security;
alter table messages enable row level security;
alter table comm_templates enable row level security;
alter table staffing_ratios enable row level security;
alter table staffing_rules enable row level security;

-- Basic Policies (Assumes user has 'organization_id' in their metadata or via a join logic, 
-- but for simplicity/starter, we often check if auth.uid() matches a profile in that org)

-- Helper function to get current user's org id
create or replace function get_auth_org_id()
returns uuid
language sql
security definer
stable
as $$
  select organization_id from profiles where id = auth.uid();
$$;

-- Generic policy: Users can view/edit data belonging to their organization
-- NOTE: In a real prod app, you'd likely split these into more granular SELECT/INSERT/UPDATE policies based on role 'owner'/'manager' vs 'staff'.

-- Organizations
create policy "Users can view their own organization" on organizations
  for select using (id = get_auth_org_id());

-- Profiles
create policy "Users can view profiles in their org" on profiles
  for select using (organization_id = get_auth_org_id());

create policy "Users can update their own profile" on profiles
  for update using (id = auth.uid());

-- Shifts
create policy "Users can view shifts in their org" on shifts
  for select using (organization_id = get_auth_org_id());

-- Time Entries
create policy "Users can view their own time entries" on time_entries
  for select using (user_id = auth.uid());

create policy "Managers can view all time entries in org" on time_entries
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and organization_id = time_entries.organization_id 
      and role in ('owner', 'manager')
    )
  );

create policy "Users can insert their own time entries" on time_entries
  for insert with check (user_id = auth.uid());

create policy "Users can update their own time entries" on time_entries
  for update using (user_id = auth.uid());

-- Availability
create policy "Users can view/edit their own availability" on availability
  for all using (user_id = auth.uid());

create policy "Managers can view all availability in org" on availability
  for select using (
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and organization_id = availability.organization_id 
      and role in ('owner', 'manager')
    )
  );

-- Time Off Requests
create policy "Users can view/edit their own requests" on time_off_requests
  for all using (user_id = auth.uid());

create policy "Managers can view all requests in org" on time_off_requests
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and organization_id = time_off_requests.organization_id
      and role in ('owner', 'manager')
    )
  );

-- Messages
create policy "Users can view messages sent to them or their group" on messages
  for select using (
    recipient_id = auth.uid() 
    or sender_id = auth.uid()
    or group_id is not null -- Simplified for groups, would need more logic for group membership checks
  );

create policy "Users can send messages" on messages
  for insert with check (sender_id = auth.uid());

-- Comm Templates
create policy "Users can view templates in their org" on comm_templates
  for select using (organization_id = get_auth_org_id());

-- Staffing Ratios
create policy "Users can view ratios in their org" on staffing_ratios
  for select using (organization_id = get_auth_org_id());

create policy "Managers can manage ratios" on staffing_ratios
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and organization_id = staffing_ratios.organization_id 
      and role in ('owner', 'manager')
    )
  );

-- Staffing Rules
create policy "Users can view rules in their org" on staffing_rules
  for select using (organization_id = get_auth_org_id());

create policy "Managers can manage rules" on staffing_rules
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and organization_id = staffing_rules.organization_id 
      and role in ('owner', 'manager')
    )
  );
