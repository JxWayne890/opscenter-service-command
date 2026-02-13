-- =====================================================
-- DELETE MOCK/DEMO STAFF DATA
-- Run this in Supabase SQL Editor
-- =====================================================

-- Delete the demo staff profiles (keeps real users like "The John Johnson" and "yopyop")
DELETE FROM profiles 
WHERE id IN (
  'd0c2c1e8-76a0-4c4f-9e79-5e7b57855680', -- Sarah Jenkins
  'e1d3d2f9-87b1-5d5e-0f80-6f8c68966791', -- Mark Thompson
  'f2e4e3a0-98c2-6e6f-1a91-7a9d79077802', -- Jessica Lee
  'a3f5f4b1-09d3-7f7a-2b02-8b0e80188913'  -- David Chen
);

-- Verify remaining profiles
SELECT id, full_name, email, role FROM profiles ORDER BY full_name;
