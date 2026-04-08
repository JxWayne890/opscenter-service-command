-- =====================================================
-- STAFF ACCOUNTABILITY: Checklists
-- =====================================================

-- Checklist Templates (defined by managers)
CREATE TABLE IF NOT EXISTS checklist_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'overnight', 'any')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Checklist Instances (daily completions by staff)
CREATE TABLE IF NOT EXISTS checklist_instances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES checklist_templates(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  shift_type text NOT NULL,
  date date NOT NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text CHECK (status IN ('pending', 'in_progress', 'complete')) DEFAULT 'pending',
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checklist_templates_org ON checklist_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_checklist_instances_org ON checklist_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_checklist_instances_date ON checklist_instances(date);
CREATE INDEX IF NOT EXISTS idx_checklist_instances_assigned ON checklist_instances(assigned_to);

-- RLS
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view checklist templates" ON checklist_templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = checklist_templates.organization_id)
  );

CREATE POLICY "Managers can manage checklist templates" ON checklist_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = checklist_templates.organization_id AND role IN ('owner', 'manager'))
  );

CREATE POLICY "Staff can view and update checklist instances" ON checklist_instances
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = checklist_instances.organization_id)
  );
