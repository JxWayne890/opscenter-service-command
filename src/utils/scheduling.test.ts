import { expect, test, describe } from 'vitest';
import { generateFixedShifts, generateRotatingShifts, generateShiftSlots } from './scheduling';

describe('generateFixedShifts', () => {
  // Use a known Monday as start date: 2026-03-23
  const monday = new Date(2026, 2, 23);

  test('generates M-F shifts for 1 week (default days)', () => {
    const slots = generateFixedShifts({ type: 'fixed' }, monday, 1);
    // 1 week = 7 days, M-F = 5 workdays + the start day counts
    // From Mon Mar 23 to Mon Mar 30 inclusive => Mon-Fri (23-27) + Mon 30 = 6
    expect(slots.length).toBe(6);
  });

  test('respects custom work days', () => {
    const slots = generateFixedShifts({
      type: 'fixed',
      fixed_days: [2, 4], // Tue, Thu only
    }, monday, 1);
    // Tue 24, Thu 26, Tue 31... wait, 1 week = 7 days from Mar 23
    // Mar 24 (Tue), Mar 26 (Thu), Mar 31 (Tue) if <= Mar 30
    // Mar 23 + 7 = Mar 30 (Mon). So Tue 24, Thu 26 = 2 slots
    expect(slots.length).toBe(2);
  });

  test('uses default 9:00-17:00 times', () => {
    const slots = generateFixedShifts({ type: 'fixed' }, monday, 1);
    expect(slots[0].startTime.getHours()).toBe(9);
    expect(slots[0].startTime.getMinutes()).toBe(0);
    expect(slots[0].endTime.getHours()).toBe(17);
    expect(slots[0].endTime.getMinutes()).toBe(0);
  });

  test('uses custom shift times', () => {
    const slots = generateFixedShifts({
      type: 'fixed',
      shift_start_time: '06:30',
      shift_end_time: '14:30',
    }, monday, 1);
    expect(slots[0].startTime.getHours()).toBe(6);
    expect(slots[0].startTime.getMinutes()).toBe(30);
    expect(slots[0].endTime.getHours()).toBe(14);
    expect(slots[0].endTime.getMinutes()).toBe(30);
  });

  test('generates 4 weeks by default', () => {
    const slots = generateFixedShifts({ type: 'fixed' }, monday);
    // 4 weeks M-F = 20 weekdays + partial overlap at end
    expect(slots.length).toBeGreaterThanOrEqual(20);
  });

  test('returns empty for no work days', () => {
    const slots = generateFixedShifts({ type: 'fixed', fixed_days: [] }, monday, 1);
    expect(slots).toHaveLength(0);
  });

  test('handles weekend-only schedule', () => {
    const slots = generateFixedShifts({
      type: 'fixed',
      fixed_days: [0, 6], // Sun, Sat
    }, monday, 1);
    // From Mon Mar 23 to Mon Mar 30: Sat 28, Sun 29 = 2
    expect(slots.length).toBe(2);
  });
});

describe('generateRotatingShifts', () => {
  // Anchor on Monday Mar 23, 2026
  const monday = new Date(2026, 2, 23);

  test('4-on/4-off generates correct pattern', () => {
    const slots = generateRotatingShifts({
      type: 'rotating',
      days_on: 4,
      days_off: 4,
      anchor_date: monday,
    }, monday, 1);
    // Week 1 (7 days): ON Mon-Thu (4), OFF Fri-Mon = 4 shifts
    // Plus Mon Mar 30 is day 7, position 7%8=7 >= 4, so OFF
    expect(slots.length).toBe(4);
  });

  test('2-on/2-off alternates correctly', () => {
    const slots = generateRotatingShifts({
      type: 'rotating',
      days_on: 2,
      days_off: 2,
      anchor_date: monday,
    }, monday, 1);
    // Cycle = 4 days. In 8 days (Mon 23 - Mon 30):
    // Day 0,1 ON, 2,3 OFF, 4,5 ON, 6,7 OFF = 4 shifts
    expect(slots.length).toBe(4);
  });

  test('uses custom times', () => {
    const slots = generateRotatingShifts({
      type: 'rotating',
      days_on: 1,
      days_off: 1,
      anchor_date: monday,
      shift_start_time: '07:00',
      shift_end_time: '19:00',
    }, monday, 1);
    expect(slots[0].startTime.getHours()).toBe(7);
    expect(slots[0].endTime.getHours()).toBe(19);
  });

  test('handles anchor date before start date', () => {
    // Anchor is 2 days before start, so we start mid-cycle
    const anchor = new Date(2026, 2, 21); // Saturday
    const slots = generateRotatingShifts({
      type: 'rotating',
      days_on: 3,
      days_off: 3,
      anchor_date: anchor,
    }, monday, 1);
    // Anchor Sat Mar 21. Mon Mar 23 = day 2 in cycle (position 2 < 3 = ON)
    // Day 2 ON, Day 3 OFF, Day 4 OFF, Day 5 OFF, Day 6 ON, Day 7 ON, Day 8 ON
    // ON days: Mon 23, Sat 28, Sun 29, Mon 30 = 4 days? Let me re-check...
    // Position: Mon=2(ON), Tue=3(OFF), Wed=4(OFF), Thu=5(OFF), Fri=0(ON), Sat=1(ON), Sun=2(ON), Mon=3(OFF)
    // ON: Mon 23, Fri 27, Sat 28, Sun 29 = 4
    expect(slots.length).toBe(4);
  });
});

describe('generateShiftSlots', () => {
  const monday = new Date(2026, 2, 23);

  test('dispatches to fixed generator', () => {
    const slots = generateShiftSlots({ type: 'fixed', fixed_days: [1] }, monday, 1);
    // Only Mondays in 1 week from Mon: Mon 23, Mon 30 = 2
    expect(slots.length).toBe(2);
  });

  test('dispatches to rotating generator', () => {
    const slots = generateShiftSlots({
      type: 'rotating',
      days_on: 1,
      days_off: 6,
      anchor_date: monday,
    }, monday, 1);
    // 1 day on per 7-day cycle: Mon 23 and Mon 30 (inclusive range) = 2
    expect(slots.length).toBe(2);
  });
});
