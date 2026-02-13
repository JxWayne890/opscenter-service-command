-- =====================================================
-- OPSCENTER - UTILITIES
-- =====================================================
-- Helpful queries for debugging, data cleanup, and maintenance.
-- =====================================================

-- =====================================================
-- CLEAR ALL DATA (Fresh Start)
-- Use with caution!
-- =====================================================
-- DELETE FROM shifts;
-- DELETE FROM time_entries;
-- DELETE FROM availability;
-- DELETE FROM time_off_requests;
-- DELETE FROM shift_swaps;
-- DELETE FROM messages;
-- DELETE FROM invitations;
-- DELETE FROM staffing_ratios;
-- DELETE FROM staffing_rules;
-- DELETE FROM knowledge_entries;
-- DELETE FROM comm_templates;
-- DELETE FROM pay_stubs;
-- DELETE FROM pet_assignments;
-- DELETE FROM pets;
-- DELETE FROM clients;
-- DELETE FROM profiles;

-- =====================================================
-- LINK CLIENTS TO AUTH USERS
-- Run this to auto-link clients to their Supabase auth accounts
-- =====================================================
UPDATE clients c
SET user_id = au.id
FROM auth.users au
WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(au.email))
AND c.user_id IS NULL;

-- =====================================================
-- DEBUG: Check Client Linking Status
-- =====================================================
SELECT 
  c.id as "Client ID",
  c.full_name as "Name", 
  c.email as "Email",
  c.user_id as "Linked User ID",
  CASE WHEN c.user_id IS NOT NULL THEN '✓ LINKED' ELSE '✗ NOT LINKED' END as "Status"
FROM clients c
ORDER BY c.full_name;

-- =====================================================
-- DEBUG: View All Profiles
-- =====================================================
SELECT id, full_name, role, organization_id, email, status
FROM profiles;

-- =====================================================
-- DEBUG: View Auth Users
-- =====================================================
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- =====================================================
-- DISABLE RLS FOR DEMO MODE
-- WARNING: Only use in development/demo environments!
-- =====================================================
-- ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pets DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE availability DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE time_off_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE shift_swaps DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pay_stubs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE knowledge_entries DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE comm_templates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE staffing_ratios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE staffing_rules DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pet_assignments DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- RE-ENABLE RLS FOR PRODUCTION
-- =====================================================
-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)
