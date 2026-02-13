import React, { useState } from 'react';
import { supabase } from '../../services/db';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertCircle, Dog } from 'lucide-react';

const PortalLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [accessCode] = useState('PET24');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: orgs, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('client_invite_code', accessCode)
                .limit(1);

            if (orgError || !orgs || orgs.length === 0) throw new Error('Invalid Access Code');

            const organization = orgs[0];

            const { data: clients, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('organization_id', organization.id)
                .ilike('email', email)
                .limit(1);

            if (clientError || !clients || clients.length === 0) {
                throw new Error('We couldn\'t find an account with that email.');
            }

            const client = clients[0];
            localStorage.setItem('portal_client_id', client.id);
            localStorage.setItem('portal_org_id', organization.id);
            navigate('/portal/dashboard');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Access denied.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            {/* Left Side - Professional Gradient */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-700 to-blue-600 relative overflow-hidden items-center justify-center p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 max-w-lg">
                    <div className="bg-white/10 backdrop-blur-lg w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-white/20">
                        <Dog size={32} />
                    </div>
                    <h1 className="text-4xl font-bold mb-6 leading-tight">Manage your pet's care with ease.</h1>
                    <p className="text-indigo-100 text-lg leading-relaxed">
                        View updates, check schedules, and communicate directly with your care team from one secure portal.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-white">
                <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="text-center lg:text-left">
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Client Portal</h2>
                        <p className="text-gray-500 mt-2">Sign in using your authorized email.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-3 border border-red-100">
                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-lg transition-all text-gray-900 placeholder:text-gray-400"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Access Code</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={accessCode}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-500 font-mono text-sm rounded-lg cursor-not-allowed select-none"
                                />
                                <p className="text-xs text-gray-400 mt-1.5 ml-1">This code is auto-filled for your organization.</p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? 'Verifying...' : (
                                <>
                                    <span>Sign In</span>
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-6 border-t border-gray-100 text-center">
                        <p className="text-gray-400 text-sm">
                            Powered by Provider OS
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortalLogin;
