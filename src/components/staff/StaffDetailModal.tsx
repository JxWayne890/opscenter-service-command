import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Clock, Save, Trash2, Shield, DollarSign, Mail, Briefcase, FileText, Upload, CheckCircle } from 'lucide-react';
import { useOpsCenter } from '../../services/store';
import { Profile, ScheduleConfig } from '../../types';
import { RestorationService } from '../../services/restoration';
import AnalogTimePicker from '../ui/AnalogTimePicker';
import CustomDatePicker from '../ui/CustomDatePicker';
import ConfirmDialog from '../ui/ConfirmDialog';
import OffboardingModal from './OffboardingModal';

interface StaffDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string | null;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({ isOpen, onClose, staffId }) => {
    const { staff, updateStaff, addStaff, currentUser, generateShiftsFromPattern, shifts, clearUserSchedule, bulkRestoreStaff } = useOpsCenter();
    const [activeTab, setActiveTab] = useState<'profile' | 'schedule' | 'shifts'>('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showOffboarding, setShowOffboarding] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [importSuccess, setImportSuccess] = useState<string | null>(null);
    const [bulkRecords, setBulkRecords] = useState<any[]>([]);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Profile>>({});
    const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
        type: 'fixed',
        fixed_days: [1, 2, 3, 4, 5], // Default M-F
        days_on: 4,
        days_off: 4,
        anchor_date: new Date().toISOString().split('T')[0],
        shift_start_time: '09:00',
        shift_end_time: '17:00'
    });

    useEffect(() => {
        if (isOpen) {
            setIsSaving(false);
            if (staffId) {
                // Edit Mode
                const user = staff.find(s => s.id === staffId);
                if (user) {
                    setFormData({
                        full_name: user.full_name,
                        email: user.email,
                        role: user.role,
                        hourly_rate: user.hourly_rate,
                        status: user.status
                    });
                    if (user.schedule_config) {
                        setScheduleConfig(user.schedule_config);
                    } else {
                        setScheduleConfig({
                            type: 'fixed',
                            fixed_days: [1, 2, 3, 4, 5],
                            days_on: 4,
                            days_off: 4,
                            anchor_date: new Date().toISOString().split('T')[0]
                        });
                    }
                }
            } else {
                // Create Mode - Reset form
                setFormData({
                    full_name: '',
                    email: '',
                    role: 'staff',
                    status: 'active',
                    hourly_rate: 0
                });
                setScheduleConfig({
                    type: 'fixed',
                    fixed_days: [1, 2, 3, 4, 5],
                    days_on: 4,
                    days_off: 4,
                    anchor_date: new Date().toISOString().split('T')[0],
                    shift_start_time: '09:00',
                    shift_end_time: '17:00'
                });
            }
        }
    }, [isOpen, staffId, staff]);

    if (!isOpen) return null;

    const handleFileDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const items = Array.from(e.dataTransfer.items);
        if (items.length === 0) return;

        setIsProcessingBulk(true);
        const collectedFiles: { name: string, fullPath: string, content: string }[] = [];

        const scanEntry = async (entry: any, path: string = '') => {
            if (entry.isFile) {
                const file = await new Promise<File>((resolve) => entry.file(resolve));
                if (file.name.toLowerCase().endsWith('.zip')) {
                    const zipResults = await RestorationService.parseZipArchive(file);
                    setBulkRecords(prev => [...prev, ...zipResults]);
                } else if (file.name.toLowerCase().endsWith('.csv')) {
                    const text = await file.text();
                    collectedFiles.push({
                        name: file.name,
                        fullPath: `${path}${file.name}`,
                        content: text
                    });
                }
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                const entries = await new Promise<any[]>((resolve) => reader.readEntries(resolve));
                for (const child of entries) {
                    await scanEntry(child, `${path}${entry.name}/`);
                }
            }
        };

        for (const item of items) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                await scanEntry(entry);
            }
        }

        // Group the collected flat files
        if (collectedFiles.length > 0) {
            const grouped = RestorationService.groupBulkRecords(collectedFiles);
            if (grouped.length > 0) {
                // If it's just one profile, auto-fill the form
                if (grouped.length === 1 && bulkRecords.length === 0) {
                    setFormData(prev => ({ ...prev, ...grouped[0].profile }));
                    setImportSuccess('Profile restored successfully!');
                    setTimeout(() => setImportSuccess(null), 3000);
                } else {
                    // Multi-profile detection
                    setBulkRecords(prev => [...prev, ...grouped]);
                }
            }
        }

        setIsProcessingBulk(false);
    };

    const handleBulkRestore = async () => {
        setIsSaving(true);
        const { bulkRestoreStaff } = useOpsCenter(); // Note: This is inside the function, might need to move out
        // Actually, I already have bulkRestoreStaff from useOpsCenter at the top
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const targetId = staffId || crypto.randomUUID();

            // Create the minimum delay promise
            const minDelayPromise = new Promise(resolve => setTimeout(resolve, 800));

            // Create the actual save operation promise
            const saveOperationPromise = (async () => {
                if (staffId) {
                    await updateStaff(staffId, {
                        ...formData,
                        schedule_config: scheduleConfig
                    });
                } else {
                    // Create New
                    const newProfile: Profile = {
                        id: targetId,
                        organization_id: currentUser.organization_id,
                        email: formData.email || '',
                        full_name: formData.full_name || 'New Staff',
                        role: formData.role || 'staff',
                        status: formData.status || 'active',
                        hourly_rate: formData.hourly_rate || 0,
                        schedule_config: scheduleConfig,
                        avatar_url: `https://ui-avatars.com/api/?name=${formData.full_name || 'New+Staff'}&background=random`
                    };
                    await addStaff(newProfile);
                }

                // Generate shifts for any schedule pattern (fixed or rotating)
                if (scheduleConfig.type === 'fixed' || scheduleConfig.type === 'rotating') {
                    await generateShiftsFromPattern(targetId, scheduleConfig, 4);
                }
            })();

            // Wait for both to complete
            await Promise.all([saveOperationPromise, minDelayPromise]);

            console.log("Save complete, closing modal");
            onClose();
        } catch (error: any) {
            console.error("Error saving staff:", error);
            alert(`Error saving staff: ${error.message || error}`);
        } finally {
            setIsSaving(false);
        }
    };

    const daysOfWeek = [
        { id: 0, label: 'Sun' },
        { id: 1, label: 'Mon' },
        { id: 2, label: 'Tue' },
        { id: 3, label: 'Wed' },
        { id: 4, label: 'Thu' },
        { id: 5, label: 'Fri' },
        { id: 6, label: 'Sat' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-xl border border-white/50 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

                {/* Gradient Top Border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80"></div>

                {/* Header */}
                <div className="flex items-center justify-between p-8 pb-4">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Staff Details</h2>
                        <p className="text-sm font-medium text-slate-500">Manage profile and schedule settings</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-8 pb-6">
                    <div className="flex bg-slate-100/80 p-1.5 rounded-2xl">
                        {[
                            { id: 'profile', label: 'Profile', icon: User },
                            { id: 'schedule', label: 'Pattern', icon: Calendar },
                            ...(staffId ? [{ id: 'shifts', label: 'Current Schedule', icon: Clock }] : [])
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                                    ? 'bg-white text-indigo-600 shadow-md transform scale-[1.02]'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="px-8 overflow-y-auto flex-1 custom-scrollbar pb-8">
                    {activeTab === 'shifts' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Upcoming Shifts List */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Upcoming Shifts</h3>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {(() => {
                                        // Get upcoming shifts for this user
                                        const now = new Date();
                                        const userShifts = shifts
                                            .filter(s => s.user_id === staffId && new Date(s.start_time) >= now)
                                            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                                        if (userShifts.length === 0) {
                                            return (
                                                <div className="text-center py-10 text-slate-400 text-sm font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                    No upcoming shifts scheduled.
                                                </div>
                                            );
                                        }

                                        return userShifts.map(shift => (
                                            <div key={shift.id} className="bg-white/60 p-4 rounded-2xl border border-slate-200/60 shadow-sm flex justify-between items-center group hover:bg-white transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                                        <Clock size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900">
                                                            {new Date(shift.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="text-xs font-medium text-slate-500">
                                                            {new Date(shift.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(shift.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wide">
                                                    {shift.role_type}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-4">Danger Zone</h3>
                                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-rose-900">Clear Entire Schedule</div>
                                        <div className="text-xs font-medium text-rose-600 mt-1 opacity-80">Permanently delete all future shifts.</div>
                                    </div>
                                    <button
                                        onClick={() => setShowClearConfirm(true)}
                                        className="px-4 py-2.5 bg-white border border-rose-200 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm"
                                    >
                                        Clear Schedule
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            {/* Restoration Drop Zone - Only for New Profiles */}
                            {!staffId && (
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleFileDrop}
                                    className={`relative p-6 border-2 border-dashed rounded-[2rem] transition-all flex flex-col items-center justify-center gap-3 group ${isDragging
                                        ? 'border-indigo-500 bg-indigo-50 px-8 py-10'
                                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                >
                                    {importSuccess ? (
                                        <div className="flex flex-col items-center gap-2 animate-bounce">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                                                <CheckCircle size={24} />
                                            </div>
                                            <p className="text-sm font-black text-emerald-600">{importSuccess}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 -translate-y-2' : 'bg-white text-slate-400 border border-slate-100 shadow-sm group-hover:scale-110'}`}>
                                                <Upload size={28} strokeWidth={2.5} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-black text-slate-900 leading-tight">Accidental Deletion?</p>
                                                <p className="text-xs font-bold text-slate-400 mt-1 max-w-[200px]">Drag and drop your <span className="text-indigo-600">profile CSV</span> here to recover all member info.</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={formData.full_name || ''}
                                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                                    <div className="relative group">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <select
                                            value={formData.role || 'staff'}
                                            onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="staff">Staff</option>
                                            <option value="manager">Manager</option>
                                            <option value="owner">Owner</option>
                                        </select>
                                    </div>
                                </div>
                                {(['admin', 'owner', 'manager'].includes(currentUser.role) || currentUser.id === staffId) && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hourly Rate ($)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                            <input
                                                type="number"
                                                value={formData.hourly_rate || ''}
                                                onChange={e => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                                                disabled={!['admin', 'owner', 'manager'].includes(currentUser.role)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                                <div className="relative group">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <select
                                        value={formData.status || 'active'}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {bulkRecords.length > 0 && !staffId && (
                        <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white animate-in slide-in-from-bottom-6 duration-500 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full -mr-20 -mt-20"></div>

                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold tracking-tight">Bulk Restore Detected</h3>
                                        <p className="text-slate-400 text-sm font-medium mt-1">{bulkRecords.length} staff profiles found in upload</p>
                                    </div>
                                    <button
                                        onClick={() => setBulkRecords([])}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar-dark pr-2 mb-6">
                                    {bulkRecords.map((record, i) => (
                                        <div key={i} className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                                                    {record.profile?.full_name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold">{record.profile?.full_name || 'Unknown Staff'}</div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{record.profile?.role || 'Staff'}</div>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                                                {record.shifts?.length || 0} Shifts • {record.timesheets?.length || 0} Entries
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={async () => {
                                        setIsSaving(true);
                                        await bulkRestoreStaff(bulkRecords);
                                        setBulkRecords([]);
                                        onClose();
                                    }}
                                    disabled={isSaving}
                                    className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                                            Restoring Team...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={18} />
                                            Restore All {bulkRecords.length} Staff Members
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-slate-500 font-bold text-center mt-4 uppercase tracking-[0.2em]">Full Historical Data Migration</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Pattern Type Toggle */}
                            <div className="bg-slate-50 p-1.5 rounded-xl inline-flex border border-slate-200/50">
                                <button
                                    onClick={() => setScheduleConfig({ ...scheduleConfig, type: 'fixed' })}
                                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${scheduleConfig.type === 'fixed'
                                        ? 'bg-white shadow text-indigo-600'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Fixed Weekly
                                </button>
                                <button
                                    onClick={() => setScheduleConfig({ ...scheduleConfig, type: 'rotating' })}
                                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${scheduleConfig.type === 'rotating'
                                        ? 'bg-white shadow text-indigo-600'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Rotating Pattern
                                </button>
                            </div>

                            {scheduleConfig.type === 'fixed' ? (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Working Days</h3>
                                        <div className="flex gap-2.5">
                                            {daysOfWeek.map(day => (
                                                <button
                                                    key={day.id}
                                                    onClick={() => {
                                                        const current = scheduleConfig.fixed_days || [];
                                                        const newDays = current.includes(day.id)
                                                            ? current.filter(d => d !== day.id)
                                                            : [...current, day.id];
                                                        setScheduleConfig({ ...scheduleConfig, fixed_days: newDays });
                                                    }}
                                                    className={`w-11 h-11 rounded-xl text-sm font-bold transition-all shadow-sm ${scheduleConfig.fixed_days?.includes(day.id)
                                                        ? 'bg-indigo-600 text-white shadow-indigo-500/30 ring-2 ring-indigo-600 ring-offset-2'
                                                        : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                                                        }`}
                                                >
                                                    {day.label[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Shift Times for Fixed */}
                                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                                        <AnalogTimePicker
                                            label="Shift Start Time"
                                            value={scheduleConfig.shift_start_time || '09:00'}
                                            onChange={(time) => setScheduleConfig({ ...scheduleConfig, shift_start_time: time })}
                                        />
                                        <AnalogTimePicker
                                            label="Shift End Time"
                                            value={scheduleConfig.shift_end_time || '17:00'}
                                            onChange={(time) => setScheduleConfig({ ...scheduleConfig, shift_end_time: time })}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Days ON</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={scheduleConfig.days_on}
                                                onChange={e => setScheduleConfig({ ...scheduleConfig, days_on: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Days OFF</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={scheduleConfig.days_off}
                                                onChange={e => setScheduleConfig({ ...scheduleConfig, days_off: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Shift Times */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <AnalogTimePicker
                                            label="Shift Start Time"
                                            value={scheduleConfig.shift_start_time || '09:00'}
                                            onChange={(time) => setScheduleConfig({ ...scheduleConfig, shift_start_time: time })}
                                        />
                                        <AnalogTimePicker
                                            label="Shift End Time"
                                            value={scheduleConfig.shift_end_time || '17:00'}
                                            onChange={(time) => setScheduleConfig({ ...scheduleConfig, shift_end_time: time })}
                                        />
                                    </div>

                                    <div>
                                        <CustomDatePicker
                                            label="Pattern Start Date"
                                            value={scheduleConfig.anchor_date || ''}
                                            onChange={(date) => setScheduleConfig({ ...scheduleConfig, anchor_date: date })}
                                        />
                                        <p className="text-xs font-medium text-slate-400 mt-2 pl-1">First day of the "Days ON" cycle.</p>
                                    </div>

                                    <div className="bg-indigo-50/80 text-indigo-700 text-sm p-4 rounded-xl flex items-start gap-3 border border-indigo-100">
                                        <Clock className="w-5 h-5 mt-0.5 shrink-0 text-indigo-500" />
                                        <p className="font-medium">
                                            Shifts: <strong>{scheduleConfig.shift_start_time || '9:00 AM'}</strong> to <strong>{scheduleConfig.shift_end_time || '5:00 PM'}</strong> • {scheduleConfig.days_on} days on / {scheduleConfig.days_off} days off.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 backdrop-blur-sm">
                    <div className="flex-1">
                        {staffId && staffId !== currentUser.id && staff.find(s => s.id === staffId)?.role === 'staff' && ['admin', 'owner', 'manager'].includes(currentUser.role) && (
                            <button
                                onClick={() => setShowOffboarding(true)}
                                className="px-4 py-3.5 text-sm font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={18} />
                                Delete Staff
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-8 py-3.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={async () => {
                    if (staffId) {
                        try {
                            // 1. Delete existing shifts
                            await clearUserSchedule(staffId);

                            // 2. Clear the pattern in DB so it doesn't regenerate
                            const emptyConfig: ScheduleConfig = {
                                ...scheduleConfig,
                                type: 'fixed',
                                fixed_days: []
                            };
                            await updateStaff(staffId, { schedule_config: emptyConfig });

                            // 3. Clear local state so UI reflects it immediately
                            setScheduleConfig(emptyConfig);

                            setShowClearConfirm(false);
                            console.log("Schedule cleared and pattern reset.");
                        } catch (err) {
                            console.error("Error clearing schedule:", err);
                            alert("Failed to clear schedule completely.");
                        }
                    }
                }}
                title="Clear Schedule"
                message="Are you sure you want to delete ALL future shifts for this staff member? This action cannot be undone."
                confirmText="Yes, Clear Schedule"
                variant="danger"
            />
            {
                staffId && (
                    <OffboardingModal
                        isOpen={showOffboarding}
                        onClose={() => setShowOffboarding(false)}
                        staffMembers={[staff.find(s => s.id === staffId)!]}
                        onSuccess={() => {
                            setShowOffboarding(false);
                            onClose(); // Close parent modal too
                        }}
                    />
                )
            }
        </div >
    );
};
