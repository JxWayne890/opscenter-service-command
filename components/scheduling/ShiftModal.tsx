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
    const { staff, currentUser, createShift, updateShift, deleteShift, offerShift } = useOpsCenter();
    const [userId, setUserId] = useState<string>(defaultUserId || '');
    const [roleType, setRoleType] = useState('Staff');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isOpenShift, setIsOpenShift] = useState(false);
    const [notes, setNotes] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSwapConfirm, setShowSwapConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
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
                setStartTime('09:00');
                setEndTime('17:00');
                setNotes('');
            }
            setShowDeleteConfirm(false);
            setShowSwapConfirm(false);
        }
    }, [isOpen, editShift, defaultUserId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
            shiftData.status = 'draft';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 m-4 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900">
                        {editShift ? 'Edit Shift' : 'New Shift'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Toggle Open / Assigned */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setIsOpenShift(false)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isOpenShift ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Assigned Shift
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpenShift(true)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isOpenShift ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Open Shift
                        </button>
                    </div>

                    {!isOpenShift && (
                        <CustomSelect
                            label="Staff Member"
                            options={staffOptions}
                            value={userId}
                            onChange={setUserId}
                            placeholder="Select Employee"
                            icon={<User size={16} />}
                        />
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role / Position</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={roleType}
                                onChange={(e) => setRoleType(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none h-24"
                            placeholder="e.g. Opening duties..."
                        />
                    </div>

                    <div className="pt-2 flex space-x-3">
                        {editShift && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="p-3.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold hover:bg-rose-100 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                        {isMyShift && (
                            <button
                                type="button"
                                onClick={() => setShowSwapConfirm(true)}
                                className="flex-1 py-3.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl font-bold hover:bg-orange-100 transition-colors flex items-center justify-center space-x-2"
                            >
                                <ArrowRightLeft size={18} />
                                <span>Offer Swap</span>
                            </button>
                        )}
                        <button
                            type="submit"
                            className="flex-[2] py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-[0.98]"
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
