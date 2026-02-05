import React, { useState, useEffect } from 'react';
import { X, Clock, User, Calendar, Save, Trash2 } from 'lucide-react';
import { useOpsCenter } from '../../services/store';
import { TimeEntry } from '../../types';
import { isManager } from '../../services/permissions';
import AnalogTimePicker from '../ui/AnalogTimePicker';
import CustomSelect from '../ui/CustomSelect';
import ConfirmDialog from '../ui/ConfirmDialog';

interface ManualEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    editEntry?: TimeEntry;
}

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ isOpen, onClose, editEntry }) => {
    const { staff, timeEntries, currentUser, addTimeEntry, updateTimeEntry, deleteTimeEntries } = useOpsCenter();
    const [userId, setUserId] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [clockInTime, setClockInTime] = useState('09:00');
    const [clockOutTime, setClockOutTime] = useState('17:00');
    const [breakMinutes, setBreakMinutes] = useState<number>(0);
    const [status, setStatus] = useState<TimeEntry['status']>('pending_approval');
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const canManage = isManager(currentUser);

    useEffect(() => {
        if (isOpen) {
            if (editEntry) {
                setUserId(editEntry.user_id);
                setDate(new Date(editEntry.clock_in).toISOString().split('T')[0]);
                setClockInTime(new Date(editEntry.clock_in).toTimeString().substring(0, 5));
                setClockOutTime(editEntry.clock_out ? new Date(editEntry.clock_out).toTimeString().substring(0, 5) : '17:00');
                setBreakMinutes(editEntry.total_break_minutes || 0);
                setStatus(editEntry.status);
            } else {
                setUserId('');
                setDate(new Date().toISOString().split('T')[0]);
                setClockInTime('09:00');
                setClockOutTime('17:00');
                setBreakMinutes(0);
                setStatus('pending_approval');
            }
            setError(null);
        }
    }, [isOpen, editEntry]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!userId) {
            setError('Please select a staff member.');
            return;
        }

        const start = new Date(`${date}T${clockInTime}`);
        const end = new Date(`${date}T${clockOutTime}`);

        if (end < start) {
            end.setDate(end.getDate() + 1);
        }

        const entryData: Omit<TimeEntry, 'id'> = {
            organization_id: currentUser?.organization_id || '',
            user_id: userId,
            clock_in: start.toISOString(),
            clock_out: end.toISOString(),
            total_break_minutes: breakMinutes,
            status: status,
        };

        try {
            if (editEntry) {
                await updateTimeEntry(editEntry.id, entryData);
            } else {
                await addTimeEntry(entryData);
            }
            onClose();
        } catch (err) {
            setError('Failed to save time entry.');
        }
    };

    const handleDelete = async () => {
        if (!editEntry) return;
        await deleteTimeEntries([editEntry.id]);
        setShowDeleteConfirm(false);
        onClose();
    };

    if (!isOpen) return null;

    const staffOptions = staff.map(s => ({
        value: s.id,
        label: s.full_name,
        icon: <User size={14} />
    }));

    const statusOptions = [
        { value: 'pending_approval', label: 'Pending Approval', icon: <Clock size={14} /> },
        { value: 'approved', label: 'Approved', icon: <Save size={14} /> },
        { value: 'rejected', label: 'Rejected', icon: <X size={14} /> }
    ];

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] animate-in fade-in duration-300" onClick={onClose} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-lg animate-in zoom-in-95 duration-300 px-4">
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden">
                    <div className="bg-slate-50/50 px-8 py-6 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">{editEntry ? 'Edit Time Entry' : 'Manual Time Entry'}</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timesheet Management</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-slate-400 hover:text-slate-600 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold animate-pulse">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <CustomSelect
                                    label="Staff Member"
                                    options={staffOptions}
                                    value={userId}
                                    onChange={setUserId}
                                    disabled={!!editEntry}
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Work Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <AnalogTimePicker
                                    label="Clock In"
                                    value={clockInTime}
                                    onChange={setClockInTime}
                                />
                            </div>

                            <div>
                                <AnalogTimePicker
                                    label="Clock Out"
                                    value={clockOutTime}
                                    onChange={setClockOutTime}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Break (Mins)</label>
                                <input
                                    type="number"
                                    value={breakMinutes}
                                    onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <div>
                                <CustomSelect
                                    label="Entry Status"
                                    options={statusOptions}
                                    value={status}
                                    onChange={(v) => setStatus(v as any)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            {editEntry && (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors"
                                >
                                    <Trash2 size={24} />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                            >
                                {editEntry ? 'Update Entry' : 'Create Entry'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Time Entry"
                message="Are you sure you want to delete this time entry? This action cannot be undone."
                variant="danger"
            />
        </>
    );
};

export default ManualEntryModal;
