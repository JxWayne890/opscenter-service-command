import React, { useState } from 'react';
import { Trash2, Clock, UserPlus, X, CheckSquare } from 'lucide-react';
import { Shift, Profile } from '../../types';
import { useOpsCenter } from '../../services/store';
import { useToast } from '../ui/Toast';
import ConfirmDialog from '../ui/ConfirmDialog';
import CustomSelect from '../ui/CustomSelect';

interface BulkShiftActionsProps {
  selectedShiftIds: Set<string>;
  onClearSelection: () => void;
  onUndoAction?: (action: { description: string; undo: () => Promise<void> }) => void;
}

const BulkShiftActions: React.FC<BulkShiftActionsProps> = ({
  selectedShiftIds,
  onClearSelection,
  onUndoAction,
}) => {
  const { shifts, staff, deleteShift, updateShift } = useOpsCenter();
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignUserId, setReassignUserId] = useState('');

  const count = selectedShiftIds.size;
  if (count === 0) return null;

  const selectedShifts = shifts.filter(s => selectedShiftIds.has(s.id));

  const handleBulkDelete = async () => {
    const backups = selectedShifts.map(s => ({ ...s }));
    for (const id of Array.from(selectedShiftIds)) {
      await deleteShift(id);
    }
    onClearSelection();
    showToast(`${count} shift${count > 1 ? 's' : ''} deleted`);

    if (onUndoAction) {
      onUndoAction({
        description: `Delete ${count} shifts`,
        undo: async () => {
          // Note: full undo would require re-creating shifts
          // This is a simplified placeholder
          showToast('Undo is not available for deletions', 'warning');
        },
      });
    }
  };

  const handleBulkReassign = async () => {
    if (!reassignUserId) return;
    const prevAssignments = selectedShifts.map(s => ({ id: s.id, user_id: s.user_id }));

    for (const id of Array.from(selectedShiftIds)) {
      await updateShift(id, { user_id: reassignUserId, is_open: false });
    }

    const user = staff.find(s => s.id === reassignUserId);
    onClearSelection();
    setShowReassign(false);
    showToast(`${count} shift${count > 1 ? 's' : ''} reassigned to ${user?.full_name}`);

    if (onUndoAction) {
      onUndoAction({
        description: `Reassign ${count} shifts`,
        undo: async () => {
          for (const prev of prevAssignments) {
            await updateShift(prev.id, {
              user_id: prev.user_id || undefined,
              is_open: !prev.user_id,
            });
          }
          showToast('Reassignment undone');
        },
      });
    }
  };

  const staffOptions = staff.map(u => ({ value: u.id, label: u.full_name }));

  return (
    <>
      <div className="fixed bottom-32 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/40 ring-1 ring-white/10">
          <div className="flex items-center gap-2 pr-4 border-r border-white/20">
            <CheckSquare size={16} className="text-indigo-400" />
            <span className="text-sm font-bold">{count} selected</span>
          </div>

          {showReassign ? (
            <div className="flex items-center gap-2">
              <div className="w-48">
                <CustomSelect
                  options={staffOptions}
                  value={reassignUserId}
                  onChange={setReassignUserId}
                  placeholder="Assign to..."
                />
              </div>
              <button
                onClick={handleBulkReassign}
                disabled={!reassignUserId}
                className="px-4 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-400 transition-colors disabled:opacity-50"
              >
                Assign
              </button>
              <button
                onClick={() => setShowReassign(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowReassign(true)}
                className="flex items-center gap-1.5 px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-bold transition-colors"
              >
                <UserPlus size={14} />
                Reassign
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 hover:bg-rose-500/20 text-rose-300 rounded-xl text-sm font-bold transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </>
          )}

          <button
            onClick={onClearSelection}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-2"
            title="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${count} Shift${count > 1 ? 's' : ''}?`}
        message="This action cannot be undone."
        confirmText="Delete All"
        variant="danger"
      />
    </>
  );
};

export default BulkShiftActions;
