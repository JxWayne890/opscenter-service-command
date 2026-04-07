import React, { useState } from 'react';
import { ArrowRightLeft, Hand, Clock, User, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';
import { Shift, ShiftSwap, Profile } from '../../types';
import { useOpsCenter } from '../../services/store';
import { useToast } from '../ui/Toast';

interface ShiftExchangeBoardProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShiftExchangeBoard: React.FC<ShiftExchangeBoardProps> = ({ isOpen, onClose }) => {
  const { shifts, swaps, staff, currentUser, updateShift, updateSwapStatus } = useOpsCenter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'open' | 'swaps'>('open');

  if (!isOpen) return null;

  const openShifts = shifts.filter(s => s.is_open && new Date(s.start_time) > new Date());

  const pendingSwaps = (swaps || []).filter(sw => sw.status === 'pending');
  const swapShifts = pendingSwaps.map(sw => ({
    swap: sw,
    shift: shifts.find(s => s.id === sw.shift_id),
    requester: staff.find(s => s.id === sw.requester_id),
  })).filter(x => x.shift);

  const handleClaimOpen = async (shift: Shift) => {
    try {
      await updateShift(shift.id, {
        user_id: currentUser.id,
        is_open: false,
      });
      showToast('Shift claimed!');
    } catch {
      showToast('Failed to claim shift', 'error');
    }
  };

  const handleClaimSwap = async (swap: ShiftSwap, shift: Shift) => {
    try {
      await updateSwapStatus(swap.id, 'claimed');
      await updateShift(shift.id, { user_id: currentUser.id, is_open: false });
      showToast('Swap claimed!');
    } catch {
      showToast('Failed to claim swap', 'error');
    }
  };

  const formatShiftTime = (shift: Shift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const startStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const endStr = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return { dateStr, timeStr: `${startStr} - ${endStr}` };
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <ArrowRightLeft size={20} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900">Shift Exchange</h2>
                <p className="text-xs text-slate-500 font-medium">Claim open shifts or accept swaps</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('open')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${activeTab === 'open' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              Open Shifts ({openShifts.length})
            </button>
            <button
              onClick={() => setActiveTab('swaps')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${activeTab === 'swaps' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
            >
              Swap Offers ({swapShifts.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'open' && (
            openShifts.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase size={32} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-400">No open shifts available</p>
              </div>
            ) : (
              openShifts.map(shift => {
                const { dateStr, timeStr } = formatShiftTime(shift);
                return (
                  <div key={shift.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{shift.role_type}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {dateStr} &middot; {timeStr}
                        </div>
                      </div>
                      <button
                        onClick={() => handleClaimOpen(shift)}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all"
                      >
                        Claim
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'swaps' && (
            swapShifts.length === 0 ? (
              <div className="text-center py-12">
                <ArrowRightLeft size={32} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-400">No swap offers right now</p>
              </div>
            ) : (
              swapShifts.map(({ swap, shift, requester }) => {
                if (!shift) return null;
                const { dateStr, timeStr } = formatShiftTime(shift);
                const isOwn = swap.requester_id === currentUser.id;
                return (
                  <div key={swap.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <img src={requester?.avatar_url} alt={requester?.full_name} className="w-6 h-6 rounded-full" />
                          <span className="text-sm font-bold text-slate-900">{requester?.full_name}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-600">{shift.role_type}</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {dateStr} &middot; {timeStr}
                        </div>
                      </div>
                      {!isOwn && (
                        <button
                          onClick={() => handleClaimSwap(swap, shift)}
                          className="px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all"
                        >
                          Take Shift
                        </button>
                      )}
                      {isOwn && (
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl">
                          Your Offer
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </>
  );
};

export default ShiftExchangeBoard;
