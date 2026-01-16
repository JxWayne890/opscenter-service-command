import React, { useState, useEffect } from 'react';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { SupabaseService } from '../../services/db';
import { UserPlus, Settings, Bell, Shield, LogOut, Copy, CheckCircle, Key } from 'lucide-react';

const SettingsView = () => {
    const { setInviteModalOpen, logout } = useOpsCenter();
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchCode = async () => {
            const org = await SupabaseService.getOrganization();
            if (org?.invite_code) {
                setInviteCode(org.invite_code);
            }
        };
        fetchCode();
    }, []);

    const handleCopyCode = () => {
        if (inviteCode) {
            navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <h2 className="text-2xl font-bold text-slate-900">Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invite Code Section */}
                <SectionCard className="space-y-4 md:col-span-2">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <Key size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Organization Invite Code</h3>
                            <p className="text-xs text-slate-400">Share this code with new team members to join</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 rounded-2xl">
                        <div>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Your Invite Code</p>
                            <p className="text-4xl font-black text-indigo-900 tracking-[0.3em]">{inviteCode || '------'}</p>
                        </div>
                        <button
                            onClick={handleCopyCode}
                            className="flex items-center space-x-2 px-5 py-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-indigo-600 font-bold text-sm border border-indigo-100"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle size={18} />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={18} />
                                    <span>Copy Code</span>
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400">New staff can use this code on the login screen by clicking "Join with Invite Code"</p>
                </SectionCard>

                {/* Team Management Section */}
                <SectionCard className="space-y-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Team Management</h3>
                            <p className="text-xs text-slate-400">Manage access and invitations</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setInviteModalOpen(true)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-white hover:shadow-md border border-slate-200 rounded-xl transition-all group"
                    >
                        <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Invite New Staff Member</span>
                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors">
                            <span className="text-lg leading-none text-slate-400 group-hover:text-white mb-0.5">+</span>
                        </div>
                    </button>
                </SectionCard>

                {/* Notifications Placeholder */}
                <SectionCard className="space-y-4 opacity-75">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <Bell size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Notifications</h3>
                            <p className="text-xs text-slate-400">Configure alerts & preferences</p>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium text-center">
                        Notification settings coming soon
                    </div>
                </SectionCard>

                {/* Security Placeholder */}
                <SectionCard className="space-y-4 opacity-75">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Security</h3>
                            <p className="text-xs text-slate-400">Password & 2FA</p>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium text-center">
                        Security controls coming soon
                    </div>
                </SectionCard>

                {/* App Info & Logout */}
                <SectionCard className="space-y-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">App Info</h3>
                            <p className="text-xs text-slate-400">Version 1.0.5 (Beta)</p>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full py-3 text-rose-500 font-bold text-sm bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center space-x-2"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </SectionCard>

            </div>
        </div>
    );
};

export default SettingsView;
