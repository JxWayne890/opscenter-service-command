import { expect, test, describe } from 'vitest';
import {
  mergeKnowledgeEntries,
  scoreKnowledgeEntry,
  filterKnowledgeEntries,
  DEFAULT_KNOWLEDGE_ENTRIES,
  MOD_SOP_TITLE,
} from './knowledge';
import { KnowledgeEntry } from '../types';

const makeEntry = (title: string, category: string, tags: string[] = [], content: string = ''): KnowledgeEntry => ({
  id: crypto.randomUUID(),
  organization_id: 'org-1',
  title,
  category,
  tags,
  content_raw: content,
});

describe('mergeKnowledgeEntries', () => {
  test('includes default entries when input is empty', () => {
    const result = mergeKnowledgeEntries([]);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some(e => e.title === MOD_SOP_TITLE)).toBe(true);
  });

  test('deduplicates entries with same title + category', () => {
    const custom = makeEntry(MOD_SOP_TITLE, 'Operations');
    const result = mergeKnowledgeEntries([custom]);
    const modEntries = result.filter(e => e.title === MOD_SOP_TITLE);
    expect(modEntries).toHaveLength(1);
  });

  test('keeps user entries before defaults (user wins)', () => {
    const custom = makeEntry(MOD_SOP_TITLE, 'Operations', [], 'Custom content');
    const result = mergeKnowledgeEntries([custom]);
    const mod = result.find(e => e.title === MOD_SOP_TITLE);
    expect(mod?.content_raw).toBe('Custom content');
  });

  test('preserves unique entries from both sources', () => {
    const custom = makeEntry('Custom Guide', 'Training');
    const result = mergeKnowledgeEntries([custom]);
    expect(result.some(e => e.title === 'Custom Guide')).toBe(true);
    expect(result.some(e => e.title === MOD_SOP_TITLE)).toBe(true);
  });
});

describe('scoreKnowledgeEntry', () => {
  const entry = makeEntry('Manager On Duty', 'Operations', ['mod', 'sop'], 'Daily routines for opening and closing the facility');

  test('returns 0 for empty query', () => {
    expect(scoreKnowledgeEntry('', entry)).toBe(0);
  });

  test('exact title match scores high', () => {
    const score = scoreKnowledgeEntry('Manager On Duty', entry);
    expect(score).toBeGreaterThanOrEqual(12);
  });

  test('tag match adds points', () => {
    const score = scoreKnowledgeEntry('mod', entry);
    expect(score).toBeGreaterThan(0);
  });

  test('category match adds points', () => {
    const score = scoreKnowledgeEntry('operations', entry);
    expect(score).toBeGreaterThan(0);
  });

  test('content match adds points', () => {
    const score = scoreKnowledgeEntry('opening closing', entry);
    expect(score).toBeGreaterThan(0);
  });

  test('irrelevant query scores 0', () => {
    const score = scoreKnowledgeEntry('xyzzy foobar', entry);
    expect(score).toBe(0);
  });

  test('is case insensitive', () => {
    const lower = scoreKnowledgeEntry('manager on duty', entry);
    const upper = scoreKnowledgeEntry('MANAGER ON DUTY', entry);
    expect(lower).toBe(upper);
  });
});

describe('filterKnowledgeEntries', () => {
  const entries = [
    makeEntry('Manager On Duty', 'Operations', ['mod'], 'Daily routines'),
    makeEntry('Feeding Guide', 'Care', ['feeding', 'dogs'], 'How to feed dogs'),
    makeEntry('Emergency Procedures', 'Safety', ['emergency'], 'What to do in emergencies'),
  ];

  test('empty query returns all entries', () => {
    expect(filterKnowledgeEntries(entries, '')).toHaveLength(3);
    expect(filterKnowledgeEntries(entries, '  ')).toHaveLength(3);
  });

  test('filters and sorts by relevance', () => {
    const result = filterKnowledgeEntries(entries, 'feeding dogs');
    expect(result[0].title).toBe('Feeding Guide');
  });

  test('excludes entries with no match', () => {
    const result = filterKnowledgeEntries(entries, 'xyzzy');
    expect(result).toHaveLength(0);
  });

  test('returns multiple matches sorted by score', () => {
    const result = filterKnowledgeEntries(entries, 'emergency');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].title).toBe('Emergency Procedures');
  });
});
