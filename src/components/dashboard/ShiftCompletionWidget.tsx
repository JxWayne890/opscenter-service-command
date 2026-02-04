import React, { useState, useMemo } from 'react';
import { useOpsCenter } from '../../services/store';
import { ArrowUpRight, CheckCircle, AlertCircle, TrendingUp, Clock, Calendar } from 'lucide-react';
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
        const shiftStart = new Date(shift.start_time);
        const shiftEnd = new Date(shift.end_time);
        const shiftDurationMs = shiftEnd.getTime() - shiftStart.getTime();

        const entry = entries.find(e =>
            e.user_id === shift.user_id &&
            new Date(e.clock_in).toDateString() === shiftStart.toDateString()
        );

        if (!entry) return 0; // Missed shift

        const clockIn = new Date(entry.clock_in);
        const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();

        let workedMs = clockOut.getTime() - clockIn.getTime();
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
        if (status === 'off') return 'bg-slate-100/50';
        if (status === 'missed') return 'bg-rose-200';
        if (status === 'perfect' || (pct || 0) >= 95) return 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/20';
        if (status === 'good' || (pct || 0) >= 50) return 'bg-indigo-400';
        if (status === 'partial' || (pct || 0) > 0) return 'bg-indigo-300';
        return 'bg-slate-200'; // Pending/Future
    };

    return (
        <div className={`flex flex-col h-full justify-between ${className}`}>
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <TrendingUp size={20} className="text-white" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-slate-500 block">Performance</span>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                {isAdmin && viewMode === 'today' ? 'Team Efficiency' : 'My Reliability'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-4xl font-display font-bold tracking-tight text-slate-900 leading-none">
                            {isAdmin && viewMode === 'today' ? `${teamAverage}%` : `${Math.round(myTodayPct)}%`}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                            +2.4% vs last week
                        </span>
                    </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-1 mb-6 flex">
                    {isAdmin && (
                        <button
                            onClick={() => setViewMode('today')}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'today'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Team Today
                        </button>
                    )}
                    <button
                        onClick={() => setViewMode('historical')}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'historical'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        History
                    </button>
                </div>

                {/* --- GRID VISUALIZATION --- */}
                <div className="min-h-[100px]">
                    {isAdmin && viewMode === 'today' && (
                        <div className="grid grid-cols-6 gap-3">
                            {teamCompletionData.length === 0 && <div className="col-span-6 text-xs text-slate-400 italic py-4 text-center">No shifts scheduled today.</div>}
                            {teamCompletionData.map((item, i) => (
                                <div key={i} className="group relative">
                                    <div
                                        className={`h-12 rounded-xl ${getCellColor('', item.pct)} transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-help border border-white/10`}
                                    />
                                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl transition-all z-20 whitespace-nowrap">
                                        {item.user?.full_name}: {Math.round(item.pct)}%
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === 'historical' && (
                        <div className="grid grid-cols-7 gap-3">
                            {myHistorical.map((day, i) => (
                                <div key={i} className="group relative">
                                    <div
                                        className={`h-12 rounded-xl ${getCellColor(day.status)} transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-help border border-white/10`}
                                    />
                                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl transition-all z-20 whitespace-nowrap">
                                        {day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        <div className="text-[10px] opacity-80 font-normal">
                                            {typeof day.pct === 'number' ? `${Math.round(day.pct)}% Complete` : 'Off Duty'}
                                        </div>
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100/50 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
                    <Clock size={14} />
                    <span>Last updated just now</span>
                </div>
                {teamAverage < 100 && (
                    <div className="flex items-center text-xs font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full">
                        <AlertCircle size={12} className="mr-1.5" />
                        Action Required
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShiftCompletionWidget;
