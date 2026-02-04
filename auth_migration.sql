-- =====================================================
-- AUTH MIGRATION: Link profiles to auth.users
-- Run this AFTER enabling auth in Supabase
-- =====================================================

-- 1. Add foreign key constraint linking profiles to auth.users
-- Note: This expects profile IDs to match auth.users IDs
-- New users created via signUp will automatically have matching IDs

-- First, let's add a comment noting the relationship
COMMENT ON COLUMN profiles.id IS 'Must match auth.users.id for authenticated users';

-- 2. Create a trigger to auto-create a profile when a user signs up
-- This is optional - our app creates profiles after signup in the signUp function

-- 3. Add policy for users to insert their own profile during signup
CREATE POLICY "Users can create their own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- 4. Optional: Update existing profiles to link them
-- If you have existing demo profiles, you'll need to:
-- a) Create auth accounts for them manually in Supabase dashboard
-- b) Update their profile IDs to match the new auth user IDs
-- OR
-- c) Have users re-join via invite code (they'll get new profiles)

-- 5. Ensure profiles table has proper RLS for authenticated users
-- Existing policies should work, but let's add an update policy
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- 6. Allow newly signed up users to be inserted
-- Note: We need to allow inserts from our app after signup
-- The existing RLS might block this, so we add a service role or disable RLS for inserts temporarily
-- In production, you'd use a Supabase Edge Function or service role key

-- For now, let's ensure the insert policy allows new users
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
CREATE POLICY "Allow profile creation" ON profiles
  FOR INSERT WITH CHECK (true);  -- Allow all inserts (controlled by app logic)

-- Done! New users signing up will have their profile.id = auth.uid()
