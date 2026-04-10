import React, { useState, useEffect } from 'react';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { SupabaseService } from '../../services/db';
import { UserPlus, Settings, Bell, Shield, LogOut, Copy, CheckCircle, Key, Banknote, HelpCircle, Save, AlertCircle, Trash2, DollarSign, Plus } from 'lucide-react';
import { BillingService } from '../../services/billing';
import { ServiceType } from '../../types';
import OffboardingModal from '../staff/OffboardingModal';
import { Organization } from '../../types';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isManager } from '../../services/permissions';
import { useToast } from '../ui/Toast';

// ─── Service Pricing Card ─────────────────────
const ServicePricingCard = () => {
    const [services, setServices] = useState<ServiceType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRate, setEditRate] = useState('');
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState<ServiceType['category']>('other');
    const [newRate, setNewRate] = useState('');
    const [newUnit, setNewUnit] = useState<ServiceType['rate_unit']>('per_session');
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => {
        BillingService.getServiceTypes().then(data => { setServices(data); setLoading(false); });
    }, []);

    const handleSaveRate = async (svc: ServiceType) => {
        const updated = await BillingService.upsertServiceType({ ...svc, rate: parseFloat(editRate) || 0 });
        if (updated) {
            setServices(prev => prev.map(s => s.id === svc.id ? updated : s));
        }
        setEditingId(null);
    };

    const handleAdd = async () => {
        if (!newName.trim()) return;
        const created = await BillingService.upsertServiceType({
            name: newName.trim(),
            category: newCategory,
            rate: parseFloat(newRate) || 0,
            rate_unit: newUnit,
            is_active: true,
        });
        if (created) {
            setServices(prev => [...prev, created]);
            setNewName(''); setNewRate(''); setShowAdd(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (await BillingService.deleteServiceType(id)) {
            setServices(prev => prev.filter(s => s.id !== id));
        }
    };

    const unitLabels: Record<string, string> = { per_night: '/night', per_day: '/day', per_session: '/session', per_hour: '/hour' };

    return (
        <SectionCard className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><DollarSign size={20} /></div>
                    <div>
                        <h3 className="font-bold text-slate-900">Services & Pricing</h3>
                        <p className="text-xs text-slate-400">Define your service rates for billing</p>
                    </div>
                </div>
                <button onClick={() => setShowAdd(!showAdd)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                    <Plus size={16} />
                </button>
            </div>

            {showAdd && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Service name" className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        <select value={newCategory} onChange={e => setNewCategory(e.target.value as any)} className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                            <option value="boarding">Boarding</option>
                            <option value="daycare">Daycare</option>
                            <option value="training">Training</option>
                            <option value="grooming">Grooming</option>
                            <option value="other">Other</option>
                        </select>
                        <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="Rate ($)" className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        <select value={newUnit} onChange={e => setNewUnit(e.target.value as any)} className="p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                            <option value="per_night">Per Night</option>
                            <option value="per_day">Per Day</option>
                            <option value="per_session">Per Session</option>
                            <option value="per_hour">Per Hour</option>
                        </select>
                    </div>
                    <button onClick={handleAdd} className="w-full py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors">Add Service</button>
                </div>
            )}

            {loading ? (
                <div className="p-4 text-center text-sm text-slate-400">Loading services...</div>
            ) : services.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    No services defined yet. Add your first service above.
                </div>
            ) : (
                <div className="space-y-2">
                    {services.map(svc => (
                        <div key={svc.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors group">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900">{svc.name}</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{svc.category}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {editingId === svc.id ? (
                                    <>
                                        <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} className="w-20 p-1.5 border rounded-lg text-sm text-right font-bold" autoFocus />
                                        <button onClick={() => handleSaveRate(svc)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"><Save size={14} /></button>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-sm font-black text-slate-900">${svc.rate.toFixed(2)}</span>
                                        <span className="text-xs text-slate-400 font-medium">{unitLabels[svc.rate_unit]}</span>
                                        <button onClick={() => { setEditingId(svc.id); setEditRate(svc.rate.toString()); }} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Settings size={14} /></button>
                                        <button onClick={() => handleDelete(svc.id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </SectionCard>
    );
};

// Invite Code Card Component - Now supports editing for authorized codes
const InviteCodeCard = ({ label, code, description, colorScheme, icon, comingSoon = false, onSave }: {
    label: string;
    code: string;
    description: string;
    colorScheme: 'indigo' | 'emerald' | 'amber';
    icon: string;
    comingSoon?: boolean;
    onSave?: (newCode: string) => void;
}) => {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tempCode, setTempCode] = useState(code);

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

    const handleSave = () => {
        if (onSave && tempCode !== code) {
            onSave(tempCode);
        }
        setIsEditing(false);
    };

    return (
        <div className={`relative p-5 rounded-2xl border ${colors.bg} ${colors.border} transition-all hover:shadow-lg`}>
            {comingSoon && (
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full uppercase">
                    Coming Soon
                </div>
            )}
            <div className="flex justify-between items-start">
                <div className="text-2xl mb-3">{icon}</div>
                {onSave && !comingSoon && (
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="p-1.5 hover:bg-white/50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                        title="Edit Code"
                    >
                        <Settings size={14} />
                    </button>
                )}
            </div>

            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${colors.subtext}`}>{label}</p>

            {isEditing ? (
                <div className="mb-2 flex gap-2">
                    <input
                        value={tempCode}
                        onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                        className="w-full bg-white/50 border border-slate-200 rounded px-2 py-1 text-lg font-bold tracking-wider"
                        autoFocus
                    />
                    <button onClick={handleSave} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                        <Save size={16} />
                    </button>
                </div>
            ) : (
                <p className={`text-2xl font-black tracking-[0.2em] mb-2 ${colors.text}`}>{code || '---'}</p>
            )}

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
    const { showToast } = useToast();
    usePageTitle('Settings');
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
        const fetchCodes = async () => {
            const org = await SupabaseService.getOrganization();
            if (org) {
                if (org.invite_code) setInviteCode(org.invite_code);
                if (org.client_invite_code) setClientInviteCode(org.client_invite_code);
            }
        };
        fetchCodes();
    }, []);

    const [clientInviteCode, setClientInviteCode] = useState<string>('PET24');



    const handleUpdateClientCode = async (newCode: string) => {
        if (!organization?.id) return;
        const success = await SupabaseService.updateOrganization(organization.id, { client_invite_code: newCode });
        if (success) {
            setClientInviteCode(newCode);
            showToast('Client invite code updated!');
        } else {
            showToast('Failed to update code.', 'error');
        }
    };

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
            showToast('Payroll settings updated!');
        } catch (error) {
            showToast('Failed to update payroll settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const isAdmin = isManager(currentUser);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Settings</h1>

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
                            code={clientInviteCode}
                            description="Share with clients for portal access"
                            colorScheme="amber"
                            icon="🐕"
                            onSave={handleUpdateClientCode}
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

                {/* Services & Pricing */}
                <ServicePricingCard />

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
                            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase">
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
