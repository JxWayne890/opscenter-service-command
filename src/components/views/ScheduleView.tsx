import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Users, Filter, Save, Trash2, RefreshCw, Briefcase, Clock, Search, MoreHorizontal } from 'lucide-react';
import { useOpsCenter } from '../../services/store';
import { isManager } from '../../services/permissions';
import { Shift, Profile } from '../../types';
import SectionCard from '../SectionCard';
import ShiftModal from '../scheduling/ShiftModal';
import { StaffDetailModal } from '../staff/StaffDetailModal';
import ConfirmDialog from '../ui/ConfirmDialog';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ScheduleView = () => {
    const { shifts, staff, publishSchedule, updateShift, deleteShift, currentUser, generateShiftsFromPattern } = useOpsCenter();
    const canManageSchedule = isManager(currentUser);
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

    // Drag API State
    const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalDate, setModalDate] = useState<Date | undefined>(undefined);
    const [modalUserId, setModalUserId] = useState<string | undefined>(undefined);
    const [editingShift, setEditingShift] = useState<Shift | undefined>(undefined);

    // Staff Modal State
    const [isStaffModalOpen, setStaffModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

    // Delete confirmation
    const [showTrashConfirm, setShowTrashConfirm] = useState(false);
    const [pendingDeleteShiftId, setPendingDeleteShiftId] = useState<string | null>(null);

    // Dropdown State
    const [isAddStaffDropdownOpen, setIsAddStaffDropdownOpen] = useState(false);

    const handleOpenStaffModal = (staffId: string | null) => {
        setSelectedStaffId(staffId);
        setStaffModalOpen(true);
    };

    // Helpers
    const getWeekDates = (startDate: Date) => {
        const dates = [];
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(new Date(startDate).setDate(diff)); // Fix date ref issue

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const weekDates = getWeekDates(new Date(currentWeekStart));

    // Mobile State
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handlePublish = async () => {
        await publishSchedule();
        alert('Schedule Published!');
    };

    // Repeat/Extend Schedule for all staff with schedule patterns
    const [isRepeating, setIsRepeating] = useState(false);
    const handleRepeatSchedule = async () => {
        setIsRepeating(true);
        try {
            // Generate shifts for each staff member with a schedule config
            for (const member of staff) {
                if (member.schedule_config && (member.schedule_config.type === 'fixed' || member.schedule_config.type === 'rotating')) {
                    // Find the latest shift for THIS specific user
                    const userShifts = shifts.filter(s => s.user_id === member.id);
                    let fromDate: Date | undefined;

                    if (userShifts.length > 0) {
                        // Find the latest end date among this user's shifts
                        const latestShiftDate = userShifts.reduce((latest, shift) => {
                            const endDate = new Date(shift.end_time);
                            return endDate > latest ? endDate : latest;
                        }, new Date(0));

                        // Start generating from the day AFTER the latest shift
                        fromDate = new Date(latestShiftDate);
                        fromDate.setDate(fromDate.getDate() + 1);
                    }

                    await generateShiftsFromPattern(member.id, member.schedule_config, 4, fromDate);
                }
            }
            alert('Schedule extended for the next 4 weeks!');
        } catch (error) {
            console.error('Error repeating schedule:', error);
            alert('Failed to extend schedule. Please try again.');
        } finally {
            setIsRepeating(false);
        }
    };

    const handleNewShift = (date: Date, userId?: string) => {
        setEditingShift(undefined);
        setModalDate(date);
        setModalUserId(userId);
        setIsModalOpen(true);
    };

    const handleEditShift = (shift: Shift, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingShift(shift);
        setModalDate(undefined);
        setModalUserId(undefined);
        setIsModalOpen(true);
    };

    // --- Drag & Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, shiftId: string) => {
        setDraggedShiftId(shiftId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedShiftId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleTrashDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedShiftId) return;

        setPendingDeleteShiftId(draggedShiftId);
        setShowTrashConfirm(true);
        setDraggedShiftId(null);
    };

    const confirmTrashDelete = async () => {
        if (pendingDeleteShiftId) {
            await deleteShift(pendingDeleteShiftId);
            setPendingDeleteShiftId(null);
        }
    };

    const handleDrop = async (e: React.DragEvent, targetDate: Date, targetUserId?: string) => {
        e.preventDefault();
        if (!draggedShiftId) return;

        const originalShift = shifts.find(s => s.id === draggedShiftId);
        if (!originalShift) return;

        // Calculate new times preserving the original duration and time-of-day
        const oldStart = new Date(originalShift.start_time);
        const oldEnd = new Date(originalShift.end_time);

        const newStart = new Date(targetDate);
        newStart.setHours(oldStart.getHours(), oldStart.getMinutes());

        const duration = oldEnd.getTime() - oldStart.getTime();
        const newEnd = new Date(newStart.getTime() + duration);

        const updates: Partial<Shift> = {
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
            is_open: !targetUserId,
            user_id: targetUserId || undefined,
            // Optimistic update: directly set profile if assigning to user? 
            // The store logic usually regenerates it, but let's be safe.
        };

        await updateShift(draggedShiftId, updates);
        setDraggedShiftId(null);
    };

    // Filter shifts for mobile day view
    const getMobileShifts = (date: Date) => {
        return shifts.filter(s => {
            const sDate = new Date(s.start_time);
            return sDate.getDate() === date.getDate() &&
                sDate.getMonth() === date.getMonth() &&
                sDate.getFullYear() === date.getFullYear();
        }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    };

    const mobileShifts = getMobileShifts(selectedDate);
    const myMobileShift = mobileShifts.find(s => s.user_id === 'user-1' || s.user_id === currentUser?.id);

    // Navigation Handlers
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

    const navigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentWeekStart);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        }
        setCurrentWeekStart(newDate);
    };

    return (
        <div className="flex gap-6 h-[calc(100vh-8rem)]" onClick={() => setIsAddStaffDropdownOpen(false)}>
            <div className="flex-1 flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-hidden">
                <ShiftModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    editShift={editingShift}
                    defaultDate={modalDate}
                    defaultUserId={modalUserId}
                />

                <StaffDetailModal
                    isOpen={isStaffModalOpen}
                    onClose={() => setStaffModalOpen(false)}
                    staffId={selectedStaffId}
                />

                {/* Trash Delete Confirmation */}
                <ConfirmDialog
                    isOpen={showTrashConfirm}
                    onClose={() => setShowTrashConfirm(false)}
                    onConfirm={confirmTrashDelete}
                    title="Delete Shift"
                    message="Are you sure you want to delete this shift?"
                    confirmText="Delete"
                    variant="danger"
                />

                {/* --- Mobile View: Day Agenda --- */}
                <div className="lg:hidden flex flex-col h-[calc(100vh-140px)]">
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between mb-6 px-1">
                        <div>
                            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Schedule</h2>
                            <p className="text-slate-500 font-medium text-sm">Tap date to navigate</p>
                        </div>
                        <div className="glass-panel px-1 py-1 rounded-2xl flex items-center shadow-lg shadow-indigo-500/10">
                            <button
                                onClick={() => {
                                    const prev = new Date(selectedDate);
                                    prev.setDate(prev.getDate() - 1);
                                    setSelectedDate(prev);
                                }}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/50 rounded-xl text-slate-500 transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="px-2 flex flex-col items-center justify-center min-w-[80px]">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <span className="text-lg font-display font-bold text-slate-900 leading-none">
                                    {selectedDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    const next = new Date(selectedDate);
                                    next.setDate(next.getDate() + 1);
                                    setSelectedDate(next);
                                }}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/50 rounded-xl text-slate-500 transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Scrolling Body */}
                    <div className="flex-1 overflow-y-auto pb-24 space-y-4 px-1 custom-scrollbar">

                        {/* My Shift Highlight */}
                        {myMobileShift ? (
                            <div className="relative group overflow-hidden rounded-[2rem] shadow-xl shadow-indigo-500/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700"></div>
                                <div className="absolute top-0 right-0 p-8 opacity-20">
                                    <Clock size={120} />
                                </div>
                                <div className="relative z-10 p-6 text-white">
                                    <div className="flex justify-between items-start mb-6">
                                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">
                                            My Shift Today
                                        </span>
                                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                            <Briefcase size={18} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 mb-6">
                                        <div className="text-4xl font-display font-bold tracking-tight">
                                            {new Date(myMobileShift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '')}
                                        </div>
                                        <div className="text-lg font-medium text-indigo-100 flex items-center gap-2">
                                            <span className="opacity-60">until</span>
                                            <span>{new Date(myMobileShift.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                                        <div>
                                            <div className="text-2xl font-bold">{(new Date(myMobileShift.end_time).getTime() - new Date(myMobileShift.start_time).getTime()) / 3600000}h</div>
                                            <div className="text-[10px] uppercase font-bold text-indigo-200">Duration</div>
                                        </div>
                                        <div className="w-px h-8 bg-white/10"></div>
                                        <div>
                                            <div className="text-sm font-bold">{myMobileShift.role_type}</div>
                                            <div className="text-[10px] uppercase font-bold text-indigo-200">Role</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-panel p-8 rounded-[2rem] flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-200/50">
                                <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-4 shadow-inner">
                                    <CalendarIcon size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">You are off today</h3>
                                <p className="text-sm text-slate-500 font-medium">No shifts scheduled for this date.</p>
                            </div>
                        )}

                        {/* Open Shifts Section */}
                        {mobileShifts.filter(s => s.is_open).length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Open Shifts</h3>
                                <div className="space-y-3">
                                    {mobileShifts.filter(s => s.is_open).map(shift => (
                                        <div key={shift.id} onClick={(e) => handleEditShift(shift, e)} className="glass-panel p-4 rounded-2xl flex justify-between items-center group active:scale-[0.98] transition-transform cursor-pointer border border-dashed border-indigo-200/50 hover:border-indigo-400">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                    <Briefcase size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">
                                                        {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium">{shift.role_type}</div>
                                                </div>
                                            </div>
                                            <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20">
                                                Claim
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Team Shifts Section */}
                        {mobileShifts.filter(s => !s.is_open && s.id !== myMobileShift?.id).length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Team Schedule</h3>
                                <div className="space-y-3">
                                    {mobileShifts.filter(s => !s.is_open && s.id !== myMobileShift?.id).map(shift => {
                                        const user = staff.find(u => u.id === shift.user_id);
                                        return (
                                            <div key={shift.id} onClick={(e) => handleEditShift(shift, e)} className="glass-panel p-3 rounded-2xl flex items-center gap-3 cursor-pointer hover:border-indigo-300 transition-colors">
                                                <div className="relative">
                                                    <img src={user?.avatar_url || 'https://via.placeholder.com/40'} alt={user?.full_name} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <h4 className="text-sm font-bold text-slate-900 truncate pr-2">
                                                            {user?.full_name}
                                                        </h4>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100/80 px-2 py-1 rounded-lg">
                                                            {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()} - {new Date(shift.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{shift.role_type}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {canManageSchedule && (
                            <button onClick={() => handleNewShift(selectedDate)} className="w-full py-4 mt-6 border-2 border-dashed border-slate-300 text-slate-400 rounded-2xl font-bold text-sm flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 hover:bg-white/50 transition-all">
                                <Plus size={18} className="mr-2" />
                                Add Shift
                            </button>
                        )}
                    </div>
                </div>

                {/* --- Desktop View Content --- */}
                <div className="hidden lg:flex flex-col space-y-6 h-full">
                    {/* Header */}
                    <div className="flex justify-between items-center shrink-0">
                        <div className="flex items-center space-x-8">
                            <div>
                                <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Schedule</h1>
                                <p className="text-slate-500 font-medium">Manage team shifts and coverage</p>
                            </div>

                            {/* Navigation Capsule */}
                            <div className="glass-panel p-1 rounded-2xl flex items-center shadow-sm">
                                <button onClick={() => navigate('prev')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="px-4 text-sm font-bold text-slate-700 min-w-[160px] text-center font-display">
                                    {viewMode === 'week' && `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                    {viewMode === 'day' && currentWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    {viewMode === 'month' && currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => navigate('next')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* View Toggles */}
                            <div className="glass-panel p-1 rounded-xl flex space-x-1">
                                {(['day', 'week', 'month'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${viewMode === mode
                                            ? 'bg-slate-900 text-white shadow-md'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {/* Add Staff Button - Admin Only */}
                            {canManageSchedule && (
                                <button
                                    onClick={() => handleOpenStaffModal(null)}
                                    className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 hover:shadow-sm transition-all"
                                >
                                    <Users size={16} className="text-indigo-500" />
                                    <span>Staff</span>
                                </button>
                            )}

                            {/* Repeat Schedule - Admin Only */}
                            {canManageSchedule && (
                                <button
                                    onClick={handleRepeatSchedule}
                                    disabled={isRepeating}
                                    className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 hover:shadow-sm transition-all disabled:opacity-50"
                                >
                                    <RefreshCw size={16} className={`text-emerald-500 ${isRepeating ? 'animate-spin' : ''}`} />
                                    <span>{isRepeating ? 'Extending...' : 'Repeat'}</span>
                                </button>
                            )}

                            {/* Filter */}
                            <button className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:border-indigo-200 transition-all">
                                <Filter size={18} />
                            </button>

                            {/* Trash Drop Zone */}
                            {draggedShiftId && (
                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={handleTrashDrop}
                                    className="flex items-center justify-center px-6 py-2 bg-rose-50 border-2 border-dashed border-rose-300 text-rose-600 rounded-xl font-bold text-sm animate-pulse transition-all shadow-sm"
                                >
                                    <Trash2 size={18} className="mr-2" />
                                    <span>Drop to Delete</span>
                                </div>
                            )}

                            {/* Publish Button */}
                            {canManageSchedule && (
                                <button onClick={handlePublish} className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all">
                                    <Save size={18} />
                                    <span>Publish</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Main Grid Area */}
                    <div className="glass-panel rounded-[2rem] overflow-hidden flex-1 border border-white/40 shadow-xl shadow-indigo-500/5 relative">
                        {/* Decorative background blur */}
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-10"></div>

                        {viewMode === 'week' && (
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Week Header - Fixed */}
                                <div className="grid grid-cols-8 divide-x divide-slate-100 border-b border-slate-100 bg-white/50 backdrop-blur-sm z-20">
                                    <div className="p-4 flex items-center justify-between relative">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                <Users size={16} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">STAFF</span>
                                        </div>

                                        {/* Add Staff Button (Mini) */}
                                        {canManageSchedule && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsAddStaffDropdownOpen(!isAddStaffDropdownOpen);
                                                }}
                                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        )}

                                        {/* Staff Dropdown */}
                                        {isAddStaffDropdownOpen && (
                                            <div className="absolute top-full left-2 mt-2 w-64 glass-panel rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                                    <div className="text-xs font-bold text-slate-500 uppercase">Quick Add Shift</div>
                                                </div>
                                                <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                                                    {staff.map(user => (
                                                        <div
                                                            key={user.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleNewShift(currentWeekStart, user.id);
                                                                setIsAddStaffDropdownOpen(false);
                                                            }}
                                                            className="flex items-center space-x-3 p-2 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                                                        >
                                                            <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full object-cover shadow-sm" />
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-900">{user.full_name}</div>
                                                                <div className="text-[10px] text-slate-400 uppercase">{user.role}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dates Header */}
                                    {weekDates.map((date, i) => {
                                        const isToday = date.toDateString() === new Date().toDateString();
                                        return (
                                            <div key={i} className={`p-3 text-center transition-colors ${isToday ? 'bg-indigo-50/30' : ''}`}>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">{DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}</div>
                                                <div className={`flex items-center justify-center mx-auto w-8 h-8 rounded-full text-lg font-bold font-display ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'text-slate-700'}`}>
                                                    {date.getDate()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Scrollable Grid Content */}
                                <div className="divide-y divide-slate-100 overflow-y-auto flex-1 custom-scrollbar pb-24 bg-white/30">
                                    {/* Unassigned Shifts Row */}
                                    <div className={`grid grid-cols-8 divide-x divide-slate-100/50 group hover:bg-slate-50/30 transition-colors ${!canManageSchedule ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                                        <div className="p-4 flex items-center space-x-3 bg-slate-50/50">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                                                <Briefcase size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-600 text-sm">Open Shifts</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Unassigned</div>
                                            </div>
                                        </div>
                                        {weekDates.map((date, i) => {
                                            const dayShifts = shifts.filter(s => s.is_open && new Date(s.start_time).toDateString() === date.toDateString());
                                            return (
                                                <div
                                                    key={i}
                                                    className="p-1 min-h-[100px] relative transition-colors hover:bg-indigo-50/10 cursor-pointer"
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, date, undefined)}
                                                    onClick={() => handleNewShift(date)}
                                                >
                                                    <div className="h-full w-full rounded-xl border border-transparent hover:border-dashed hover:border-slate-300 transition-all p-1">
                                                        <div className="space-y-2 pointer-events-none">
                                                            {dayShifts.map(shift => (
                                                                <div
                                                                    key={shift.id}
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, shift.id)}
                                                                    onDragEnd={handleDragEnd}
                                                                    onClick={(e) => { e.stopPropagation(); handleEditShift(shift, e); }}
                                                                    className="bg-white border-2 border-dashed border-indigo-200 text-slate-600 p-2.5 rounded-xl cursor-pointer hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group/shift pointer-events-auto shadow-sm"
                                                                >
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                                                            {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs font-bold text-slate-700">{shift.role_type}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Staff Rows */}
                                    {(canManageSchedule ? staff : staff.filter(u => u.id === currentUser.id)).map(user => {
                                        const isCurrentUser = user.id === currentUser.id;
                                        const isRestricted = !canManageSchedule && !isCurrentUser;

                                        return (
                                            <div
                                                key={user.id}
                                                className={`grid grid-cols-8 divide-x divide-slate-100/50 group hover:bg-white/40 transition-colors ${isRestricted ? 'opacity-40 pointer-events-none grayscale' : ''}`}
                                            >
                                                {/* Staff Header Cell */}
                                                <div className="p-4 flex items-center space-x-3 bg-white/30 backdrop-blur-sm group-hover:bg-white/60 transition-colors">
                                                    <div className="relative">
                                                        <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-xl object-cover shadow-sm ring-2 ring-white" />
                                                        {isCurrentUser && <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white"></div>}
                                                    </div>
                                                    <div className="cursor-pointer group/name overflow-hidden" onClick={() => handleOpenStaffModal(user.id)}>
                                                        <div className="font-bold text-slate-700 text-sm group-hover/name:text-indigo-600 truncate transition-colors">{user.full_name}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{user.role}</div>
                                                    </div>
                                                </div>

                                                {/* Days Cells */}
                                                {weekDates.map((date, i) => {
                                                    const dayShifts = shifts.filter(s => s.user_id === user.id && new Date(s.start_time).toDateString() === date.toDateString());
                                                    return (
                                                        <div
                                                            key={i}
                                                            className="p-1 min-h-[100px] relative transition-colors hover:bg-slate-50/30 cursor-pointer"
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(e, date, user.id)}
                                                            onClick={() => handleNewShift(date, user.id)}
                                                        >
                                                            <div className="h-full w-full rounded-xl border border-transparent hover:border-dashed hover:border-slate-300 transition-all p-1">
                                                                <div className="space-y-2 pointer-events-none">
                                                                    {dayShifts.map(shift => (
                                                                        <div
                                                                            key={shift.id}
                                                                            draggable
                                                                            onDragStart={(e) => handleDragStart(e, shift.id)}
                                                                            onDragEnd={handleDragEnd}
                                                                            onClick={(e) => { e.stopPropagation(); handleEditShift(shift, e); }}
                                                                            className={`relative z-10 p-2.5 rounded-xl cursor-pointer shadow-sm border hover:shadow-md transition-all pointer-events-auto group/card ${shift.is_open
                                                                                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                                                                                    : 'bg-white border-slate-200/60'
                                                                                }`}
                                                                        >
                                                                            <div className="flex justify-between items-center mb-1.5">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <div className={`w-1.5 h-1.5 rounded-full ${shift.is_open ? 'bg-slate-400' : 'bg-emerald-500'}`}></div>
                                                                                    <span className="text-[10px] font-bold text-slate-400">
                                                                                        {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                                                                                    </span>
                                                                                </div>
                                                                                {!shift.is_open && (
                                                                                    <div className="opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                                                        <MoreHorizontal size={12} className="text-slate-400" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className={`text-xs font-bold leading-tight ${shift.is_open ? 'text-slate-500' : 'text-slate-700'}`}>
                                                                                {shift.role_type}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {viewMode === 'month' && (
                            <div className="flex flex-col h-full bg-white/50">
                                <div className="grid grid-cols-7 border-b border-slate-100 flex-none bg-slate-50/50">
                                    {DAYS.map(day => (
                                        <div key={day} className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 auto-rows-fr flex-1 gap-px border-b border-l border-slate-100 overflow-y-auto pb-24 bg-slate-100/50">
                                    {/* Month generation logic identical to before but refined styles */}
                                    {(() => {
                                        const year = currentWeekStart.getFullYear();
                                        const month = currentWeekStart.getMonth();
                                        const firstDay = new Date(year, month, 1);
                                        const lastDay = new Date(year, month + 1, 0);
                                        const daysInMonth = lastDay.getDate();
                                        const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

                                        const calendarDays = [];
                                        for (let i = 0; i < startingDayOfWeek; i++) {
                                            calendarDays.push({ date: new Date(year, month, 1 - (startingDayOfWeek - i)), isCurrentMonth: false });
                                        }
                                        for (let i = 1; i <= daysInMonth; i++) {
                                            calendarDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
                                        }
                                        const remainingCells = 42 - calendarDays.length;
                                        for (let i = 1; i <= remainingCells; i++) {
                                            calendarDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
                                        }

                                        return calendarDays.map((cell, idx) => {
                                            const dayShifts = shifts.filter(s => new Date(s.start_time).toDateString() === cell.date.toDateString());
                                            const isToday = cell.date.toDateString() === new Date().toDateString();

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`bg-white p-2 min-h-[120px] hover:bg-slate-50 transition-colors cursor-pointer group relative ${!cell.isCurrentMonth ? 'bg-slate-50/50' : ''}`}
                                                    onClick={() => canManageSchedule && handleNewShift(cell.date)}
                                                >
                                                    <div className={`text-right mb-2`}>
                                                        <span className={`text-xs font-bold inline-block w-7 h-7 leading-7 text-center rounded-lg ${isToday ? 'bg-indigo-600 text-white shadow-md' : (!cell.isCurrentMonth ? 'text-slate-300' : 'text-slate-700')}`}>
                                                            {cell.date.getDate()}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 content-start">
                                                        {(() => {
                                                            const colors = [
                                                                'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
                                                                'bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500'
                                                            ];

                                                            const filteredDayShifts = canManageSchedule ? dayShifts : dayShifts.filter(s => s.user_id === currentUser.id);
                                                            const maxDots = 7;
                                                            const shiftsToShow = filteredDayShifts.slice(0, maxDots);
                                                            const extraCount = filteredDayShifts.length - maxDots;

                                                            return (
                                                                <>
                                                                    {shiftsToShow.map((shift, i) => {
                                                                        const staffMember = staff.find(s => s.id === shift.user_id);
                                                                        const staffIndex = staff.findIndex(s => s.id === shift.user_id);
                                                                        const initials = shift.is_open ? '?' : (staffMember?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??');
                                                                        const colorClass = shift.is_open ? 'bg-slate-300' : colors[staffIndex % colors.length];
                                                                        const fullName = shift.is_open ? 'Open Shift' : (staffMember?.full_name || 'Unassigned');
                                                                        const time = new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                                                        const isRestricted = !canManageSchedule && shift.user_id !== currentUser.id;

                                                                        return (
                                                                            <div
                                                                                key={shift.id}
                                                                                onClick={(e) => {
                                                                                    if (isRestricted) return;
                                                                                    handleEditShift(shift, e);
                                                                                }}
                                                                                title={`${time} - ${fullName}`}
                                                                                className={`w-7 h-7 rounded-lg ${colorClass} text-white text-[10px] font-bold flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-md transition-all inset-shadow-sm ${isRestricted ? 'opacity-30 pointer-events-none grayscale' : ''}`}
                                                                            >
                                                                                {initials}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {extraCount > 0 && (
                                                                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center border border-slate-200">
                                                                            +{extraCount}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}

                        {viewMode === 'day' && (
                            <div className="h-full overflow-auto bg-white/50 custom-scrollbar pb-24">
                                <div className="flex min-w-max min-h-max">
                                    {/* Time Column */}
                                    <div className="sticky left-0 z-30 bg-white/95 backdrop-blur w-20 flex-shrink-0 border-r border-slate-100 shadow-sm">
                                        <div className="h-14 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-40"></div>
                                        {Array.from({ length: 24 }).map((_, i) => (
                                            <div key={i} className="h-24 border-b border-slate-50 text-[10px] font-bold text-slate-400 text-center pt-2 relative">
                                                <span className="-translate-y-1/2 block bg-white/80 px-1 rounded mx-auto w-fit">
                                                    {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Staff Columns */}
                                    {['Unassigned', ...(canManageSchedule ? staff.map(s => s.full_name) : staff.filter(s => s.id === currentUser.id).map(s => s.full_name))].map((name, i) => {
                                        const isStaff = i > 0;
                                        const staffId = isStaff ? (canManageSchedule ? staff[i - 1].id : currentUser.id) : undefined;
                                        const relevantShifts = shifts.filter(s =>
                                            new Date(s.start_time).toDateString() === currentWeekStart.toDateString() &&
                                            (isStaff ? s.user_id === staffId : s.is_open)
                                        );

                                        const isRestricted = !canManageSchedule && (isStaff ? staffId !== currentUser.id : true);

                                        return (
                                            <div key={i} className={`w-56 border-r border-slate-100/50 relative bg-white/30 ${isRestricted ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                                                {/* Header - sticky top */}
                                                <div className="h-14 border-b border-slate-100 bg-white/90 backdrop-blur px-4 flex items-center justify-center font-bold text-xs text-slate-700 sticky top-0 z-20 shadow-sm">
                                                    {name}
                                                </div>

                                                {/* Hour Grid - 24 hours * 96px (h-24) = 2304px */}
                                                <div className="relative" style={{ height: '2304px' }}>
                                                    {Array.from({ length: 24 }).map((_, h) => (
                                                        <div key={h}
                                                            className="h-24 border-b border-slate-50/50 hover:bg-indigo-50/10 transition-colors cursor-pointer"
                                                            onClick={() => {
                                                                const d = new Date(currentWeekStart);
                                                                d.setHours(h);
                                                                d.setMinutes(0);
                                                                handleNewShift(d, staffId);
                                                            }}
                                                        />
                                                    ))}

                                                    {/* Shifts Overlay */}
                                                    {relevantShifts.map(shift => {
                                                        const start = new Date(shift.start_time);
                                                        const end = new Date(shift.end_time);
                                                        const startMinutes = start.getHours() * 60 + start.getMinutes();
                                                        const durationMinutes = (end.getTime() - start.getTime()) / 60000;

                                                        const top = (startMinutes / 60) * 96; // 96px per hour
                                                        const height = Math.max((durationMinutes / 60) * 96, 48);

                                                        return (
                                                            <div
                                                                key={shift.id}
                                                                style={{ top: `${top}px`, height: `${height}px` }}
                                                                onClick={(e) => handleEditShift(shift, e)}
                                                                className={`absolute left-2 right-2 rounded-xl p-3 text-xs font-bold border shadow-lg cursor-pointer hover:scale-[1.02] transition-transform z-10 overflow-hidden flex flex-col justify-center group ${shift.is_open ? 'bg-white/90 backdrop-blur border-slate-200 text-slate-600' : 'bg-indigo-50/90 backdrop-blur border-indigo-200 text-indigo-700'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <Clock size={12} className="opacity-50" />
                                                                    <span>{start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                                                </div>
                                                                <div className="opacity-75 text-[10px] uppercase tracking-wide truncate">{shift.role_type}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ScheduleView;
