import React, { useState } from 'react';
import { User, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, CheckCircle, ArrowLeft, Zap, ArrowRight } from 'lucide-react';
import { useOpsCenter } from '../services/store';

interface SignUpScreenProps {
    onSignUpSuccess: () => void;
    onBackToLogin: () => void;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ onSignUpSuccess, onBackToLogin }) => {
    const { signUp } = useOpsCenter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Default organization ID - in a real app, you might let users select or create an org
    const DEFAULT_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (fullName.trim().length < 2) {
            setError('Please enter your full name');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const { success: signUpSuccess, error: signUpError } = await signUp(
                email,
                password,
                fullName,
                DEFAULT_ORG_ID,
                'staff' // Default role for self-registration
            );

            if (signUpSuccess) {
                setSuccess(true);
                // Wait a moment then redirect
                setTimeout(() => {
                    onSignUpSuccess();
                }, 2000);
            } else {
                setError(signUpError || 'Failed to create account. Please try again.');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
                <div className="ambient-bg" />
                <div className="w-full max-w-md text-center glass-panel p-10 rounded-[2.5rem] relative z-10 animate-in zoom-in duration-300">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-50 mb-6 shadow-xl animate-bounce">
                        <CheckCircle size={40} className="text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">Account Created!</h2>
                    <p className="text-slate-500 mb-8 max-w-xs mx-auto text-sm">Welcome aboard, {fullName.split(' ')[0]}! Check your email to verify your account, then sign in.</p>
                    <button
                        onClick={onBackToLogin}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
                    >
                        <span>Go to Sign In</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
            <div className="ambient-bg" />

            <div className="w-full max-w-md relative z-10 animate-in slide-in-from-right-10 fade-in duration-500">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white mb-4 shadow-xl ring-4 ring-white/20">
                        <Zap size={28} className="text-yellow-300 fill-yellow-300" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Create Account</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Join the Provider OS Community</p>
                </div>

                {/* Sign Up Form */}
                <div className="glass-panel rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 opacity-50"></div>

                    <button
                        onClick={onBackToLogin}
                        className="flex items-center text-xs font-bold text-slate-400 hover:text-slate-700 mb-6 transition-colors group"
                    >
                        <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to Login
                    </button>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium text-rose-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative group/input">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Smith"
                                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-500/30 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                                    autoComplete="name"
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
                                    placeholder="you@company.com"
                                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-indigo-500/30 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                                    autoComplete="email"
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
                                    autoComplete="new-password"
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
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !email || !password || !fullName}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-[0.2em] opacity-60">
                    Terms & Privacy Policy
                </p>
            </div>
        </div>
    );
};

export default SignUpScreen;
