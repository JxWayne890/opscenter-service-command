import React from 'react';
import { Activity, ArrowUpRight, Clock, Sparkles, Send, BookOpen, PauseCircle, PlayCircle } from 'lucide-react';
import { ViewType } from '../../types';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import ShiftCompletionWidget from '../dashboard/ShiftCompletionWidget';

const HeatmapGrid = () => (
    <div className="grid grid-cols-7 gap-1.5 mt-4">
        {Array.from({ length: 28 }).map((_, i) => {
            const intensities = ['bg-slate-100', 'bg-slate-200', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-900'];
            const idx = Math.floor(Math.random() * intensities.length);
            return <div key={i} className={`h-8 rounded-md ${intensities[idx]} transition-all hover:scale-110 cursor-pointer`} />;
        })}
    </div>
);

const PulseView = ({ setActiveView }: { setActiveView: (v: ViewType) => void }) => {
    const { shifts, isClockedIn, activeTimeEntry, clockIn, clockOut, knowledgeBase, templates, staff, timeEntries, currentUser } = useOpsCenter();
    const [currentTime, setCurrentTime] = React.useState(new Date());
    const [rosterFilter, setRosterFilter] = React.useState<'all' | 'manager' | 'staff'>('all');

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
    const activeStaff = staff.filter(s => activeStaffIds.has(s.id)); // Use staff list to get details

    // Navigation Handler
    const { setNavigatedUser } = useOpsCenter();
    const handleNavigateToTimesheet = (userId: string) => {
        setNavigatedUser(userId);
        setActiveView('roster');
    };

    // Sort to put me first if I'm clocked in
    const sortedActiveStaff = [...activeStaff].sort((a, b) => {
        if (a.id === currentUser.id) return -1;
        if (b.id === currentUser.id) return 1;
        return 0;
    });

    // Get my next shift
    const nextShift = shifts.find(s => new Date(s.start_time) > new Date()) || null;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 1. HERO SECTION: My Status (Mobile) vs Operational Progress (Desktop) */}

                {/* Mobile: My Status Card */}
                <div className="lg:hidden col-span-1">
                    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Clock size={120} />
                        </div>

                        <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                            <h2 className={`text-3xl font-black mb-4 ${isClockedIn ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {isClockedIn ? 'Clocked In' : 'Off Clock'}
                            </h2>

                            {isClockedIn ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-4">
                                        <div className="flex items-center space-x-2">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase">On the Clock</p>
                                        </div>
                                        <p className="text-sm font-mono font-bold text-emerald-700">{getDuration()}</p>
                                    </div>
                                    <button
                                        onClick={() => clockOut()}
                                        className="w-full py-4 bg-rose-50 text-rose-600 font-bold rounded-2xl shadow-sm border border-rose-100 flex items-center justify-center space-x-2 active:scale-95 transition-all"
                                    >
                                        <PauseCircle size={20} />
                                        <span>End Shift</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {nextShift ? (
                                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase">Next Shift</p>
                                            <p className="text-sm font-bold text-indigo-900">
                                                {new Date(nextShift.start_time).toLocaleDateString([], { weekday: 'short', day: 'numeric' })} @ {new Date(nextShift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 mb-4">No upcoming shifts scheduled.</p>
                                    )}
                                    <button
                                        onClick={() => clockIn({ lat: 34.05, lng: -118.24 })}
                                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center space-x-2 active:scale-95 transition-all"
                                    >
                                        <PlayCircle size={20} />
                                        <span>Start Shift</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Desktop: Shifts Heatmap */}
                <SectionCard className="hidden lg:flex lg:col-span-4 flex-col justify-between">
                    <ShiftCompletionWidget />
                </SectionCard>

                {/* 2. LIVE ROSTER */}
                <div className="lg:col-span-4 flex flex-col">
                    {/* Mobile: Ticker */}
                    <div className="lg:hidden mb-6">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h3 className="text-sm font-bold text-slate-900">Who's Working</h3>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{activeStaff.length} Active</span>
                        </div>
                        <div className="flex space-x-4 overflow-x-auto pb-4 px-1 custom-scrollbar snap-x">
                            {activeStaff.length === 0 && <p className="text-xs text-slate-400 italic">No one is currently online.</p>}
                            {sortedActiveStaff.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleNavigateToTimesheet(s.id)}
                                    className="flex-shrink-0 flex flex-col items-center space-y-2 snap-center focus:outline-none group"
                                >
                                    <div className="relative group-active:scale-95 transition-transform">
                                        <img src={s.avatar_url} className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover" />
                                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 max-w-[60px] truncate text-center">{s.full_name?.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Desktop: List Card */}
                    <SectionCard className="hidden lg:block h-full">
                        <div className="flex flex-col space-y-4 mb-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-slate-500">Live Roster</h3>
                                <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span>{activeStaff.length} Active</span>
                                </div>
                            </div>

                            {/* Filter Toggles */}
                            <div className="flex p-1 bg-slate-100 rounded-xl">
                                {(['all', 'manager', 'staff'] as const).map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setRosterFilter(filter)}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${rosterFilter === filter
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                            {activeStaff.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs">No one is currently clocked in.</div>
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
                                                    className="w-full flex items-center justify-between p-3 hover:bg-white/60 rounded-2xl transition-all border border-transparent hover:border-white/60 cursor-pointer text-left group mb-2 last:mb-0"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <img src={s.avatar_url} className="w-10 h-10 rounded-full border-2 border-white shadow-sm group-hover:scale-105 transition-transform" />
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{s.full_name}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{s.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-slate-900">
                                                            Active
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-medium">Clocked in</p>
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

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            {isClockedIn ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase">On the Clock</span>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-emerald-700">{getDuration()}</span>
                                    </div>
                                    <button
                                        onClick={() => clockOut()}
                                        className="w-full flex items-center justify-center space-x-2 bg-slate-100 text-slate-900 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 border border-slate-200 py-4 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition-all"
                                    >
                                        <PauseCircle size={18} />
                                        <span>Clock Out</span>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => clockIn({ lat: 34.05, lng: -118.24 })}
                                    className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all"
                                >
                                    <PlayCircle size={18} />
                                    <span>Clock In</span>
                                </button>
                            )}
                        </div>
                    </SectionCard>
                </div>

                {/* 3. OpsPilot Assistant (Operational Intelligence) */}
                <SectionCard className="hidden lg:flex lg:col-span-4 glass-dark text-white relative overflow-hidden min-h-[400px]">
                    <img src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&q=80&w=600" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="text-3xl font-extrabold tracking-tight">OpsPilot</h3>
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <p className="text-white/60 text-sm font-medium">Intelligence layer active</p>

                        <div className="mt-auto space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                {['Summary of KB', 'Who is late?', 'Check SOPs'].map(q => (
                                    <button key={q} className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-[10px] font-bold text-left hover:bg-white/20 transition-all border border-white/10">
                                        {q}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                    <Sparkles size={10} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ask intelligence..."
                                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-4 pl-12 pr-12 text-xs font-medium focus:outline-none"
                                />
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl text-slate-900">
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* 4. Quick Access: Knowledge & Comms (Core Phase 1) */}
                <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SectionCard onClick={() => setActiveView('knowledge')} className="cursor-pointer group hover:border-indigo-500/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Staff Knowledge Base</h4>
                                    <p className="text-xs text-slate-400 font-medium">Internal FAQs & Protocols</p>
                                </div>
                            </div>
                            <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {knowledgeBase.slice(0, 4).map(entry => (
                                <div key={entry.id} className="p-3 bg-slate-50 rounded-xl text-[11px] font-bold text-slate-600 truncate border border-slate-100">
                                    {entry.title}
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard onClick={() => setActiveView('comms')} className="cursor-pointer group hover:border-indigo-500/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                                    <Send size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">Communication Hub</h4>
                                    <p className="text-xs text-slate-400 font-medium">Pre-written response templates</p>
                                </div>
                            </div>
                            <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {templates.slice(0, 4).map(temp => (
                                <div key={temp.id} className="p-3 bg-indigo-50 rounded-xl text-[11px] font-bold text-indigo-700 truncate border border-indigo-100">
                                    {temp.name}
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

export default PulseView;
