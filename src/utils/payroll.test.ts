import { expect, test, describe } from 'vitest';
import {
  getPayPeriodStart,
  getPayPeriodEnd,
  calculateTotalHours,
  calculateGrossPay,
  filterEntriesForPeriod,
  calculateEmployeePayroll,
  TimeEntryLike,
} from './payroll';

// ─── Pay Period Date Logic ────────────────────────────────

describe('getPayPeriodStart', () => {
  test('aligns to Monday when periodStartDay=1 and today is Wednesday', () => {
    // 2026-03-25 is a Wednesday
    const wed = new Date(2026, 2, 25);
    const result = getPayPeriodStart(wed, 1);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(23); // March 23
  });

  test('aligns to Monday when today IS Monday', () => {
    // 2026-03-23 is a Monday
    const mon = new Date(2026, 2, 23);
    const result = getPayPeriodStart(mon, 1);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(23);
  });

  test('goes back a week when today is Sunday and start day is Monday', () => {
    // 2026-03-22 is a Sunday
    const sun = new Date(2026, 2, 22);
    const result = getPayPeriodStart(sun, 1);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(16); // Previous Monday
  });

  test('aligns to Sunday when periodStartDay=0', () => {
    const wed = new Date(2026, 2, 25);
    const result = getPayPeriodStart(wed, 0);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getDate()).toBe(22);
  });

  test('sets time to midnight', () => {
    const d = new Date(2026, 2, 25, 14, 30, 45);
    const result = getPayPeriodStart(d, 1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe('getPayPeriodEnd', () => {
  test('weekly period is 6 days after start', () => {
    const start = new Date(2026, 2, 23); // Monday
    const end = getPayPeriodEnd(start, 'weekly');
    expect(end.getDate()).toBe(29); // Sunday
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  test('biweekly period is 13 days after start', () => {
    const start = new Date(2026, 2, 23);
    const end = getPayPeriodEnd(start, 'biweekly');
    expect(end.getDate()).toBe(5); // April 5
    expect(end.getMonth()).toBe(3); // April
  });

  test('monthly period ends on last day of the month', () => {
    const start = new Date(2026, 1, 1); // Feb 1
    const end = getPayPeriodEnd(start, 'monthly');
    expect(end.getDate()).toBe(28); // Feb 28 (2026 is not leap)
    expect(end.getMonth()).toBe(1);
  });

  test('monthly period handles 31-day months', () => {
    const start = new Date(2026, 0, 1); // Jan 1
    const end = getPayPeriodEnd(start, 'monthly');
    expect(end.getDate()).toBe(31);
    expect(end.getMonth()).toBe(0);
  });
});

// ─── Hours Calculation ────────────────────────────────────

describe('calculateTotalHours', () => {
  test('calculates hours for a standard 8-hour entry', () => {
    const entries: TimeEntryLike[] = [{
      user_id: 'u1',
      clock_in: '2026-03-25T09:00:00',
      clock_out: '2026-03-25T17:00:00',
      total_break_minutes: 0,
    }];
    expect(calculateTotalHours(entries)).toBeCloseTo(8, 2);
  });

  test('subtracts break minutes correctly', () => {
    const entries: TimeEntryLike[] = [{
      user_id: 'u1',
      clock_in: '2026-03-25T09:00:00',
      clock_out: '2026-03-25T17:00:00',
      total_break_minutes: 30,
    }];
    expect(calculateTotalHours(entries)).toBeCloseTo(7.5, 2);
  });

  test('sums multiple entries', () => {
    const entries: TimeEntryLike[] = [
      {
        user_id: 'u1',
        clock_in: '2026-03-25T08:00:00',
        clock_out: '2026-03-25T12:00:00',
        total_break_minutes: 0,
      },
      {
        user_id: 'u1',
        clock_in: '2026-03-25T13:00:00',
        clock_out: '2026-03-25T17:00:00',
        total_break_minutes: 0,
      },
    ];
    expect(calculateTotalHours(entries)).toBeCloseTo(8, 2);
  });

  test('skips entries with no clock_out and non-active status', () => {
    const entries: TimeEntryLike[] = [{
      user_id: 'u1',
      clock_in: '2026-03-25T09:00:00',
      clock_out: null,
      total_break_minutes: 0,
      status: 'pending_approval',
    }];
    expect(calculateTotalHours(entries)).toBe(0);
  });

  test('returns 0 for empty entries', () => {
    expect(calculateTotalHours([])).toBe(0);
  });

  test('never returns negative hours', () => {
    const entries: TimeEntryLike[] = [{
      user_id: 'u1',
      clock_in: '2026-03-25T09:00:00',
      clock_out: '2026-03-25T09:15:00',
      total_break_minutes: 60, // Break longer than shift
    }];
    expect(calculateTotalHours(entries)).toBe(0);
  });
});

// ─── Gross Pay Calculation ────────────────────────────────

describe('calculateGrossPay', () => {
  test('multiplies hours by rate', () => {
    expect(calculateGrossPay(8, 15)).toBe(120);
  });

  test('handles fractional hours', () => {
    // 7.5 hours at $20/hr = $150
    expect(calculateGrossPay(7.5, 20)).toBe(150);
  });

  test('returns 0 for zero rate', () => {
    expect(calculateGrossPay(8, 0)).toBe(0);
  });

  test('returns 0 for zero hours', () => {
    expect(calculateGrossPay(0, 25)).toBe(0);
  });

  test('never returns negative', () => {
    expect(calculateGrossPay(-1, 25)).toBe(0);
  });
});

// ─── Period Filtering ─────────────────────────────────────

describe('filterEntriesForPeriod', () => {
  const periodStart = new Date('2026-03-23T00:00:00');
  const periodEnd = new Date('2026-03-29T23:59:59');

  const entries: TimeEntryLike[] = [
    { user_id: 'u1', clock_in: '2026-03-24T09:00:00', clock_out: '2026-03-24T17:00:00', total_break_minutes: 0 },
    { user_id: 'u1', clock_in: '2026-03-20T09:00:00', clock_out: '2026-03-20T17:00:00', total_break_minutes: 0 }, // Before period
    { user_id: 'u2', clock_in: '2026-03-25T09:00:00', clock_out: '2026-03-25T17:00:00', total_break_minutes: 0 }, // Different user
    { user_id: 'u1', clock_in: '2026-03-29T08:00:00', clock_out: '2026-03-29T16:00:00', total_break_minutes: 0 }, // End of period
  ];

  test('returns only entries for the specified user within the period', () => {
    const result = filterEntriesForPeriod(entries, 'u1', periodStart, periodEnd);
    expect(result).toHaveLength(2);
  });

  test('excludes entries outside the period', () => {
    const result = filterEntriesForPeriod(entries, 'u1', periodStart, periodEnd);
    const hasOutOfRange = result.some(e => new Date(e.clock_in) < periodStart);
    expect(hasOutOfRange).toBe(false);
  });

  test('returns empty array for user with no entries', () => {
    const result = filterEntriesForPeriod(entries, 'u999', periodStart, periodEnd);
    expect(result).toHaveLength(0);
  });

  test('includes active entries without clock_out', () => {
    const withActive: TimeEntryLike[] = [
      { user_id: 'u1', clock_in: '2026-03-25T09:00:00', clock_out: null, total_break_minutes: 0, status: 'active' },
    ];
    const result = filterEntriesForPeriod(withActive, 'u1', periodStart, periodEnd);
    expect(result).toHaveLength(1);
  });
});

// ─── Full Employee Payroll ────────────────────────────────

describe('calculateEmployeePayroll', () => {
  const periodStart = new Date('2026-03-23T00:00:00');
  const periodEnd = new Date('2026-03-29T23:59:59');

  test('calculates total hours and gross pay for a week', () => {
    const employee = { id: 'u1', hourly_rate: 18 };
    const entries: TimeEntryLike[] = [
      // Mon-Fri, 8 hours each, 30min break
      ...['23', '24', '25', '26', '27'].map(day => ({
        user_id: 'u1',
        clock_in: `2026-03-${day}T08:00:00`,
        clock_out: `2026-03-${day}T16:30:00`,
        total_break_minutes: 30,
      })),
    ];

    const result = calculateEmployeePayroll(employee, entries, periodStart, periodEnd);
    // Each day: 8.5h - 0.5h break = 8h. 5 days = 40h
    expect(result.totalHours).toBeCloseTo(40, 1);
    expect(result.grossPay).toBeCloseTo(720, 1); // 40 * $18
  });

  test('returns zero for employee with no entries in period', () => {
    const employee = { id: 'u1', hourly_rate: 20 };
    const result = calculateEmployeePayroll(employee, [], periodStart, periodEnd);
    expect(result.totalHours).toBe(0);
    expect(result.grossPay).toBe(0);
  });

  test('handles employee with no hourly rate', () => {
    const employee = { id: 'u1', hourly_rate: 0 };
    const entries: TimeEntryLike[] = [{
      user_id: 'u1',
      clock_in: '2026-03-25T09:00:00',
      clock_out: '2026-03-25T17:00:00',
      total_break_minutes: 0,
    }];

    const result = calculateEmployeePayroll(employee, entries, periodStart, periodEnd);
    expect(result.totalHours).toBeCloseTo(8, 2);
    expect(result.grossPay).toBe(0);
  });
});
