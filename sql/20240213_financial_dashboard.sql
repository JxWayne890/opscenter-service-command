-- =====================================================
-- FINANCIAL DASHBOARD TABLES
-- Created: 2026-02-13
-- Purpose: Store manual financial inputs for the Financial Clarity Dashboard
-- =====================================================

-- 1. Monthly Financial Inputs (Fixed Costs & Bank Balance)
CREATE TABLE IF NOT EXISTS monthly_financial_inputs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  month date NOT NULL, -- Stored as first day of month (e.g., 2024-02-01)
  fixed_overhead numeric(12, 2) DEFAULT 0,
  bank_balance numeric(12, 2) DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, month)
);

-- 2. Monthly Revenue Breakdown
CREATE TABLE IF NOT EXISTS monthly_revenue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  month date NOT NULL,
  boarding_revenue numeric(12, 2) DEFAULT 0,
  daycare_revenue numeric(12, 2) DEFAULT 0,
  training_revenue numeric(12, 2) DEFAULT 0,
  grooming_revenue numeric(12, 2) DEFAULT 0,
  other_revenue numeric(12, 2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, month)
);

-- 3. Monthly Payroll Summary
CREATE TABLE IF NOT EXISTS monthly_payroll_summary (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  month date NOT NULL,
  total_payroll_cost numeric(12, 2) DEFAULT 0,
  total_hours_worked numeric(10, 2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, month)
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE monthly_financial_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_payroll_summary ENABLE ROW LEVEL SECURITY;

-- Policy: Only Owners and Managers can VIEW financial data
CREATE POLICY "Admins can view financial inputs" ON monthly_financial_inputs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "Admins can view revenue" ON monthly_revenue
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "Admins can view payroll summary" ON monthly_payroll_summary
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Policy: Only Owners and Managers can MANAGE (Insert/Update) financial data
CREATE POLICY "Admins can manage financial inputs" ON monthly_financial_inputs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "Admins can manage revenue" ON monthly_revenue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "Admins can manage payroll summary" ON monthly_payroll_summary
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fin_inputs_org_month ON monthly_financial_inputs(organization_id, month);
CREATE INDEX IF NOT EXISTS idx_revenue_org_month ON monthly_revenue(organization_id, month);
CREATE INDEX IF NOT EXISTS idx_payroll_org_month ON monthly_payroll_summary(organization_id, month);
