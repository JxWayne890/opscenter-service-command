-- Add schedule_config column to profiles for rotating patterns
-- Run this in Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS schedule_config jsonb DEFAULT '{}'::jsonb;

-- Done! Refresh the app.
