import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />,
  error: <XCircle size={18} className="text-rose-500 flex-shrink-0" />,
  info: <Info size={18} className="text-indigo-500 flex-shrink-0" />,
  warning: <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />,
};

const BG_MAP: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200',
  error: 'bg-rose-50 border-rose-200',
  info: 'bg-indigo-50 border-indigo-200',
  warning: 'bg-amber-50 border-amber-200',
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${BG_MAP[toast.type]} ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
      role="alert"
    >
      {ICON_MAP[toast.type]}
      <span className="text-sm font-bold text-slate-800 flex-1">{toast.message}</span>
      <button
        onClick={() => { setIsExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
        className="p-1 hover:bg-black/5 rounded-lg transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X size={14} className="text-slate-400" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-28 lg:bottom-6 right-4 lg:right-6 z-[110] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-300">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
