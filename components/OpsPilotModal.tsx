import React from 'react';
import { X, Send, Sparkles } from 'lucide-react';

interface OpsPilotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OpsPilotModal: React.FC<OpsPilotModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-slate-900 text-white rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Background Image Layer */}
                <img
                    src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&q=80&w=600"
                    className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
                />

                {/* Content Layer */}
                <div className="relative z-10 p-8 pb-32 sm:pb-8 flex flex-col min-h-[500px]">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <Sparkles className="text-indigo-400" size={24} />
                                <h3 className="text-3xl font-extrabold tracking-tight">OpsPilot</h3>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <p className="text-white/60 text-sm font-medium">Intelligence layer active</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-auto space-y-6">
                        <div className="space-y-4">
                            <p className="text-sm text-white/40 font-medium uppercase tracking-widest text-center">Suggested Queries</p>
                            <div className="grid grid-cols-1 gap-3">
                                {['Summary of Knowledge Base updates', 'Who is late for shift?', 'Check Opening SOPs'].map(q => (
                                    <button key={q} className="p-4 bg-white/5 backdrop-blur-md rounded-2xl text-sm font-bold text-left hover:bg-white/10 transition-all border border-white/10 flex items-center justify-between group">
                                        <span>{q}</span>
                                        <ArrowRightIcon className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-300" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <Sparkles size={14} />
                            </div>
                            <input
                                type="text"
                                autoFocus
                                placeholder="Ask intelligence anything..."
                                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl py-5 pl-16 pr-14 text-sm font-medium focus:outline-none focus:border-indigo-400/50 focus:bg-white/15 transition-all text-white placeholder-white/40 shadow-inner"
                            />
                            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white rounded-2xl text-slate-900 hover:scale-105 active:scale-95 transition-all">
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ArrowRightIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

export default OpsPilotModal;
