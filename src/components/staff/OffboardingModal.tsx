
import React, { useState } from 'react';
import { AlertTriangle, Download, Trash2, X, CheckCircle, Lock, Loader2 } from 'lucide-react';
import { OffboardingService } from '../../services/offboarding';
import { Profile } from '../../types';
import { AuthService } from '../../services/supabase';

interface OffboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffMembers: Profile[]; // Changed to array
    onSuccess: () => void;
}

const OffboardingModal: React.FC<OffboardingModalProps> = ({ isOpen, onClose, staffMembers, onSuccess }) => {
    const [step, setStep] = useState<'confirm' | 'downloading' | 'ready' | 'password' | 'deleting' | 'skip-verify'>('confirm');
    const [hasDownloaded, setHasDownloaded] = useState(false);
    const [hasSkippedDownload, setHasSkippedDownload] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [skipPhase, setSkipPhase] = useState<'init' | 'first' | 'second'>('init');

    if (!isOpen) return null;

    const isBulk = staffMembers.length > 1;
    const title = isBulk ? `Delete ${staffMembers.length} Staff Members?` : 'Delete Staff Member?';
    const nameDisplay = isBulk ? `${staffMembers.length} selected staff` : staffMembers[0]?.full_name;

    const handleDownload = async () => {
        setStep('downloading');
        try {
            const targets = staffMembers.map(s => ({ id: s.id, name: s.full_name }));
            if (isBulk) {
                await OffboardingService.downloadBulkArchive(targets);
            } else {
                await OffboardingService.downloadStaffArchive(targets[0].id, targets[0].name);
            }
            setHasDownloaded(true);
            setStep('ready');
        } catch (error) {
            console.error("Download failed", error);
            setStep('confirm');
        }
    };

    const handleSkipVerification = async () => {
        if (skipPhase === 'first') {
            if (!password) {
                setPasswordError('Password required');
                return;
            }
            setPasswordError(null);
            setSkipPhase('second');
            return;
        }

        if (skipPhase === 'second') {
            if (password !== confirmPassword) {
                setPasswordError('Passwords do not match');
                return;
            }

            // Verify with actual auth
            const user = await AuthService.getCurrentUser();
            if (!user?.email) {
                setPasswordError('Session expired');
                return;
            }

            const { error } = await AuthService.signIn(user.email, password);
            if (error) {
                setPasswordError('Incorrect password');
                return;
            }

            setHasSkippedDownload(true);
            setStep('ready');
            setSkipPhase('init');
        }
    };

    const showPasswordPrompt = () => {
        setStep('password');
        setPassword('');
        setPasswordError(null);
    };

    const handlePasswordConfirm = async () => {
        if (!password) {
            setPasswordError('Please enter your password');
            return;
        }

        setPasswordError(null);

        // Verify password by re-authenticating
        const user = await AuthService.getCurrentUser();
        if (!user?.email) {
            setPasswordError('Unable to verify user. Please try again.');
            return;
        }

        const { error: authError } = await AuthService.signIn(user.email, password);
        if (authError) {
            setPasswordError('Incorrect password. Please try again.');
            return;
        }

        // Password verified, proceed with deletion
        setIsDeleting(true);
        setStep('deleting');
        try {
            const ids = staffMembers.map(s => s.id);
            if (isBulk) {
                await OffboardingService.nukeStaffMembers(ids);
            } else {
                await OffboardingService.nukeStaffMember(ids[0]);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Deletion failed", error);
            setIsDeleting(false);
            setStep('password');
            setPasswordError('Failed to delete. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-slate-200">
                {/* Header */}
                <div className="bg-rose-50 p-6 border-b border-rose-100 flex items-start gap-4">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-full shrink-0">
                        <AlertTriangle size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-rose-900 leading-tight">{title}</h2>
                        <p className="text-sm text-rose-700 font-medium mt-1">This action cannot be undone.</p>
                    </div>
                    <button onClick={onClose} className="ml-auto text-rose-400 hover:text-rose-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        {isBulk ? (
                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                                {staffMembers.length}
                            </div>
                        ) : (
                            <img src={staffMembers[0]?.avatar_url} className="w-12 h-12 rounded-full object-cover grayscale" alt="" />
                        )}
                        <div>
                            <div className="font-bold text-slate-900">{nameDisplay}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase">Offboarding</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${(!hasDownloaded && !hasSkippedDownload) ? 'border-indigo-100 bg-indigo-50/50' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${hasDownloaded || hasSkippedDownload ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                                    {hasDownloaded || hasSkippedDownload ? <CheckCircle size={14} /> : '1'}
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Download Records</h3>
                            </div>
                            <p className="text-xs text-slate-600 pl-9 mb-3">
                                {hasSkippedDownload
                                    ? "Compliance override complete. No backup generated."
                                    : isBulk
                                        ? "Download a master archive containing records for all selected staff."
                                        : "You must download a compliance archive before deletion."}
                            </p>

                            {!hasDownloaded && !hasSkippedDownload && (
                                <div className="ml-9 space-y-3">
                                    {skipPhase === 'init' ? (
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={handleDownload}
                                                disabled={step === 'downloading'}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition-all shadow-sm shadow-indigo-200 w-fit"
                                            >
                                                {step === 'downloading' ? (
                                                    <>Generating ZIP...</>
                                                ) : (
                                                    <>
                                                        <Download size={14} />
                                                        Download Archive {isBulk && '(Bulk)'}
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => { setSkipPhase('first'); setPassword(''); }}
                                                className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-wider text-left pl-1"
                                            >
                                                Delete without download
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-white/50 border border-slate-200 p-3 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secure Override</div>
                                                <button onClick={() => setSkipPhase('init')} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                                            </div>

                                            {passwordError && (
                                                <p className="text-[10px] font-bold text-rose-500">{passwordError}</p>
                                            )}

                                            <div className="space-y-2">
                                                {skipPhase === 'first' ? (
                                                    <input
                                                        type="password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder="Enter password..."
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-slate-100 focus:border-slate-300 outline-none"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        placeholder="Confirm password..."
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-slate-100 focus:border-slate-300 outline-none"
                                                        autoFocus
                                                    />
                                                )}

                                                <button
                                                    onClick={handleSkipVerification}
                                                    className="w-full py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-colors"
                                                >
                                                    {skipPhase === 'first' ? 'Next Step' : 'Verify Override'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${hasDownloaded || hasSkippedDownload ? 'border-rose-100 bg-rose-50/50' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${hasDownloaded || hasSkippedDownload ? 'bg-rose-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                                    2
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Confirm Deletion</h3>
                            </div>
                            <p className="text-xs text-slate-600 pl-9 mb-3">
                                Permanently remove {isBulk ? 'these users' : staffMembers[0]?.full_name?.split(' ')[0]} and wipe all database records.
                            </p>

                            {(hasDownloaded || hasSkippedDownload) && (
                                <button
                                    onClick={showPasswordPrompt}
                                    disabled={step === 'deleting'}
                                    className="ml-9 flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 disabled:opacity-70 transition-all shadow-sm shadow-rose-200 w-full justify-center"
                                >
                                    {step === 'deleting' ? (
                                        <>Deleting...</>
                                    ) : (
                                        <>
                                            <Trash2 size={14} />
                                            Permanently Delete {isBulk ? 'users' : 'Staff'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Password Confirmation Step */}
                    {step === 'password' && (
                        <div className="p-5 bg-rose-50 border-2 border-rose-200 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center">
                                    <Lock size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-rose-900">Confirm Your Password</h3>
                                    <p className="text-xs text-rose-600">Enter password to permanently delete {isBulk ? `${staffMembers.length} profiles` : 'this profile'}</p>
                                </div>
                            </div>

                            {passwordError && (
                                <div className="mb-4 p-3 bg-rose-100 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
                                    {passwordError}
                                </div>
                            )}

                            <div className="space-y-3">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 bg-white border-2 border-rose-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setStep('ready')}
                                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePasswordConfirm}
                                        disabled={!password || isDeleting}
                                        className="flex-1 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? (
                                            <><Loader2 size={16} className="animate-spin" /> Deleting...</>
                                        ) : (
                                            <><Trash2 size={16} /> Confirm Delete</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OffboardingModal;
