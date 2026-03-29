import { TimeMath } from './timeMath';

export interface OvertimeStatus {
  userId: string;
  totalHoursThisWeek: number;
  isApproaching: boolean; // >= 35h
  isOvertime: boolean;    // >= 40h
  overtimeHours: number;  // hours over 40
}

interface TimeEntryLike {
  user_id: string;
  clock_in: string;
  clock_out?: string | null;
  total_break_minutes: number;
  status?: string;
}

/**
 * Returns the Monday 00:00 of the current week.
 */
export function getCurrentWeekStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  now.setDate(now.getDate() + diff);
  return now;
}

/**
 * Calculates overtime status for a user based on current week time entries.
 */
export function getOvertimeStatus(
  userId: string,
  entries: TimeEntryLike[],
  weekStart?: Date
): OvertimeStatus {
  const start = weekStart || getCurrentWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const weekEntries = entries.filter(e =>
    e.user_id === userId &&
    new Date(e.clock_in) >= start &&
    new Date(e.clock_in) < end
  );

  let totalMs = 0;
  weekEntries.forEach(e => {
    if (!e.clock_out && e.status !== 'active') return;
    totalMs += TimeMath.calculateNetDurationMS(
      e.clock_in,
      e.clock_out || new Date(),
      e.total_break_minutes
    );
  });

  const totalHours = TimeMath.msToDecimalHours(totalMs);

  return {
    userId,
    totalHoursThisWeek: totalHours,
    isApproaching: totalHours >= 35 && totalHours < 40,
    isOvertime: totalHours >= 40,
    overtimeHours: Math.max(0, totalHours - 40),
  };
}

/**
 * Returns overtime statuses for all provided user IDs.
 */
export function getOvertimeStatuses(
  userIds: string[],
  entries: TimeEntryLike[],
  weekStart?: Date
): OvertimeStatus[] {
  return userIds.map(id => getOvertimeStatus(id, entries, weekStart));
}
