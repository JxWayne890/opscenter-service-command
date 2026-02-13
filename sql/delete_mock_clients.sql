-- =====================================================
-- DELETE MOCK CLIENTS & PETS DATA
-- Run this in Supabase SQL Editor
-- =====================================================

-- Delete demo pets first (due to foreign key constraints)
DELETE FROM pets 
WHERE client_id IN (
  SELECT id FROM clients 
  WHERE full_name IN ('Sarah Jenkins', 'Robert Chen', 'Emily Davis')
);

-- Delete demo clients
DELETE FROM clients 
WHERE full_name IN ('Sarah Jenkins', 'Robert Chen', 'Emily Davis');

-- Verify remaining clients
SELECT id, full_name, email FROM clients ORDER BY full_name;
