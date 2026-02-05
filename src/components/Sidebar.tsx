import React from 'react';
import { useOpsCenter } from '../services/store';
import { isManager } from '../services/permissions';
import { Home, Users, BookOpen, Send, Settings, LogOut, Zap, Calendar, Clock, Menu, X, Sparkles, ChevronRight } from 'lucide-react';
import { ViewType } from '../types';
import OpsPilotModal from './OpsPilotModal';

const SidebarIcon = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ease-out ${active
            ? 'bg-gradient-to-br from-brand-blue to-brand-dark text-white shadow-lg shadow-brand-blue/25 ring-1 ring-white/20'
            : 'text-slate-400 hover:text-brand-dark hover:bg-white/60'
            }`}
        title={label}
    >
        <div className={`p-2 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        </div>

        {/* Tooltip for desktop */}
        <div className="absolute left-full abort ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shadow-xl whitespace-nowrap z-50 hidden lg:block">
            {label}
        </div>

        {/* Active Indicator Dot */}
        {active && (
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-white rounded-l-full hidden lg:block opacity-0 lg:opacity-100" />
        )}
    </button>
);

const Sidebar = ({ activeView, setActiveView }: { activeView: ViewType, setActiveView: (v: ViewType) => void }) => {
    const { logout, currentUser } = useOpsCenter();
    const canManage = isManager(currentUser);

    return (
        <aside className="hidden lg:flex flex-col glass-panel w-24 rounded-[2.5rem] items-center py-8 space-y-8 sticky top-6 h-[calc(100vh-3rem)] z-40 transition-all hover:w-24">
            {/* Brand Logo */}
            <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-brand-blue/40 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center text-white shadow-2xl ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-300">
                    <Zap size={24} className="text-yellow-400 fill-yellow-400" />
                </div>
            </div>

            <div className="flex-1 w-full flex flex-col items-center space-y-4 px-4 overflow-y-auto scrollbar-hide">
                <div className="w-full h-px bg-slate-200/50 mb-2" />

                <SidebarIcon label="Pulse Dashboard" icon={Home} active={activeView === 'pulse'} onClick={() => setActiveView('pulse')} />
                <SidebarIcon label="Schedule & Shifts" icon={Calendar} active={activeView === 'schedule'} onClick={() => setActiveView('schedule')} />
                <SidebarIcon label="Time Clock" icon={Clock} active={activeView === 'timeclock'} onClick={() => setActiveView('timeclock')} />

                <div className="w-8 h-px bg-slate-200/50 my-2" />

                <SidebarIcon label={canManage ? 'Staff Roster' : 'My Profile'} icon={Users} active={activeView === 'roster'} onClick={() => setActiveView('roster')} />
                <SidebarIcon label="Knowledge Hub" icon={BookOpen} active={activeView === 'knowledge'} onClick={() => setActiveView('knowledge')} />

                {canManage && (
                    <>
                        <SidebarIcon label="Communications" icon={Send} active={activeView === 'comms'} onClick={() => setActiveView('comms')} />
                        <SidebarIcon label="Settings" icon={Settings} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
                    </>
                )}
            </div>

            <div className="px-4 w-full">
                <button
                    onClick={logout}
                    className="w-full aspect-square flex items-center justify-center rounded-2xl text-slate-400 hover:text-white hover:bg-rose-500/90 hover:shadow-lg hover:shadow-rose-500/30 transition-all duration-300 group"
                    title="Sign Out"
                >
                    <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
            </div>
        </aside>
    );
};

