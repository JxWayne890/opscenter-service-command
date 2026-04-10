import { KnowledgeEntry, Profile, Shift, TimeEntry, Client, PayStub, TimeOffRequest, ShiftSwap, Organization } from '../types';
import { scoreKnowledgeEntry } from './knowledge';
import { TimeMath } from '../utils/timeMath';
import { isManager } from './permissions';

// ─── Types ────────────────────────────────────────

type RoleGate = 'all' | 'manager' | 'self';
type IntentCategory = 'scheduling' | 'attendance' | 'dogs_clients' | 'hours_personal' | 'financial' | 'knowledge';

export interface OpsPilotContext {
  knowledgeBase: KnowledgeEntry[];
  shifts: Shift[];
  staff: Profile[];
  timeEntries: TimeEntry[];
  currentUser: Profile;
  clients: Client[];
  payStubs: PayStub[];
  requests: TimeOffRequest[];
  swaps: ShiftSwap[];
  organization: Organization | null;
  now?: Date;
}

interface Intent {
  id: string;
  category: IntentCategory;
  displayQuestion: string;
  keywords: string[];
  synonyms: string[];
  requiredRole: RoleGate;
  handler: (ctx: OpsPilotContext, extracted: ExtractedInfo) => string;
}

interface ExtractedInfo {
  dateRange: { start: Date; end: Date } | null;
  dateLabel: string;
  targetStaffId: string | null;
  targetStaffName: string | null;
}

export interface CatalogCategory {
  id: IntentCategory;
  label: string;
  questions: { intentId: string; displayQuestion: string }[];
}

// ─── Normalization & Matching Helpers ─────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

// ─── Date Extraction ──────────────────────────────

function extractDate(query: string, now: Date): { start: Date; end: Date; label: string } | null {
  const q = normalize(query);
  const today = new Date(now); today.setHours(0, 0, 0, 0);

  if (q.includes('tomorrow')) {
    const start = new Date(today); start.setDate(start.getDate() + 1);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { start, end, label: 'tomorrow' };
  }
  if (q.includes('yesterday')) {
    const start = new Date(today); start.setDate(start.getDate() - 1);
    const end = new Date(today);
    return { start, end, label: 'yesterday' };
  }
  if (q.includes('last week')) {
    const start = new Date(today);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1) - 7);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { start, end, label: 'last week' };
  }
  if (q.includes('this week') || q.includes('week')) {
    const start = new Date(today);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { start, end, label: 'this week' };
  }
  if (q.includes('this month') || q.includes('month')) {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return { start, end, label: 'this month' };
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let d = 0; d < dayNames.length; d++) {
    if (q.includes(dayNames[d])) {
      const start = new Date(today);
      const diff = (d - today.getDay() + 7) % 7 || 7;
      start.setDate(start.getDate() + diff);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      return { start, end, label: dayNames[d] };
    }
  }

  // Default: today
  if (q.includes('today') || q.includes('right now') || q.includes('currently')) {
    const end = new Date(today); end.setDate(end.getDate() + 1);
    return { start: today, end, label: 'today' };
  }

  return null;
}

// ─── Name Extraction ──────────────────────────────

function extractStaffName(query: string, staff: Profile[]): { id: string; name: string } | null {
  const q = normalize(query);
  for (const member of staff) {
    const fullName = normalize(member.full_name);
    const firstName = fullName.split(' ')[0];
    if (q.includes(fullName) || q.includes(firstName)) {
      return { id: member.id, name: member.full_name };
    }
  }
  return null;
}

// ─── Date Helpers ─────────────────────────────────

function getTodayRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { start, end };
}

function getWeekRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return { start, end };
}

function shiftsInRange(shifts: Shift[], start: Date, end: Date): Shift[] {
  return shifts.filter(s => {
    const t = new Date(s.start_time);
    return t >= start && t < end;
  });
}

function timeEntriesInRange(entries: TimeEntry[], start: Date, end: Date): TimeEntry[] {
  return entries.filter(e => {
    const t = new Date(e.clock_in);
    return t >= start && t < end;
  });
}

// ─── Intent Handlers ──────────────────────────────

