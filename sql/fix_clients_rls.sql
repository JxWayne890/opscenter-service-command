-- =====================================================
-- FIX CLIENTS & PETS RLS POLICIES
-- Run this in Supabase SQL Editor to fix client saving
-- =====================================================

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

-- Verify the policies were created
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE tablename IN ('clients', 'pets')
ORDER BY tablename, policyname;
