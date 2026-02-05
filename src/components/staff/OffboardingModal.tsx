
import React, { useState } from 'react';
import { AlertTriangle, Download, Trash2, X, CheckCircle } from 'lucide-react';
import { OffboardingService } from '../../services/offboarding';
import { Profile } from '../../types';

interface OffboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffMembers: Profile[]; // Changed to array
    onSuccess: () => void;
}

const OffboardingModal: React.FC<OffboardingModalProps> = ({ isOpen, onClose, staffMembers, onSuccess }) => {
    const [step, setStep] = useState<'confirm' | 'downloading' | 'ready' | 'deleting'>('confirm');
    const [hasDownloaded, setHasDownloaded] = useState(false);

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

    const handleDelete = async () => {
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
            setStep('ready');
            alert("Failed to delete. Check console.");
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
                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${!hasDownloaded ? 'border-indigo-100 bg-indigo-50/50' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${hasDownloaded ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                                    {hasDownloaded ? <CheckCircle size={14} /> : '1'}
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Download Records</h3>
                            </div>
                            <p className="text-xs text-slate-600 pl-9 mb-3">
                                {isBulk
                                    ? "Download a master archive containing records for all selected staff."
                                    : "You must download a compliance archive before deletion."}
                            </p>

                            {!hasDownloaded && (
                                <button
                                    onClick={handleDownload}
                                    disabled={step === 'downloading'}
                                    className="ml-9 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-70 transition-all shadow-sm shadow-indigo-200"
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
                            )}
                        </div>

                        <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${hasDownloaded ? 'border-rose-100 bg-rose-50/50' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${hasDownloaded ? 'bg-rose-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                                    2
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Confirm Deletion</h3>
                            </div>
                            <p className="text-xs text-slate-600 pl-9 mb-3">
                                Permanently remove {isBulk ? 'these users' : staffMembers[0]?.full_name?.split(' ')[0]} and wipe all database records.
                            </p>

                            {hasDownloaded && (
                                <button
                                    onClick={handleDelete}
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
                </div>
            </div>
        </div>
    );
};

export default OffboardingModal;
