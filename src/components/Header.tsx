import React from 'react';
import { Bell, Search, MapPin, ChevronDown } from 'lucide-react';
import { Organization, Profile } from '../types';
import { useOpsCenter } from '../services/store';

interface HeaderProps {
    user: Profile | null;
    org: Organization;
}

const Header: React.FC<HeaderProps> = ({ user, org }) => {
    const { setInviteModalOpen, currentUser } = useOpsCenter();
    const isManager = currentUser?.role === 'owner' || currentUser?.role === 'manager';

    if (!user) return null;

    return (
        <header className="flex items-center justify-between px-2 pt-2 lg:px-6 lg:pt-6 pb-2 sticky top-0 z-30 mix-blend-hard-light mb-6 md:mb-0">
            {/* Left Section: Context / Search */}
            <div className="flex items-center space-x-6">
                <div className="hidden md:flex items-center space-x-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer group">
                    <MapPin size={18} className="group-hover:text-brand-blue transition-colors" />
                    <span className="text-sm font-bold tracking-tight">{org.name || "A Dog's World"}</span>
                    <ChevronDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Search Bar - Glass */}
                <div className="hidden lg:flex items-center relative">
                    <Search size={16} className="absolute left-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search anything..."
                        className="w-64 py-2.5 pl-10 pr-4 bg-white/40 border border-white/40 hover:bg-white/60 focus:bg-white/80 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Right Section: Actions & Profile */}
            <div className="flex items-center space-x-3 md:space-x-5">
                {/* Admin Actions */}
                {isManager && (
                    <button
                        onClick={() => setInviteModalOpen(true)}
                        className="hidden md:flex bg-white/60 hover:bg-white text-slate-600 hover:text-brand-dark px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm border border-white/50 transition-all"
                    >
                        + Add Staff
                    </button>
                )}

                <div className="h-8 w-px bg-slate-200/50 hidden md:block" />

                <button className="relative p-2.5 text-slate-400 hover:text-brand-blue hover:bg-white/60 rounded-xl transition-all group">
                    <Bell size={20} />
                    <span className="absolute top-2.5 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white/0 group-hover:border-white transition-all shadow-sm"></span>
                </button>

                {/* User Pill (Glass) */}
                <div className="flex items-center space-x-3 pl-1 pr-1.5 py-1 bg-white/40 hover:bg-white/60 backdrop-blur-md rounded-full border border-white/40 shadow-sm cursor-pointer transition-all group">
                    <div className="relative">
                        <img src={user.avatar_url} className="w-9 h-9 rounded-full border-2 border-white shadow-sm group-hover:scale-105 transition-transform" alt="User Avatar" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="hidden md:flex flex-col pr-3">
                        <span className="text-sm font-bold text-slate-800 leading-none group-hover:text-brand-dark transition-colors">{user.full_name?.split(' ')[0]}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight mt-0.5">{user.role}</span>
                    </div>
                    <ChevronDown size={14} className="text-slate-400 pr-2 hidden md:block" />
                </div>
            </div>
        </header>
    );
};

export default Header;
