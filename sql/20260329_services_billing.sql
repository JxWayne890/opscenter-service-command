-- Service types and billing records for automatic revenue tracking

-- Service types (boarding, daycare, training, grooming, etc.)
CREATE TABLE IF NOT EXISTS service_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('boarding', 'daycare', 'training', 'grooming', 'other')),
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  rate_unit TEXT NOT NULL CHECK (rate_unit IN ('per_night', 'per_day', 'per_session', 'per_hour')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Service records (individual bookings/check-ins)
CREATE TABLE IF NOT EXISTS service_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  service_type_id UUID NOT NULL REFERENCES service_types(id),
  service_category TEXT NOT NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_rate NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service types visible to org members"
  ON service_types FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service records visible to org members"
  ON service_records FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Seed default service types for existing org
INSERT INTO service_types (organization_id, name, category, rate, rate_unit) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Boarding', 'boarding', 65.00, 'per_night'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Daycare', 'daycare', 45.00, 'per_day'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Training Session', 'training', 85.00, 'per_session'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Grooming', 'grooming', 55.00, 'per_session')
ON CONFLICT DO NOTHING;

-- Index for revenue aggregation queries
CREATE INDEX IF NOT EXISTS idx_service_records_org_date ON service_records(organization_id, check_in);
CREATE INDEX IF NOT EXISTS idx_service_records_category ON service_records(service_category);
