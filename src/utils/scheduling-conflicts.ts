import { Shift, ScheduleConflict, TimeOffRequest, Availability } from '../types';

/**
 * Detect scheduling conflicts for a proposed shift assignment.
 */
export function detectConflicts(
  proposedShift: { user_id: string; start_time: string; end_time: string; id?: string },
  existingShifts: Shift[],
  timeOffRequests: TimeOffRequest[],
  weeklyHoursLimit: number = 40
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const start = new Date(proposedShift.start_time);
  const end = new Date(proposedShift.end_time);

  // 1. Double-booking check
  for (const shift of existingShifts) {
    if (shift.user_id !== proposedShift.user_id) continue;
    if (proposedShift.id && shift.id === proposedShift.id) continue;
    if (shift.status === 'completed' || shift.status === 'rejected') continue;

    const sStart = new Date(shift.start_time);
    const sEnd = new Date(shift.end_time);

    if (start < sEnd && end > sStart) {
      conflicts.push({
        type: 'double_booking',
        shift_id: shift.id,
        user_id: proposedShift.user_id,
        message: `Overlaps with existing shift (${sStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${sEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`,
        severity: 'error',
      });
    }
  }

  // 2. Time-off conflict
  for (const req of timeOffRequests) {
    if (req.user_id !== proposedShift.user_id) continue;
    if (req.status !== 'pending' && req.status !== 'approved') continue;

    const reqStart = new Date(req.start_date);
    const reqEnd = new Date(req.end_date);
    reqEnd.setHours(23, 59, 59);

    if (start <= reqEnd && end >= reqStart) {
      conflicts.push({
        type: 'time_off',
        shift_id: proposedShift.id || '',
        user_id: proposedShift.user_id,
        message: `Has ${req.status} time off (${req.type}) from ${req.start_date} to ${req.end_date}`,
        severity: req.status === 'approved' ? 'error' : 'warning',
      });
    }
  }

  // 3. Weekly overtime check
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let weekHours = 0;
  for (const shift of existingShifts) {
    if (shift.user_id !== proposedShift.user_id) continue;
    if (proposedShift.id && shift.id === proposedShift.id) continue;
    const sStart = new Date(shift.start_time);
    const sEnd = new Date(shift.end_time);
    if (sStart >= weekStart && sStart < weekEnd) {
      weekHours += (sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60);
    }
  }

  const proposedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (weekHours + proposedHours > weeklyHoursLimit) {
    conflicts.push({
      type: 'overtime',
      shift_id: proposedShift.id || '',
      user_id: proposedShift.user_id,
      message: `Would put employee at ${(weekHours + proposedHours).toFixed(1)}h this week (limit: ${weeklyHoursLimit}h)`,
      severity: 'warning',
    });
  }

  return conflicts;
}

/**
 * Run conflict detection across all shifts for publish-time summary.
 */
export function detectPublishConflicts(
  shifts: Shift[],
  timeOffRequests: TimeOffRequest[],
  weeklyHoursLimit: number = 40
): ScheduleConflict[] {
  const allConflicts: ScheduleConflict[] = [];
  const seen = new Set<string>();

  for (const shift of shifts) {
    if (!shift.user_id || shift.is_open) continue;
    if (shift.status === 'completed' || shift.status === 'rejected') continue;

    const conflicts = detectConflicts(
      { user_id: shift.user_id, start_time: shift.start_time, end_time: shift.end_time, id: shift.id },
      shifts,
      timeOffRequests,
      weeklyHoursLimit
    );

    for (const c of conflicts) {
      const key = `${c.type}-${c.user_id}-${c.shift_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        allConflicts.push(c);
      }
    }
  }

  return allConflicts;
}
