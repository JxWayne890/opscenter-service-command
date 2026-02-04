import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'bg-rose-50 text-rose-500 ring-4 ring-rose-50/50',
            button: 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
        },
        warning: {
            icon: 'bg-amber-50 text-amber-500 ring-4 ring-amber-50/50',
            button: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
        },
        info: {
            icon: 'bg-indigo-50 text-indigo-500 ring-4 ring-indigo-50/50',
            button: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
        }
    };

    const styles = variantStyles[variant];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-sm bg-white/95 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center ${styles.icon}`}>
                        <AlertTriangle size={32} />
                    </div>
                </div>

                {/* Content */}
                <div className="text-center mb-8">
                    <h3 className="text-xl font-display font-bold text-slate-900 mb-3 tracking-tight">{title}</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 ${styles.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ConfirmDialog;
