import React from 'react';
import { Home, Users, BookOpen, Send, Settings, LogOut, Zap, Calendar, Clock, Menu, X, Sparkles } from 'lucide-react';
import { ViewType } from '../types';
import OpsPilotModal from './OpsPilotModal';

const SidebarIcon = ({ icon: Icon, active, onClick }: { icon: any, active?: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`relative group p-4 rounded-2xl transition-all duration-500 ease-out active:scale-90 ${active ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
    >
        {active && (
            <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl animate-pulse" />
        )}
        <div className={`relative z-10 p-1 rounded-xl transition-all duration-300 ${active ? 'bg-indigo-600 shadow-lg shadow-indigo-500/40 ring-1 ring-white/20 scale-110' : 'group-hover:bg-white/5'}`}>
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        </div>
    </button>
);

const Sidebar = ({ activeView, setActiveView }: { activeView: ViewType, setActiveView: (v: ViewType) => void }) => (
    <aside className="hidden lg:flex flex-col glass w-20 rounded-[2rem] items-center py-8 space-y-8 sticky top-6 h-[calc(100vh-3rem)]">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl mb-4">
            <Zap size={24} />
        </div>

        <div className="flex-1 flex flex-col space-y-4">
            <SidebarIcon icon={Home} active={activeView === 'pulse'} onClick={() => setActiveView('pulse')} />
            <SidebarIcon icon={Calendar} active={activeView === 'schedule'} onClick={() => setActiveView('schedule')} />
            <SidebarIcon icon={Clock} active={activeView === 'timeclock'} onClick={() => setActiveView('timeclock')} />
            <SidebarIcon icon={Users} active={activeView === 'roster'} onClick={() => setActiveView('roster')} />
            <SidebarIcon icon={BookOpen} active={activeView === 'knowledge'} onClick={() => setActiveView('knowledge')} />
            <SidebarIcon icon={Send} active={activeView === 'comms'} onClick={() => setActiveView('comms')} />
            <SidebarIcon icon={Settings} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
        </div>

        <button className="p-3 text-slate-400 hover:text-rose-500 transition-colors">
            <LogOut size={20} />
        </button>
    </aside>
);

export const MobileNav = ({ activeView, setActiveView }: { activeView: ViewType, setActiveView: (v: ViewType) => void }) => {
    const [isPilotOpen, setIsPilotOpen] = React.useState(false);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    // Filter main tabs for the dock
    const MainTabs = [
        { id: 'pulse', icon: Home },
        { id: 'schedule', icon: Calendar },
    ];

    const RightTabs = [
        { id: 'timeclock', icon: Clock },
        { id: 'menu', icon: isMenuOpen ? X : Menu },
    ];

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <>
            {/* OpsPilot Intelligence Modal */}
            <OpsPilotModal isOpen={isPilotOpen} onClose={() => setIsPilotOpen(false)} />

            {/* Overflow Menu (Knowledge, Comms, Settings, Roster) */}
            {isMenuOpen && (
                <div className="fixed bottom-24 right-4 z-[90] glass-dark rounded-2xl p-4 flex flex-col space-y-4 animate-in slide-in-from-bottom-10 fade-in duration-300 min-w-[160px] shadow-2xl border border-white/10">
                    <button onClick={() => { setActiveView('roster'); setIsMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${activeView === 'roster' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                        <Users size={18} />
                        <span className="text-sm font-bold">Roster</span>
                    </button>
                    <button onClick={() => { setActiveView('knowledge'); setIsMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${activeView === 'knowledge' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                        <BookOpen size={18} />
                        <span className="text-sm font-bold">Knowledge</span>
                    </button>
                    <button onClick={() => { setActiveView('comms'); setIsMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${activeView === 'comms' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                        <Send size={18} />
                        <span className="text-sm font-bold">Comms</span>
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { setActiveView('settings'); setIsMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${activeView === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                        <Settings size={18} />
                        <span className="text-sm font-bold">Settings</span>
                    </button>
                </div>
            )}

            {/* Floating Dock */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-[100]">
                <nav className="relative flex items-center justify-between p-2 h-20 bg-slate-950/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
                    {/* Active Background Glow (Center Behind Pilot) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 blur-[60px] rounded-full -z-10" />

                    {/* Left Group */}
                    <div className="flex items-center space-x-1 ml-1">
                        {MainTabs.map(tab => (
                            <SidebarIcon
                                key={tab.id}
                                icon={tab.icon}
                                active={activeView === tab.id}
                                onClick={() => { setActiveView(tab.id as ViewType); setIsMenuOpen(false); }}
                            />
                        ))}
                    </div>

                    {/* Center OpsPilot FAB (Redesigned) */}
                    <div className="relative -mt-6">
                        <div className="absolute -inset-4 bg-indigo-600/30 blur-2xl rounded-full scale-150 animate-pulse" />
                        <button
                            onClick={() => setIsPilotOpen(true)}
                            className="relative group w-16 h-16 bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 rounded-[20px] flex items-center justify-center text-white shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-90 transition-all duration-500 border border-white/20 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 bg-white/10 transition-transform duration-500" />
                            <Sparkles size={28} fill="white" className="relative z-10 drop-shadow-lg" />
                        </button>
                    </div>

                    {/* Right Group */}
                    <div className="flex items-center space-x-1 mr-1">
                        <SidebarIcon
                            icon={Clock}
                            active={activeView === 'timeclock'}
                            onClick={() => { setActiveView('timeclock'); setIsMenuOpen(false); }}
                        />
                        <button
                            onClick={handleMenuClick}
                            className={`p-4 rounded-2xl transition-all duration-500 relative group overflow-hidden ${isMenuOpen ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {!isMenuOpen && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            <div className="relative z-10">
                                {isMenuOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2} />}
                            </div>
                        </button>
                    </div>
                </nav>
            </div>
        </>
    );
};

export default Sidebar;
