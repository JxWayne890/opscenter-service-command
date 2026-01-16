-- =====================================================
-- CLEAR ALL DATA - Fresh Start
-- Run this in Supabase SQL Editor
-- =====================================================

-- Clear all data (order matters due to foreign keys)
DELETE FROM shifts;
DELETE FROM time_entries;
DELETE FROM availability;
DELETE FROM time_off_requests;
DELETE FROM shift_swaps;
DELETE FROM messages;
DELETE FROM invitations;
DELETE FROM staffing_ratios;
DELETE FROM staffing_rules;
DELETE FROM knowledge_entries;
DELETE FROM comm_templates;
DELETE FROM profiles;

-- Keep the organization but clear other tables
-- The org is needed so the app works
UPDATE organizations 
SET invite_code = 'DOGS24' 
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Done! Start fresh - add your own staff via the app
