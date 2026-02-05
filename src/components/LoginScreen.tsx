import React, { useState } from 'react';
import { Mail, Lock, KeyRound, Loader2, AlertCircle, Eye, EyeOff, UserPlus, Zap, ArrowRight } from 'lucide-react';
import { useOpsCenter } from '../services/store';
import JoinScreen from './JoinScreen';
import SignUpScreen from './SignUpScreen';

interface LoginScreenProps {
    onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const { signIn, authLoading } = useOpsCenter();
    const [showJoin, setShowJoin] = useState(false);
    const [showSignUp, setShowSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { success, error: signInError } = await signIn(email, password);

        if (!success) {
            setError(signInError || 'Invalid email or password');
            setIsLoading(false);
            return;
        }

        // Auth state listener in store will handle navigation
        setIsLoading(false);
        onLogin();
    };

    const handleJoinSuccess = () => {
        onLogin();
    };

    const handleSignUpSuccess = () => {
        // After successful signup, go back to login to sign in
        setShowSignUp(false);
    };

    if (showSignUp) {
        return <SignUpScreen onSignUpSuccess={handleSignUpSuccess} onBackToLogin={() => setShowSignUp(false)} />;
    }

    if (showJoin) {
        return <JoinScreen onJoinSuccess={handleJoinSuccess} onBackToLogin={() => setShowJoin(false)} />;
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
                <div className="ambient-bg" />
                <div className="text-center relative z-10 p-8 glass-panel rounded-3xl animate-in fade-in zoom-in duration-500">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 bg-brand-blue/30 blur-xl rounded-full" />
                        <div className="relative w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Zap size={28} className="text-yellow-400 fill-yellow-400 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Initializing...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
            <div className="ambient-bg" />

            <div className="w-full max-w-md relative z-10 animate-in slide-in-from-bottom-10 fade-in duration-700">
                {/* Logo / Branding */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white mb-6 shadow-2xl ring-4 ring-white/20">
                        <Zap size={32} className="text-yellow-400 fill-yellow-400" />
                    </div>
                    <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight mb-2">Provider OS</h1>
                    <p className="text-slate-500 font-medium text-lg">Manage your business with intelligence</p>
                </div>

                {/* Login Form */}
                <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-blue via-brand-purple to-brand-violet opacity-50"></div>

                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-slate-900">Welcome Back</h2>
                        <p className="text-slate-400 text-sm mt-1">Enter your credentials to access the dashboard.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium text-rose-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group/input">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-brand-blue transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-brand-blue/30 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-blue/10 transition-all shadow-inner"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group/input">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-brand-blue transition-colors" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-brand-blue/30 rounded-2xl py-4 pl-12 pr-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-blue/10 transition-all shadow-inner"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors bg-transparent p-1 rounded-lg hover:bg-slate-200/50"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed group/btn"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center my-8">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                        <span className="px-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Or continue with</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Sign Up Button */}
                        <button
                            onClick={() => setShowSignUp(true)}
                            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-900 transition-all group/opt active:scale-[0.98]"
                        >
                            <UserPlus size={24} className="mb-2 text-indigo-500 group-hover/opt:scale-110 transition-transform" />
                            <span className="text-xs font-bold">Create Account</span>
                        </button>

                        {/* Join with Invite Code - Made More Prominent */}
                        <button
                            onClick={() => setShowJoin(true)}
                            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all group/opt active:scale-[0.98]"
                        >
                            <KeyRound size={24} className="mb-2 text-white/90 group-hover/opt:scale-110 transition-transform" />
                            <span className="text-xs font-bold">Have an Invite?</span>
                            <span className="text-[10px] text-white/70 mt-1">Join your team</span>
                        </button>
                    </div>
                </div>

                <p className="text-center text-[10px] font-bold text-slate-400 mt-8 uppercase tracking-[0.2em] opacity-60">
                    &copy; {new Date().getFullYear()} Provider OS Premium
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;
