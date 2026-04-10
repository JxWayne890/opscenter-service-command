import React, { useState, useMemo } from 'react';
import PunchPad from '../timeclock/PunchPad';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { Clock, MapPin, CalendarDays, UserCog, Coffee, AlertTriangle, Users, CheckCircle } from 'lucide-react';
import RequestModal from '../requests/RequestModal';
import AvailabilityModal from '../availability/AvailabilityModal';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isManager } from '../../services/permissions';

type AttendanceBadge = { label: string; color: string; detail?: string };

const getAttendanceBadge = (clockIn: string | null, shiftStart: string): AttendanceBadge => {
    const shiftTime = new Date(shiftStart).getTime();
    if (!clockIn) {
        if (Date.now() > shiftTime) return { label: 'Missed', color: 'bg-rose-100 text-rose-700 border-rose-200' };
        return { label: 'Upcoming', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
    const clockTime = new Date(clockIn).getTime();
    const diffMin = Math.round((clockTime - shiftTime) / 60000);
    if (diffMin > 5) return { label: 'Late', color: 'bg-amber-100 text-amber-700 border-amber-200', detail: `${diffMin}m late` };
    if (diffMin < -15) return { label: 'Early', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { label: 'On Time', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};

const TimeClockView = () => {
    usePageTitle('Time Clock');
    const { timeEntries, currentUser, shifts, staff } = useOpsCenter();
    const [isRequestModalOpen, setRequestModalOpen] = useState(false);
    const [isAvailabilityModalOpen, setAvailabilityModalOpen] = useState(false);
    const canManage = isManager(currentUser);

    // specific user history
    const myHistory = timeEntries
        .filter(te => te.user_id === currentUser.id)
        .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime())
        .slice(0, 5);

    // My shift today — for punch pad badge & accountability
    const myShiftToday = useMemo(() => {
        const today = new Date().toDateString();
        return shifts.find(s => s.user_id === currentUser.id && !s.is_open && new Date(s.start_time).toDateString() === today);
    }, [shifts, currentUser.id]);

    const punchBadge = useMemo((): AttendanceBadge | null => {
        if (!myShiftToday) return { label: 'Unscheduled', color: 'bg-slate-100 text-slate-500 border-slate-200' };
        const activeEntry = timeEntries.find(te => te.user_id === currentUser.id && new Date(te.clock_in).toDateString() === new Date().toDateString());
        return getAttendanceBadge(activeEntry?.clock_in || null, myShiftToday.start_time);
    }, [myShiftToday, timeEntries, currentUser.id]);

    // Today's attendance summary (manager only)
    const todayAttendance = useMemo(() => {
        if (!canManage) return [];
        const today = new Date().toDateString();
        const now = Date.now();
        const todayShifts = shifts.filter(s => s.user_id && !s.is_open && new Date(s.start_time).toDateString() === today);
        const todayEntries = timeEntries.filter(e => new Date(e.clock_in).toDateString() === today);

        return todayShifts.map(shift => {
            const member = staff.find(s => s.id === shift.user_id);
            const entry = todayEntries.find(e => e.user_id === shift.user_id);
            const shiftStart = new Date(shift.start_time);
            const time = shiftStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

            let status: 'clocked_in' | 'late' | 'missed' | 'upcoming';
            let lateMin = 0;

            if (shiftStart.getTime() > now) {
                status = 'upcoming';
            } else if (!entry) {
                status = (now - shiftStart.getTime()) > 1800000 ? 'missed' : 'upcoming';
            } else {
                lateMin = Math.floor((new Date(entry.clock_in).getTime() - shiftStart.getTime()) / 60000);
                status = lateMin > 5 ? 'late' : 'clocked_in';
            }

            return { name: member?.full_name || 'Unknown', role: shift.role_type, time, status, lateMin };
        }).sort((a, b) => {
            const order = { missed: 0, late: 1, clocked_in: 2, upcoming: 3 };
            return order[a.status] - order[b.status];
        });
    }, [shifts, timeEntries, staff, canManage]);

    // Match time entries to shifts for attendance badges
    const entryBadges = useMemo(() => {
        const map = new Map<string, AttendanceBadge>();
        for (const entry of myHistory) {
            const entryDate = new Date(entry.clock_in).toDateString();
            const matchingShift = shifts.find(s =>
                s.user_id === entry.user_id && new Date(s.start_time).toDateString() === entryDate
            );
            if (matchingShift) {
                map.set(entry.id, getAttendanceBadge(entry.clock_in, matchingShift.start_time));
            }
        }
        return map;
    }, [myHistory, shifts]);

    // Check for missed shifts today (shift started, no clock-in)
    const missedToday = useMemo(() => {
        const today = new Date().toDateString();
        const now = Date.now();
        return shifts.filter(s => {
            if (s.user_id !== currentUser.id || s.is_open) return false;
            if (new Date(s.start_time).toDateString() !== today) return false;
            if (new Date(s.start_time).getTime() > now) return false;
            const hasEntry = timeEntries.some(te =>
                te.user_id === currentUser.id && new Date(te.clock_in).toDateString() === today
            );
            return !hasEntry;
        });
    }, [shifts, timeEntries, currentUser.id]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <RequestModal isOpen={isRequestModalOpen} onClose={() => setRequestModalOpen(false)} />
            <AvailabilityModal isOpen={isAvailabilityModalOpen} onClose={() => setAvailabilityModalOpen(false)} />

            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Time Clock</h1>

            {/* Today's Attendance Summary — Manager Only */}
            {canManage && todayAttendance.length > 0 && (
                <SectionCard className="!p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-slate-400" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Attendance</h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold">
                            <span className="text-emerald-600">{todayAttendance.filter(a => a.status === 'clocked_in').length} In</span>
                            <span className="text-amber-600">{todayAttendance.filter(a => a.status === 'late').length} Late</span>
                            <span className="text-rose-600">{todayAttendance.filter(a => a.status === 'missed').length} Missed</span>
                            <span className="text-slate-400">{todayAttendance.filter(a => a.status === 'upcoming').length} Upcoming</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {todayAttendance.map((item, i) => {
                            const statusStyles = {
                                clocked_in: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                                late: 'bg-amber-50 border-amber-200 text-amber-700',
                                missed: 'bg-rose-50 border-rose-200 text-rose-700',
                                upcoming: 'bg-slate-50 border-slate-200 text-slate-500',
                            };
                            const statusLabels = {
                                clocked_in: 'Clocked In',
                                late: `Late ${item.lateMin}m`,
                                missed: 'Missed',
                                upcoming: 'Upcoming',
                            };
                            return (
                                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${statusStyles[item.status]}`}>
                                    <div>
                                        <p className="text-xs font-bold">{item.name}</p>
                                        <p className="text-[10px] opacity-70">{item.time} · {item.role}</p>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase">{statusLabels[item.status]}</span>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Punch Pad */}
                <div className="lg:col-span-7 space-y-6">
                    <PunchPad />

                    {/* Shift Attendance Badge */}
                    {punchBadge && (
                        <div className={`flex items-center gap-3 p-3 rounded-2xl border ${punchBadge.color}`}>
                            <CheckCircle size={18} />
                            <div>
                                <span className="text-sm font-bold">{punchBadge.detail || punchBadge.label}</span>
                                {myShiftToday && punchBadge.label === 'Late' && (
                                    <p className="text-xs opacity-80 mt-0.5">
                                        You clocked in after your scheduled start time of {new Date(myShiftToday.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
                                    </p>
                                )}
                                {!myShiftToday && (
                                    <p className="text-xs opacity-80 mt-0.5">No shift scheduled for today.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Missed Shift Alert */}
                    {missedToday.length > 0 && (
                        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-in fade-in duration-300">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-rose-900">Missed Shift{missedToday.length > 1 ? 's' : ''}</p>
                                <p className="text-xs text-rose-600">
                                    {missedToday.map(s => new Date(s.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })).join(', ')} — no clock-in recorded
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions for Staff */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setRequestModalOpen(true)}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:bg-slate-50 transition-all group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                    <CalendarDays size={20} />
                                </div>
                                <span className="font-bold text-slate-700 text-sm">Request Time Off</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setAvailabilityModalOpen(true)}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:bg-slate-50 transition-all group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
                                    <UserCog size={20} />
                                </div>
                                <span className="font-bold text-slate-700 text-sm">Update Availability</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Recent Activity / Mini Timesheet */}
                <div className="lg:col-span-5 space-y-6">
                    <SectionCard>
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Clock size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900">Recent Activity</h3>
                        </div>

                        <div className="space-y-4">
                            {myHistory.length === 0 && (
                                <p className="text-sm text-slate-400">No recent punches.</p>
                            )}
                            {myHistory.map(entry => {
                                const badge = entryBadges.get(entry.id);
                                return (
                                <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-slate-900">
                                                {new Date(entry.clock_in).toLocaleDateString()}
                                            </p>
                                            {badge && (
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${badge.color}`}>
                                                    {badge.detail || badge.label}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                                {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-slate-300">-</span>
                                            {entry.clock_out ? (
                                                <span className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                                    {new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : (
                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end space-y-1">
                                        {/* Individual Break Logs */}
                                        {entry.breaks && entry.breaks.length > 0 ? (
                                            <div className="flex flex-col space-y-1 items-end">
                                                {entry.breaks.map((b, i) => {
                                                    const duration = b.duration || (b.end
                                                        ? Math.floor((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000)
                                                        : Math.floor((Date.now() - new Date(b.start).getTime()) / 60000));

                                                    return (
                                                        <div key={i} className="flex items-center space-x-2">
                                                            <div className="flex items-center space-x-1.5 text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100">
                                                                <span className="font-mono font-medium opacity-80">
                                                                    {new Date(b.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                                    {' - '}
                                                                    {b.end ? new Date(b.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Active'}
                                                                </span>
                                                            </div>
                                                            {duration > 0 && (
                                                                <div className="flex items-center space-x-1 text-xs bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold" title="Lunch Duration">
                                                                    <Coffee size={10} />
                                                                    <span>{duration}m</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            /* Legacy Total Fallback */
                                            !!entry.total_break_minutes && entry.total_break_minutes > 0 && (
                                                <div className="flex items-center space-x-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100" title="Total Lunch Time">
                                                    <Coffee size={12} />
                                                    <span className="text-xs font-bold">{entry.total_break_minutes}m</span>
                                                </div>
                                            )
                                        )}

                                        {entry.location_data && (
                                            <div className="text-slate-300" title="Location Verified">
                                                <MapPin size={14} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

export default TimeClockView;
