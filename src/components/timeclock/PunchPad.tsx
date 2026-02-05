import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Fingerprint, Coffee, ShieldCheck } from 'lucide-react';
import { useOpsCenter } from '../../services/store';

import ConfirmDialog from '../ui/ConfirmDialog';

const PunchPad = () => {
    const { isClockedIn, activeTimeEntry, clockIn, clockOut, startBreak, endBreak, shifts, currentUser } = useOpsCenter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [locationStatus, setLocationStatus] = useState<'locating' | 'locked' | 'error'>('locating');

    // Confirmation State
    const [confirmAction, setConfirmAction] = useState<'in' | 'out' | 'break_start' | 'break_end' | null>(null);

    // Derived state
    const isOnBreak = !!activeTimeEntry?.break_start;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Mock Geo-lock
        setTimeout(() => setLocationStatus('locked'), 1500);

        return () => clearInterval(timer);
    }, []);

    // Calculate duration logic
    const getDuration = () => {
        if (!activeTimeEntry) return '00:00:00';

        // CASE 1: ON BREAK -> Show Break Duration Timer
        if (isOnBreak && activeTimeEntry.break_start) {
            const breakStart = new Date(activeTimeEntry.break_start).getTime();
            const now = currentTime.getTime();
            const diff = Math.floor((now - breakStart) / 1000);

            const h = Math.floor(diff / 3600).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
        }

        // CASE 2: WORKING -> Show Net Work Duration
        const start = new Date(activeTimeEntry.clock_in).getTime();
        const now = currentTime.getTime();
        let diff = Math.floor((now - start) / 1000);

        // Subtract completed breaks
        if (activeTimeEntry.total_break_minutes) {
            diff -= (activeTimeEntry.total_break_minutes * 60);
        }

        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const handleMainButtonClick = () => {
        setConfirmAction(isClockedIn ? 'out' : 'in');
    };

    const handleBreakToggle = () => {
        setConfirmAction(isOnBreak ? 'break_end' : 'break_start');
    };

    const executePunch = () => {
        if (confirmAction === 'in') {
            clockIn({ lat: 34.05, lng: -118.24 });
        } else if (confirmAction === 'out') {
            clockOut();
        } else if (confirmAction === 'break_start') {
            startBreak();
        } else if (confirmAction === 'break_end') {
            endBreak();
        }
        setConfirmAction(null);
    };

    // Schedule Check for Punch In
    const myShiftsToday = shifts.filter(s =>
        s.user_id === currentUser?.id &&
        new Date(s.start_time).toDateString() === currentTime.toDateString()
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const todayShift = myShiftsToday[0];
    const isEarly = todayShift && (new Date(todayShift.start_time).getTime() - currentTime.getTime()) > 15 * 60 * 1000;
    const isNotScheduled = !todayShift;
    const isOutOfSchedule = confirmAction === 'in' && (isNotScheduled || isEarly);

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center max-w-md mx-auto relative overflow-hidden">
            {/* Security Indicator */}
            <div className={`absolute top-4 right-4 flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider ${locationStatus === 'locked' ? 'text-emerald-500' : 'text-slate-400'}`}>
                <MapPin size={12} />
                <span>{locationStatus === 'locked' ? 'GPS Measured' : 'Locating...'}</span>
            </div>

            {/* Time Display */}
            <div className="mb-8 mt-4">
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">
                    {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <h2 className="text-5xl font-black text-slate-900 tracking-tight tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h2>
            </div>

            {/* Status or Timer */}
            {isClockedIn ? (
                <div className="mb-8 animate-in fade-in zoom-in duration-300">
                    <div className={`px-6 py-2 rounded-full font-bold text-sm inline-flex items-center gap-2 mb-2 ${isOnBreak ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        <span className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnBreak ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnBreak ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                        </span>
                        {isOnBreak ? 'On Lunch' : 'On the Clock'}
                    </div>
                    <p className={`text-3xl font-mono font-bold tabular-nums ${isOnBreak ? 'text-amber-600' : 'text-slate-700'}`}>
                        {getDuration()}
                    </p>
                </div>
            ) : (
                <div className="mb-8 h-20 flex items-center justify-center">
                    <p className="text-slate-400 font-medium">Ready to start your shift?</p>
                </div>
            )}

            {/* Big Action Button */}
            <button
                onClick={handleMainButtonClick}
                disabled={locationStatus !== 'locked' || isOnBreak} // Disable clock out while on break? Usually good practice to end break first.
                className={`w-full py-6 rounded-2xl shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center space-x-3 group ${isClockedIn
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                <div className="bg-white/20 p-2 rounded-full">
                    {isClockedIn ? <Clock size={24} /> : <Fingerprint size={24} />}
                </div>
                <div className="text-left">
                    <span className="block text-xs font-medium opacity-80 uppercase tracking-wider">
                        {isClockedIn ? 'End Shift' : 'Start Shift'}
                    </span>
                    <span className="block text-xl font-bold">
                        {isClockedIn ? 'Clock Out' : 'Clock In'}
                    </span>
                </div>
            </button>

            {/* Secondary Actions (Break) */}
            {isClockedIn && (
                <div className="grid grid-cols-2 gap-4 w-full mt-4">
                    <button
                        onClick={handleBreakToggle}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors ${isOnBreak
                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Coffee size={20} className="mb-1" />
                        <span className="text-xs font-bold">{isOnBreak ? 'End Lunch' : 'Start Lunch'}</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <ShieldCheck size={20} className="mb-1" />
                        <span className="text-xs font-bold">Switch Job</span>
                    </button>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={executePunch}
                title={
                    confirmAction === 'in' ? (isOutOfSchedule ? (isNotScheduled ? "Not Scheduled Today" : "Clocking In Early") : "Confirm Clock In") :
                        confirmAction === 'out' ? "Confirm Clock Out" :
                            confirmAction === 'break_start' ? "Start Lunch" : "End Lunch"
                }
                message={
                    confirmAction === 'in'
                        ? (isNotScheduled
                            ? `You aren't scheduled to work today. Clock in anyway at ${currentTime.toLocaleTimeString()}?`
                            : isEarly
                                ? `You aren't scheduled to start until ${new Date(todayShift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Clock in anyway?`
                                : `Are you sure you want to clock in at ${currentTime.toLocaleTimeString()}?`)
                        : confirmAction === 'out' ? `Are you sure you want to clock out at ${currentTime.toLocaleTimeString()}?` :
                            confirmAction === 'break_start' ? "Pause your work timer and start your lunch?" :
                                "Resume work timer and end your lunch?"
                }
                confirmText={
                    isOutOfSchedule ? "Clock In Anyway" :
                        confirmAction === 'in' ? "Clock In" :
                            confirmAction === 'out' ? "Clock Out" :
                                confirmAction === 'break_start' ? "Start Lunch" : "End Lunch"
                }
                cancelText={isOutOfSchedule ? "Go Back" : "Cancel"}
                variant={confirmAction === 'out' ? 'danger' : isOutOfSchedule ? 'warning' : 'info'}
            />
        </div>
    );
};

export default PunchPad;
