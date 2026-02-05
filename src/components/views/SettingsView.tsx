import React, { useState, useEffect } from 'react';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { SupabaseService } from '../../services/db';
import { UserPlus, Settings, Bell, Shield, LogOut, Copy, CheckCircle, Key, Banknote, HelpCircle, Save, AlertCircle, Trash2 } from 'lucide-react';
import OffboardingModal from '../staff/OffboardingModal';
import { Organization } from '../../types';

// Invite Code Card Component
const InviteCodeCard = ({ label, code, description, colorScheme, icon, comingSoon = false }: {
    label: string;
    code: string;
    description: string;
    colorScheme: 'indigo' | 'emerald' | 'amber';
    icon: string;
    comingSoon?: boolean;
}) => {
    const [copied, setCopied] = useState(false);

    const colorStyles = {
        indigo: {
            bg: 'bg-gradient-to-br from-indigo-50 to-purple-50',
            border: 'border-indigo-100',
            text: 'text-indigo-900',
            subtext: 'text-indigo-400',
            button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        },
        emerald: {
            bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
            border: 'border-emerald-100',
            text: 'text-emerald-900',
            subtext: 'text-emerald-500',
            button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        },
        amber: {
            bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
            border: 'border-amber-100',
            text: 'text-amber-900',
            subtext: 'text-amber-500',
            button: 'bg-amber-600 hover:bg-amber-700 text-white',
        },
    };

    const colors = colorStyles[colorScheme];

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`relative p-5 rounded-2xl border ${colors.bg} ${colors.border} transition-all hover:shadow-lg`}>
            {comingSoon && (
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full uppercase">
                    Coming Soon
                </div>
            )}
            <div className="text-2xl mb-3">{icon}</div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${colors.subtext}`}>{label}</p>
            <p className={`text-2xl font-black tracking-[0.2em] mb-2 ${colors.text}`}>{code}</p>
            <p className="text-xs text-slate-500 mb-4">{description}</p>
            <button
                onClick={handleCopy}
                disabled={comingSoon}
                className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${comingSoon ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : colors.button}`}
            >
                {copied ? (
                    <><CheckCircle size={16} /> Copied!</>
                ) : (
                    <><Copy size={16} /> Copy Code</>
                )}
            </button>
        </div>
    );
};

const SettingsView = () => {
    const { setInviteModalOpen, logout, currentUser, organization, updateOrganizationSettings } = useOpsCenter();
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Pay Period State
    const [payPeriod, setPayPeriod] = useState(organization?.pay_period || 'weekly');
    const [startDay, setStartDay] = useState(organization?.pay_period_start_day || 1);
    const [isSaving, setIsSaving] = useState(false);
    const [showSelfDeleteModal, setShowSelfDeleteModal] = useState(false);

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

            {/* Invite Codes Section - Admin Only */}
            {isAdmin && (
                <SectionCard className="space-y-6 md:col-span-2">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <Key size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Invite Codes</h3>
                            <p className="text-xs text-slate-400">Share these codes for new users to join with the appropriate role</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Staff Code */}
                        <InviteCodeCard
                            label="Staff Invite Code"
                            code="DOGS24"
                            description="For team members to join as staff"
                            colorScheme="indigo"
                            icon="👤"
                        />

                        {/* Admin Code */}
                        <InviteCodeCard
                            label="Admin Invite Code"
                            code="ADMIN24"
                            description="For managers with full access"
                            colorScheme="emerald"
                            icon="🔐"
                        />

                        {/* Client Code */}
                        <InviteCodeCard
                            label="Client Invite Code"
                            code="PET24"
                            description="Client portal coming soon"
                            colorScheme="amber"
                            icon="🐕"
                            comingSoon
                        />
                    </div>
                </SectionCard>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Danger Zone - Delete Own Account */}
            <div className="mt-12 pt-12 border-t border-slate-200">
                <SectionCard className="border-rose-100 bg-rose-50/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Danger Zone</h3>
                                <p className="text-sm text-slate-500 font-medium">Permanently delete your entire provider profile and all associated data.</p>
                                <p className="text-xs text-rose-600 font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                                    <AlertCircle size={14} />
                                    This action is final and cannot be undone
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSelfDeleteModal(true)}
                            className="px-6 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95 whitespace-nowrap"
                        >
                            Delete My Account
                        </button>
                    </div>
                </SectionCard>
            </div>

            {showSelfDeleteModal && (
                <OffboardingModal
                    isOpen={showSelfDeleteModal}
                    onClose={() => setShowSelfDeleteModal(false)}
                    staffMembers={[currentUser]}
                    onSuccess={() => {
                        setShowSelfDeleteModal(false);
                        logout(); // Sign out after self-deletion
                    }}
                />
            )}
        </div>
    );
};

export default SettingsView;
