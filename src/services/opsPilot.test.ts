import { describe, expect, test } from 'vitest';
import { buildOpsPilotReply } from './opsPilot';
import { DEFAULT_KNOWLEDGE_ENTRIES, filterKnowledgeEntries } from './knowledge';

describe('OpsPilot knowledge responses', () => {
  test('answers dog dinner questions from the MOD SOP', () => {
    const response = buildOpsPilotReply('When do dog dinners start?', {
      knowledgeBase: DEFAULT_KNOWLEDGE_ENTRIES,
      shifts: [],
      staff: [],
      timeEntries: []
    });

    expect(response).toContain('Manager On Duty (MOD)');
    expect(response).toContain('5p-7p');
    expect(response).toContain('finishing by 7pm');
  });

  test('returns MOD policy guidance when asked', () => {
    const response = buildOpsPilotReply('What are the MOD policy guidelines?', {
      knowledgeBase: DEFAULT_KNOWLEDGE_ENTRIES,
      shifts: [],
      staff: [],
      timeEntries: []
    });

    expect(response).toContain('daily routines at the facility for your shift');
    expect(response).toContain('customer satisfaction');
  });
});

describe('Knowledge filtering', () => {
  test('matches SOP content and tags, not only titles', () => {
    const entries = filterKnowledgeEntries(DEFAULT_KNOWLEDGE_ENTRIES, 'dog dinners');

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Manager On Duty (MOD)');
  });
});
