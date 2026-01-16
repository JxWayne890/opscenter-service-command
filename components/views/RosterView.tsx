import React, { useState } from 'react';
import { useOpsCenter } from '../../services/store';
import { isManager } from '../../services/permissions';
import TimesheetHeader from '../timesheet/TimesheetHeader';
import SmartRosterTable from '../timesheet/SmartRosterTable';
import { Mail, CalendarCheck, ArrowRightLeft, CheckCircle2, XCircle, Search, Clock, Users } from 'lucide-react';
import SectionCard from '../SectionCard';
import { StaffDetailModal } from '../staff/StaffDetailModal';

const RosterView = () => {
    const { shifts, requests, swaps, currentUser, staff } = useOpsCenter();
    const [dateRange, setDateRange] = useState('this_week');
    const [viewMode, setViewMode] = useState<'roster' | 'timesheets' | 'requests'>('roster');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all'); // 'all' or staff id

    // Permission check
    const canManageStaff = isManager(currentUser);

    // Modal State
    const [isStaffModalOpen, setStaffModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

    // Navigation Handler
    const { navigatedUser, setNavigatedUser } = useOpsCenter();
    React.useEffect(() => {
        if (navigatedUser) {
            setViewMode('timesheets');
            setSelectedStaffFilter(navigatedUser);
            // Clear navigation state so we don't get stuck here
            // setNavigatedUser(null); // Actually, keep it for now so the filter persists? No, clear it is better but let's see. 
            // Better to clear it on unmount or just let it stay until another nav event? 
            // If I clear it immediately, it might be fine because local state 'selectedStaffFilter' takes over.
            setNavigatedUser(null);
        }
    }, [navigatedUser, setNavigatedUser]);

    const handleOpenStaffModal = (staffId: string | null) => {
        // Staff can only view themselves, not add new staff
        if (!canManageStaff && staffId === null) return;
        setSelectedStaffId(staffId);
        setStaffModalOpen(true);
    };

    // In a real app, 'dateRange' filter would apply here.
    const sortedShifts = [...shifts].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    // Filter staff for mobile list - Staff only see themselves
    const filteredStaff = canManageStaff
        ? staff.filter(user =>
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : staff.filter(user => user.id === currentUser.id);

    // Filter shifts by selected staff
    const filteredShifts = selectedStaffFilter === 'all'
        ? sortedShifts
        : sortedShifts.filter(s => s.user_id === selectedStaffFilter);

    return (
        <div className="space-y-6 pb-24 lg:pb-0 min-h-[50vh]">
            {/* Toggle Header */}
            <div className="flex flex-col space-y-4 px-1">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black text-slate-900">
                        {canManageStaff ? 'Roster' : 'My Profile'}
                    </h2>
                    {/* View Toggle - Roster / Timesheets / Requests */}
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                        {canManageStaff && (
                            <button
                                onClick={() => setViewMode('roster')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'roster' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Users size={14} />
                                Roster
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('timesheets')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'timesheets' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {canManageStaff ? 'Timesheets' : 'Profile'}
                        </button>
                        {canManageStaff && (
                            <>
                                <button
                                    onClick={() => setViewMode('requests')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'requests' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Requests
                                    {(requests.length + swaps.length) > 0 && (
                                        <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                            {requests.length + swaps.length}
                                        </span>
                                    )}
                                </button>
                                {/* Add Staff Button - Manager Only */}
                                <button
                                    onClick={() => handleOpenStaffModal(null)}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
                                >
                                    + Staff
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobile Search Bar */}
                {viewMode === 'timesheets' && (
                    <div className="relative lg:hidden">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Find staff member..."
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                    </div>
                )}
            </div>


            {/* === ROSTER VIEW === */}
            {viewMode === 'roster' && canManageStaff && (
                <div className="px-1">
                    {/* Search */}
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search staff..."
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                    </div>

                    {/* Staff Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredStaff.map(user => {
                            const userShifts = shifts.filter(s => s.user_id === user.id);
                            const totalHours = userShifts.reduce((acc, s) => {
                                const start = new Date(s.start_time);
                                const end = new Date(s.end_time);
                                return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            }, 0);
                            const isClockedIn = Math.random() > 0.7;

                            return (
                                <div
                                    key={user.id}
                                    className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-100 transition-all cursor-pointer group"
                                    onClick={() => handleOpenStaffModal(user.id)}
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="relative">
                                            <img
                                                src={user.avatar_url}
                                                alt={user.full_name}
                                                className="w-14 h-14 rounded-full object-cover border-2 border-slate-50 group-hover:border-indigo-100"
                                            />
                                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${isClockedIn ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate">{user.full_name}</h3>
                                            <p className="text-xs font-medium text-slate-400 uppercase">{user.role}</p>
                                            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase ${isClockedIn ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
                                                }`}>
                                                <Clock size={10} />
                                                {isClockedIn ? 'Clocked In' : 'Off Duty'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                        <div>
                                            <div className="text-lg font-black text-slate-900">{totalHours.toFixed(1)}h</div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase">This Week</div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStaffFilter(user.id);
                                                setViewMode('timesheets');
                                            }}
                                            className="text-xs font-bold text-indigo-600 px-3 py-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
                                            View Timesheet →
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredStaff.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">No staff found</p>
                            <p className="text-xs">Try searching for a different name</p>
                        </div>
                    )}
                </div>
            )}

            {/* === TIMESHEETS VIEW === */}
            {viewMode === 'timesheets' && (
                <>
                    {/* Desktop Header & Table */}
                    <div className="hidden lg:block space-y-6">
                        {/* Staff Filter */}
                        {canManageStaff && (
                            <div className="flex items-center gap-4 px-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Filter by Staff:</label>
                                <select
                                    value={selectedStaffFilter}
                                    onChange={(e) => setSelectedStaffFilter(e.target.value)}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                    <option value="all">All Staff</option>
                                    {staff.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name}</option>
                                    ))}
                                </select>
                                {selectedStaffFilter !== 'all' && (
                                    <button
                                        onClick={() => setSelectedStaffFilter('all')}
                                        className="text-xs font-bold text-indigo-600 hover:underline"
                                    >
                                        Clear Filter
                                    </button>
                                )}
                            </div>
                        )}

                        <TimesheetHeader
                            shifts={filteredShifts}
                            dateRange={dateRange}
                            setDateRange={setDateRange}
                        />
                        <SmartRosterTable
                            shifts={filteredShifts}
                            onMemberClick={handleOpenStaffModal}
                        />
                    </div>

                    {/* Mobile Staff List */}
                    <div className="lg:hidden space-y-3 px-1">
                        {filteredStaff.map(user => {
                            // Mock Status Logic
                            const isClockedIn = Math.random() > 0.7;
                            const totalHours = (Math.random() * 40).toFixed(1);

                            return (
                                <div
                                    key={user.id}
                                    onClick={() => handleOpenStaffModal(user.id)}
                                    className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-4 shadow-sm active:scale-[0.99] transition-transform cursor-pointer hover:border-indigo-100"
                                >
                                    <div className="relative">
                                        <img src={user.avatar_url} alt={user.full_name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-50" />
                                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${isClockedIn ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-900 truncate">{user.full_name}</h3>
                                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{user.role}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-slate-900">{totalHours}h</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase">This Week</div>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center space-x-2">
                                            {isClockedIn ? (
                                                <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold uppercase">
                                                    <Clock size={10} />
                                                    <span>Clocked In</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-1 px-2 py-1 bg-slate-50 text-slate-500 rounded-md text-[10px] font-bold uppercase">
                                                    <Users size={10} />
                                                    <span>Off Duty</span>
                                                </div>
                                            )}
                                            <button className="text-[10px] font-bold text-indigo-600 px-2 py-1 hover:bg-indigo-50 rounded-md transition-colors">
                                                View Schedule
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredStaff.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Search size={48} className="mb-4 opacity-20" />
                                <p className="font-bold">No staff found</p>
                                <p className="text-xs">Try searching for a different name</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* === REQUESTS VIEW === */}
            {viewMode === 'requests' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-1">
                    {/* Time Off Section Card */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <CalendarCheck size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-lg">Time Off Requests</h3>
                        </div>
                        <div className="space-y-4">
                            {requests.map(req => (
                                <div key={req.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {req.user_id.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">User {req.user_id.substring(0, 4)}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{req.type} Leave</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                            }`}>{req.status}</span>
                                    </div>

                                    <div className="text-xs font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-100 mb-3">
                                        {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                        <div className="mt-1 text-slate-400 italic">"{req.reason}"</div>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50">Decline</button>
                                        <button className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-200 hover:scale-[1.02] transition-transform">Approve</button>
                                    </div>
                                </div>
                            ))}
                            {requests.length === 0 && (
                                <div className="text-center py-10 text-slate-400">
                                    <p className="text-sm font-medium">No pending requests</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shift Swaps Section Card */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                                <ArrowRightLeft size={20} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-lg">Shift Swaps</h3>
                        </div>
                        <div className="space-y-4">
                            {swaps.map(swap => (
                                <div key={swap.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SWAP #{swap.id.substring(0, 4)}</span>
                                        <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold uppercase">{swap.status}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 mb-3">
                                        <div className="text-center">
                                            <div className="text-xs font-bold text-slate-900">User {swap.requester_id}</div>
                                            <div className="text-[10px] text-slate-400">Requester</div>
                                        </div>
                                        <ArrowRightLeft size={14} className="text-orange-400" />
                                        <div className="text-center">
                                            <div className="text-xs font-bold text-slate-900">User {swap.recipient_id || 'Anyone'}</div>
                                            <div className="text-[10px] text-slate-400">Recipient</div>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50">Reject</button>
                                        <button className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-200 hover:scale-[1.02] transition-transform">Authorize Swap</button>
                                    </div>
                                </div>
                            ))}
                            {swaps.length === 0 && (
                                <div className="text-center py-10 text-slate-400">
                                    <p className="text-sm font-medium">No pending swaps</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <StaffDetailModal
                isOpen={isStaffModalOpen}
                onClose={() => setStaffModalOpen(false)}
                staffId={selectedStaffId}
            />
        </div>
    );
};

export default RosterView;