export const MobileNav = ({ activeView, setActiveView }: { activeView: ViewType, setActiveView: (v: ViewType) => void }) => {
    const { logout, currentUser } = useOpsCenter();
    const canManage = isManager(currentUser);
    const [isPilotOpen, setIsPilotOpen] = React.useState(false);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    // Filter main tabs for the dock
    const MainTabs = [
        { id: 'pulse', icon: Home, label: 'Pulse' },
        { id: 'schedule', icon: Calendar, label: 'Schedule' },
    ];

    return (
        <>
            {/* OpsPilot Intelligence Modal */}
            <OpsPilotModal isOpen={isPilotOpen} onClose={() => setIsPilotOpen(false)} />

            {/* Overflow Menu Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] lg:hidden animate-fade-in"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Overflow Menu */}
            <div className={`fixed bottom-24 right-4 z-[90] glass-panel-dark rounded-3xl p-2 flex flex-col space-y-1 lg:hidden transition-all duration-300 origin-bottom-right shadow-2xl ring-1 ring-white/10 w-48 ${isMenuOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8 pointer-events-none'}`}>
                <div className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 mb-1">
                    Menu
                </div>

                <button onClick={() => { setActiveView('roster'); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors">
                    <Users size={20} />
                    <span className="font-medium text-sm">{canManage ? 'Roster' : 'My Profile'}</span>
                </button>

                <button onClick={() => { setActiveView('knowledge'); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors">
                    <BookOpen size={20} />
                    <span className="font-medium text-sm">Knowledge</span>
                </button>

                {canManage && (
                    <>
                        <button onClick={() => { setActiveView('comms'); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors">
                            <Send size={20} />
                            <span className="font-medium text-sm">Comms</span>
                        </button>
                        <button onClick={() => { setActiveView('settings'); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors">
                            <Settings size={20} />
                            <span className="font-medium text-sm">Settings</span>
                        </button>
                    </>
                )}

                <div className="h-px bg-white/10 my-1 mx-2" />

                <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl transition-colors">
                    <LogOut size={20} />
                    <span className="font-medium text-sm">Sign Out</span>
                </button>
            </div>

            {/* Integrated Floating Dock */}
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-[100] flex justify-center">
                <nav className="relative flex items-center gap-1 p-1.5 h-[4.5rem] bg-[#0F172A] rounded-full shadow-2xl shadow-black/40 ring-1 ring-white/10">

                    {/* Left Group */}
                    <div className="flex items-center gap-1 pl-2">
                        {MainTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveView(tab.id as ViewType); setIsMenuOpen(false); }}
                                className={`relative w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 ${activeView === tab.id
                                    ? 'text-white bg-white/10'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                <tab.icon
                                    size={26}
                                    strokeWidth={activeView === tab.id ? 2.5 : 2}
                                    className={activeView === tab.id ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}
                                />
                                {activeView === tab.id && (
                                    <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Integrated Center Action */}
                    <div className="px-2">
                        <button
                            onClick={() => setIsPilotOpen(true)}
                            className="group relative w-14 h-14 flex items-center justify-center bg-gradient-to-b from-brand-blue to-brand-dark rounded-full text-white shadow-lg shadow-brand-blue/30 active:scale-95 transition-all duration-300 ring-4 ring-[#0F172A]"
                        >
                            <Sparkles size={24} className="fill-white" />
                        </button>
                    </div>

                    {/* Right Group */}
                    <div className="flex items-center gap-1 pr-2">
                        <button
                            onClick={() => { setActiveView('timeclock'); setIsMenuOpen(false); }}
                            className={`relative w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 ${activeView === 'timeclock'
                                ? 'text-white bg-white/10'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <Clock
                                size={26}
                                strokeWidth={activeView === 'timeclock' ? 2.5 : 2}
                                className={activeView === 'timeclock' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}
                            />
                            {activeView === 'timeclock' && (
                                <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white]" />
                            )}
                        </button>

                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`relative w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 ${isMenuOpen
                                ? 'text-white bg-white/10 rotate-90'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {isMenuOpen ? <X size={26} strokeWidth={2.5} /> : <Menu size={26} strokeWidth={2} />}
                        </button>
                    </div>
                </nav>
            </div>
        </>
    );
};

export default Sidebar;
