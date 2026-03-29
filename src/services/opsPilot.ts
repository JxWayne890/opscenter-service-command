import { KnowledgeEntry, Profile, Shift, TimeEntry } from '../types';
import { MOD_SOP_TITLE, scoreKnowledgeEntry } from './knowledge';

export const OPS_PILOT_SUGGESTIONS = [
  'What does the MOD do from 12p-2p?',
  'When do dog dinners start?',
  'What are the MOD policy guidelines?'
];

interface OpsPilotContext {
  knowledgeBase: KnowledgeEntry[];
  shifts: Shift[];
  staff: Profile[];
  timeEntries: TimeEntry[];
  now?: Date;
}

interface ModSections {
  purpose: string;
  policy: string;
  procedure: Record<string, string>;
  flow: string[];
}

const TIME_SLOTS = ['6a-9a', '9a-12p', '12p-2p', '2p-5p', '5p-7p', '7p-10p'] as const;

const parseModSections = (entry: KnowledgeEntry): ModSections => {
  const sections: ModSections = {
    purpose: '',
    policy: '',
    procedure: {},
    flow: []
  };

  let inFlow = false;

  for (const rawLine of entry.content_raw.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('Purpose:')) {
      sections.purpose = line.replace('Purpose:', '').trim();
      continue;
    }

    if (line.startsWith('Policy Guidelines:')) {
      sections.policy = line.replace('Policy Guidelines:', '').trim();
      continue;
    }

    if (line.startsWith('Simplified Flow Chart:')) {
      inFlow = true;
      continue;
    }

    const procedureMatch = line.match(/^(6a-9a|9a-12p|12p-2p|2p-5p|5p-7p|7p-10p)\s*-\s*(.+)$/i);
    if (procedureMatch) {
      sections.procedure[procedureMatch[1].toLowerCase()] = procedureMatch[2].trim();
      continue;
    }

    if (inFlow) {
      sections.flow.push(line);
    }
  }

  return sections;
};

const includesAny = (query: string, terms: string[]) => {
  return terms.some(term => query.includes(term));
};

const findModTimeSlot = (query: string) => {
  if (includesAny(query, ['6a', '6am', '9a', '9am', 'morning', 'opening', 'overnight', 'feeding', 'leashes', 'cubby'])) {
    return '6a-9a';
  }

  if (includesAny(query, ['11am', 'lunch', 'lunches', 'meals', 'cubbies', 'missed meal'])) {
    return '9a-12p';
  }

  if (includesAny(query, ['12p', '12pm', '2p', '2pm', 'dishes', 'spray bottles', 'mop buckets', 'foh', 'audit', 'next shift'])) {
    return '12p-2p';
  }

  if (includesAny(query, ['going home', 'send people home', 'numbers drop', 'drop fast'])) {
    return '2p-5p';
  }

  if (includesAny(query, ['5p', '5pm', '7p', '7pm', 'dinner', 'dinners', 'closing down rooms'])) {
    return '5p-7p';
  }

  if (includesAny(query, ['10p', '10pm', 'closing', 'close', 'trash', 'overnight crew', 'upper kennels', 'lights', 'lock'])) {
    return '7p-10p';
  }

  return null;
};

const buildModResponse = (query: string, entry: KnowledgeEntry) => {
  const normalizedQuery = query.toLowerCase();
  const sections = parseModSections(entry);

  if (includesAny(normalizedQuery, ['purpose'])) {
    return `${MOD_SOP_TITLE}\nPurpose: ${sections.purpose}`;
  }

  if (includesAny(normalizedQuery, ['policy', 'guideline', 'responsible', 'responsibility', 'customer satisfaction', 'safety', 'comfort'])) {
    return `${MOD_SOP_TITLE}\n${sections.policy}`;
  }

  if (includesAny(normalizedQuery, ['flow', 'chart', 'timeline', 'summary'])) {
    return `${MOD_SOP_TITLE} flow\n- ${sections.flow.join('\n- ')}`;
  }

  const slot = findModTimeSlot(normalizedQuery);
  if (slot) {
    return `${MOD_SOP_TITLE}\n${slot}: ${sections.procedure[slot]}`;
  }

  return [
    MOD_SOP_TITLE,
    `Purpose: ${sections.purpose}`,
    'Procedure overview:',
    ...TIME_SLOTS.map(slotKey => `- ${slotKey}: ${sections.procedure[slotKey]}`)
  ].join('\n');
};

