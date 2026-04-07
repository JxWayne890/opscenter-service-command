import React, { useEffect, useState } from 'react';
import { Bell, X, Check, CheckCheck, Clock, DollarSign, Calendar, Info } from 'lucide-react';
import { AppNotification } from '../types';
import { NotificationService } from '../services/notifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcon = (category: AppNotification['category']) => {
  switch (category) {
    case 'shift': return <Calendar size={14} className="text-indigo-500" />;
    case 'payroll': return <DollarSign size={14} className="text-emerald-500" />;
    case 'timeoff': return <Clock size={14} className="text-amber-500" />;
    default: return <Info size={14} className="text-slate-400" />;
  }
};

const typeColor = (type: AppNotification['type']) => {
  switch (type) {
    case 'success': return 'border-l-emerald-500';
    case 'warning': return 'border-l-amber-500';
    case 'error': return 'border-l-rose-500';
    default: return 'border-l-indigo-500';
  }
};

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    setNotifications(NotificationService.getAll());
    return NotificationService.subscribe(setNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div role="region" aria-label="Notifications" aria-live="polite" className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => NotificationService.markAllRead()}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Mark all as read"
              >
                <CheckCheck size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-10 text-center">
              <Bell size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-400">No notifications yet</p>
              <p className="text-xs text-slate-300 mt-1">You'll see shift reminders, approvals, and alerts here.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-5 py-3.5 border-b border-slate-50 border-l-2 ${typeColor(n.type)} hover:bg-slate-50 transition-colors cursor-pointer ${n.read ? 'opacity-60' : ''}`}
                onClick={() => NotificationService.markRead(n.id)}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {categoryIcon(n.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? 'text-slate-600' : 'text-slate-900 font-semibold'} leading-snug`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{n.message}</p>
                  <p className="text-xs text-slate-300 mt-1 font-medium">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); NotificationService.dismiss(n.id); }}
                  className="p-1 text-slate-300 hover:text-slate-500 rounded transition-colors flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
