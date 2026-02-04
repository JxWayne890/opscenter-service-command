-- Pay Stubs Table
-- Tracks the approval and release status of pay periods for users

create table if not exists pay_stubs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  status text check (status in ('draft', 'approved', 'released')) default 'draft',
  
  -- Snapshots (Optional but good for history)
  total_hours numeric(10, 2) default 0,
  gross_pay numeric(10, 2) default 0,
  
  approved_by uuid references profiles(id), -- Who approved/released it
  released_at timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, period_start, period_end) -- Prevent duplicate stubs for same period
);

-- RLS
alter table pay_stubs enable row level security;

-- Policies

-- Managers can do everything
create policy "Managers can manage pay stubs" on pay_stubs
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and organization_id = pay_stubs.organization_id 
      and role in ('owner', 'manager')
    )
  );

-- Staff can view ONLY their own RELEASED pay stubs
create policy "Staff can view their own released pay stubs" on pay_stubs
  for select using (
    user_id = auth.uid()
    and status = 'released'
  );

-- Indexes
create index idx_pay_stubs_user on pay_stubs(user_id);
create index idx_pay_stubs_org on pay_stubs(organization_id);
create index idx_pay_stubs_period on pay_stubs(period_start, period_end);
