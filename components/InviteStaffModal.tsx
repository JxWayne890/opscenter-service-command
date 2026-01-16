import React, { useState, useRef, useEffect } from 'react';
import { X, Mail, Shield, ChevronDown, Loader2, Check, Copy, CheckCircle } from 'lucide-react';
import { useOpsCenter } from '../services/store';
import { SupabaseService } from '../services/db';

const ROLES = [
    { value: 'staff', label: 'Staff Member', description: 'View schedule, clock in/out' },
    { value: 'manager', label: 'Manager', description: 'Full access, manage team' },
];

const InviteStaffModal = () => {
    const { isInviteModalOpen, setInviteModalOpen, addStaff } = useOpsCenter();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'staff' | 'manager'>('staff');
    const [isLoading, setIsLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [success, setSuccess] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch org invite code on mount
    useEffect(() => {
        const fetchOrgCode = async () => {
            const org = await SupabaseService.getOrganization();
            if (org?.invite_code) {
                setInviteCode(org.invite_code);
            }
        };
        if (isInviteModalOpen) {
            fetchOrgCode();
            setSuccess(false);
            setEmail('');
        }
    }, [isInviteModalOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isInviteModalOpen) return null;

    const handleCopyCode = () => {
        if (inviteCode) {
            navigator.clipboard.writeText(inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // 1. Create invitation
            await SupabaseService.createInvitation(email, role);

            // 2. ALSO create profile immediately for testing/demo purposes
            const fullName = email.split('@')[0];
            const capitalizedName = fullName.charAt(0).toUpperCase() + fullName.slice(1);

            await addStaff({
                id: crypto.randomUUID(),
                organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // ORG_ID
                email,
                full_name: capitalizedName,
                role: role,
                status: 'active',
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
            });

            setSuccess(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedRole = ROLES.find(r => r.value === role);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={() => setInviteModalOpen(false)}
            />

            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-visible animate-in fade-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Invite Staff</h2>
                            <p className="text-sm text-slate-500 font-medium mt-1">Send an invitation to join your team</p>
                        </div>
                        <button
                            onClick={() => setInviteModalOpen(false)}
                            className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Invite Code Display */}
                    {inviteCode && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Organization Invite Code</p>
                                    <p className="text-2xl font-black text-indigo-900 tracking-widest">{inviteCode}</p>
                                </div>
                                <button
                                    onClick={handleCopyCode}
                                    className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-indigo-600"
                                >
                                    {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                            <p className="text-[11px] text-indigo-500 mt-2">Share this code with new team members</p>
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Invitation Sent!</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                {email} can now join using code <strong>{inviteCode}</strong>
                            </p>
                            <button
                                onClick={() => { setSuccess(false); setEmail(''); }}
                                className="text-indigo-600 font-bold text-sm hover:underline"
                            >
                                Send Another Invite
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="newmember@company.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 relative" ref={dropdownRef}>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Role</label>
                                <div
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-10 text-sm font-bold text-slate-900 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-indigo-500/20 transition-all ${isDropdownOpen ? 'ring-2 ring-indigo-500/20' : ''}`}
                                >
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <div>
                                        <span>{selectedRole?.label}</span>
                                        <span className="text-slate-400 text-xs ml-2">• {selectedRole?.description}</span>
                                    </div>
                                    <ChevronDown className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} size={16} />
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-[210] animate-in fade-in zoom-in-95 duration-150">
                                        {ROLES.map((r) => (
                                            <div
                                                key={r.value}
                                                onClick={() => {
                                                    setRole(r.value as 'staff' | 'manager');
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`px-4 py-3 cursor-pointer transition-colors ${role === r.value ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-900">{r.label}</span>
                                                        <p className="text-xs text-slate-400">{r.description}</p>
                                                    </div>
                                                    {role === r.value && <Check size={16} className="text-indigo-600" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Creating Invite...</span>
                                        </>
                                    ) : (
                                        <span>Send Invitation</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
                <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-medium">
                        The invite will be recorded. Share the code <strong>{inviteCode}</strong> with them.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InviteStaffModal;
