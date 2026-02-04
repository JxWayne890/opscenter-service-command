-- Add Pay Period Configuration to Organizations
-- This migration adds the necessary columns to track how each organization handles payroll cycles.

ALTER TABLE organizations 
ADD COLUMN pay_period text CHECK (pay_period IN ('weekly', 'biweekly', 'monthly')) DEFAULT 'weekly',
ADD COLUMN pay_period_start_day integer CHECK (pay_period_start_day BETWEEN 0 AND 6) DEFAULT 1; -- 0=Sun, 1=Mon, etc.

-- Update existing demo organization if it exists
UPDATE organizations 
SET pay_period = 'weekly', 
    pay_period_start_day = 1 
WHERE slug = 'adogs-world';

-- Add a comment for documentation
COMMENT ON COLUMN organizations.pay_period IS 'The frequency of payroll runs (weekly, biweekly, monthly)';
COMMENT ON COLUMN organizations.pay_period_start_day IS 'The day of the week the pay cycle starts (0=Sunday, 1=Monday)';
