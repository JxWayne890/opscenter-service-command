import React, { useState, useRef, useEffect } from 'react';
import { X, Mail, Shield, ChevronDown, Loader2, Check } from 'lucide-react';
import { useOpsCenter } from '../services/store';

const ROLES = [
    { value: 'staff', label: 'Staff Member' },
    { value: 'manager', label: 'Manager' },
    { value: 'owner', label: 'Admin / Owner' },
];

const InviteStaffModal = () => {
    const { isInviteModalOpen, setInviteModalOpen, inviteStaff } = useOpsCenter();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('staff');
    const [isLoading, setIsLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await inviteStaff(email, role);
            setInviteModalOpen(false);
            setEmail('');
            setRole('staff');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedRoleLabel = ROLES.find(r => r.value === role)?.label;

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
                            <p className="text-sm text-slate-500 font-medium mt-1">Send an invitation to join the organization.</p>
                        </div>
                        <button
                            onClick={() => setInviteModalOpen(false)}
                            className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

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
                                    placeholder="colleague@company.com"
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
                                <span>{selectedRoleLabel}</span>
                                <ChevronDown className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} size={16} />
                            </div>

                            {isDropdownOpen && (
                                <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-[210] animate-in fade-in zoom-in-95 duration-150">
                                    {ROLES.map((r) => (
                                        <div
                                            key={r.value}
                                            onClick={() => {
                                                setRole(r.value);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${role === r.value ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'}`}
                                        >
                                            <span className="text-sm font-bold">{r.label}</span>
                                            {role === r.value && <Check size={16} className="text-indigo-600" />}
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
                                        <span>Sending Invite...</span>
                                    </>
                                ) : (
                                    <span>Send Invitation</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-medium">
                        They will receive an email with a link to set their password.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InviteStaffModal;
