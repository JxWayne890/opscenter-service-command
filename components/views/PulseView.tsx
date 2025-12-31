import React from 'react';
import { Activity, ArrowUpRight, Clock, Sparkles, Send, BookOpen, PauseCircle, PlayCircle } from 'lucide-react';
import { ViewType } from '../../types';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';

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
    const { shifts, isClockedIn, clockIn, clockOut, knowledgeBase, templates } = useOpsCenter();

    // Filter showing actively working people
    const activeShifts = shifts.filter(s => s.role_type === 'active');

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
                                <button
                                    onClick={() => clockOut()}
                                    className="w-full py-4 bg-rose-50 text-rose-600 font-bold rounded-2xl shadow-sm border border-rose-100 flex items-center justify-center space-x-2 active:scale-95 transition-all"
                                >
                                    <PauseCircle size={20} />
                                    <span>End Shift</span>
                                </button>
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
                                        onClick={() => clockIn()}
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
                    <div>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Activity size={12} className="text-orange-600" />
                                </div>
                                <span className="text-sm font-semibold text-slate-500">Shift Completion</span>
                            </div>
                            <span className="text-4xl font-extrabold tracking-tight">98%</span>
                        </div>
                        <div className="flex space-x-6 mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="text-slate-900 border-b-2 border-indigo-500 pb-1">Historical</span>
                            <span>Target</span>
                        </div>
                        <HeatmapGrid />
                    </div>
                    <div className="mt-8 flex items-center space-x-4 p-4 bg-slate-50/50 rounded-2xl border border-white/50 relative overflow-hidden group cursor-pointer">
                        <p className="text-xs font-medium text-slate-600 leading-relaxed">
                            Team is maintaining <span className="font-bold text-slate-900">100% attendance</span> for the current pay period.
                        </p>
                        <ArrowUpRight size={14} className="absolute top-3 right-3 text-slate-300" />
                    </div>
                </SectionCard>

                {/* 2. LIVE ROSTER */}
                <div className="lg:col-span-4 flex flex-col">
                    {/* Mobile: Ticker */}
                    <div className="lg:hidden mb-6">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h3 className="text-sm font-bold text-slate-900">Who's Working</h3>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{activeShifts.length} Active</span>
                        </div>
                        <div className="flex space-x-4 overflow-x-auto pb-4 px-1 custom-scrollbar snap-x">
                            {activeShifts.length === 0 && <p className="text-xs text-slate-400 italic">No one is currently online.</p>}
                            {activeShifts.map(shift => (
                                <div key={shift.id} className="flex-shrink-0 flex flex-col items-center space-y-2 snap-center">
                                    <div className="relative">
                                        <img src={shift.profile?.avatar_url} className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover" />
                                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 max-w-[60px] truncate text-center">{shift.profile?.full_name?.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Desktop: List Card */}
                    <SectionCard className="hidden lg:block h-full">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-sm font-semibold text-slate-500">Live Roster</h3>
                            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span>{activeShifts.length} Active</span>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                            {activeShifts.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs">No one is currently clocked in.</div>
                            ) : (
                                activeShifts.map(shift => (
                                    <div key={shift.id} className="flex items-center justify-between p-3 hover:bg-white/40 rounded-2xl transition-all border border-transparent hover:border-white/60">
                                        <div className="flex items-center space-x-3">
                                            <img src={shift.profile?.avatar_url} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">{shift.profile?.full_name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{shift.role_type}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-900">
                                                {/* Simple duration mock display */}
                                                Active
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-medium">Started {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            {isClockedIn ? (
                                <button
                                    onClick={() => clockOut()}
                                    className="w-full flex items-center justify-center space-x-2 bg-slate-100 text-slate-900 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 border border-slate-200 py-4 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition-all"
                                >
                                    <PauseCircle size={18} />
                                    <span>Clock Out</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => clockIn()}
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
