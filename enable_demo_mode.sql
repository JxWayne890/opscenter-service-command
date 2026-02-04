-- ENABLE DEMO MODE
-- This script relaxes the security policies to allow the "Instant Profile Switcher" to work.
-- Since we are switching users on the frontend without doing a full Supabase Auth login for each one,
-- we need the database to accept these writes.

-- 1. Time Entries (Fixes the Clock-In Error)
alter table time_entries disable row level security;

-- 2. Shifts (Fixes Schedule Publishing/Updates)
alter table shifts disable row level security;

-- 3. Profiles (Fixes Profile Updates)
alter table profiles disable row level security;

-- 4. Availability (Fixes Availability Updates)
alter table availability disable row level security;

-- 5. Time Off Requests
alter table time_off_requests disable row level security;

-- 6. Pay Stubs (Fixes Payroll Approvals in Demo Mode)
alter table pay_stubs disable row level security;

-- NOTE: In a production environment, you would Re-Enable these and strictly use supabase.auth.signInWithPassword().
