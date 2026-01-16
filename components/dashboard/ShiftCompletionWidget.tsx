import React, { useState, useMemo } from 'react';
import { useOpsCenter } from '../../services/store';
import { ArrowUpRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Profile, Shift, TimeEntry } from '../../types';

interface ShiftCompletionWidgetProps {
    className?: string;
}

const ShiftCompletionWidget: React.FC<ShiftCompletionWidgetProps> = ({ className }) => {
    const { shifts, timeEntries, staff, currentUser } = useOpsCenter();
    const [viewMode, setViewMode] = useState<'today' | 'historical'>('today');

    const isAdmin = currentUser.role === 'owner' || currentUser.role === 'manager';

    // --- Logic: Completion Calculation ---
    const getCompletionForShift = (shift: Shift, entries: TimeEntry[]) => {
        // Find matching entry (simplistic matching by user and date approx)
        // In a real app we'd match by precise overlap or shift_id
        const shiftStart = new Date(shift.start_time);
        const shiftEnd = new Date(shift.end_time);
        const shiftDurationMs = shiftEnd.getTime() - shiftStart.getTime();

        // Find entry for this user that overlaps or starts near this shift
        // Logic: Entry start is on same day
        const entry = entries.find(e =>
            e.user_id === shift.user_id &&
            new Date(e.clock_in).toDateString() === shiftStart.toDateString()
        );

        if (!entry) return 0; // Missed shift

        // Calculate worked time
        const clockIn = new Date(entry.clock_in);
        const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date(); // If active, count until now

        let workedMs = clockOut.getTime() - clockIn.getTime();

        // Cap at 100% (if they stayed late, we still say 100% complete for this metric likely)
        // Or maybe >100% is fine. Let's cap at 100 for the visual.
        return Math.min(100, (workedMs / shiftDurationMs) * 100);
    };

    // --- Data Prep ---
    const today = new Date();

    // 1. Team Stats (For Today)
    const todaysShifts = shifts.filter(s =>
        new Date(s.start_time).toDateString() === today.toDateString() &&
        !s.is_open &&
        s.user_id
    );

    const teamCompletionData = useMemo(() => {
        return todaysShifts.map(shift => {
            const user = staff.find(u => u.id === shift.user_id);
            const pct = getCompletionForShift(shift, timeEntries);
            return {
                user,
                pct,
                status: pct >= 95 ? 'complete' : pct > 0 ? 'in-progress' : 'pending'
            };
        });
    }, [todaysShifts, timeEntries, staff]);

    const teamAverage = teamCompletionData.length > 0
        ? Math.round(teamCompletionData.reduce((acc, curr) => acc + curr.pct, 0) / teamCompletionData.length)
        : 100;

    // 2. Personal Stats (Historical - Last 14 days)
    const getHistoricalData = (userId: string) => {
        return Array.from({ length: 14 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));

            const dayShifts = shifts.filter(s =>
                s.user_id === userId &&
                new Date(s.start_time).toDateString() === d.toDateString()
            );

            if (dayShifts.length === 0) return { date: d, status: 'off' };

            // Take average of shifts that day (usually 1)
            const pcts = dayShifts.map(s => getCompletionForShift(s, timeEntries));
            const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;

            return {
                date: d,
                pct: avg,
                status: avg >= 95 ? 'perfect' : avg > 80 ? 'good' : avg > 0 ? 'partial' : 'missed'
            };
        });
    };

    const myHistorical = getHistoricalData(currentUser.id);
    const myTodayShift = todaysShifts.find(s => s.user_id === currentUser.id);
    const myTodayPct = myTodayShift ? getCompletionForShift(myTodayShift, timeEntries) : 0;

    // --- Render Helpers ---
    const getCellColor = (status: string, pct?: number) => {
        if (status === 'off') return 'bg-slate-100';
        if (status === 'missed') return 'bg-rose-200';
        if (status === 'perfect' || (pct || 0) >= 95) return 'bg-indigo-600'; // Dark Blue/Indigo based on image
        if (status === 'good' || (pct || 0) >= 50) return 'bg-indigo-400';
        if (status === 'partial' || (pct || 0) > 0) return 'bg-indigo-200';
        return 'bg-slate-200'; // Pending/Future
    };

    return (
        <div className={`flex flex-col h-full justify-between ${className}`}>
            <div>
                <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <ArrowUpRight size={16} className="text-orange-600" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-slate-500 block">Shift Completion</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {isAdmin && viewMode === 'today' ? 'Team Daily Average' : 'Personal Performance'}
                            </span>
                        </div>
                    </div>
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                        {isAdmin && viewMode === 'today' ? `${teamAverage}%` : `${Math.round(myTodayPct)}%`}
                    </span>
                </div>

                <div className="flex space-x-6 mt-6 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    {isAdmin && (
                        <button
                            onClick={() => setViewMode('today')}
                            className={`pb-2 transition-colors ${viewMode === 'today' ? 'text-slate-900 border-b-2 border-indigo-500 -mb-px' : 'hover:text-slate-600'}`}
                        >
                            Today (Team)
                        </button>
                    )}
                    <button
                        onClick={() => setViewMode('historical')}
                        className={`pb-2 transition-colors ${viewMode === 'historical' ? 'text-slate-900 border-b-2 border-indigo-500 -mb-px' : 'hover:text-slate-600'}`}
                    >
                        Historical
                    </button>
                </div>

                {/* --- GRID VISUALIZATION --- */}

                {/* Mode A: Team Today (Admin Only) */}
                {isAdmin && viewMode === 'today' && (
                    <div className="grid grid-cols-6 gap-2">
                        {teamCompletionData.length === 0 && <div className="col-span-6 text-xs text-slate-400 italic py-4">No shifts scheduled today.</div>}
                        {teamCompletionData.map((item, i) => (
                            <div key={i} className="group relative">
                                <div
                                    className={`h-10 rounded-lg ${getCellColor('', item.pct)} transition-transform hover:scale-105 cursor-help shadow-sm border border-black/5`}
                                />
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                    {item.user?.full_name}: {Math.round(item.pct)}%
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Mode B: Historical (Personal or Team Avg - let's do Personal for now as requested for "staff view" parity logic) */}
                {viewMode === 'historical' && (
                    <div className="grid grid-cols-7 gap-2">
                        {/* Week days header? maybe purely visual like github grid */}
                        {myHistorical.map((day, i) => (
                            <div key={i} className="group relative">
                                <div
                                    className={`h-10 rounded-lg ${getCellColor(day.status)} transition-transform hover:scale-105 cursor-help shadow-sm border border-black/5`}
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                    {day.date.toLocaleDateString()}: {typeof day.pct === 'number' ? Math.round(day.pct) : 'Off'}%
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                {teamAverage === 100 || myTodayPct === 100 ? (
                    <CheckCircle size={16} className="text-emerald-500" />
                ) : (
                    <AlertCircle size={16} className="text-amber-500" />
                )}
                <p className="text-xs font-medium text-slate-600">
                    {isAdmin && viewMode === 'today'
                        ? (teamAverage < 100 ? `${100 - teamAverage}% deviation from schedule.` : 'Perfect attendance today.')
                        : (myTodayPct < 100 ? 'You are currently on shift.' : 'Shift completed successfully.')}
                </p>
            </div>
        </div>
    );
};

export default ShiftCompletionWidget;
