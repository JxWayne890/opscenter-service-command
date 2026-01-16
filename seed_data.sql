-- =====================================================
-- QUICK SEED - Run this in Supabase SQL Editor
-- =====================================================

-- Organization with invite code
INSERT INTO organizations (id, name, slug, industry, invite_code, settings)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A Dog''s World', 'adogs-world', 'pet_care', 'DOGS24', '{"timezone": "America/Chicago"}')
ON CONFLICT (id) DO UPDATE SET invite_code = 'DOGS24';

-- Staff Profiles
INSERT INTO profiles (id, organization_id, email, full_name, role, status, hourly_rate)
VALUES
  ('d0c2c1e8-76a0-4c4f-9e79-5e7b57855680', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'sarah@adogs.world', 'Sarah Jenkins', 'owner', 'active', 45.00),
  ('e1d3d2f9-87b1-5d5e-0f80-6f8c68966791', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'mark@adogs.world', 'Mark Thompson', 'staff', 'active', 22.00),
  ('a3f5f4b1-09d3-7f7a-2b02-8b0e80188913', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'david@adogs.world', 'David Chen', 'manager', 'active', 28.00)
ON CONFLICT (id) DO NOTHING;

-- Staffing Ratios
INSERT INTO staffing_ratios (organization_id, zone_name, staff_count, dog_count)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Daycare', 1, 15),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Boarding', 1, 25)
ON CONFLICT DO NOTHING;

-- Done!
