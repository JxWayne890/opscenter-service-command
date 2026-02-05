import React, { useState } from 'react';
import { useOpsCenter } from '../../services/store';
import { isManager } from '../../services/permissions';
import TimesheetHeader from '../timesheet/TimesheetHeader';
import SmartRosterTable from '../timesheet/SmartRosterTable';
import { Mail, CalendarCheck, ArrowRightLeft, CheckCircle2, XCircle, Search, Clock, Users, Banknote } from 'lucide-react';
import SectionCard from '../SectionCard';
import { StaffDetailModal } from '../staff/StaffDetailModal';
import TimesheetDetailModal from '../timesheet/TimesheetDetailModal';
import PayrollView from './PayrollView';
import OffboardingModal from '../staff/OffboardingModal';
import ManualEntryModal from '../timesheet/ManualEntryModal';

const RosterView = () => {
    const { shifts, requests, swaps, currentUser, staff, timeEntries, organization } = useOpsCenter();
    const [dateRange, setDateRange] = useState('this_week');

    // Permission check
    const canManageStaff = isManager(currentUser);

    // Default view: Managers -> 'roster', Staff -> 'timesheets'
    const [viewMode, setViewMode] = useState<'roster' | 'timesheets' | 'requests' | 'payroll'>(
        canManageStaff ? 'roster' : 'timesheets'
    );

    const [searchTerm, setSearchTerm] = useState('');
    // For staff, lock filter to themselves
    const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>(
        canManageStaff ? 'all' : currentUser.id
    );

    // Modal State
    const [isStaffModalOpen, setStaffModalOpen] = useState(false);
    const [isTimesheetModalOpen, setTimesheetModalOpen] = useState(false);
    const [isManualEntryModalOpen, setManualEntryModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [editingTimeEntry, setEditingTimeEntry] = useState<any>(null);

    // Bulk Selection State
    const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
    const [isBulkOffboarding, setIsBulkOffboarding] = useState(false);

    // Toggle Selection
    const toggleSelection = (id: string) => {
        // Only allow selecting 'staff' members for deletion
        const user = staff.find(s => s.id === id);
        if (!user || user.role !== 'staff' || user.id === currentUser.id) return;

        if (selectedStaff.includes(id)) {
            setSelectedStaff(selectedStaff.filter(s => s !== id));
        } else {
            setSelectedStaff([...selectedStaff, id]);
        }
    };

    // Navigation Handler
    const { navigatedUser, setNavigatedUser } = useOpsCenter();
    React.useEffect(() => {
        if (navigatedUser) {
            setViewMode('timesheets');
            setSelectedStaffFilter(navigatedUser);
            setNavigatedUser(null);
        }
    }, [navigatedUser, setNavigatedUser]);

    const handleOpenStaffModal = (staffId: string | null) => {
        // Staff can only view themselves
        if (!canManageStaff) {
            if (staffId !== currentUser.id && staffId !== null) return;
            setSelectedStaffId(currentUser.id);
        } else {
            // Manager: If null, it means create new. If ID, it means edit.
            setSelectedStaffId(staffId);
        }
        setStaffModalOpen(true);
    };

    const getDateRangeObject = () => {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        const periodType = organization?.pay_period || 'weekly';
        const periodStartDay = organization?.pay_period_start_day !== undefined ? organization.pay_period_start_day : 1; // Default Monday

        if (dateRange === 'this_week') {
            const currentDay = start.getDay();
            // Calculate distance to start of period
            let diff = start.getDate() - currentDay + periodStartDay;
            if (currentDay < periodStartDay) diff -= 7;

            start.setDate(diff);

            if (periodType === 'biweekly') {
                end.setDate(start.getDate() + 13);
            } else if (periodType === 'weekly') {
                end.setDate(start.getDate() + 6);
            } else if (periodType === 'monthly') {
                start.setDate(1);
                end.setMonth(start.getMonth() + 1);
                end.setDate(0);
            }
        } else if (dateRange === 'last_week') {
            const currentDay = start.getDay();
            let diff = start.getDate() - currentDay + periodStartDay - (periodType === 'biweekly' ? 14 : 7);
            if (currentDay < periodStartDay) diff -= (periodType === 'biweekly' ? 14 : 7);

            start.setDate(diff);

            if (periodType === 'biweekly') {
                end.setDate(start.getDate() + 13);
            } else if (periodType === 'weekly') {
                end.setDate(start.getDate() + 6);
            } else if (periodType === 'monthly') {
                start.setMonth(start.getMonth() - 1);
                start.setDate(1);
                end.setMonth(start.getMonth() + 1);
                end.setDate(0);
            }
        } else if (dateRange === 'this_month') {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
        }
        return { start, end };
    };

    const handleOpenTimesheetModal = (staffId: string) => {
        setSelectedStaffId(staffId);
        setTimesheetModalOpen(true);
    };

    const handleEditTimeEntry = (entry: any) => {
        setEditingTimeEntry(entry);
        setManualEntryModalOpen(true);
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
    // If NOT manager, force filter to current user regardless of state (safety)
    const effectiveStaffFilter = canManageStaff ? selectedStaffFilter : currentUser.id;

    const shiftsForStaff = effectiveStaffFilter === 'all'
        ? sortedShifts
        : sortedShifts.filter(s => s.user_id === effectiveStaffFilter);

    // For timesheets: only show PAST shifts (before now) - not future scheduled shifts
    const now = new Date();
    const pastShiftsForTimesheets = shiftsForStaff.filter(s => new Date(s.end_time) < now);

    // Filter timeEntries by selected staff AND DATE RANGE
    const { start: filterStart, end: filterEnd } = getDateRangeObject();

    const effectiveTimeEntries = (effectiveStaffFilter === 'all'
        ? timeEntries
        : timeEntries.filter(te => te.user_id === effectiveStaffFilter)
    ).filter(te => {
        const d = new Date(te.clock_in);
        // Include entries that overlap with the range
        return d <= filterEnd && (te.clock_out ? new Date(te.clock_out) >= filterStart : true);
    });

    return (
        <div className="space-y-6 pb-48 lg:pb-24 min-h-[50vh] relative">
            {/* Toggle Header */}
            <div className="flex flex-col space-y-4 px-1">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black text-slate-900">
                        {canManageStaff ? 'Roster' : 'My Profile'}
                    </h2>
                    {/* View Toggle - Roster / Timesheets / Requests */}
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-[calc(100vw-40px)] no-scrollbar">
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
                                <button
                                    onClick={() => setViewMode('payroll')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'payroll' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Banknote size={14} />
                                    Payroll
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedStaffId(null);
                                        handleOpenStaffModal(null);
                                    }}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all whitespace-nowrap"
                                >
                                    + Staff
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingTimeEntry(null);
                                        setManualEntryModalOpen(true);
                                    }}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50 shadow-sm transition-all whitespace-nowrap"
                                >
                                    + Timesheet
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
                            // Calculate actual worked hours from TimeEntries (not scheduled shifts)
                            const userEntries = timeEntries.filter(te => te.user_id === user.id);

                            // Calculate total hours from closed entries
                            const totalHours = userEntries.reduce((acc, entry) => {
                                if (!entry.clock_out) return acc;
                                const start = new Date(entry.clock_in).getTime();
                                const end = new Date(entry.clock_out).getTime();
                                const breakMins = entry.total_break_minutes || 0;
                                return acc + ((end - start) / (1000 * 60 * 60)) - (breakMins / 60);
                            }, 0);

                            // Check if currently clocked in (active entry with no clock out)
                            const isClockedIn = userEntries.some(te => !te.clock_out && te.status === 'active');
                            const isSelected = selectedStaff.includes(user.id);

                            return (
                                <div
                                    key={user.id}
                                    className={`relative bg-white border rounded-2xl p-5 transition-all cursor-pointer group ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' : 'border-slate-100 hover:shadow-lg hover:border-indigo-100'}`}
                                    onClick={() => {
                                        if (selectedStaff.length > 0) {
                                            toggleSelection(user.id);
                                        } else {
                                            handleOpenStaffModal(user.id);
                                        }
                                    }}
                                >
                                    {/* Selection Checkbox - Only for 'staff' members and not self */}
                                    {user.role === 'staff' && user.id !== currentUser.id && (
                                        <div
                                            onClick={(e) => { e.stopPropagation(); toggleSelection(user.id); }}
                                            className={`absolute top-4 right-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all z-10 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 group-hover:border-indigo-300'}`}
                                        >
                                            {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                        </div>
                                    )}

                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="relative">
                                            <img
                                                src={user.avatar_url}
                                                alt={user.full_name}
                                                className="w-14 h-14 rounded-full object-cover border-2 border-slate-50 group-hover:border-indigo-100"
                                            />
                                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${isClockedIn ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                        </div>
                                        <div className="flex-1 min-w-0 pr-8">
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
                                            <div className="text-[9px] font-bold text-slate-400 uppercase">Total Worked</div>
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
                            entries={effectiveTimeEntries}
                            dateRange={dateRange}
                            setDateRange={setDateRange}
                        />
                        <SmartRosterTable
                            entries={effectiveTimeEntries}
                            onMemberClick={handleOpenTimesheetModal}
                            onEditEntry={handleEditTimeEntry}
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

            {/* === PAYROLL VIEW === */}
            {viewMode === 'payroll' && canManageStaff && (
                <PayrollView />
            )}

            {/* Bulk Action Bar */}
            {selectedStaff.length > 0 && (
                <div className="fixed bottom-6 left-6 right-6 lg:left-32 lg:right-auto z-50 animate-bounce-in">
                    <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-2xl flex items-center gap-4 pr-4 border border-white/10 ring-4 ring-black/5">
                        <div className="bg-white/10 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            {selectedStaff.length} Selected
                        </div>
                        <div className="h-6 w-px bg-white/10" />
                        <button
                            onClick={() => setSelectedStaff([])}
                            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => setIsBulkOffboarding(true)}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-900/20 active:scale-95 flex items-center gap-2 ml-2"
                        >
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}

            <StaffDetailModal
                isOpen={isStaffModalOpen}
                onClose={() => setStaffModalOpen(false)}
                staffId={selectedStaffId}
            />

            <TimesheetDetailModal
                isOpen={isTimesheetModalOpen}
                onClose={() => setTimesheetModalOpen(false)}
                staffId={selectedStaffId || ''}
                dateRange={getDateRangeObject()}
            />

            <ManualEntryModal
                isOpen={isManualEntryModalOpen}
                onClose={() => {
                    setManualEntryModalOpen(false);
                    setEditingTimeEntry(null);
                }}
                editEntry={editingTimeEntry}
            />

            <OffboardingModal
                isOpen={isBulkOffboarding}
                onClose={() => setIsBulkOffboarding(false)}
                staffMembers={staff.filter(s => selectedStaff.includes(s.id))}
                onSuccess={() => {
                    setSelectedStaff([]);
                    setIsBulkOffboarding(false);
                }}
            />
        </div>
    );
};

export default RosterView;
