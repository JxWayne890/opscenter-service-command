-- =====================================================
-- OPSCENTER - MOD SOP KNOWLEDGE ENTRY
-- =====================================================
-- Apply this to existing environments to enable knowledge entry reads
-- and seed the Manager On Duty SOP used by OpsPilot.
-- =====================================================

-- Knowledge Base policies
DROP POLICY IF EXISTS "Staff can view knowledge entries" ON knowledge_entries;
DROP POLICY IF EXISTS "Managers can manage knowledge entries" ON knowledge_entries;

CREATE POLICY "Staff can view knowledge entries" ON knowledge_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = knowledge_entries.organization_id
      AND role IN ('owner', 'manager', 'staff')
    )
  );

CREATE POLICY "Managers can manage knowledge entries" ON knowledge_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = knowledge_entries.organization_id
      AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = knowledge_entries.organization_id
      AND role IN ('owner', 'manager')
    )
  );

-- Manager On Duty SOP
INSERT INTO knowledge_entries (id, organization_id, category, title, content_raw, tags)
VALUES (
  '0a2d62c7-1b90-4d15-8e11-745ef5280056',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Operations',
  'Manager On Duty (MOD)',
  $$Purpose: This procedure outlines the steps in running the day to day routines needed at a pet care facility.
Policy Guidelines: As the MOD you are in charge of the daily routines at the facility for your shift. You are to ensure customer satisfaction by phone or in person. You are the one responsible for any mistakes that happen. These guidelines ensure the safety and comfort of our guests while in our care.
Procedure:
6a-9a - Take over feeding, cleaning from overnight so they can go home. Dog numbers start going up fast so hold on! Make sure leashes and food are labeled correctly and put away in the right cubby.
9a-12p - Start human lunches at 9am and dog lunches at 11am with the aim of finishing by 12p. Check cubbies for any meals that were missed.
12p-2p - Get the dishes done, refill spray bottles, change mop buckets and if you have time left clean rooms while dogs are outside, get the building ready for the next shift. Swing shift lunches, if any need covered with the aim of being done before 2pm. Make sure FOH does a Cubby audit before shift change.
2p-5p - Dogs are going home, numbers will drop fast so hold on! Send people home as numbers drop.
5p-7p - Start dog dinners, send humans for their lunches while dogs are in kennels eating with the aim of finishing by 7pm. Start closing down rooms when numbers allow.
7p-10p - Clean rooms, halls, lobby. Refill bottles, take out trash/boxes. Send the pack out one last time around 9-10. Get things ready for overnight crew, paperwork, dogs in kennels. (No dogs over 20 lbs in upper kennels.) Walk the building making sure it is clean and ready for overnight shift, lock all doors and turn off lights.
Simplified Flow Chart:
6AM - Morning shift takes over for night shift.
Morning check-in - Make sure to check each dog in correctly.
Lunches - Start lunches for dogs and humans.
Second shift prep - Clean the building and get it ready for 2nd shift.
Shift change - Dogs start going home.
Dinners - Start dinners for dogs and humans.
Third shift prep - Clean the building and get it ready for 3rd shift.
Overnight - Watch the dogs for the night and feed at 5am.$$,
  ARRAY['mod', 'manager on duty', 'sop', 'operations', 'opening', 'closing', 'lunches', 'dinners', 'flow chart']
)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  content_raw = EXCLUDED.content_raw,
  tags = EXCLUDED.tags,
  updated_at = timezone('utc'::text, now());
