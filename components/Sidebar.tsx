import React from 'react';
import { Home, Users, BookOpen, Send, Settings, LogOut, Zap, Calendar, Clock, Menu, X, Sparkles } from 'lucide-react';
import { ViewType } from '../types';
import OpsPilotModal from './OpsPilotModal';

const SidebarIcon = ({ icon: Icon, active, onClick }: { icon: any, active?: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`p-3 rounded-xl transition-all duration-300 ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-white/50'
            }`}
    >
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
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
            <nav className="lg:hidden fixed bottom-6 inset-x-4 glass-dark rounded-2xl h-18 flex items-center justify-between px-6 z-[100] shadow-2xl border border-white/10">
                {/* Left Group */}
                <div className="flex items-center space-x-1">
                    {MainTabs.map(tab => (
                        <SidebarIcon
                            key={tab.id}
                            icon={tab.icon}
                            active={activeView === tab.id}
                            onClick={() => { setActiveView(tab.id as ViewType); setIsMenuOpen(false); }}
                        />
                    ))}
                </div>

                {/* Center OpsPilot FAB (Integrated) */}
                <div className="flex items-center justify-center">
                    <button
                        onClick={() => setIsPilotOpen(true)}
                        className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                    >
                        <Sparkles size={20} fill="white" className="animate-pulse" />
                    </button>
                </div>

                {/* Right Group */}
                <div className="flex items-center space-x-1">
                    <SidebarIcon
                        icon={Clock}
                        active={activeView === 'timeclock'}
                        onClick={() => { setActiveView('timeclock'); setIsMenuOpen(false); }}
                    />
                    <button
                        onClick={handleMenuClick}
                        className={`p-3 rounded-xl transition-all duration-300 ${isMenuOpen ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
