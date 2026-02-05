import React from 'react';
import { Activity, ArrowUpRight, Clock, Sparkles, Send, BookOpen, PauseCircle, PlayCircle, Users, CheckCircle } from 'lucide-react';
import { ViewType } from '../../types';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { isManager } from '../../services/permissions';
import ShiftCompletionWidget from '../dashboard/ShiftCompletionWidget';
import ConfirmDialog from '../ui/ConfirmDialog';

const PulseView = ({ setActiveView }: { setActiveView: (v: ViewType) => void }) => {
    const { shifts, isClockedIn, activeTimeEntry, clockIn, clockOut, knowledgeBase, templates, staff, timeEntries, currentUser } = useOpsCenter();
    const [currentTime, setCurrentTime] = React.useState(new Date());
    const [rosterFilter, setRosterFilter] = React.useState<'all' | 'manager' | 'staff'>('all');

    // Confirmation State
    const [scheduleWarning, setScheduleWarning] = React.useState<{
        isOpen: boolean;
        title: string;
        message: string;
    }>({
        isOpen: false,
        title: '',
        message: ''
    });

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Calculate duration if clocked in
    const getDuration = () => {
        if (!activeTimeEntry) return '00:00:00';
        const start = new Date(activeTimeEntry.clock_in).getTime();
        const now = currentTime.getTime();
        const diff = Math.floor((now - start) / 1000);

        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // Live Roster Logic
    const activeEntries = timeEntries.filter(te => te.status === 'active' || !te.clock_out);
    const activeStaffIds = new Set(activeEntries.map(te => te.user_id));
    const activeStaff = staff.filter(s => activeStaffIds.has(s.id));

    // Navigation Handler
    const { setNavigatedUser } = useOpsCenter();
    const handleNavigateToTimesheet = (userId: string) => {
        setNavigatedUser(userId);
        setActiveView('roster');
    };

    // Sort to put me first if I'm clocked in
    const sortedActiveStaff = [...activeStaff].sort((a, b) => {
        if (!currentUser) return 0;
        if (a.id === currentUser.id) return -1;
        if (b.id === currentUser.id) return 1;
        return 0;
    });

    // Get my next shift
    const myShifts = React.useMemo(() => {
        if (!currentUser) return [];
        return shifts
            .filter(s => s.user_id === currentUser.id)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [shifts, currentUser]);

    const nextShift = myShifts.find(s => new Date(s.start_time) > currentTime) || null;
    const todayShift = myShifts.find(s => new Date(s.start_time).toDateString() === currentTime.toDateString());

    const handleClockIn = () => {
        if (!todayShift) {
            setScheduleWarning({
                isOpen: true,
                title: 'Not Scheduled Today',
                message: "You aren't scheduled for a shift today. Would you like to clock in anyway?"
            });
            return;
        }

        const scheduledStart = new Date(todayShift.start_time);
        const diffMinutes = (scheduledStart.getTime() - currentTime.getTime()) / 60000;

        if (diffMinutes > 15) {
            setScheduleWarning({
                isOpen: true,
                title: 'Clocking In Early',
                message: `You aren't scheduled to start until ${scheduledStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Clock in early anyway?`
            });
            return;
        }

        // Proceed normally
        clockIn({ lat: 34.05, lng: -118.24 });
    };

    const confirmScheduleClockIn = () => {
        clockIn({ lat: 34.05, lng: -118.24 });
        setScheduleWarning(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Pulse Dashboard</h1>
                    <p className="text-slate-500 font-medium">Real-time operational overview</p>
                </div>
                <div className="flex items-center space-x-4 bg-white/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm font-mono font-bold text-slate-700">
                        {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 1. HERO SECTION: My Status & Quick Actions */}
                <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
                    {/* My Status Card */}
                    <div className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500">
                            <Clock size={160} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isClockedIn ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-slate-900 shadow-slate-900/20'}`}>
                                        <Clock size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">My Status</p>
                                        <h2 className={`text-2xl font-black ${isClockedIn ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            {isClockedIn ? 'Clocked In' : 'Off Clock'}
                                        </h2>
                                    </div>
                                </div>
                            </div>

                            {isClockedIn ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl backdrop-blur-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Shift Active</span>
                                            </div>
                                            <span className="text-xs text-emerald-600 font-medium">Since {activeTimeEntry && new Date(activeTimeEntry.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-4xl font-mono font-bold text-emerald-900 tracking-tighter">{getDuration()}</p>
                                    </div>

                                    <button
                                        onClick={() => clockOut()}
                                        className="w-full py-4 bg-white border-2 border-rose-100 text-rose-600 font-bold rounded-2xl shadow-sm hover:bg-rose-50 hover:border-rose-200 hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center space-x-2 group/btn"
                                    >
                                        <PauseCircle size={20} className="group-hover/btn:scale-110 transition-transform" />
                                        <span>End Shift</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {nextShift ? (
                                        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl backdrop-blur-sm">
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Next Scheduled Shift</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-lg font-bold text-indigo-900">
                                                    {new Date(nextShift.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </p>
                                                <p className="text-lg font-bold text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded-lg">
                                                    {new Date(nextShift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                            <p className="text-sm text-slate-400 font-medium">No upcoming shifts scheduled.</p>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleClockIn}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 group/btn"
                                    >
                                        <PlayCircle size={20} className="fill-white/20 group-hover/btn:scale-110 transition-transform" />
                                        <span>Start Shift</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Widget (Personal Performance) */}
                    <div className="glass-panel p-6 rounded-[2rem] flex-1">
                        <ShiftCompletionWidget />
                    </div>
                </div>

                {/* 2. CENTER SECTION: Live Roster */}
                <div className="col-span-1 lg:col-span-4 flex flex-col h-full">
                    <div className="glass-panel p-6 rounded-[2rem] h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <Users size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Live Roster</h3>
                                    <p className="text-xs text-slate-500 font-medium">Real-time attendance</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{activeStaff.length} Active</span>
                            </div>
                        </div>

                        {/* Filter Toggles */}
                        <div className="flex p-1 bg-slate-100/80 rounded-xl mb-4">
                            {(['all', 'manager', 'staff'] as const).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setRosterFilter(filter)}
                                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${rosterFilter === filter
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                            {activeStaff.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                    <Users size={32} className="mb-2 opacity-20" />
                                    <p className="text-xs font-medium italic">No one is currently clocked in.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Helper to render a list of staff */}
                                    {(() => {
                                        const managers = sortedActiveStaff.filter(s => s.role === 'owner' || s.role === 'manager');
                                        const regular = sortedActiveStaff.filter(s => s.role !== 'owner' && s.role !== 'manager');

                                        const renderList = (list: typeof sortedActiveStaff) => (
                                            list.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => handleNavigateToTimesheet(s.id)}
                                                    className="w-full flex items-center justify-between p-3 hover:bg-white/60 active:bg-white/80 rounded-2xl transition-all border border-transparent hover:border-white/60 cursor-pointer text-left group"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="relative">
                                                            <img src={s.avatar_url || `https://ui-avatars.com/api/?name=${s.full_name}&background=random`} className="w-10 h-10 rounded-full ring-2 ring-white shadow-sm object-cover group-hover:scale-105 transition-transform" />
                                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{s.full_name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="px-2 py-1 bg-emerald-100/50 text-emerald-700 rounded-lg text-[10px] font-bold">
                                                            Active
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        );

                                        if (rosterFilter === 'all') {
                                            return (
                                                <div className="space-y-4">
                                                    {managers.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 pl-2">Managers</h4>
                                                            {renderList(managers)}
                                                        </div>
                                                    )}
                                                    {regular.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 pl-2">Staff</h4>
                                                            {renderList(regular)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        if (rosterFilter === 'manager') {
                                            return managers.length ? renderList(managers) : <p className="text-center py-4 text-xs text-slate-400 font-medium italic">No managers active.</p>;
                                        }

                                        if (rosterFilter === 'staff') {
                                            return regular.length ? renderList(regular) : <p className="text-center py-4 text-xs text-slate-400 font-medium italic">No staff active.</p>;
                                        }
                                    })()}
                                </>
                            )}
                        </div>
                    </div>
                </div>


                {/* 3. RIGHT SECTION: OpsPilot & Quick Access */}
                <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">

                    {/* OpsPilot Visual */}
                    <div className="glass-panel-dark p-6 rounded-[2rem] min-h-[300px] relative overflow-hidden flex flex-col justify-between group">
                        {/* Abstract BG */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full blur-[60px] opacity-30 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500 rounded-full blur-[60px] opacity-30 group-hover:opacity-40 transition-opacity" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Sparkles size={16} className="text-indigo-400" />
                                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">OpsPilot AI</span>
                                    </div>
                                    <h3 className="text-2xl font-display font-bold text-white tracking-tight">Intelligence</h3>
                                </div>
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                            </div>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                System is monitoring operational metrics. No anomalies detected in the last hour.
                            </p>
                        </div>

                        <div className="relative z-10 mt-6 space-y-3">
                            <div className="space-y-2">
                                {['Who is late for shift?', 'Summary of KB updates', 'Draft message to team'].map((q, i) => (
                                    <button key={i} className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-medium text-slate-300 transition-colors flex items-center justify-between group/item">
                                        <span>{q}</span>
                                        <ArrowUpRight size={12} className="opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>

                            <div className="relative mt-2">
                                <input
                                    type="text"
                                    placeholder="Ask OpsPilot..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                                />
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500 rounded-lg text-white hover:bg-indigo-400 transition-colors">
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Knowledge Base Quick Link */}
                    <div
                        onClick={() => setActiveView('knowledge')}
                        className="glass-panel p-5 rounded-[2rem] cursor-pointer group hover:border-indigo-200 transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
                                    <BookOpen size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Knowledge Hub</h4>
                                </div>
                            </div>
                            <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {knowledgeBase.slice(0, 3).map(entry => (
                                <span key={entry.id} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 truncate max-w-[120px]">
                                    {entry.title}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Comms Quick Link */}
                    <div
                        onClick={() => setActiveView('comms')}
                        className="glass-panel p-5 rounded-[2rem] cursor-pointer group hover:border-indigo-200 transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                                    <Send size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Comms Hub</h4>
                                </div>
                            </div>
                            <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Quick access to team announcements and templates.</p>
                    </div>

                </div>
            </div>
            {/* Schedule Warnings */}
            <ConfirmDialog
                isOpen={scheduleWarning.isOpen}
                onClose={() => setScheduleWarning(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmScheduleClockIn}
                title={scheduleWarning.title}
                message={scheduleWarning.message}
                confirmText="Clock In Anyway"
                cancelText="Go Back"
                variant="warning"
            />
        </div>
    );
};

export default PulseView;
