import React, { useState } from 'react';
import { Calendar, User, Clock, MoreVertical, Shield, CheckCircle2, AlertCircle, LogOut, Edit2, Lock, Trash2, X } from 'lucide-react';
import { Shift, Profile, TimeEntry } from '../../types';
import { useOpsCenter } from '../../services/store';
import { isManager } from '../../services/permissions';
import ConfirmDialog from '../ui/ConfirmDialog';

interface SmartRosterTableProps {
    entries: TimeEntry[];
    onMemberClick?: (staffId: string) => void;
    onEditEntry?: (entry: TimeEntry) => void;
}

const SmartRosterTable: React.FC<SmartRosterTableProps> = ({ entries, onMemberClick, onEditEntry }) => {
    const { currentUser, updateTimeEntry, deleteTimeEntries, clockOut, staff } = useOpsCenter();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const canManage = isManager(currentUser);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === entries.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(entries.map(s => s.id)));
        }
    };

    const handleBulkApprove = async () => {
        for (const id of Array.from(selectedIds)) {
            await updateTimeEntry(id, { status: 'approved' });
        }
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
        await deleteTimeEntries(Array.from(selectedIds));
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
    };

    // Helper for Status Badge
    const getStatusBadge = (status: TimeEntry['status']) => {
        if (status === 'active') {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide animate-pulse">Live</span>;
        }
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wide flex items-center gap-1"><Lock size={10} /> Approved</span>;
            case 'rejected':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 uppercase tracking-wide">Rejected</span>;
            case 'pending_approval':
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">Pending Approval</span>;
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Bulk Action Header */}
            {canManage && selectedIds.size > 0 && (
                <div className="bg-indigo-50 px-6 py-3 flex items-center justify-between border-b border-indigo-100 animate-in slide-in-from-top-2">
                    <span className="text-xs font-bold text-indigo-900">{selectedIds.size} entries selected</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="bg-white text-rose-600 border border-rose-100 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-rose-50 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            <span>Delete Selected</span>
                        </button>
                        <button
                            onClick={handleBulkApprove}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <CheckCircle2 size={14} />
                            <span>Approve Selected</span>
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            {canManage && entries.length > 0 && (
                                <th className="px-6 py-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={selectedIds.size === entries.length && entries.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                            )}
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Staff Member</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actual Time</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Break</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {entries.map(entry => {
                            const isMe = entry.user_id === currentUser.id;
                            const isActive = entry.status === 'active';
                            const isLocked = entry.status === 'approved';

                            // Resolve Staff Profile
                            const staffMember = staff.find(s => s.id === entry.user_id);
                            const avatarUrl = staffMember?.avatar_url;
                            const fullName = staffMember?.full_name || 'Unknown User';
                            const initials = fullName === 'Unknown User' ? '??' : fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                            return (
                                <tr key={entry.id} className={`transition-colors ${isActive ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}>
                                    {canManage && (
                                        <td className="px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                                disabled={isLocked || isActive}
                                                checked={selectedIds.has(entry.id)}
                                                onChange={() => toggleSelect(entry.id)}
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div
                                            className="flex items-center space-x-3 cursor-pointer hover:opacity-75 transition-opacity"
                                            onClick={() => entry.user_id && onMemberClick?.(entry.user_id)}
                                        >
                                            {avatarUrl ? (
                                                <img src={avatarUrl} className="w-8 h-8 rounded-full border border-slate-200" />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-indigo-100 text-indigo-600`}>
                                                    {initials}
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                                                    {fullName}
                                                </div>
                                                {isMe && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 rounded">YOU</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                        Punch Entry
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                                                <span>{new Date(entry.clock_in).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
                                                <Clock size={12} />
                                                <span>
                                                    {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {' - '}
                                                    {isActive ? <span className="text-emerald-600 font-bold animate-pulse">Now</span> : (entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...')}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                        {entry.total_break_minutes ? `${entry.total_break_minutes}m` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {getStatusBadge(entry.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {/* Action Buttons */}
                                            {isActive ? (
                                                isMe ? (
                                                    <button
                                                        onClick={() => clockOut()}
                                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-[10px] font-bold hover:bg-red-200 transition-colors flex items-center gap-1"
                                                    >
                                                        <LogOut size={12} /> Clock Out
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => alert('Force clock out moved to Staff View')}
                                                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-50 transition-colors flex items-center gap-1"
                                                        title="Force Clock Out (Manager)"
                                                    >
                                                        <AlertCircle size={12} /> Force End
                                                    </button>
                                                )
                                            ) : (
                                                /* Completed Entries */
                                                !isLocked && canManage && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateTimeEntry(entry.id, { status: 'approved' })}
                                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                                            title="Approve Entry"
                                                        >
                                                            <CheckCircle2 size={12} /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => onEditEntry?.(entry)}
                                                            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                                                            title="Edit Entry"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {entries.length === 0 && (
                <div className="p-12 text-center text-slate-400 text-sm font-medium bg-slate-50/50">
                    No time entries found for this period.
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleBulkDelete}
                title="Delete Entries"
                message={`Are you sure you want to delete ${selectedIds.size} selected entries? This action cannot be undone.`}
                confirmText="Delete Entries"
                variant="danger"
            />
        </div>
    );
};

export default SmartRosterTable;
