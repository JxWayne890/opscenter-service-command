import React, { useMemo } from 'react';
import { useOpsCenter } from '../../services/store';
import { TimeMath } from '../../utils/timeMath';
import { getOvertimeStatuses } from '../../utils/overtime';
import { isManager } from '../../services/permissions';
import { BarChart3, Users, Clock, DollarSign, TrendingUp, AlertTriangle, Calendar, CheckCircle2, Lock } from 'lucide-react';
import SectionCard from '../SectionCard';

const AnalyticsView = () => {
    const { staff, timeEntries, shifts, clients, payStubs, currentUser, organization } = useOpsCenter();

    if (currentUser.role === 'staff') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Lock size={64} className="mb-4 opacity-20" />
                <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
                <p className="text-sm max-w-xs text-center mt-2">Analytics is available for managers and owners.</p>
            </div>
        );
    }

    // Current week boundaries
    const now = new Date();
    const weekStart = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        return d;
    }, []);

    const weekEnd = useMemo(() => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        return d;
    }, [weekStart]);

    // This week's time entries
    const weekEntries = useMemo(() =>
        timeEntries.filter(e => new Date(e.clock_in) >= weekStart && new Date(e.clock_in) < weekEnd),
    [timeEntries, weekStart, weekEnd]);

    // Total hours this week
    const totalHoursThisWeek = useMemo(() => {
        let total = 0;
        weekEntries.forEach(e => {
            if (!e.clock_out && e.status !== 'active') return;
            total += TimeMath.msToDecimalHours(
                TimeMath.calculateNetDurationMS(e.clock_in, e.clock_out || new Date(), e.total_break_minutes)
            );
        });
        return total;
    }, [weekEntries]);

    // Average hours per employee
    const activeStaffIds = useMemo(() => [...new Set(weekEntries.map(e => e.user_id))], [weekEntries]);
    const avgHoursPerEmployee = activeStaffIds.length > 0 ? totalHoursThisWeek / activeStaffIds.length : 0;

    // Overtime statuses
    const overtimeStatuses = useMemo(() =>
        getOvertimeStatuses(staff.map(s => s.id), timeEntries, weekStart),
    [staff, timeEntries, weekStart]);

    const overtimeCount = overtimeStatuses.filter(s => s.isOvertime).length;
    const approachingCount = overtimeStatuses.filter(s => s.isApproaching).length;

    // This week's shifts
    const weekShifts = useMemo(() =>
        shifts.filter(s => new Date(s.start_time) >= weekStart && new Date(s.start_time) < weekEnd),
    [shifts, weekStart, weekEnd]);

    const publishedShifts = weekShifts.filter(s => s.status === 'published' || s.status === 'approved');
    const openShifts = weekShifts.filter(s => s.is_open);

    // Estimated payroll this week
    const estimatedPayroll = useMemo(() => {
        return staff.reduce((sum, emp) => {
            const empEntries = weekEntries.filter(e => e.user_id === emp.id);
            let hours = 0;
            empEntries.forEach(e => {
                if (!e.clock_out && e.status !== 'active') return;
                hours += TimeMath.msToDecimalHours(
                    TimeMath.calculateNetDurationMS(e.clock_in, e.clock_out || new Date(), e.total_break_minutes)
                );
            });
            return sum + (hours * (emp.hourly_rate || 0));
        }, 0);
    }, [staff, weekEntries]);

    // Staff utilization (staff who clocked in this week / total active staff)
    const activeStaff = staff.filter(s => s.status === 'active');
    const utilization = activeStaff.length > 0 ? (activeStaffIds.length / activeStaff.length) * 100 : 0;

    // Top performers by hours
    const topPerformers = useMemo(() => {
        return staff.map(emp => {
            const empEntries = weekEntries.filter(e => e.user_id === emp.id);
            let hours = 0;
            empEntries.forEach(e => {
                if (!e.clock_out && e.status !== 'active') return;
                hours += TimeMath.msToDecimalHours(
                    TimeMath.calculateNetDurationMS(e.clock_in, e.clock_out || new Date(), e.total_break_minutes)
                );
            });
            return { employee: emp, hours };
        })
        .filter(p => p.hours > 0)
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);
    }, [staff, weekEntries]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <BarChart3 size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Analytics</h1>
                        <p className="text-sm text-slate-500 font-medium">Week of {weekStart.toLocaleDateString()} — {new Date(weekEnd.getTime() - 1).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SectionCard>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock size={16} className="text-indigo-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Hours</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">{TimeMath.formatDecimalHours(totalHoursThisWeek)}</div>
                        <div className="text-xs text-slate-400 mt-1">{activeStaffIds.length} staff clocked in</div>
                    </div>
                </SectionCard>

                <SectionCard>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Payroll</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">{TimeMath.formatCurrency(estimatedPayroll)}</div>
                        <div className="text-xs text-slate-400 mt-1">Avg {TimeMath.formatCurrency(activeStaffIds.length > 0 ? estimatedPayroll / activeStaffIds.length : 0)}/person</div>
                    </div>
                </SectionCard>

                <SectionCard>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Users size={16} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Utilization</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">{utilization.toFixed(0)}%</div>
                        <div className="text-xs text-slate-400 mt-1">{activeStaffIds.length} of {activeStaff.length} active staff</div>
                    </div>
                </SectionCard>

                <SectionCard>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle size={16} className={overtimeCount > 0 ? 'text-rose-500' : approachingCount > 0 ? 'text-amber-500' : 'text-slate-300'} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overtime</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">{overtimeCount}</div>
                        <div className="text-xs text-slate-400 mt-1">
                            {approachingCount > 0 ? `${approachingCount} approaching 40h` : 'No alerts'}
                        </div>
                    </div>
                </SectionCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Top Performers */}
                <SectionCard>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp size={16} className="text-indigo-500" />
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Top Hours This Week</h3>
                        </div>
                        {topPerformers.length === 0 ? (
                            <div className="text-center py-8">
                                <Clock size={32} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-sm text-slate-400">No time entries this week yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topPerformers.map((p, i) => {
                                    const ot = overtimeStatuses.find(s => s.userId === p.employee.id);
                                    return (
                                        <div key={p.employee.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-900 truncate">{p.employee.full_name}</span>
                                                    {ot?.isOvertime && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold rounded-full">OT</span>}
                                                    {ot?.isApproaching && !ot?.isOvertime && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full">!</span>}
                                                </div>
                                                <span className="text-xs text-slate-400">{p.employee.role}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-slate-900">{TimeMath.formatDecimalHours(p.hours)}</div>
                                                <div className="text-[10px] text-slate-400">{TimeMath.formatCurrency(p.hours * (p.employee.hourly_rate || 0))}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* Schedule Overview */}
                <SectionCard>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Calendar size={16} className="text-indigo-500" />
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Schedule Overview</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl">
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Total Shifts</div>
                                    <div className="text-xs text-slate-400">Scheduled this week</div>
                                </div>
                                <div className="text-2xl font-black text-slate-900">{weekShifts.length}</div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl">
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Published</div>
                                    <div className="text-xs text-slate-400">Active & approved</div>
                                </div>
                                <div className="text-2xl font-black text-emerald-600 flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    {publishedShifts.length}
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl">
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Open Shifts</div>
                                    <div className="text-xs text-slate-400">Unassigned</div>
                                </div>
                                <div className={`text-2xl font-black ${openShifts.length > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                                    {openShifts.length}
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl">
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Avg Hours/Employee</div>
                                    <div className="text-xs text-slate-400">This week</div>
                                </div>
                                <div className="text-2xl font-black text-slate-900">{TimeMath.formatDecimalHours(avgHoursPerEmployee)}</div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Staff</div>
                    <div className="text-xl font-black text-slate-900">{activeStaff.length}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Clients</div>
                    <div className="text-xl font-black text-slate-900">{clients.length}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pay Stubs</div>
                    <div className="text-xl font-black text-slate-900">{payStubs.length}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pay Period</div>
                    <div className="text-xl font-black text-slate-900 capitalize">{organization?.pay_period || 'Weekly'}</div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;
