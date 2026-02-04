import React, { useState } from 'react';
import PunchPad from '../timeclock/PunchPad';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { Clock, MapPin, CalendarDays, UserCog, Coffee } from 'lucide-react';
import RequestModal from '../requests/RequestModal';
import AvailabilityModal from '../availability/AvailabilityModal';

const TimeClockView = () => {
    const { timeEntries, currentUser } = useOpsCenter();
    const [isRequestModalOpen, setRequestModalOpen] = useState(false);
    const [isAvailabilityModalOpen, setAvailabilityModalOpen] = useState(false);

    // specific user history
    const myHistory = timeEntries
        .filter(te => te.user_id === currentUser.id)
        .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <RequestModal isOpen={isRequestModalOpen} onClose={() => setRequestModalOpen(false)} />
            <AvailabilityModal isOpen={isAvailabilityModalOpen} onClose={() => setAvailabilityModalOpen(false)} />

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Time Clock</h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Punch Pad */}
                <div className="lg:col-span-7 space-y-6">
                    <PunchPad />

                    {/* Quick Actions for Staff */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setRequestModalOpen(true)}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:bg-slate-50 transition-all group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                    <CalendarDays size={20} />
                                </div>
                                <span className="font-bold text-slate-700 text-sm">Request Time Off</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setAvailabilityModalOpen(true)}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:bg-slate-50 transition-all group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
                                    <UserCog size={20} />
                                </div>
                                <span className="font-bold text-slate-700 text-sm">Update Availability</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Recent Activity / Mini Timesheet */}
                <div className="lg:col-span-5 space-y-6">
                    <SectionCard>
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Clock size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900">Recent Activity</h3>
                        </div>

                        <div className="space-y-4">
                            {myHistory.length === 0 && (
                                <p className="text-sm text-slate-400">No recent punches.</p>
                            )}
                            {myHistory.map(entry => (
                                <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">
                                            {new Date(entry.clock_in).toLocaleDateString()}
                                        </p>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                                {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-slate-300">-</span>
                                            {entry.clock_out ? (
                                                <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                                    {new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end space-y-1">
                                        {/* Individual Break Logs */}
                                        {entry.breaks && entry.breaks.length > 0 ? (
                                            <div className="flex flex-col space-y-1 items-end">
                                                {entry.breaks.map((b, i) => {
                                                    const duration = b.duration || (b.end
                                                        ? Math.floor((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000)
                                                        : 0);

                                                    return (
                                                        <div key={i} className="flex items-center space-x-2">
                                                            <div className="flex items-center space-x-1.5 text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100">
                                                                <span className="font-mono font-medium opacity-80">
                                                                    {new Date(b.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                                    {' - '}
                                                                    {b.end ? new Date(b.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Active'}
                                                                </span>
                                                            </div>
                                                            {duration > 0 && (
                                                                <div className="flex items-center space-x-1 text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold" title="Lunch Duration">
                                                                    <Coffee size={10} />
                                                                    <span>{duration}m</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            /* Legacy Total Fallback */
                                            !!entry.total_break_minutes && entry.total_break_minutes > 0 && (
                                                <div className="flex items-center space-x-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100" title="Total Lunch Time">
                                                    <Coffee size={12} />
                                                    <span className="text-[10px] font-bold">{entry.total_break_minutes}m</span>
                                                </div>
                                            )
                                        )}

                                        {entry.location_data && (
                                            <div className="text-slate-300" title="Location Verified">
                                                <MapPin size={14} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

export default TimeClockView;
