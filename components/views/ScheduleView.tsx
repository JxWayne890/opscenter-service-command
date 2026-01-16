import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Users, Filter, Save, Trash2 } from 'lucide-react';
import { useOpsCenter } from '../../services/store';
import { isManager } from '../../services/permissions';
import { Shift, Profile } from '../../types';
import SectionCard from '../SectionCard';
import ShiftModal from '../scheduling/ShiftModal';
import { StaffDetailModal } from '../staff/StaffDetailModal';
import ConfirmDialog from '../ui/ConfirmDialog';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ScheduleView = () => {
    const { shifts, staff, publishSchedule, updateShift, deleteShift, currentUser } = useOpsCenter();
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
    const myMobileShift = mobileShifts.find(s => s.user_id === 'user-1' || s.user_id === 'currentUser'); // Mock ID check

    return (
        <div className="flex gap-6 h-[calc(100vh-8rem)]">
            <div className="flex-1 flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden">
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
                        <h2 className="text-3xl font-black text-slate-900">Schedule</h2>
                        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                            <button
                                onClick={() => {
                                    const prev = new Date(selectedDate);
                                    prev.setDate(prev.getDate() - 1);
                                    setSelectedDate(prev);
                                }}
                                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="px-4 flex flex-col items-center justify-center min-w-[100px]">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <span className="text-sm font-black text-slate-900 leading-none">
                                    {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    const next = new Date(selectedDate);
                                    next.setDate(next.getDate() + 1);
                                    setSelectedDate(next);
                                }}
                                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Scrolling Body */}
                    <div className="flex-1 overflow-y-auto pb-20 space-y-4 px-1 custom-scrollbar">

                        {/* My Shift Highlight */}
                        {myMobileShift ? (
                            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <span className="inline-block px-2 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase mb-2">My Shift</span>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-3xl font-black mb-1">
                                                {new Date(myMobileShift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '')}
                                            </div>
                                            <div className="text-sm text-white/60 font-medium">
                                                to {new Date(myMobileShift.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-indigo-300">{(new Date(myMobileShift.end_time).getTime() - new Date(myMobileShift.start_time).getTime()) / 3600000}h</div>
                                            <div className="text-[10px] text-white/40 uppercase font-bold">Duration</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            </div>
                        ) : (
                            <div className="bg-slate-100 border-2 border-dashed border-slate-200 text-slate-400 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                                <CalendarIcon size={24} className="mb-2 opacity-50" />
                                <span className="text-sm font-bold">You are off today</span>
                                <span className="text-xs">Enjoy your time off!</span>
                            </div>
                        )}

                        {/* Open Shifts Section */}
                        {mobileShifts.filter(s => s.is_open).length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Open Shifts</h3>
                                <div className="space-y-2">
                                    {mobileShifts.filter(s => s.is_open).map(shift => (
                                        <div key={shift.id} onClick={(e) => handleEditShift(shift, e)} className="bg-white border-2 border-slate-100 rounded-xl p-4 flex justify-between items-center shadow-sm active:scale-[0.99] transition-transform">
                                            <div>
                                                <div className="font-bold text-slate-900">
                                                    {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">{shift.role_type}</div>
                                            </div>
                                            <button className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100">
                                                Claim
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Team Shifts Section */}
                        {mobileShifts.filter(s => !s.is_open && s.id !== myMobileShift?.id).length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Team Working</h3>
                                <div className="space-y-2">
                                    {mobileShifts.filter(s => !s.is_open && s.id !== myMobileShift?.id).map(shift => {
                                        const user = staff.find(u => u.id === shift.user_id);
                                        return (
                                            <div key={shift.id} onClick={(e) => handleEditShift(shift, e)} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center space-x-3 shadow-sm">
                                                <div className="relative">
                                                    <img src={user?.avatar_url || 'https://via.placeholder.com/40'} alt={user?.full_name} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <h4
                                                            className="text-sm font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenStaffModal(shift.user_id!);
                                                            }}
                                                        >
                                                            {user?.full_name}
                                                        </h4>
                                                        <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                                                            {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()} - {new Date(shift.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{shift.role_type}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <button onClick={() => handleNewShift(selectedDate)} className="w-full py-3 mt-4 border-2 border-dashed border-slate-300 text-slate-400 rounded-xl font-bold text-sm flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                            <Plus size={16} className="mr-2" />
                            Add Shift
                        </button>
                    </div>
                </div>

                {/* --- Desktop View: Weekly Grid (Existing) --- */}
                <div className="hidden lg:flex flex-col space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-3xl font-black text-slate-900">Schedule</h2>
                            <div className="flex items-center space-x-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="px-2 text-sm font-bold text-slate-600">
                                    {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:shadow-md transition-all">
                                <Filter size={16} />
                                <span>Filter</span>
                            </button>

                            {/* Trash Drop Zone - appears when dragging */}
                            {draggedShiftId && (
                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={handleTrashDrop}
                                    className="flex items-center justify-center px-6 py-2 bg-rose-100 border-2 border-dashed border-rose-400 text-rose-600 rounded-xl font-bold text-sm animate-pulse transition-all"
                                >
                                    <Trash2 size={18} className="mr-2" />
                                    <span>Drop to Delete</span>
                                </div>
                            )}

                            <button onClick={handlePublish} className="flex items-center space-x-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
                                <Save size={16} />
                                <span>Publish</span>
                            </button>
                        </div>
                    </div>

                    <SectionCard className="overflow-hidden">
                        <div className="grid grid-cols-8 divide-x divide-slate-100 border-b border-slate-100">
                            <div className="p-4 bg-slate-50/50 flex flex-col justify-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STAFF MEMBER</span>
                            </div>
                            {weekDates.map((date, i) => (
                                <div key={i} className={`p-4 text-center ${date.toDateString() === new Date().toDateString() ? 'bg-indigo-50/30' : ''}`}>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}</div>
                                    <div className={`text-xl font-black ${date.toDateString() === new Date().toDateString() ? 'text-indigo-600' : 'text-slate-900'}`}>
                                        {date.getDate()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="divide-y divide-slate-50">
                            {/* Open Shifts Row */}
                            <div className="grid grid-cols-8 divide-x divide-slate-50 group hover:bg-slate-50/50 transition-colors">
                                <div className="p-4 flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                                        <Plus size={20} />
                                    </div>
                                    <span className="font-bold text-slate-600">Open Shifts</span>
                                </div>
                                {weekDates.map((date, i) => {
                                    const dayShifts = shifts.filter(s =>
                                        s.is_open &&
                                        new Date(s.start_time).toDateString() === date.toDateString()
                                    );

                                    return (
                                        <div
                                            key={i}
                                            className="p-2 min-h-[100px] relative transition-colors hover:bg-slate-100/50 cursor-pointer group/cell"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, date, undefined)}
                                            onClick={() => handleNewShift(date)}
                                        >
                                            <div className="space-y-2 pointer-events-none">
                                                {dayShifts.map(shift => (
                                                    <div
                                                        key={shift.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, shift.id)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent parent click from triggering new shift
                                                            handleEditShift(shift, e);
                                                        }}
                                                        className="bg-white border-2 border-dashed border-slate-300 p-2 rounded-lg cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group/shift pointer-events-auto"
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs font-bold text-slate-700">{shift.role_type}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Staff Rows */}
                            {staff.map(user => (
                                <div key={user.id} className="grid grid-cols-8 divide-x divide-slate-50 group hover:bg-slate-50/50 transition-colors">
                                    <div className="p-4 flex items-center space-x-3">
                                        <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                                        <div
                                            className="cursor-pointer hover:text-indigo-600 transition-colors group/name"
                                            onClick={() => handleOpenStaffModal(user.id)}
                                        >
                                            <div className="font-bold text-slate-900 text-sm group-hover/name:text-indigo-600 transition-colors">{user.full_name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">{user.role}</div>
                                        </div>
                                    </div>

                                    {weekDates.map((date, i) => {
                                        const dayShifts = shifts.filter(s =>
                                            s.user_id === user.id &&
                                            new Date(s.start_time).toDateString() === date.toDateString()
                                        );

                                        return (
                                            <div
                                                key={i}
                                                className="p-2 min-h-[100px] relative transition-colors hover:bg-slate-100/50 cursor-pointer group/cell"
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, date, user.id)}
                                                onClick={() => handleNewShift(date, user.id)}
                                            >
                                                <div className="space-y-2 pointer-events-none">
                                                    {dayShifts.map(shift => (
                                                        <div
                                                            key={shift.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, shift.id)}
                                                            onDragEnd={handleDragEnd}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditShift(shift, e);
                                                            }}
                                                            className={`relative z-10 p-2 rounded-lg cursor-pointer shadow-sm border border-transparent hover:shadow-md transition-all pointer-events-auto ${shift.is_open ? 'bg-slate-100' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}
                                                        >
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[10px] font-bold opacity-75">
                                                                    {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                                                                </span>
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            </div>
                                                            <div className="text-xs font-bold leading-tight">{shift.role_type}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                </div>
            </div>

        </div>
    );
};

export default ScheduleView;
