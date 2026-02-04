-- Add breaks column to time_entries to store detailed lunch logs
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS breaks JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN time_entries.breaks IS 'List of individual break/lunch sessions: [{start, end, duration}]';
