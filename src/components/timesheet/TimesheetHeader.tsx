import React from 'react';
import { Calendar, Download, DollarSign, Clock, Users } from 'lucide-react';
import { Shift, TimeEntry } from '../../types';

interface TimesheetHeaderProps {
    entries: TimeEntry[];
    dateRange: string;
    setDateRange: (range: string) => void;
}

const TimesheetHeader: React.FC<TimesheetHeaderProps> = ({ entries, dateRange, setDateRange }) => {
    // Calculate Stats
    const totalHours = entries.reduce((acc, entry) => {
        if (!entry.clock_out || entry.status === 'active') return acc;
        const start = new Date(entry.clock_in).getTime();
        const end = new Date(entry.clock_out).getTime();
        const breakMins = entry.total_break_minutes || 0;
        return acc + ((end - start) / (1000 * 60 * 60)) - (breakMins / 60);
    }, 0);

    const estPayroll = totalHours * 25; // Mock $25/hr rate for now
    const activeStaff = entries.filter(e => e.status === 'active').length;

    // Check for OT (simplified logic: anyone > 40h in this view)
    const otRisk = totalHours > 40 ? 2 : 0;

    const handleExport = () => {
        const headers = ['Entry ID', 'User ID', 'Clock In', 'Clock Out', 'Break (min)', 'Status'];
        const rows = entries.map(e => [
            e.id,
            e.user_id,
            new Date(e.clock_in).toLocaleString(),
            e.clock_out ? new Date(e.clock_out).toLocaleString() : 'ACTIVE',
            e.total_break_minutes || 0,
            e.status
        ]);

        const csvContent = [headers, ...rows]
            .map(e => e.join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `timesheet_export_${dateRange}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Timesheets</h2>
                    <p className="text-slate-500 font-medium">Manage shifts, approvals, and payroll.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none"
                        >
                            <option value="this_week">This Week</option>
                            <option value="last_week">Last Week</option>
                            <option value="this_month">This Month</option>
                        </select>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
                    >
                        <Download size={16} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Hours</p>
                        <p className="text-2xl font-black text-slate-900">{totalHours.toFixed(1)} <span className="text-sm font-medium text-slate-400">hrs</span></p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Est. Payroll</p>
                        <p className="text-2xl font-black text-slate-900">${estPayroll.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">OT Risk</p>
                        <p className="text-2xl font-black text-slate-900">{otRisk} <span className="text-sm font-medium text-slate-400">Staff</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimesheetHeader;
