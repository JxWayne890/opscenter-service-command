import React, { useState } from 'react';
import { Calendar, User, Clock, MoreVertical, Shield, CheckCircle2, AlertCircle, LogOut, Edit2, Lock } from 'lucide-react';
import { Shift, Profile } from '../../types';
import { useOpsCenter } from '../../services/store';

interface SmartRosterTableProps {
    shifts: Shift[];
}

const SmartRosterTable: React.FC<SmartRosterTableProps> = ({ shifts }) => {
    const { currentUser, approveShifts, forceClockOut, clockOut } = useOpsCenter();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === shifts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(shifts.map(s => s.id)));
        }
    };

    const handleBulkApprove = async () => {
        await approveShifts(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    // Helper for Status Badge
    const getStatusBadge = (status: Shift['status'], roleType: string) => {
        if (roleType === 'active') {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide animate-pulse">Live</span>;
        }
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wide flex items-center gap-1"><Lock size={10} /> Approved</span>;
            case 'rejected':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 uppercase tracking-wide">Rejected</span>;
            case 'pending_approval':
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">Pending</span>;
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Bulk Action Header */}
            {selectedIds.size > 0 && (
                <div className="bg-indigo-50 px-6 py-3 flex items-center justify-between border-b border-indigo-100 animate-in slide-in-from-top-2">
                    <span className="text-xs font-bold text-indigo-900">{selectedIds.size} shifts selected</span>
                    <button
                        onClick={handleBulkApprove}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <CheckCircle2 size={14} />
                        <span>Approve Selected</span>
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={selectedIds.size === shifts.length && shifts.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Staff Member</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Log</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Break</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {shifts.map(shift => {
                            const isMe = shift.user_id === currentUser.id;
                            const isActive = shift.role_type === 'active';
                            const isLocked = shift.status === 'approved';

                            return (
                                <tr key={shift.id} className={`transition-colors ${isActive ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}>
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                            checked={selectedIds.has(shift.id)}
                                            onChange={() => toggleSelect(shift.id)}
                                            disabled={isLocked || isActive} // Can't bulk approve active shifts or already approved ones
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            {shift.profile?.avatar_url ? (
                                                <img src={shift.profile.avatar_url} className="w-8 h-8 rounded-full border border-slate-200" />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${shift.is_open ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    {shift.is_open ? '??' : (shift.user_id?.substring(0, 2).toUpperCase() || '??')}
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{shift.profile?.full_name || 'Unknown User'}</div>
                                                {isMe && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 rounded">YOU</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                        {isActive ? 'Current Shift' : 'Standard Shift'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                                                <span>{new Date(shift.start_time).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
                                                <Clock size={12} />
                                                <span>
                                                    {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {' - '}
                                                    {isActive ? <span className="text-emerald-600 font-bold animate-pulse">Now</span> : new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                        {shift.break_duration ? `${shift.break_duration}m` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {getStatusBadge(shift.status, shift.role_type)}
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
                                                        onClick={() => forceClockOut(shift.id)}
                                                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-50 transition-colors flex items-center gap-1"
                                                        title="Force Clock Out (Manager)"
                                                    >
                                                        <AlertCircle size={12} /> Force End
                                                    </button>
                                                )
                                            ) : (
                                                /* Completed Shifts */
                                                !isLocked && (
                                                    <button
                                                        onClick={() => alert('Edit Mock')}
                                                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                                                        title="Edit Shift"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
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
            {shifts.length === 0 && (
                <div className="p-12 text-center text-slate-400 text-sm font-medium bg-slate-50/50">
                    No shifts found for this period.
                </div>
            )}
        </div>
    );
};

export default SmartRosterTable;
