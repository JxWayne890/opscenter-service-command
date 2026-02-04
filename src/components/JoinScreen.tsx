import React, { useState } from 'react';
import { KeyRound, User, Mail, Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import { SupabaseService } from '../services/db';
import { useOpsCenter } from '../services/store';
import { Organization } from '../types';

interface JoinScreenProps {
    onJoinSuccess: () => void;
    onBackToLogin: () => void;
}

const JoinScreen: React.FC<JoinScreenProps> = ({ onJoinSuccess, onBackToLogin }) => {
    const { signUp } = useOpsCenter();
    const [step, setStep] = useState<'code' | 'profile'>('code');
    const [inviteCode, setInviteCode] = useState('');
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [inviteRole, setInviteRole] = useState<'staff' | 'manager'>('staff');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                // Default role from invite or staff
                setInviteRole(result.invitation?.role || 'staff');
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

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;

        // Validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { success, error: signUpError } = await signUp(
                email,
                password,
                fullName,
                organization.id,
                inviteRole
            );

            if (success) {
                onJoinSuccess();
            } else {
                setError(signUpError || 'Failed to create account. Please try again.');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
            <div className="ambient-bg" />

            <div className="w-full max-w-md relative z-10 animate-in slide-in-from-bottom-10 fade-in duration-700">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-indigo-700 text-white mb-6 shadow-2xl ring-4 ring-white/20">
                        <Zap size={32} className="text-yellow-300 fill-yellow-300" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight mb-2">Join Your Team</h1>
                    <p className="text-slate-500 font-medium text-lg">
                        {step === 'code' ? 'Enter invite code to start' : 'Create your profile'}
                    </p>
                </div>

                <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-blue via-indigo-500 to-purple-500 opacity-50"></div>

                    <button
                        onClick={step === 'profile' ? () => setStep('code') : onBackToLogin}
                        className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-700 mb-6 transition-colors group"
                    >
                        <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                        {step === 'profile' ? 'Back to Code' : 'Back to Login'}
                    </button>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium text-rose-700">{error}</p>
                        </div>
                    )}

                    {step === 'code' ? (
                        <form onSubmit={handleVerifyCode} className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Invite Code</label>
                                <div className="relative group/input">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        required
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                        placeholder="XXXXXX"
                                        maxLength={10}
                                        className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-500/30 rounded-2xl py-4 pl-12 pr-4 text-2xl font-display font-bold text-slate-900 tracking-[0.2em] text-center focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 text-center font-medium">Ask your manager for this code</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || inviteCode.length < 4}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Continue</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleCreateAccount} className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            {/* Organization Badge */}
                            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-3 mb-2 animate-in fade-in zoom-in duration-300">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle size={20} className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-900">Joining {organization?.name}</p>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Role: {inviteRole}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                                <div className="relative group/input">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your full name"
                                        className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-500/30 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                                <div className="relative group/input">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-500/30 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                                <div className="relative group/input">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-500/30 rounded-2xl py-4 pl-12 pr-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirm Password</label>
                                <div className="relative group/input">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-500/30 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Create Account & Join</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-[10px] font-bold text-slate-400 mt-8 uppercase tracking-[0.2em] opacity-60">
                    Provider OS Premium v2.4.0
                </p>
            </div>
        </div>
    );
};

export default JoinScreen;
