-- =====================================================
-- OPSCENTER - SEED DATA (Optional)
-- =====================================================
-- Run this AFTER 01_schema.sql to populate optional demo data.
-- This only creates the organization and staffing ratios.
-- Staff profiles are created through the app when users sign up.
-- =====================================================

-- Organization (with fixed invite codes for demo)
INSERT INTO organizations (id, name, slug, industry, invite_code, client_invite_code, settings)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'A Dog''s World', 'adogs-world', 'pet_care', 'DOGS24', 'PET24', '{"timezone": "America/Chicago"}')
ON CONFLICT (id) DO UPDATE SET invite_code = 'DOGS24', client_invite_code = 'PET24';

-- Staffing Ratios
INSERT INTO staffing_ratios (organization_id, zone_name, staff_count, dog_count)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Daycare', 1, 15),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Boarding', 1, 25),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Suites', 1, 10)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DONE! Base data loaded. (No mock staff profiles)
-- =====================================================
