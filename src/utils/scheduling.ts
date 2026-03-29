/**
 * Pure scheduling logic extracted for testability.
 * These functions generate shift date/time ranges without side effects.
 */

export interface ShiftSlot {
  startTime: Date;
  endTime: Date;
}

export interface FixedScheduleConfig {
  type: 'fixed';
  fixed_days?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  shift_start_time?: string; // "HH:MM"
  shift_end_time?: string;   // "HH:MM"
}

export interface RotatingScheduleConfig {
  type: 'rotating';
  days_on: number;
  days_off: number;
  anchor_date?: string | Date;
  shift_start_time?: string;
  shift_end_time?: string;
}

export type ScheduleConfig = FixedScheduleConfig | RotatingScheduleConfig;

function parseTime(timeStr: string | undefined, defaultHour: number, defaultMin: number): [number, number] {
  if (!timeStr) return [defaultHour, defaultMin];
  const [h, m] = timeStr.split(':').map(Number);
  return [h || defaultHour, m || defaultMin];
}

/**
 * Generates shift time slots for a fixed weekly schedule.
 */
export function generateFixedShifts(
  config: FixedScheduleConfig,
  startDate: Date,
  weeksAhead: number = 4
): ShiftSlot[] {
  const [startHour, startMin] = parseTime(config.shift_start_time, 9, 0);
  const [endHour, endMin] = parseTime(config.shift_end_time, 17, 0);
  const workDays = config.fixed_days || [1, 2, 3, 4, 5];
  const slots: ShiftSlot[] = [];

  const from = new Date(startDate);
  from.setHours(0, 0, 0, 0);
  const until = new Date(from);
  until.setDate(until.getDate() + weeksAhead * 7);

  const current = new Date(from);
  while (current <= until) {
    if (workDays.includes(current.getDay())) {
      const shiftStart = new Date(current);
      shiftStart.setHours(startHour, startMin, 0, 0);
      const shiftEnd = new Date(current);
      shiftEnd.setHours(endHour, endMin, 0, 0);
      slots.push({ startTime: new Date(shiftStart), endTime: new Date(shiftEnd) });
    }
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Generates shift time slots for a rotating (N-on / N-off) schedule.
 */
export function generateRotatingShifts(
  config: RotatingScheduleConfig,
  startDate: Date,
  weeksAhead: number = 4
): ShiftSlot[] {
  const [startHour, startMin] = parseTime(config.shift_start_time, 9, 0);
  const [endHour, endMin] = parseTime(config.shift_end_time, 17, 0);
  const { days_on, days_off } = config;
  const cycleLength = days_on + days_off;
  const slots: ShiftSlot[] = [];

  const anchorStart = new Date(config.anchor_date || startDate);
  anchorStart.setHours(0, 0, 0, 0);

  const from = new Date(startDate);
  from.setHours(0, 0, 0, 0);
  const until = new Date(from);
  until.setDate(until.getDate() + weeksAhead * 7);

  const current = new Date(from);
  while (current <= until) {
    const daysSinceAnchor = Math.floor(
      (current.getTime() - anchorStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const positionInCycle = ((daysSinceAnchor % cycleLength) + cycleLength) % cycleLength;
    const isWorkDay = positionInCycle < days_on;

    if (isWorkDay) {
      const shiftStart = new Date(current);
      shiftStart.setHours(startHour, startMin, 0, 0);
      const shiftEnd = new Date(current);
      shiftEnd.setHours(endHour, endMin, 0, 0);
      slots.push({ startTime: new Date(shiftStart), endTime: new Date(shiftEnd) });
    }
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Generates shift slots from any schedule config.
 */
export function generateShiftSlots(
  config: ScheduleConfig,
  startDate: Date,
  weeksAhead: number = 4
): ShiftSlot[] {
  if (config.type === 'fixed') {
    return generateFixedShifts(config, startDate, weeksAhead);
  } else if (config.type === 'rotating') {
    return generateRotatingShifts(config, startDate, weeksAhead);
  }
  return [];
}
