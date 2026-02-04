import React, { useState, useEffect } from 'react';
import { X, Clock, User, Briefcase, Calendar, ArrowRightLeft, Trash2 } from 'lucide-react';
import { useOpsCenter } from '../../services/store';
import { Shift, Profile, ShiftSwap } from '../../types';
import AnalogTimePicker from '../ui/AnalogTimePicker';
import CustomSelect from '../ui/CustomSelect';
import ConfirmDialog from '../ui/ConfirmDialog';

interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    editShift?: Shift; // If present, editing mode
    defaultDate?: Date;
    defaultUserId?: string;
}

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, editShift, defaultDate, defaultUserId }) => {
    const { staff, shifts, currentUser, createShift, updateShift, deleteShift, offerShift } = useOpsCenter();
    const [userId, setUserId] = useState<string>(defaultUserId || '');
    const [roleType, setRoleType] = useState('Staff');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isOpenShift, setIsOpenShift] = useState(false);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSwapConfirm, setShowSwapConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            // Reset or Load Data
            if (editShift) {
                setUserId(editShift.user_id || '');
                setIsOpenShift(editShift.is_open);
                setRoleType(editShift.role_type);
                setStartTime(new Date(editShift.start_time).toTimeString().substring(0, 5));
                setEndTime(new Date(editShift.end_time).toTimeString().substring(0, 5));
                setNotes(editShift.notes || '');
            } else {
                setUserId(defaultUserId || '');
                setIsOpenShift(!defaultUserId); // Default to open if no user passed
                setRoleType('Staff');

                // Use provided time or default to 9am
                let start = defaultDate ? new Date(defaultDate) : new Date();
                if (!defaultDate) start.setHours(9, 0, 0, 0);

                const end = new Date(start);
                end.setHours(start.getHours() + 8);

                setStartTime(start.toTimeString().substring(0, 5));
                setEndTime(end.toTimeString().substring(0, 5));
                setNotes('');
            }
            setShowDeleteConfirm(false);
            setShowSwapConfirm(false);
        }
    }, [isOpen, editShift, defaultUserId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Construct basic timestamps (using defaultDate or today)
        const baseDate = defaultDate ? new Date(defaultDate) : new Date();
        const start = new Date(baseDate);
        const [sh, sm] = startTime.split(':').map(Number);
        start.setHours(sh, sm, 0, 0);

        const end = new Date(baseDate);
        const [eh, em] = endTime.split(':').map(Number);
        end.setHours(eh, em, 0, 0);

        // Handle overnight shifts
        if (end < start) end.setDate(end.getDate() + 1);

        // --- Overlap Validation ---
        if (!isOpenShift && userId) {
            const hasOverlap = shifts.some(s => {
                if (s.user_id !== userId) return false;
                if (editShift && s.id === editShift.id) return false; // Ignore self
                if (s.status !== 'published') return false; // Optional: Decide if we care about drafts

                const sStart = new Date(s.start_time);
                const sEnd = new Date(s.end_time);

                // Check intersection: (StartA < EndB) && (EndA > StartB)
                return start < sEnd && end > sStart;
            });

            if (hasOverlap) {
                setError('This user already has a shift during this time.');
                return;
            }
        }

        const shiftData: any = {
            role_type: roleType,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            is_open: isOpenShift,
            notes,
            organization_id: currentUser.organization_id // Assuming created for current org
        };

        if (isOpenShift) {
            shiftData.user_id = undefined;
        } else {
            shiftData.user_id = userId;
            const profile = staff.find(s => s.id === userId);
            shiftData.profile = profile; // Optimistic UI
        }

        if (editShift) {
            await updateShift(editShift.id, shiftData);
        } else {
            shiftData.id = crypto.randomUUID();
            shiftData.status = 'published'; // Auto-publish for now to match flow
            await createShift(shiftData);
        }

        onClose();
    };

    const handleSwapOffer = async () => {
        if (!editShift) return;

        const swap: ShiftSwap = {
            id: crypto.randomUUID(),
            organization_id: currentUser.organization_id,
            requester_id: currentUser.id,
            shift_id: editShift.id,
            status: 'pending'
        };

        await offerShift(swap);
        onClose();
    };

    const handleDelete = async () => {
        if (!editShift) return;
        await deleteShift(editShift.id);
        onClose();
    };

    if (!isOpen) return null;

    const isMyShift = editShift && editShift.user_id === currentUser.id;

    // Build staff options for CustomSelect
    const staffOptions = staff.map(u => ({
        value: u.id,
        label: u.full_name
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-xl border border-white/50 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 m-4 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                {/* Gradient Top Border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80"></div>

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
                            {editShift ? 'Edit Shift' : 'New Shift'}
                        </h2>
                        <p className="text-sm font-medium text-slate-500">
                            {editShift ? 'Update shift details' : 'Schedule a new work shift'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <User size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-rose-700">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Toggle Open / Assigned */}
                    <div className="flex bg-slate-100/80 p-1.5 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setIsOpenShift(false)}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide rounded-xl transition-all ${!isOpenShift
                                ? 'bg-white text-indigo-600 shadow-md transform scale-[1.02]'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                        >
                            Assigned Staff
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpenShift(true)}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide rounded-xl transition-all ${isOpenShift
                                ? 'bg-white text-orange-600 shadow-md transform scale-[1.02]'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                        >
                            Open Shift
                        </button>
                    </div>

                    {!isOpenShift && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <CustomSelect
                                label="Staff Member"
                                options={staffOptions}
                                value={userId}
                                onChange={setUserId}
                                placeholder="Select Employee"
                                icon={<User size={18} />}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role / Position</label>
                        <div className="relative group">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                value={roleType}
                                onChange={(e) => setRoleType(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                                placeholder="e.g. Server, Cook, Manager"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <AnalogTimePicker
                            label="Start Time"
                            value={startTime}
                            onChange={(time) => setStartTime(time)}
                        />
                        <AnalogTimePicker
                            label="End Time"
                            value={endTime}
                            onChange={(time) => setEndTime(time)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200/60 rounded-2xl text-sm font-medium text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none h-24 transition-all placeholder:text-slate-400"
                            placeholder="Add shift details, duties, or instructions..."
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        {editShift && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="p-4 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-2xl font-bold hover:bg-rose-100 hover:border-rose-300 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        {isMyShift && (
                            <button
                                type="button"
                                onClick={() => setShowSwapConfirm(true)}
                                className="flex-1 py-4 bg-orange-50 text-orange-600 border border-orange-200/60 rounded-2xl font-bold hover:bg-orange-100 hover:border-orange-300 hover:shadow-md transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
                            >
                                <ArrowRightLeft size={20} />
                                <span>Offer Swap</span>
                            </button>
                        )}
                        <button
                            type="submit"
                            className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                        >
                            {editShift ? 'Update Shift' : 'Create Shift'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Shift"
                message="Are you sure you want to delete this shift? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />

            {/* Swap Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showSwapConfirm}
                onClose={() => setShowSwapConfirm(false)}
                onConfirm={handleSwapOffer}
                title="Offer Shift for Swap"
                message="This will post your shift as available for swap with other team members."
                confirmText="Offer Swap"
                variant="warning"
            />
        </div>
    );
};

export default ShiftModal;
