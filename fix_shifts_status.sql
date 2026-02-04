-- The 'shifts' table currently restricts status to 'active', 'published', 'draft'.
-- We need to allow 'pending_approval' and 'approved' for the approval workflow to work.

-- 1. Drop the old constraint
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_status_check;

-- 2. Add the new, more permissive constraint
ALTER TABLE shifts ADD CONSTRAINT shifts_status_check 
  CHECK (status IN ('active', 'published', 'draft', 'pending_approval', 'approved', 'rejected'));
