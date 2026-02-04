import React, { useState, useEffect } from 'react';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { SupabaseService } from '../../services/db';
import { UserPlus, Settings, Bell, Shield, LogOut, Copy, CheckCircle, Key, Banknote, HelpCircle, Save, AlertCircle } from 'lucide-react';
import { Organization } from '../../types';

const SettingsView = () => {
    const { setInviteModalOpen, logout, currentUser, organization, updateOrganizationSettings } = useOpsCenter();
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Pay Period State
    const [payPeriod, setPayPeriod] = useState(organization?.pay_period || 'weekly');
    const [startDay, setStartDay] = useState(organization?.pay_period_start_day || 1);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (organization) {
            setPayPeriod(organization.pay_period || 'weekly');
            setStartDay(organization.pay_period_start_day || 1);
        }
    }, [organization]);

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

    const handleSavePayrollSettings = async () => {
        if (!organization) return;

        setIsSaving(true);
        try {
            await updateOrganizationSettings({
                pay_period: payPeriod as any,
                pay_period_start_day: Number(startDay)
            });
            alert('Payroll settings updated successfully!');
        } catch (error) {
            alert('Failed to update payroll settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const isAdmin = currentUser.role === 'owner' || currentUser.role === 'manager';

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

                {/* Payroll Settings - Admin Only */}
                {isAdmin && (
                    <SectionCard className="space-y-6 md:col-span-2 border-t-4 border-t-indigo-500">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <Banknote size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">Payroll Configuration</h3>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Financial Controls</p>
                                </div>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase">
                                <Shield size={10} />
                                Admin Locked
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Period Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 ml-1">
                                    Pay Frequency
                                    <HelpCircle size={12} className="text-slate-300" />
                                </label>
                                <select
                                    value={payPeriod}
                                    onChange={(e) => setPayPeriod(e.target.value as any)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm"
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="biweekly">Bi-weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            {/* Start Day Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 ml-1">
                                    Cycle Start Day
                                    <HelpCircle size={12} className="text-slate-300" />
                                </label>
                                <select
                                    value={startDay}
                                    onChange={(e) => setStartDay(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm"
                                >
                                    <option value={0}>Sunday</option>
                                    <option value={1}>Monday</option>
                                    <option value={2}>Tuesday</option>
                                    <option value={3}>Wednesday</option>
                                    <option value={4}>Thursday</option>
                                    <option value={5}>Friday</option>
                                    <option value={6}>Saturday</option>
                                </select>
                            </div>

                            {/* Cycle Verification & Save */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 ml-1">
                                    Commit Changes
                                    <Shield size={12} className="text-indigo-500" />
                                </label>
                                <button
                                    onClick={handleSavePayrollSettings}
                                    disabled={isSaving}
                                    className={`w-full px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95'
                                        }`}
                                >
                                    {isSaving ? '...' : <><Save size={16} /> Save Configuration</>}
                                </button>
                            </div>
                        </div>

                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100/50 flex items-start gap-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-amber-500">
                                <AlertCircle size={20} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-amber-900">Important Note on Changes</p>
                                <p className="text-xs text-amber-700/80 font-medium leading-relaxed">
                                    Updating the pay cycle will immediately regroup shifts in the Payroll Manager and Timesheet views for all staff.
                                    Past pay stubs will maintain their original dates.
                                </p>
                            </div>
                        </div>
                    </SectionCard>
                )}

            </div>
        </div>
    );
};

export default SettingsView;
