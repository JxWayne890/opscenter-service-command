import React, { useState } from 'react';
import { Bell, ChevronDown, User, Shield, LogOut, Search } from 'lucide-react';
import { Organization, Profile } from '../types';
import { useOpsCenter } from '../services/store';

interface HeaderProps {
    user: Profile;
    org: Organization;
}

const Header: React.FC<HeaderProps> = ({ user, org }) => {
    const { setInviteModalOpen, staff, loginAs, logout } = useOpsCenter();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    return (
        <header className="flex items-center justify-between px-4 pt-4 pb-2 md:pt-0">
            <div className="flex items-center space-x-12">
                <div className="relative">
                    <button
                        onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                        className="flex items-center space-x-3 md:space-x-4 group bg-white/40 hover:bg-white/80 p-1 pr-3 rounded-full border border-white/50 transition-all shadow-sm"
                    >
                        <div className="relative">
                            <img src={user.avatar_url} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg" alt="User Avatar" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></div>
                        </div>
                        <div className="flex flex-col justify-center text-left">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                                    {user.full_name?.split(' ')[0]}
                                </h3>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                            </div>
                            <p className="text-[10px] md:text-[11px] font-bold text-slate-500 leading-tight uppercase tracking-tighter">
                                {user.role === 'owner' ? 'Administrator' : user.role === 'manager' ? 'Manager' : 'Practitioner'}
                            </p>
                        </div>
                    </button>

                    {/* Profile Switcher Dropdown */}
                    {isSwitcherOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSwitcherOpen(false)}></div>
                            <div className="absolute top-full left-0 mt-3 w-[280px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-4 z-50 animate-in slide-in-from-top-2">
                                <div className="p-2 mb-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Switch Profile</h4>
                                </div>
                                <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {staff.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                loginAs(s);
                                                setIsSwitcherOpen(false);
                                            }}
                                            className={`w-full flex items-center p-2 rounded-2xl transition-all ${s.id === user.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}
                                        >
                                            <img src={s.avatar_url} className="w-8 h-8 rounded-full border border-white shadow-sm" alt="" />
                                            <div className="ml-3 text-left">
                                                <p className="text-xs font-bold text-slate-900 leading-none mb-0.5">{s.full_name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{s.role}</p>
                                            </div>
                                            {s.id === user.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col space-y-1">
                                    <button
                                        onClick={() => setInviteModalOpen(true)}
                                        className="w-full flex items-center p-2 hover:bg-slate-50 rounded-2xl text-[11px] font-bold text-slate-600 transition-all"
                                    >
                                        <Search size={14} className="mr-3 text-slate-400" />
                                        Add New Staff
                                    </button>
                                    <button
                                        onClick={() => logout()}
                                        className="w-full flex items-center p-2 hover:bg-rose-50 rounded-2xl text-[11px] font-bold text-rose-600 transition-all"
                                    >
                                        <LogOut size={14} className="mr-3 text-rose-400" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="hidden lg:flex items-center space-x-12">
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
                        <p className="text-sm font-bold text-slate-900">A Dog's World</p>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Org Slug</p>
                        <p className="text-sm font-bold text-slate-900 tracking-tight">{org.slug}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
                <div className="hidden md:flex items-center space-x-2 bg-white/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white shadow-sm">
                    <div className="px-4 py-1.5 bg-white rounded-xl shadow-sm text-[10px] font-black text-slate-700 uppercase tracking-widest border border-slate-50">
                        {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', weekday: 'short' })}
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100">
                        <Bell size={18} />
                    </button>
                </div>

                {/* Mobile Action Row */}
                <div className="md:hidden flex items-center space-x-2">
                    <button className="p-2.5 text-slate-500 active:text-indigo-600 bg-white shadow-sm border border-slate-100 rounded-full transition-all">
                        <Bell size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
