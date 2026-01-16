import React, { useState } from 'react';
import { User, Shield, KeyRound } from 'lucide-react';
import { useOpsCenter } from '../services/store';
import JoinScreen from './JoinScreen';

interface LoginScreenProps {
    onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const { loginAs, staff } = useOpsCenter();
    const [showJoin, setShowJoin] = useState(false);

    const handleProfileSelect = (profile: any) => {
        loginAs(profile);
        onLogin();
    };

    const handleJoinSuccess = (orgId: string, role: 'staff' | 'manager') => {
        // Find the new profile in staff list (it might take a moment to refresh, 
        // but store updateStaff should handle it)
        onLogin();
    };

    if (showJoin) {
        return <JoinScreen onJoinSuccess={handleJoinSuccess} onBackToLogin={() => setShowJoin(false)} />;
    }

    const managers = staff.filter(s => s.role === 'owner' || s.role === 'manager');
    const regularStaff = staff.filter(s => s.role === 'staff' || (s.role !== 'owner' && s.role !== 'manager'));

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 animate-in fade-in duration-700">
            <div className="w-full max-w-md">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white mb-4 shadow-xl">
                        <span className="text-2xl">🐕</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">A Dog's World</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Provider OS Management</p>
                </div>

                {/* Profile Selection */}
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome Back</h2>
                    <p className="text-xs text-slate-400 mb-8 font-medium">Select a profile to access the dashboard</p>

                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Managers Section */}
                        {managers.length > 0 && (
                            <div>
                                <div className="flex items-center space-x-2 mb-3 ml-1">
                                    <Shield size={12} className="text-indigo-500" />
                                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Management View</h3>
                                </div>
                                <div className="space-y-2">
                                    {managers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleProfileSelect(user)}
                                            className="w-full flex items-center p-3 bg-indigo-50/30 hover:bg-white border border-indigo-100/50 hover:border-indigo-300 rounded-2xl transition-all group hover:shadow-md active:scale-[0.98]"
                                        >
                                            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                                            <div className="ml-3 text-left flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors uppercase text-xs tracking-wide">{user.full_name}</h4>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">
                                                    {user.role === 'owner' ? 'Administrator' : 'Manager'}
                                                </p>
                                            </div>
                                            <Shield size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Staff Section */}
                        {regularStaff.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Staff</h3>
                                <div className="space-y-2">
                                    {regularStaff.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleProfileSelect(user)}
                                            className="w-full flex items-center p-3 bg-slate-50 hover:bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl transition-all group hover:shadow-md active:scale-[0.98]"
                                        >
                                            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                                            <div className="ml-3 text-left flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors uppercase text-xs tracking-wide">{user.full_name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Team member</p>
                                            </div>
                                            <User size={14} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {staff.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-sm font-bold text-slate-400">No profiles found</p>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center my-8">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="px-4 text-[10px] text-slate-300 font-black uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    {/* Join with Invite Code */}
                    <button
                        onClick={() => setShowJoin(true)}
                        className="w-full flex items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl transition-all group hover:bg-indigo-50 active:scale-[0.98]"
                    >
                        <KeyRound size={18} className="text-slate-400 group-hover:text-indigo-600 mr-3" />
                        <span className="text-xs font-black text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest">Join with Invite Code</span>
                    </button>
                </div>

                <p className="text-center text-[10px] font-bold text-slate-300 mt-8 uppercase tracking-[0.2em]">
                    Provider OS Premium v2.4.0
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;
