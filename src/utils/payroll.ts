import { TimeMath } from './timeMath';

export interface TimeEntryLike {
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  total_break_minutes: number;
  status?: string;
}

export interface EmployeeLike {
  id: string;
  hourly_rate?: number;
}

/**
 * Calculates pay period start date aligned to the configured start day.
 */
export function getPayPeriodStart(
  referenceDate: Date,
  periodStartDay: number = 1 // 0=Sun, 1=Mon, ..., 6=Sat
): Date {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  const currentDay = d.getDay();
  let diff = d.getDate() - currentDay + periodStartDay;
  if (currentDay < periodStartDay) diff -= 7;
  d.setDate(diff);
  return d;
}

/**
 * Calculates pay period end date from a start date and period type.
 */
export function getPayPeriodEnd(
  startDate: Date,
  periodType: 'weekly' | 'biweekly' | 'monthly' = 'weekly'
): Date {
  const d = new Date(startDate);
  if (periodType === 'biweekly') {
    d.setDate(d.getDate() + 13);
  } else if (periodType === 'monthly') {
    d.setMonth(d.getMonth() + 1);
    d.setDate(0); // Last day of start month
  } else {
    d.setDate(d.getDate() + 6);
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Calculates total worked hours for a set of time entries.
 */
export function calculateTotalHours(entries: TimeEntryLike[]): number {
  let totalHours = 0;
  entries.forEach(te => {
    if (!te.clock_out && te.status !== 'active') return;
    const netMS = TimeMath.calculateNetDurationMS(
      te.clock_in,
      te.clock_out || new Date(),
      te.total_break_minutes
    );
    totalHours += TimeMath.msToDecimalHours(netMS);
  });
  return Math.max(0, totalHours);
}

/**
 * Calculates gross pay for an employee given their hours and rate.
 */
export function calculateGrossPay(totalHours: number, hourlyRate: number): number {
  return Math.max(0, totalHours * (hourlyRate || 0));
}

/**
 * Filters time entries for a specific user within a date range.
 */
export function filterEntriesForPeriod(
  entries: TimeEntryLike[],
  userId: string,
  periodStart: Date,
  periodEnd: Date
): TimeEntryLike[] {
  return entries.filter(te =>
    te.user_id === userId &&
    new Date(te.clock_in) <= periodEnd &&
    (te.clock_out ? new Date(te.clock_out) >= periodStart : te.status === 'active')
  );
}

/**
 * Calculates full payroll summary for an employee in a period.
 */
export function calculateEmployeePayroll(
  employee: EmployeeLike,
  entries: TimeEntryLike[],
  periodStart: Date,
  periodEnd: Date
): { totalHours: number; grossPay: number } {
  const periodEntries = filterEntriesForPeriod(entries, employee.id, periodStart, periodEnd);
  const totalHours = calculateTotalHours(periodEntries);
  const grossPay = calculateGrossPay(totalHours, employee.hourly_rate || 0);
  return { totalHours, grossPay };
}
