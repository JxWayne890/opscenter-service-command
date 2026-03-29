-- Fix: Add missing RLS policies for tables that have RLS enabled but no policies
-- This causes all operations to be silently blocked

-- ─── Shifts ───────────────────────────────────
CREATE POLICY "Org members can view shifts" ON shifts
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Managers can manage shifts" ON shifts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ─── Time Entries ─────────────────────────────
CREATE POLICY "Org members can view time entries" ON time_entries
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Org members can manage own time entries" ON time_entries
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ─── Availability ─────────────────────────────
CREATE POLICY "Org members can manage availability" ON availability
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ─── Time Off Requests ────────────────────────
CREATE POLICY "Org members can manage time off" ON time_off_requests
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ─── Shift Swaps ──────────────────────────────
CREATE POLICY "Org members can manage swaps" ON shift_swaps
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ─── Comm Templates ───────────────────────────
CREATE POLICY "Org members can view templates" ON comm_templates
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ─── Staffing Ratios ──────────────────────────
CREATE POLICY "Org members can view ratios" ON staffing_ratios
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ─── Staffing Rules ───────────────────────────
CREATE POLICY "Org members can view rules" ON staffing_rules
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ─── Invitations ──────────────────────────────
CREATE POLICY "Org members can manage invitations" ON invitations
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
