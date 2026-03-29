import { KnowledgeEntry } from '../types';

const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MOD_SOP_ID = '0a2d62c7-1b90-4d15-8e11-745ef5280056';

export const MOD_SOP_TITLE = 'Manager On Duty (MOD)';

export const MOD_SOP_CONTENT = [
  'Purpose: This procedure outlines the steps in running the day to day routines needed at a pet care facility.',
  'Policy Guidelines: As the MOD you are in charge of the daily routines at the facility for your shift. You are to ensure customer satisfaction by phone or in person. You are the one responsible for any mistakes that happen. These guidelines ensure the safety and comfort of our guests while in our care.',
  'Procedure:',
  '6a-9a - Take over feeding, cleaning from overnight so they can go home. Dog numbers start going up fast so hold on! Make sure leashes and food are labeled correctly and put away in the right cubby.',
  '9a-12p - Start human lunches at 9am and dog lunches at 11am with the aim of finishing by 12p. Check cubbies for any meals that were missed.',
  '12p-2p - Get the dishes done, refill spray bottles, change mop buckets and if you have time left clean rooms while dogs are outside, get the building ready for the next shift. Swing shift lunches, if any need covered with the aim of being done before 2pm. Make sure FOH does a Cubby audit before shift change.',
  '2p-5p - Dogs are going home, numbers will drop fast so hold on! Send people home as numbers drop.',
  '5p-7p - Start dog dinners, send humans for their lunches while dogs are in kennels eating with the aim of finishing by 7pm. Start closing down rooms when numbers allow.',
  '7p-10p - Clean rooms, halls, lobby. Refill bottles, take out trash/boxes. Send the pack out one last time around 9-10. Get things ready for overnight crew, paperwork, dogs in kennels. (No dogs over 20 lbs in upper kennels.) Walk the building making sure it is clean and ready for overnight shift, lock all doors and turn off lights.',
  'Simplified Flow Chart:',
  '6AM - Morning shift takes over for night shift.',
  'Morning check-in - Make sure to check each dog in correctly.',
  'Lunches - Start lunches for dogs and humans.',
  'Second shift prep - Clean the building and get it ready for 2nd shift.',
  'Shift change - Dogs start going home.',
  'Dinners - Start dinners for dogs and humans.',
  'Third shift prep - Clean the building and get it ready for 3rd shift.',
  'Overnight - Watch the dogs for the night and feed at 5am.'
].join('\n');

export const DEFAULT_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  {
    id: MOD_SOP_ID,
    organization_id: ORG_ID,
    category: 'Operations',
    title: MOD_SOP_TITLE,
    content_raw: MOD_SOP_CONTENT,
    tags: [
      'mod',
      'manager on duty',
      'sop',
      'operations',
      'opening',
      'closing',
      'lunches',
      'dinners',
      'flow chart'
    ]
  }
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'me',
  'of',
  'on',
  'our',
  'the',
  'their',
  'they',
  'this',
  'to',
  'what',
  'when',
  'where',
  'who',
  'with',
  'you',
  'your'
]);

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokenize = (value: string) => {
  return normalizeText(value)
    .split(' ')
    .filter(token => token && !STOP_WORDS.has(token));
};

export const mergeKnowledgeEntries = (entries: KnowledgeEntry[]) => {
  const merged: KnowledgeEntry[] = [];
  const seen = new Set<string>();

  for (const entry of [...entries, ...DEFAULT_KNOWLEDGE_ENTRIES]) {
    const key = normalizeText(`${entry.title} ${entry.category}`);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }

  return merged;
};

export const scoreKnowledgeEntry = (query: string, entry: KnowledgeEntry) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const title = normalizeText(entry.title);
  const category = normalizeText(entry.category);
  const tags = entry.tags.map(tag => normalizeText(tag));
  const content = normalizeText(entry.content_raw);
  const tokens = tokenize(query);

  let score = 0;

  if (title.includes(normalizedQuery) || content.includes(normalizedQuery)) {
    score += 12;
  }

  for (const token of tokens) {
    if (title.includes(token)) score += 6;
    if (category.includes(token)) score += 3;
    if (content.includes(token)) score += 1;
    if (tags.some(tag => tag.includes(token))) score += 5;
  }

  return score;
};

export const filterKnowledgeEntries = (entries: KnowledgeEntry[], query: string) => {
  if (!query.trim()) return entries;

  return [...entries]
    .map(entry => ({ entry, score: scoreKnowledgeEntry(query, entry) }))
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.title.localeCompare(right.entry.title))
    .map(result => result.entry);
};
