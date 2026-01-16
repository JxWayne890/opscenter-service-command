import React, { useState } from 'react';
import { KeyRound, User, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { SupabaseService } from '../services/db';
import { Organization } from '../types';

interface JoinScreenProps {
    onJoinSuccess: (orgId: string, role: 'staff' | 'manager') => void;
    onBackToLogin: () => void;
}

const JoinScreen: React.FC<JoinScreenProps> = ({ onJoinSuccess, onBackToLogin }) => {
    const [step, setStep] = useState<'code' | 'profile'>('code');
    const [inviteCode, setInviteCode] = useState('');
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'staff' | 'manager'>('staff');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await SupabaseService.getInvitationByCode(inviteCode);
            if (result?.organization) {
                setOrganization(result.organization);
                setStep('profile');
            } else {
                setError('Invalid invite code. Please check and try again.');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;

        setIsLoading(true);
        setError(null);

        try {
            const profile = await SupabaseService.createProfile({
                id: crypto.randomUUID(),
                organization_id: organization.id,
                email,
                full_name: fullName,
                role,
                status: 'active'
            });

            if (profile) {
                onJoinSuccess(organization.id, role);
            } else {
                setError('Failed to create profile. Please try again.');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00AEEF] to-[#0054A6] text-white mb-4 shadow-xl">
                        <span className="text-2xl">🐕</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Join Your Team</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Enter your invite code to get started</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                            <AlertCircle size={20} className="text-red-500" />
                            <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                    )}

                    {step === 'code' ? (
                        <form onSubmit={handleVerifyCode} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Invite Code</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                        placeholder="XXXXXX"
                                        maxLength={6}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-lg font-black text-slate-900 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all uppercase"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 text-center">Get this code from your manager</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || inviteCode.length < 4}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <span>Continue</span>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleCreateProfile} className="space-y-6">
                            {/* Organization Badge */}
                            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 mb-2">
                                <CheckCircle size={20} className="text-green-600" />
                                <div>
                                    <p className="text-sm font-bold text-green-900">Joining {organization?.name}</p>
                                    <p className="text-xs text-green-600">Code verified successfully</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your full name"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-[#00AEEF] to-[#0054A6] text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Creating Profile...</span>
                                    </>
                                ) : (
                                    <span>Join Team</span>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <button
                    onClick={onBackToLogin}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-900 font-medium mt-6 transition-colors"
                >
                    ← Back to Login
                </button>
            </div>
        </div>
    );
};

export default JoinScreen;
