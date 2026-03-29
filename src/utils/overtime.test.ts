import { expect, test, describe } from 'vitest';
import { getOvertimeStatus, getOvertimeStatuses, getCurrentWeekStart } from './overtime';

const weekStart = new Date(2026, 2, 23); // Monday Mar 23

function makeEntry(userId: string, hoursWorked: number, dayOffset: number = 0) {
  const clockIn = new Date(weekStart);
  clockIn.setDate(clockIn.getDate() + dayOffset);
  clockIn.setHours(9, 0, 0, 0);
  const clockOut = new Date(clockIn);
  clockOut.setHours(9 + hoursWorked, 0, 0, 0);
  return {
    user_id: userId,
    clock_in: clockIn.toISOString(),
    clock_out: clockOut.toISOString(),
    total_break_minutes: 0,
  };
}

describe('getOvertimeStatus', () => {
  test('normal hours — no flags', () => {
    const entries = [
      makeEntry('u1', 8, 0),
      makeEntry('u1', 8, 1),
      makeEntry('u1', 8, 2), // 24h total
    ];
    const status = getOvertimeStatus('u1', entries, weekStart);
    expect(status.totalHoursThisWeek).toBeCloseTo(24, 1);
    expect(status.isApproaching).toBe(false);
    expect(status.isOvertime).toBe(false);
    expect(status.overtimeHours).toBe(0);
  });

  test('approaching overtime at 36h', () => {
    const entries = Array.from({ length: 4 }, (_, i) => makeEntry('u1', 9, i)); // 36h
    const status = getOvertimeStatus('u1', entries, weekStart);
    expect(status.totalHoursThisWeek).toBeCloseTo(36, 1);
    expect(status.isApproaching).toBe(true);
    expect(status.isOvertime).toBe(false);
  });

  test('overtime at 45h', () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeEntry('u1', 9, i)); // 45h
    const status = getOvertimeStatus('u1', entries, weekStart);
    expect(status.totalHoursThisWeek).toBeCloseTo(45, 1);
    expect(status.isOvertime).toBe(true);
    expect(status.overtimeHours).toBeCloseTo(5, 1);
  });

  test('ignores entries from other users', () => {
    const entries = [makeEntry('u1', 8, 0), makeEntry('u2', 40, 0)];
    const status = getOvertimeStatus('u1', entries, weekStart);
    expect(status.totalHoursThisWeek).toBeCloseTo(8, 1);
  });

  test('returns 0 for user with no entries', () => {
    const status = getOvertimeStatus('u1', [], weekStart);
    expect(status.totalHoursThisWeek).toBe(0);
    expect(status.isOvertime).toBe(false);
    expect(status.isApproaching).toBe(false);
  });

  test('exactly 40h is overtime', () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeEntry('u1', 8, i));
    const status = getOvertimeStatus('u1', entries, weekStart);
    expect(status.totalHoursThisWeek).toBeCloseTo(40, 1);
    expect(status.isOvertime).toBe(true);
    expect(status.overtimeHours).toBeCloseTo(0, 1);
  });

  test('exactly 35h is approaching', () => {
    const entries = Array.from({ length: 5 }, (_, i) => makeEntry('u1', 7, i));
    const status = getOvertimeStatus('u1', entries, weekStart);
    expect(status.totalHoursThisWeek).toBeCloseTo(35, 1);
    expect(status.isApproaching).toBe(true);
    expect(status.isOvertime).toBe(false);
  });
});

describe('getOvertimeStatuses', () => {
  test('returns statuses for multiple users', () => {
    const entries = [
      ...Array.from({ length: 5 }, (_, i) => makeEntry('u1', 9, i)),  // 45h
      ...Array.from({ length: 3 }, (_, i) => makeEntry('u2', 8, i)),  // 24h
    ];
    const statuses = getOvertimeStatuses(['u1', 'u2'], entries, weekStart);
    expect(statuses).toHaveLength(2);
    expect(statuses[0].isOvertime).toBe(true);
    expect(statuses[1].isOvertime).toBe(false);
  });
});

describe('getCurrentWeekStart', () => {
  test('returns a Monday at midnight', () => {
    const start = getCurrentWeekStart();
    expect(start.getDay()).toBe(1); // Monday
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });
});
