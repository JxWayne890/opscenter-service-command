import React from 'react';
import { X, Clock, Coffee, LogIn, LogOut, Timer, Pause, Play } from 'lucide-react';
import { Profile, TimeEntry } from '../../types';
import { useOpsCenter } from '../../services/store';
import { TimeMath } from '../../utils/timeMath';

interface LiveRosterDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string | null;
}

const LiveRosterDetailModal: React.FC<LiveRosterDetailModalProps> = ({ isOpen, onClose, staffId }) => {
    const { staff, timeEntries } = useOpsCenter();

    const staffMember = staff.find(s => s.id === staffId);

    // Get today's time entries for this staff member
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todaysEntries = timeEntries.filter(te => {
        if (te.user_id !== staffId) return false;
        const clockIn = new Date(te.clock_in);
        return clockIn >= today && clockIn <= todayEnd;
    }).sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());

    // Calculate totals
    const calculateDurationMS = (entry: TimeEntry) => {
        return TimeMath.calculateNetDurationMS(
            entry.clock_in,
            entry.clock_out || new Date(),
            entry.total_break_minutes
        );
    };

    const totalHours = TimeMath.msToDecimalHours(todaysEntries.reduce((sum, e) => sum + calculateDurationMS(e), 0));
    const totalBreakMins = todaysEntries.reduce((sum, e) => sum + (e.total_break_minutes || 0), 0);

    const activeEntry = todaysEntries.find(e => e.status === 'active' || !e.clock_out);

    // Check if currently on break/lunch
    const isOnBreak = activeEntry?.break_start && !activeEntry?.break_end;

    // Calculate current break duration if on break
    const getCurrentBreakDuration = () => {
        if (!isOnBreak || !activeEntry?.break_start) return 0;
        const breakStart = new Date(activeEntry.break_start).getTime();
        return Math.floor((Date.now() - breakStart) / TimeMath.MS_PER_MINUTE);
    };

    if (!isOpen || !staffMember) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl -ml-6 -mb-6" />

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <img
                                    src={staffMember.avatar_url || `https://ui-avatars.com/api/?name=${staffMember.full_name}&background=random`}
                                    className="w-14 h-14 rounded-2xl ring-4 ring-white/10 shadow-xl object-cover"
                                />
                                {activeEntry && !isOnBreak && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                                )}
                                {isOnBreak && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-white rounded-full animate-pulse" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{staffMember.full_name}</h2>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                                    {staffMember.role} • Today's Activity
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-100">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Worked</p>
                        <p className="text-lg font-black text-slate-900">{TimeMath.formatDecimalHours(totalHours)}</p>
                    </div>
                    <div className="text-center border-x border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Breaks</p>
                        <p className="text-lg font-black text-amber-600">{TimeMath.formatMinutes(totalBreakMins)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                        <p className={`text-lg font-black ${isOnBreak ? 'text-amber-600' : activeEntry ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isOnBreak ? 'On Break' : activeEntry ? 'Active' : 'Off'}
                        </p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="p-6 max-h-[300px] overflow-y-auto">
                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Activity Timeline</h3>

                    {todaysEntries.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Clock size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">No activity recorded today</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {todaysEntries.map((entry, idx) => (
                                <div key={entry.id} className="relative">
                                    {/* Connector Line */}
                                    {idx < todaysEntries.length - 1 && (
                                        <div className="absolute left-[19px] top-10 w-0.5 h-full bg-slate-200" />
                                    )}

                                    {/* Entry Card */}
                                    <div className="flex gap-4">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${entry.status === 'active' || !entry.clock_out
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            <LogIn size={18} />
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold text-slate-900">Clock In</span>
                                                <span className="text-xs font-medium text-slate-500">
                                                    {new Date(entry.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            {/* Break Info - Show break history from breaks array */}
                                            {entry.breaks && entry.breaks.length > 0 && entry.breaks.map((brk, bIdx) => (
                                                <div key={bIdx} className="flex items-center justify-between mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                                    <div className="flex items-center gap-2">
                                                        <Coffee size={14} className="text-amber-600" />
                                                        <span className="text-xs font-medium text-amber-700">
                                                            Break {bIdx + 1}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-medium text-amber-600">
                                                        {new Date(brk.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                        {brk.end ? ` - ${new Date(brk.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ' - Now'}
                                                    </span>
                                                </div>
                                            ))}

                                            {/* Active Break (break_start without break_end) */}
                                            {entry.break_start && !entry.break_end && (
                                                <div className="flex items-center justify-between mt-2 p-2 bg-amber-100 rounded-lg border border-amber-200 animate-pulse">
                                                    <div className="flex items-center gap-2">
                                                        <Coffee size={14} className="text-amber-700" />
                                                        <span className="text-xs font-bold text-amber-800">On Break / Lunch</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-amber-700">
                                                        Started {new Date(entry.break_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Total break minutes (fallback for old entries) */}
                                            {(!entry.breaks || entry.breaks.length === 0) && !entry.break_start && entry.total_break_minutes && entry.total_break_minutes > 0 && (
                                                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                                    <Coffee size={14} className="text-amber-600" />
                                                    <span className="text-xs font-medium text-amber-700">
                                                        Break: {entry.total_break_minutes} minutes
                                                    </span>
                                                </div>
                                            )}

                                            {/* Clock Out */}
                                            {entry.clock_out ? (
                                                <div className="flex items-center justify-between mt-2 p-2 bg-slate-50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <LogOut size={14} className="text-slate-400" />
                                                        <span className="text-xs font-medium text-slate-600">Clock Out</span>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {new Date(entry.clock_out).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ) : entry.break_start && !entry.break_end ? (
                                                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                                    <span className="text-xs font-bold text-amber-700">On Break ({getCurrentBreakDuration()}m)</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                                    <span className="text-xs font-bold text-emerald-700">Currently Active</span>
                                                </div>
                                            )}

                                            {/* Duration */}
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[10px] font-medium text-slate-400">Duration</span>
                                                <span className="text-xs font-bold text-slate-700">
                                                    {TimeMath.formatDecimalHours(TimeMath.msToDecimalHours(calculateDurationMS(entry)))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveRosterDetailModal;
