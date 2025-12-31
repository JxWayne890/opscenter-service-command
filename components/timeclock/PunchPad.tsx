import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Fingerprint, Coffee, ShieldCheck } from 'lucide-react';
import { useOpsCenter } from '../../services/store';

const PunchPad = () => {
    const { isClockedIn, activeTimeEntry, clockIn, clockOut } = useOpsCenter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [locationStatus, setLocationStatus] = useState<'locating' | 'locked' | 'error'>('locating');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Mock Geo-lock
        setTimeout(() => setLocationStatus('locked'), 1500);

        return () => clearInterval(timer);
    }, []);

    // Calculate duration if clocked in
    const getDuration = () => {
        if (!activeTimeEntry) return '00:00:00';
        const start = new Date(activeTimeEntry.clock_in).getTime();
        const now = currentTime.getTime();
        const diff = Math.floor((now - start) / 1000);

        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

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
                    <div className="bg-emerald-50 text-emerald-700 px-6 py-2 rounded-full font-bold text-sm inline-flex items-center gap-2 mb-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        On the Clock
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-700 tabular-nums">
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
                onClick={isClockedIn ? clockOut : () => clockIn({ lat: 34.05, lng: -118.24 })} // Mock coords
                disabled={locationStatus !== 'locked'}
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
                    <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <Coffee size={20} className="mb-1" />
                        <span className="text-xs font-bold">Start Break</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <ShieldCheck size={20} className="mb-1" />
                        <span className="text-xs font-bold">Switch Job</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default PunchPad;