const extractRelevantLines = (query: string, content: string) => {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);

  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const lowered = line.toLowerCase();
      const score = tokens.reduce((count, token) => count + (lowered.includes(token) ? 1 : 0), 0);
      return { line, score };
    })
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(result => result.line);
};

const buildKnowledgeResponse = (query: string, knowledgeBase: KnowledgeEntry[]) => {
  const bestMatch = [...knowledgeBase]
    .map(entry => ({ entry, score: scoreKnowledgeEntry(query, entry) }))
    .sort((left, right) => right.score - left.score)
    .find(result => result.score > 0);

  if (!bestMatch) return null;

  const { entry } = bestMatch;
  const isModEntry =
    entry.title.toLowerCase().includes('manager on duty') ||
    entry.tags.some(tag => tag.toLowerCase().includes('manager on duty') || tag.toLowerCase() === 'mod');

  if (isModEntry) {
    return buildModResponse(query, entry);
  }

  const relevantLines = extractRelevantLines(query, entry.content_raw);
  if (relevantLines.length === 0) return null;

  return [entry.title, ...relevantLines.map(line => `- ${line}`)].join('\n');
};

const buildLateShiftResponse = (query: string, context: OpsPilotContext) => {
  const normalizedQuery = query.toLowerCase();
  if (!includesAny(normalizedQuery, ['late', 'attendance'])) return null;

  const now = context.now || new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const todayTimeEntries = context.timeEntries.filter(entry => {
    const clockIn = new Date(entry.clock_in);
    return clockIn >= startOfDay && clockIn < endOfDay;
  });

  const lateStaff = context.shifts
    .filter(shift => shift.user_id)
    .filter(shift => {
      const shiftStart = new Date(shift.start_time);
      return shiftStart >= startOfDay && shiftStart < endOfDay && shiftStart < now;
    })
    .map(shift => {
      const staffMember = context.staff.find(member => member.id === shift.user_id);
      const timeEntry = todayTimeEntries.find(entry => entry.user_id === shift.user_id);
      const minutesLate = Math.floor((now.getTime() - new Date(shift.start_time).getTime()) / 60000);

      return {
        name: staffMember?.full_name || 'Unknown staff member',
        scheduledStart: new Date(shift.start_time),
        timeEntry,
        minutesLate
      };
    })
    .filter(item => !item.timeEntry && item.minutesLate >= 5)
    .sort((left, right) => right.minutesLate - left.minutesLate);

  if (lateStaff.length === 0) {
    return 'Attendance check\nNo one is currently overdue for clock-in based on today\'s shifts.';
  }

  return [
    'Attendance check',
    ...lateStaff.slice(0, 3).map(item => {
      const start = item.scheduledStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `- ${item.name} is ${item.minutesLate} minutes late for the ${start} shift.`;
    })
  ].join('\n');
};

const buildOnSiteResponse = (query: string, context: OpsPilotContext) => {
  const normalizedQuery = query.toLowerCase();
  if (!includesAny(normalizedQuery, ['on site', 'onsite', 'who is here', 'who is on'])) return null;

  const activeEntries = context.timeEntries.filter(entry => entry.status === 'active' || !entry.clock_out);
  const activeStaff = context.staff.filter(member => activeEntries.some(entry => entry.user_id === member.id));

  if (activeStaff.length === 0) {
    return 'Roster check\nNo staff are currently clocked in.';
  }

  return [
    'Roster check',
    ...activeStaff.map(member => `- ${member.full_name}`)
  ].join('\n');
};

export const buildOpsPilotReply = (query: string, context: OpsPilotContext) => {
  const lateShiftResponse = buildLateShiftResponse(query, context);
  if (lateShiftResponse) return lateShiftResponse;

  const onSiteResponse = buildOnSiteResponse(query, context);
  if (onSiteResponse) return onSiteResponse;

  const knowledgeResponse = buildKnowledgeResponse(query, context.knowledgeBase);
  if (knowledgeResponse) return knowledgeResponse;

  return [
    'OpsPilot',
    'I can answer from the Knowledge Hub and live operations data.',
    'Try asking:',
    ...OPS_PILOT_SUGGESTIONS.map(prompt => `- ${prompt}`)
  ].join('\n');
};