const handlers = {
  // SCHEDULING
  who_working(ctx: OpsPilotContext, ext: ExtractedInfo): string {
    const range = ext.dateRange || getTodayRange(ctx.now || new Date());
    const dayShifts = shiftsInRange(ctx.shifts, range.start, range.end).filter(s => s.user_id);
    if (dayShifts.length === 0) return `No one is scheduled for ${ext.dateLabel || 'today'}.`;
    const names = [...new Set(dayShifts.map(s => {
      const member = ctx.staff.find(m => m.id === s.user_id);
      const time = new Date(s.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `${member?.full_name || 'Unknown'} (${time})`;
    }))];
    return `Staff scheduled for ${ext.dateLabel || 'today'}:\n${names.map(n => `• ${n}`).join('\n')}`;
  },

  open_shifts(ctx: OpsPilotContext, ext: ExtractedInfo): string {
    const range = ext.dateRange || getWeekRange(ctx.now || new Date());
    const open = shiftsInRange(ctx.shifts, range.start, range.end).filter(s => s.is_open);
    if (open.length === 0) return `No open shifts ${ext.dateLabel || 'this week'}.`;
    return `Open shifts (${ext.dateLabel || 'this week'}):\n${open.map(s => {
      const date = new Date(s.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      const time = new Date(s.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `• ${date} at ${time} — ${s.role_type}`;
    }).join('\n')}`;
  },

  how_many_working(ctx: OpsPilotContext, ext: ExtractedInfo): string {
    const range = ext.dateRange || getTodayRange(ctx.now || new Date());
    const dayShifts = shiftsInRange(ctx.shifts, range.start, range.end).filter(s => s.user_id);
    const uniqueStaff = new Set(dayShifts.map(s => s.user_id));
    return `${uniqueStaff.size} staff member${uniqueStaff.size !== 1 ? 's' : ''} scheduled for ${ext.dateLabel || 'today'}.`;
  },

  staff_schedule_lookup(ctx: OpsPilotContext, ext: ExtractedInfo): string {
    if (!ext.targetStaffId) return 'Please include a staff member\'s name. Example: "What time does Sarah work today?"';
    const range = ext.dateRange || getTodayRange(ctx.now || new Date());
    const shifts = shiftsInRange(ctx.shifts, range.start, range.end).filter(s => s.user_id === ext.targetStaffId);
    if (shifts.length === 0) return `${ext.targetStaffName} is not scheduled for ${ext.dateLabel || 'today'}.`;
    return `${ext.targetStaffName}'s schedule (${ext.dateLabel || 'today'}):\n${shifts.map(s => {
      const start = new Date(s.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const end = new Date(s.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `• ${start} - ${end} (${s.role_type})`;
    }).join('\n')}`;
  },

  // ATTENDANCE
  who_late(ctx: OpsPilotContext): string {
    const now = ctx.now || new Date();
    const { start, end } = getTodayRange(now);
    const todayEntries = timeEntriesInRange(ctx.timeEntries, start, end);
    const late = ctx.shifts
      .filter(s => s.user_id && new Date(s.start_time) >= start && new Date(s.start_time) < now)
      .filter(s => !todayEntries.find(e => e.user_id === s.user_id))
      .map(s => ({
        name: ctx.staff.find(m => m.id === s.user_id)?.full_name || 'Unknown',
        mins: Math.floor((now.getTime() - new Date(s.start_time).getTime()) / 60000),
        time: new Date(s.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      }))
      .filter(l => l.mins >= 5)
      .sort((a, b) => b.mins - a.mins);
    if (late.length === 0) return 'No one is late. All scheduled staff have clocked in on time.';
    return `Late staff:\n${late.map(l => `• ${l.name} — ${l.mins}min late (shift started ${l.time})`).join('\n')}`;
  },

  who_clocked_in(ctx: OpsPilotContext): string {
    const active = ctx.timeEntries.filter(e => e.status === 'active' || !e.clock_out);
    const onSite = ctx.staff.filter(m => active.some(e => e.user_id === m.id));
    if (onSite.length === 0) return 'No staff are currently clocked in.';
    return `Currently clocked in (${onSite.length}):\n${onSite.map(m => `• ${m.full_name}`).join('\n')}`;
  },

  who_on_break(ctx: OpsPilotContext): string {
    const onBreak = ctx.timeEntries
      .filter(e => e.break_start && !e.clock_out)
      .map(e => ctx.staff.find(m => m.id === e.user_id)?.full_name)
      .filter(Boolean);
    if (onBreak.length === 0) return 'No one is currently on break.';
    return `On break:\n${onBreak.map(n => `• ${n}`).join('\n')}`;
  },

  // DOGS & CLIENTS
  dogs_here(ctx: OpsPilotContext): string {
    const allPets = ctx.clients.flatMap(c => c.pets || []).filter(p => p.status === 'active');
    return `There are ${allPets.length} active pets across ${ctx.clients.length} clients.`;
  },

  dogs_medical(ctx: OpsPilotContext): string {
    const alerts = ctx.clients.flatMap(c => c.pets || [])
      .filter(p => p.medical_alerts && p.medical_alerts.length > 0);
    if (alerts.length === 0) return 'No pets currently have medical alerts on file.';
    return `Pets with medical alerts (${alerts.length}):\n${alerts.map(p => `• ${p.name} — ${p.medical_alerts!.join(', ')}`).join('\n')}`;
  },

  dogs_behavior(ctx: OpsPilotContext): string {
    const flagged = ctx.clients.flatMap(c => c.pets || [])
      .filter(p => p.behavior_tags && p.behavior_tags.length > 0);
    if (flagged.length === 0) return 'No pets currently have behavior flags.';
    return `Pets with behavior flags (${flagged.length}):\n${flagged.map(p => `• ${p.name} — ${p.behavior_tags!.join(', ')}`).join('\n')}`;
  },

  client_count(ctx: OpsPilotContext): string {
    const active = ctx.clients.filter(c => c.status === 'active');
    const totalPets = ctx.clients.flatMap(c => c.pets || []).length;
    return `${active.length} active clients with ${totalPets} pets total.`;
  },

  // PERSONAL HOURS
  my_hours(ctx: OpsPilotContext, ext: ExtractedInfo): string {
    const range = ext.dateRange || getWeekRange(ctx.now || new Date());
    const myEntries = timeEntriesInRange(ctx.timeEntries, range.start, range.end)
      .filter(e => e.user_id === ctx.currentUser.id && e.clock_out);
    let totalMs = 0;
    myEntries.forEach(e => {
      totalMs += TimeMath.calculateNetDurationMS(e.clock_in, e.clock_out!, e.total_break_minutes);
    });
    const hours = TimeMath.msToDecimalHours(totalMs);
    return `You worked ${TimeMath.formatDecimalHours(hours)} ${ext.dateLabel || 'this week'} across ${myEntries.length} entries.`;
  },

  my_schedule(ctx: OpsPilotContext, ext: ExtractedInfo): string {
    const range = ext.dateRange || getWeekRange(ctx.now || new Date());
    const myShifts = shiftsInRange(ctx.shifts, range.start, range.end)
      .filter(s => s.user_id === ctx.currentUser.id)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    if (myShifts.length === 0) return `You have no shifts scheduled ${ext.dateLabel || 'this week'}.`;
    return `Your schedule (${ext.dateLabel || 'this week'}):\n${myShifts.map(s => {
      const date = new Date(s.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      const start = new Date(s.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const end = new Date(s.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `• ${date}: ${start} - ${end}`;
    }).join('\n')}`;
  },

  my_next_shift(ctx: OpsPilotContext): string {
    const now = ctx.now || new Date();
    const upcoming = ctx.shifts
      .filter(s => s.user_id === ctx.currentUser.id && new Date(s.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    if (upcoming.length === 0) return 'You have no upcoming shifts scheduled.';
    const next = upcoming[0];
    const date = new Date(next.start_time).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    const start = new Date(next.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const end = new Date(next.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Your next shift: ${date}, ${start} - ${end} (${next.role_type})`;
  },

  // FINANCIAL (manager only)
  total_payroll(ctx: OpsPilotContext, ext: ExtractedInfo): string {
    const range = ext.dateRange || getWeekRange(ctx.now || new Date());
    const entries = timeEntriesInRange(ctx.timeEntries, range.start, range.end).filter(e => e.clock_out);
    let totalCost = 0, totalHours = 0;
    entries.forEach(e => {
      const ms = TimeMath.calculateNetDurationMS(e.clock_in, e.clock_out!, e.total_break_minutes);
      const hours = TimeMath.msToDecimalHours(ms);
      const rate = ctx.staff.find(s => s.id === e.user_id)?.hourly_rate || 0;
      totalHours += hours;
      totalCost += hours * rate;
    });
    return `Payroll (${ext.dateLabel || 'this week'}):\n• Total hours: ${TimeMath.formatDecimalHours(totalHours)}\n• Estimated cost: ${TimeMath.formatCurrency(totalCost)}\n• ${entries.length} time entries across ${new Set(entries.map(e => e.user_id)).size} staff`;
  },

  who_overtime(ctx: OpsPilotContext): string {
    const range = getWeekRange(ctx.now || new Date());
    const weekEntries = timeEntriesInRange(ctx.timeEntries, range.start, range.end).filter(e => e.clock_out);
    const byUser: Record<string, number> = {};
    weekEntries.forEach(e => {
      const ms = TimeMath.calculateNetDurationMS(e.clock_in, e.clock_out!, e.total_break_minutes);
      byUser[e.user_id] = (byUser[e.user_id] || 0) + TimeMath.msToDecimalHours(ms);
    });
    const overtime = Object.entries(byUser)
      .filter(([, h]) => h >= 40)
      .map(([id, h]) => ({ name: ctx.staff.find(s => s.id === id)?.full_name || 'Unknown', hours: h }))
      .sort((a, b) => b.hours - a.hours);
    if (overtime.length === 0) return 'No staff are in overtime this week.';
    return `Overtime this week:\n${overtime.map(o => `• ${o.name}: ${TimeMath.formatDecimalHours(o.hours)} (${TimeMath.formatDecimalHours(o.hours - 40)} OT)`).join('\n')}`;
  },

  pending_paystubs(ctx: OpsPilotContext): string {
    const draft = ctx.payStubs.filter(p => p.status === 'draft');
    const approved = ctx.payStubs.filter(p => p.status === 'approved');
    return `Pay stub status:\n• ${draft.length} drafts pending approval\n• ${approved.length} approved, awaiting release\n• ${ctx.payStubs.filter(p => p.status === 'released').length} released`;
  },

  avg_hourly_rate(ctx: OpsPilotContext): string {
    const activeStaff = ctx.staff.filter(s => s.status === 'active' && s.hourly_rate);
    if (activeStaff.length === 0) return 'No staff have hourly rates set.';
    const avg = activeStaff.reduce((sum, s) => sum + (s.hourly_rate || 0), 0) / activeStaff.length;
    const min = Math.min(...activeStaff.map(s => s.hourly_rate || 0));
    const max = Math.max(...activeStaff.map(s => s.hourly_rate || 0));
    return `Hourly rates:\n• Average: ${TimeMath.formatCurrency(avg)}/hr\n• Range: ${TimeMath.formatCurrency(min)} - ${TimeMath.formatCurrency(max)}/hr\n• ${activeStaff.length} staff with rates set`;
  },

  time_off_requests(ctx: OpsPilotContext): string {
    const pending = ctx.requests.filter(r => r.status === 'pending');
    if (pending.length === 0) return 'No pending time-off requests.';
    return `Pending time-off requests (${pending.length}):\n${pending.map(r => {
      const name = ctx.staff.find(s => s.id === r.user_id)?.full_name || 'Unknown';
      return `• ${name}: ${r.start_date} to ${r.end_date} (${r.type})`;
    }).join('\n')}`;
  },

  // OPERATIONAL INTENTS
  staffing_health(ctx: OpsPilotContext): string {
    const now = ctx.now || new Date();
    const activeEntries = ctx.timeEntries.filter(e => !e.clock_out || e.status === 'active');
    const activeCount = new Set(activeEntries.map(e => e.user_id)).size;
    const { start, end } = getTodayRange(now);
    const todayShifts = shiftsInRange(ctx.shifts, start, end);
    const staffedShifts = todayShifts.filter(s => s.user_id && !s.is_open);
    const openShifts = todayShifts.filter(s => s.is_open);
    const totalPets = ctx.clients.flatMap(c => c.pets || []).filter(p => p.status === 'active').length;

    const status = openShifts.length >= 3 || activeCount < staffedShifts.length - 2
      ? 'UNDERSTAFFED'
      : openShifts.length === 0 && activeCount >= staffedShifts.length
        ? 'FULLY STAFFED'
        : 'TIGHT COVERAGE';

    return `Facility Status: ${status}\n• ${activeCount} staff clocked in\n• ${staffedShifts.length} shifts scheduled today\n• ${openShifts.length} open shifts\n• ${totalPets} dogs in system\n• Ratio: ${activeCount > 0 ? (totalPets / activeCount).toFixed(1) : '—'} dogs per staff`;
  },

  who_late_or_missing(ctx: OpsPilotContext): string {
    const now = ctx.now || new Date();
    const { start, end } = getTodayRange(now);
    const todayEntries = timeEntriesInRange(ctx.timeEntries, start, end);
    const results: string[] = [];

    const staffedToday = shiftsInRange(ctx.shifts, start, end).filter(s => s.user_id && !s.is_open && new Date(s.start_time) < now);
    for (const shift of staffedToday) {
      const name = ctx.staff.find(s => s.id === shift.user_id)?.full_name || 'Unknown';
      const time = new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const entry = todayEntries.find(e => e.user_id === shift.user_id);
      const minsSinceStart = Math.floor((now.getTime() - new Date(shift.start_time).getTime()) / 60000);

      if (!entry && minsSinceStart > 30) {
        results.push(`• ${name} — MISSED (due at ${time}, ${minsSinceStart}min ago)`);
      } else if (!entry && minsSinceStart > 5) {
        results.push(`• ${name} — NO CLOCK-IN (due at ${time}, ${minsSinceStart}min ago)`);
      } else if (entry) {
        const lateMin = Math.floor((new Date(entry.clock_in).getTime() - new Date(shift.start_time).getTime()) / 60000);
        if (lateMin > 5) results.push(`• ${name} — LATE by ${lateMin}min (shift at ${time})`);
      }
    }
    if (results.length === 0) return 'All clear — no one is late or missing today.';
    return `Late/Missing staff today:\n${results.join('\n')}`;
  },

  approaching_overtime(ctx: OpsPilotContext): string {
    const range = getWeekRange(ctx.now || new Date());
    const weekEntries = timeEntriesInRange(ctx.timeEntries, range.start, range.end);
    const byUser: Record<string, number> = {};
    weekEntries.forEach(e => {
      const ms = TimeMath.calculateNetDurationMS(e.clock_in, e.clock_out || new Date(), e.total_break_minutes);
      byUser[e.user_id] = (byUser[e.user_id] || 0) + TimeMath.msToDecimalHours(ms);
    });
    const atRisk = Object.entries(byUser)
      .filter(([, h]) => h >= 35)
      .map(([id, h]) => ({ name: ctx.staff.find(s => s.id === id)?.full_name || 'Unknown', hours: h }))
      .sort((a, b) => b.hours - a.hours);
    if (atRisk.length === 0) return 'No staff are approaching overtime this week.';
    return `Overtime risk this week:\n${atRisk.map(o => `• ${o.name}: ${TimeMath.formatDecimalHours(o.hours)}${o.hours >= 40 ? ' ⚠️ OVERTIME' : ` (${TimeMath.formatDecimalHours(40 - o.hours)} remaining)`}`).join('\n')}`;
  },
};

// ─── Intent Registry ──────────────────────────────

const INTENTS: Intent[] = [
  // SCHEDULING
  { id: 'who_working', category: 'scheduling', displayQuestion: 'Who is working today?', keywords: ['who', 'working', 'scheduled'], synonyms: ['whos working', 'who is working', 'who works today', 'who is scheduled', 'who is on today', 'whos on today'], requiredRole: 'all', handler: handlers.who_working },
  { id: 'open_shifts', category: 'scheduling', displayQuestion: 'What shifts are open?', keywords: ['open', 'shifts', 'unfilled'], synonyms: ['open shifts', 'unfilled shifts', 'available shifts', 'shifts available'], requiredRole: 'all', handler: handlers.open_shifts },
  { id: 'how_many_working', category: 'scheduling', displayQuestion: 'How many people are working today?', keywords: ['how many', 'people', 'working', 'headcount'], synonyms: ['headcount', 'staff count', 'how many working', 'how many staff'], requiredRole: 'all', handler: handlers.how_many_working },
  { id: 'staff_schedule', category: 'scheduling', displayQuestion: 'What time does [name] work?', keywords: ['time', 'work', 'shift', 'schedule'], synonyms: ['when does', 'what shift is', 'what time does'], requiredRole: 'all', handler: handlers.staff_schedule_lookup },

  // ATTENDANCE
  { id: 'who_late', category: 'attendance', displayQuestion: 'Who is late?', keywords: ['late', 'attendance', 'no show', 'overdue'], synonyms: ['whos late', 'who is late', 'who hasnt clocked in', 'attendance check', 'no shows'], requiredRole: 'all', handler: handlers.who_late },
  { id: 'who_clocked_in', category: 'attendance', displayQuestion: 'Who is clocked in right now?', keywords: ['clocked', 'in', 'here', 'onsite', 'on site'], synonyms: ['whos here', 'who is here', 'whos clocked in', 'who is on site', 'who is onsite', 'whos on the clock', 'who is on the clock'], requiredRole: 'all', handler: handlers.who_clocked_in },
  { id: 'who_on_break', category: 'attendance', displayQuestion: 'Who is on break?', keywords: ['break', 'lunch'], synonyms: ['whos on break', 'who is on break', 'whos on lunch', 'who is on lunch'], requiredRole: 'all', handler: handlers.who_on_break },

  // DOGS & CLIENTS
  { id: 'dogs_here', category: 'dogs_clients', displayQuestion: 'How many dogs are here?', keywords: ['dogs', 'how many', 'pets', 'here'], synonyms: ['how many dogs', 'dog count', 'dogs checked in', 'how many dogs are here', 'how many pets'], requiredRole: 'all', handler: handlers.dogs_here },
  { id: 'dogs_medical', category: 'dogs_clients', displayQuestion: 'Which dogs have medical alerts?', keywords: ['dogs', 'medical', 'alerts', 'sick'], synonyms: ['medical alerts', 'medical flags', 'dogs with medical', 'sick dogs'], requiredRole: 'all', handler: handlers.dogs_medical },
  { id: 'dogs_behavior', category: 'dogs_clients', displayQuestion: 'Any dogs with behavior issues?', keywords: ['dogs', 'behavior', 'reactive', 'issues'], synonyms: ['behavior flags', 'reactive dogs', 'dog selective', 'behavior issues', 'problem dogs'], requiredRole: 'all', handler: handlers.dogs_behavior },
  { id: 'client_count', category: 'dogs_clients', displayQuestion: 'How many clients do we have?', keywords: ['clients', 'how many', 'count'], synonyms: ['total clients', 'client count', 'number of clients', 'how many clients'], requiredRole: 'all', handler: handlers.client_count },

  // PERSONAL HOURS
  { id: 'my_hours', category: 'hours_personal', displayQuestion: 'How many hours have I worked this week?', keywords: ['my', 'hours', 'worked'], synonyms: ['my hours', 'hours this week', 'how many hours', 'hours i worked', 'hours ive worked'], requiredRole: 'self', handler: handlers.my_hours },
  { id: 'my_schedule', category: 'hours_personal', displayQuestion: "What's my schedule this week?", keywords: ['my', 'schedule', 'shifts'], synonyms: ['my schedule', 'when do i work', 'my shifts', 'am i working', 'do i work'], requiredRole: 'self', handler: handlers.my_schedule },
  { id: 'my_next_shift', category: 'hours_personal', displayQuestion: 'When is my next shift?', keywords: ['next', 'shift', 'my'], synonyms: ['my next shift', 'when do i work next', 'next time i work'], requiredRole: 'self', handler: handlers.my_next_shift },

  // FINANCIAL (Manager only)
  { id: 'total_payroll', category: 'financial', displayQuestion: "What's the total payroll?", keywords: ['payroll', 'total', 'labor', 'cost'], synonyms: ['total payroll', 'payroll cost', 'labor cost', 'how much payroll'], requiredRole: 'manager', handler: handlers.total_payroll },
  { id: 'who_overtime', category: 'financial', displayQuestion: 'Who has overtime?', keywords: ['overtime', 'ot', 'over 40'], synonyms: ['who has overtime', 'overtime hours', 'whos in overtime', 'over 40 hours'], requiredRole: 'manager', handler: handlers.who_overtime },
  { id: 'pending_paystubs', category: 'financial', displayQuestion: 'How many pay stubs are pending?', keywords: ['pay stubs', 'pending', 'draft', 'paystubs'], synonyms: ['pending pay stubs', 'draft pay stubs', 'unapproved pay stubs', 'pay stub status'], requiredRole: 'manager', handler: handlers.pending_paystubs },
  { id: 'avg_hourly_rate', category: 'financial', displayQuestion: "What's the average hourly rate?", keywords: ['average', 'hourly', 'rate', 'pay'], synonyms: ['average pay rate', 'avg hourly', 'average rate', 'pay rate'], requiredRole: 'manager', handler: handlers.avg_hourly_rate },
  { id: 'time_off_requests', category: 'financial', displayQuestion: 'Any pending time-off requests?', keywords: ['time off', 'requests', 'pending', 'pto'], synonyms: ['time off requests', 'pending requests', 'pto requests', 'vacation requests'], requiredRole: 'manager', handler: handlers.time_off_requests },

  // OPERATIONAL
  { id: 'staffing_health', category: 'scheduling', displayQuestion: 'Are we properly staffed right now?', keywords: ['staffed', 'properly', 'enough', 'coverage', 'understaffed'], synonyms: ['are we properly staffed', 'are we staffed', 'staffing health', 'enough staff', 'do we have enough people', 'are we understaffed', 'facility status'], requiredRole: 'manager', handler: handlers.staffing_health },
  { id: 'who_late_or_missing', category: 'attendance', displayQuestion: 'Who is late or missing today?', keywords: ['late', 'missing', 'no show'], synonyms: ['who is late or missing', 'whos late or missing', 'late or missing', 'attendance issues', 'who hasnt shown up'], requiredRole: 'manager', handler: handlers.who_late_or_missing },
  { id: 'approaching_overtime', category: 'financial', displayQuestion: 'Who is approaching overtime this week?', keywords: ['approaching', 'overtime', 'close to overtime', 'hours risk'], synonyms: ['approaching overtime', 'close to overtime', 'who is approaching overtime', 'overtime risk', 'nearing overtime'], requiredRole: 'manager', handler: handlers.approaching_overtime },
];

// ─── Intent Matching ──────────────────────────────

function scoreIntent(query: string, intent: Intent): number {
  const q = normalize(query);
  let score = 0;

  // Synonym phrase match (highest priority)
  for (const syn of intent.synonyms) {
    if (q.includes(syn)) { score += 20; break; }
  }

  // Keyword match
  const qTokens = q.split(' ');
  for (const kw of intent.keywords) {
    if (q.includes(kw)) {
      score += 5;
    } else {
      // Fuzzy: check if any query token is within edit distance 1
      for (const token of qTokens) {
        if (token.length > 2 && levenshtein(token, kw) <= 1) {
          score += 2;
          break;
        }
      }
    }
  }

  return score;
}

function matchIntent(query: string, ctx: OpsPilotContext): { intent: Intent | null; score: number; extracted: ExtractedInfo } {
  const now = ctx.now || new Date();
  const dateInfo = extractDate(query, now);
  const staffInfo = extractStaffName(query, ctx.staff);

  const extracted: ExtractedInfo = {
    dateRange: dateInfo ? { start: dateInfo.start, end: dateInfo.end } : null,
    dateLabel: dateInfo?.label || '',
    targetStaffId: staffInfo?.id || null,
    targetStaffName: staffInfo?.name || null,
  };

  let bestIntent: Intent | null = null;
  let bestScore = 0;

  for (const intent of INTENTS) {
    const score = scoreIntent(query, intent);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  return { intent: bestIntent, score: bestScore, extracted };
}

// ─── Knowledge Fallback (preserved from original) ─

function buildKnowledgeResponse(query: string, knowledgeBase: KnowledgeEntry[]): string | null {
  const bestMatch = [...knowledgeBase]
    .map(entry => ({ entry, score: scoreKnowledgeEntry(query, entry) }))
    .sort((a, b) => b.score - a.score)
    .find(r => r.score > 0);

  if (!bestMatch) return null;
  const { entry } = bestMatch;

  // MOD SOP special handling
  const isModEntry = entry.title.toLowerCase().includes('manager on duty') ||
    (entry.tags || []).some(tag => tag.toLowerCase() === 'mod' || tag.toLowerCase().includes('manager on duty'));

  if (isModEntry) {
    // Preserve existing MOD response logic
    const lines = entry.content_raw.split('\n').map(l => l.trim()).filter(Boolean);
    const tokens = normalize(query).split(' ').filter(t => t.length > 2);
    const matched = lines
      .map(line => ({ line, score: tokens.reduce((s, t) => s + (line.toLowerCase().includes(t) ? 1 : 0), 0) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(r => r.line);
    if (matched.length > 0) return `${entry.title}\n${matched.join('\n')}`;
    return `${entry.title}\n${lines.slice(0, 5).join('\n')}`;
  }

  // Generic knowledge entry
  const tokens = normalize(query).split(' ').filter(t => t.length > 2);
  const relevant = entry.content_raw.split('\n').map(l => l.trim()).filter(Boolean)
    .map(line => ({ line, score: tokens.reduce((s, t) => s + (line.toLowerCase().includes(t) ? 1 : 0), 0) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.line);
  if (relevant.length === 0) return null;

  // Check if critical entry
  const CRITICAL_KEYWORDS = ['emergency', 'critical', 'safety', 'incident', 'evacuation', 'bite', 'seizure', 'allergic'];
  const entryStr = `${entry.title} ${entry.category} ${(entry.tags || []).join(' ')}`.toLowerCase();
  const isCritical = CRITICAL_KEYWORDS.some(kw => entryStr.includes(kw)) || (entry.tags || []).some(t => t.toLowerCase() === 'critical');
  const prefix = isCritical ? 'CRITICAL PROCEDURE: ' : '';

  return `${prefix}${entry.title}\n${relevant.map(l => `• ${l}`).join('\n')}`;
}

// ─── Main API ─────────────────────────────────────

const MINIMUM_SCORE = 5;

export function buildOpsPilotReply(query: string, context: OpsPilotContext): string {
  const { intent, score, extracted } = matchIntent(query, context);

  if (intent && score >= MINIMUM_SCORE) {
    // Role check
    if (intent.requiredRole === 'manager' && !isManager(context.currentUser)) {
      return 'This information is only available to managers and owners.';
    }
    return intent.handler(context, extracted);
  }

  // Fallback: knowledge base
  const kbResponse = buildKnowledgeResponse(query, context.knowledgeBase);
  if (kbResponse) return kbResponse;

  // Nothing matched
  return 'I couldn\'t find an answer for that. Try browsing the Questions tab to see what I can help with, or rephrase your question.';
}

// ─── Question Catalog ─────────────────────────────

const CATEGORY_LABELS: Record<IntentCategory, string> = {
  scheduling: 'Scheduling',
  attendance: 'Attendance',
  dogs_clients: 'Dogs & Clients',
  hours_personal: 'My Hours & Schedule',
  financial: 'Financial & Payroll',
  knowledge: 'SOPs & Knowledge',
};

export function getQuestionCatalog(user: Profile): CatalogCategory[] {
  const userIsManager = isManager(user);

  const categories: CatalogCategory[] = [];
  const grouped: Record<string, CatalogCategory> = {};

  for (const intent of INTENTS) {
    // Filter by role
    if (intent.requiredRole === 'manager' && !userIsManager) continue;

    if (!grouped[intent.category]) {
      grouped[intent.category] = {
        id: intent.category,
        label: CATEGORY_LABELS[intent.category],
        questions: [],
      };
    }
    grouped[intent.category].questions.push({
      intentId: intent.id,
      displayQuestion: intent.displayQuestion,
    });
  }

  // Add knowledge category
  grouped['knowledge'] = {
    id: 'knowledge',
    label: CATEGORY_LABELS.knowledge,
    questions: [
      { intentId: 'kb_mod_overview', displayQuestion: 'What is the MOD procedure?' },
      { intentId: 'kb_mod_12p', displayQuestion: 'What does the MOD do from 12p-2p?' },
      { intentId: 'kb_dinners', displayQuestion: 'When do dog dinners start?' },
      { intentId: 'kb_closing', displayQuestion: 'What is the closing procedure?' },
    ],
  };

  // Order categories
  const order: IntentCategory[] = ['scheduling', 'attendance', 'dogs_clients', 'hours_personal', 'financial', 'knowledge'];
  for (const cat of order) {
    if (grouped[cat]) categories.push(grouped[cat]);
  }

  return categories;
}

// Legacy export for backward compatibility
export const OPS_PILOT_SUGGESTIONS = [
  'Are we properly staffed right now?',
  'Who is late or missing today?',
  'Any dogs with medical alerts?',
  'What shifts are still open today?',
  'Who is approaching overtime this week?',
];
