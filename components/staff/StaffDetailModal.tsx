import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Clock, Save } from 'lucide-react';
import { useOpsCenter } from '../../services/store';
import { Profile, ScheduleConfig } from '../../types';
import AnalogTimePicker from '../ui/AnalogTimePicker';
import CustomDatePicker from '../ui/CustomDatePicker';

interface StaffDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string | null;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({ isOpen, onClose, staffId }) => {
    const { staff, updateStaff, addStaff, currentUser, generateShiftsFromPattern } = useOpsCenter();
    const [activeTab, setActiveTab] = useState<'profile' | 'schedule'>('profile');

    // Form State
    const [formData, setFormData] = useState<Partial<Profile>>({});
    const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
        type: 'fixed',
        fixed_days: [1, 2, 3, 4, 5], // Default M-F
        days_on: 4,
        days_off: 4,
        anchor_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (isOpen) {
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
                    role: 'staff',
                    status: 'active',
                    hourly_rate: 0
                });
                setScheduleConfig({
                    type: 'fixed',
                    fixed_days: [1, 2, 3, 4, 5],
                    days_on: 4,
                    days_off: 4,
                    anchor_date: new Date().toISOString().split('T')[0]
                });
            }
        }
    }, [isOpen, staffId, staff]);

    if (!isOpen) return null;

    const handleSave = async () => {
        const targetId = staffId || crypto.randomUUID();

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

        // Generate shifts if rotating pattern is saved
        if (scheduleConfig.type === 'rotating') {
            await generateShiftsFromPattern(targetId, scheduleConfig, 4);
        }

        onClose();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Staff Details</h2>
                        <p className="text-sm text-gray-500">Manage profile and schedule settings</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`py-4 mr-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'profile'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'schedule'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Schedule Pattern
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'profile' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.full_name || ''}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={formData.role || 'staff'}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    >
                                        <option value="staff">Staff</option>
                                        <option value="manager">Manager</option>
                                        <option value="owner">Owner</option>
                                    </select>
                                </div>
                                {(['admin', 'owner', 'manager'].includes(currentUser.role) || currentUser.id === staffId) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                                        <input
                                            type="number"
                                            value={formData.hourly_rate || ''}
                                            onChange={e => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                            disabled={!['admin', 'owner', 'manager'].includes(currentUser.role)} // Only admin can edit, staff can only view? User said "they can see what they make". Usually staff can't edit their rate.
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status || 'active'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Pattern Type Toggle */}
                            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg inline-flex">
                                <button
                                    onClick={() => setScheduleConfig({ ...scheduleConfig, type: 'fixed' })}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${scheduleConfig.type === 'fixed'
                                        ? 'bg-white shadow text-primary-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Fixed Weekly
                                </button>
                                <button
                                    onClick={() => setScheduleConfig({ ...scheduleConfig, type: 'rotating' })}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${scheduleConfig.type === 'rotating'
                                        ? 'bg-white shadow text-primary-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Rotating Pattern
                                </button>
                            </div>

                            {scheduleConfig.type === 'fixed' ? (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-gray-900">Working Days</h3>
                                    <div className="flex gap-2">
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
                                                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors border ${scheduleConfig.fixed_days?.includes(day.id)
                                                    ? 'bg-primary-500 border-primary-500 text-white'
                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-primary-300'
                                                    }`}
                                            >
                                                {day.label[0]}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500">Select the days this employee normally works.</p>

                                    {/* Shift Times for Fixed */}
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
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
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Days ON</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={scheduleConfig.days_on}
                                                onChange={e => setScheduleConfig({ ...scheduleConfig, days_on: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Days OFF</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={scheduleConfig.days_off}
                                                onChange={e => setScheduleConfig({ ...scheduleConfig, days_off: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Shift Times */}
                                    <div className="grid grid-cols-2 gap-4">
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
                                        <p className="text-xs text-gray-500 mt-2">First day of the "Days ON" cycle.</p>
                                    </div>

                                    <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg flex items-start gap-2">
                                        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                                        <p>
                                            Shifts: <strong>{scheduleConfig.shift_start_time || '9:00 AM'}</strong> to <strong>{scheduleConfig.shift_end_time || '5:00 PM'}</strong> • {scheduleConfig.days_on} days on / {scheduleConfig.days_off} days off.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
