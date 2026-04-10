import { Shift, TimeEntry, Profile, Client, StaffingRatio } from '../types';
import { TimeMath } from '../utils/timeMath';

// ─── Alert Types ─────────────────────────────────

export type AlertType = 'understaffed' | 'open_shift' | 'late_clockin' | 'missed_shift' | 'medical_flag' | 'overtime_risk';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface OpsAlert {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    timestamp: string;
    linkedEntityId?: string;
}

// ─── Helpers ─────────────────────────────────────

function todayRange(now: Date): { start: Date; end: Date } {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { start, end };
}

function weekRange(now: Date): { start: Date; end: Date } {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { start, end };
}

function sameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Main Builder ────────────────────────────────

export interface AlertContext {
    shifts: Shift[];
    timeEntries: TimeEntry[];
    staff: Profile[];
    clients: Client[];
    ratios: StaffingRatio[];
}

export function buildAlerts(ctx: AlertContext): OpsAlert[] {
    const now = new Date();
    const alerts: OpsAlert[] = [];
    const { start: todayStart, end: todayEnd } = todayRange(now);

    const todayShifts = ctx.shifts.filter(s => {
        const t = new Date(s.start_time);
        return t >= todayStart && t < todayEnd;
    });

    const todayEntries = ctx.timeEntries.filter(e => {
        const t = new Date(e.clock_in);
        return t >= todayStart && t < todayEnd;
    });

    // ─── Understaffed ────────────────────────────
    if (ctx.ratios.length > 0) {
        const activeOnDuty = ctx.timeEntries.filter(e => !e.clock_out || e.status === 'active').length;
        const totalDogsNeeded = ctx.ratios.reduce((sum, r) => sum + r.dog_count, 0);
        const totalStaffNeeded = ctx.ratios.reduce((sum, r) => sum + r.staff_count, 0);
        const activePets = ctx.clients.flatMap(c => c.pets || []).filter(p => p.status === 'active').length;

        if (activeOnDuty < totalStaffNeeded && activePets > 0) {
            alerts.push({
                id: 'understaffed-today',
                type: 'understaffed',
                severity: 'critical',
                title: 'Understaffed',
                message: `${activeOnDuty} staff on duty but ${totalStaffNeeded} needed for current ratio (${totalStaffNeeded}:${totalDogsNeeded}).`,
                timestamp: now.toISOString(),
            });
        }
    }

    // ─── Open Shifts ─────────────────────────────
    const openToday = todayShifts.filter(s => s.is_open);
    for (const shift of openToday) {
        const shiftStart = new Date(shift.start_time);
        const hoursUntil = (shiftStart.getTime() - now.getTime()) / 3600000;
        const severity: AlertSeverity = hoursUntil <= 2 ? 'critical' : 'warning';
        const time = shiftStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        alerts.push({
            id: `open-shift-${shift.id}`,
            type: 'open_shift',
            severity,
            title: `Open ${shift.role_type} Shift`,
            message: severity === 'critical'
                ? `${shift.role_type} shift at ${time} starts within 2 hours — still unfilled.`
                : `${shift.role_type} shift at ${time} is still open.`,
            timestamp: now.toISOString(),
            linkedEntityId: shift.id,
        });
    }

    // ─── Late Clock-ins & Missed Shifts ──────────
    const staffedToday = todayShifts.filter(s => s.user_id && !s.is_open);
    for (const shift of staffedToday) {
        const shiftStart = new Date(shift.start_time);
        if (shiftStart > now) continue; // shift hasn't started yet

        const matchingEntry = todayEntries.find(e => e.user_id === shift.user_id);
        const staffName = ctx.staff.find(s => s.id === shift.user_id)?.full_name || 'Unknown';
        const time = shiftStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const minutesSinceStart = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);

        if (!matchingEntry) {
            // No clock-in at all
            if (minutesSinceStart > 30) {
                alerts.push({
                    id: `missed-${shift.id}`,
                    type: 'missed_shift',
                    severity: 'critical',
                    title: `Missed Shift — ${staffName}`,
                    message: `${staffName} was scheduled at ${time} and has not clocked in (${minutesSinceStart}min ago).`,
                    timestamp: now.toISOString(),
                    linkedEntityId: shift.user_id,
                });
            } else if (minutesSinceStart > 5) {
                alerts.push({
                    id: `late-noclk-${shift.id}`,
                    type: 'late_clockin',
                    severity: 'warning',
                    title: `No Clock-in — ${staffName}`,
                    message: `${staffName} was due at ${time} (${minutesSinceStart}min ago) — no clock-in yet.`,
                    timestamp: now.toISOString(),
                    linkedEntityId: shift.user_id,
                });
            }
        } else {
            // Has clock-in — check if late
            const clockInTime = new Date(matchingEntry.clock_in);
            const lateMin = Math.floor((clockInTime.getTime() - shiftStart.getTime()) / 60000);
            if (lateMin > 5) {
                alerts.push({
                    id: `late-${shift.id}`,
                    type: 'late_clockin',
                    severity: 'warning',
                    title: `Late Clock-in — ${staffName}`,
                    message: `${staffName} clocked in ${lateMin}min late (shift started ${time}).`,
                    timestamp: now.toISOString(),
                    linkedEntityId: shift.user_id,
                });
            }
        }
    }

    // ─── Medical Flags ───────────────────────────
    for (const client of ctx.clients) {
        for (const pet of client.pets || []) {
            if (pet.medical_alerts && pet.medical_alerts.length > 0) {
                alerts.push({
                    id: `medical-${pet.id}`,
                    type: 'medical_flag',
                    severity: 'info',
                    title: `Medical Alert — ${pet.name}`,
                    message: `${pet.name} (${client.full_name}): ${pet.medical_alerts.join(', ')}`,
                    timestamp: now.toISOString(),
                    linkedEntityId: pet.client_id,
                });
            }
        }
    }

    // ─── Overtime Risk ───────────────────────────
    const { start: weekStart, end: weekEnd } = weekRange(now);
    const weekEntries = ctx.timeEntries.filter(e => {
        const t = new Date(e.clock_in);
        return t >= weekStart && t < weekEnd;
    });

    const hoursByUser: Record<string, number> = {};
    for (const entry of weekEntries) {
        const ms = TimeMath.calculateNetDurationMS(entry.clock_in, entry.clock_out || now, entry.total_break_minutes);
        hoursByUser[entry.user_id] = (hoursByUser[entry.user_id] || 0) + TimeMath.msToDecimalHours(ms);
    }

    for (const [userId, hours] of Object.entries(hoursByUser)) {
        const staffName = ctx.staff.find(s => s.id === userId)?.full_name || 'Unknown';
        if (hours >= 40) {
            alerts.push({
                id: `ot-critical-${userId}`,
                type: 'overtime_risk',
                severity: 'critical',
                title: `Overtime — ${staffName}`,
                message: `${staffName} has worked ${TimeMath.formatDecimalHours(hours)} this week (${TimeMath.formatDecimalHours(hours - 40)} over).`,
                timestamp: now.toISOString(),
                linkedEntityId: userId,
            });
        } else if (hours >= 35) {
            alerts.push({
                id: `ot-warn-${userId}`,
                type: 'overtime_risk',
                severity: 'warning',
                title: `Approaching Overtime — ${staffName}`,
                message: `${staffName} has ${TimeMath.formatDecimalHours(hours)} this week — ${TimeMath.formatDecimalHours(40 - hours)} until overtime.`,
                timestamp: now.toISOString(),
                linkedEntityId: userId,
            });
        }
    }

    // Sort: critical first, then warning, then info; within same severity, by time
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts;
}
