import { describe, expect, test } from 'vitest';
import { buildOpsPilotReply, getQuestionCatalog, OpsPilotContext } from './opsPilot';
import { DEFAULT_KNOWLEDGE_ENTRIES, filterKnowledgeEntries } from './knowledge';
import { Profile } from '../types';

const makeUser = (role: 'owner' | 'manager' | 'staff', id = 'user-1'): Profile => ({
  id, organization_id: 'org-1', email: 'test@test.com', full_name: 'Test User', role, status: 'active',
});

const baseContext = (userRole: 'owner' | 'manager' | 'staff' = 'manager'): OpsPilotContext => ({
  knowledgeBase: DEFAULT_KNOWLEDGE_ENTRIES,
  shifts: [
    { id: 's1', organization_id: 'org-1', user_id: 'user-1', start_time: new Date().toISOString(), end_time: new Date(Date.now() + 8 * 3600000).toISOString(), role_type: 'Staff', status: 'published', is_open: false },
    { id: 's2', organization_id: 'org-1', user_id: 'user-2', start_time: new Date().toISOString(), end_time: new Date(Date.now() + 8 * 3600000).toISOString(), role_type: 'Staff', status: 'published', is_open: false },
  ],
  staff: [
    makeUser('manager', 'user-1'),
    { ...makeUser('staff', 'user-2'), full_name: 'Sarah Jones' },
  ],
  timeEntries: [
    { id: 'te1', organization_id: 'org-1', user_id: 'user-1', clock_in: new Date().toISOString(), total_break_minutes: 0, status: 'active' },
  ],
  currentUser: makeUser(userRole),
  clients: [
    { id: 'c1', organization_id: 'org-1', full_name: 'Client One', email: 'c@c.com', phone_primary: '555-1234', created_at: '2026-01-01', status: 'active', pets: [
      { id: 'p1', client_id: 'c1', organization_id: 'org-1', name: 'Buddy', breed: 'Lab', gender: 'male', is_spayed_neutered: true, status: 'active', medical_alerts: ['Diabetic'], behavior_tags: ['Jumper'] },
    ]},
  ],
  payStubs: [
    { id: 'ps1', organization_id: 'org-1', user_id: 'user-1', period_start: '2026-03-01', period_end: '2026-03-07', status: 'draft', total_hours: 40, gross_pay: 600 },
  ],
  requests: [],
  swaps: [],
  organization: null,
});

// ─── Fuzzy Matching ────────────────────────────────

describe('OpsPilot fuzzy matching', () => {
  test('"who is working today" matches scheduling intent', () => {
    const r = buildOpsPilotReply('who is working today', baseContext());
    expect(r).toContain('scheduled');
  });

  test('"whos working" (no apostrophe) matches same intent', () => {
    const r = buildOpsPilotReply('whos working', baseContext());
    expect(r).toContain('scheduled');
  });

  test('"who works today" matches same intent', () => {
    const r = buildOpsPilotReply('who works today', baseContext());
    expect(r).toContain('scheduled');
  });

  test('"whos clocked in" matches attendance', () => {
    const r = buildOpsPilotReply('whos clocked in', baseContext());
    expect(r.toLowerCase()).toContain('clocked in');
  });

  test('"whos here" matches attendance', () => {
    const r = buildOpsPilotReply('whos here', baseContext());
    expect(r.toLowerCase()).toContain('clocked in');
  });

  test('"how many dogs" matches dogs intent', () => {
    const r = buildOpsPilotReply('how many dogs', baseContext());
    expect(r).toContain('pets');
  });

  test('nonsense query falls back to "couldn\'t find"', () => {
    const r = buildOpsPilotReply('xyzzy foobar baz', baseContext());
    expect(r).toContain('couldn\'t find');
  });
});

// ─── Role Gating ──────────────────────────────────

describe('OpsPilot role gating', () => {
  test('staff cannot access financial data', () => {
    const r = buildOpsPilotReply('total payroll', baseContext('staff'));
    expect(r).toContain('only available to managers');
  });

  test('manager can access financial data', () => {
    const r = buildOpsPilotReply('total payroll', baseContext('manager'));
    expect(r).not.toContain('only available to managers');
    expect(r.toLowerCase()).toContain('payroll');
  });

  test('owner can access financial data', () => {
    const r = buildOpsPilotReply('total payroll', baseContext('owner'));
    expect(r).not.toContain('only available to managers');
  });

  test('staff can ask about their own schedule', () => {
    const r = buildOpsPilotReply('my schedule', baseContext('staff'));
    expect(r).not.toContain('only available to managers');
  });

  test('staff can ask who is working', () => {
    const r = buildOpsPilotReply('who is working today', baseContext('staff'));
    expect(r).toContain('scheduled');
  });
});

// ─── Question Catalog ─────────────────────────────

describe('Question catalog', () => {
  test('manager sees all categories including financial', () => {
    const catalog = getQuestionCatalog(makeUser('manager'));
    const catIds = catalog.map(c => c.id);
    expect(catIds).toContain('financial');
    expect(catIds).toContain('scheduling');
    expect(catIds).toContain('hours_personal');
  });

  test('staff does NOT see financial category', () => {
    const catalog = getQuestionCatalog(makeUser('staff'));
    const catIds = catalog.map(c => c.id);
    expect(catIds).not.toContain('financial');
    expect(catIds).toContain('scheduling');
    expect(catIds).toContain('hours_personal');
  });

  test('catalog includes knowledge/SOP category for all roles', () => {
    const staffCatalog = getQuestionCatalog(makeUser('staff'));
    const catIds = staffCatalog.map(c => c.id);
    expect(catIds).toContain('knowledge');
  });
});

// ─── Knowledge Fallback ───────────────────────────

describe('Knowledge base fallback', () => {
  test('MOD SOP questions still work', () => {
    const r = buildOpsPilotReply('What does the MOD do from 12p-2p?', baseContext());
    expect(r.toLowerCase()).toContain('dishes');
  });

  test('knowledge filtering still works', () => {
    const entries = filterKnowledgeEntries(DEFAULT_KNOWLEDGE_ENTRIES, 'dog dinners');
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Manager On Duty (MOD)');
  });
});

// ─── Handler Outputs ──────────────────────────────

describe('Handler outputs', () => {
  test('dogs medical alerts lists pets with alerts', () => {
    const r = buildOpsPilotReply('which dogs have medical alerts', baseContext());
    expect(r).toContain('Buddy');
    expect(r).toContain('Diabetic');
  });

  test('dogs behavior lists pets with behavior flags', () => {
    const r = buildOpsPilotReply('dogs with behavior issues', baseContext());
    expect(r).toContain('Buddy');
    expect(r).toContain('Jumper');
  });

  test('client count returns number', () => {
    const r = buildOpsPilotReply('how many clients', baseContext());
    expect(r).toContain('1 active client');
  });

  test('pending pay stubs returns status', () => {
    const r = buildOpsPilotReply('pending pay stubs', baseContext('manager'));
    expect(r).toContain('1 drafts pending');
  });

  test('who is on break reports correctly', () => {
    const r = buildOpsPilotReply('who is on break', baseContext());
    expect(r).toContain('No one is currently on break');
  });
});
