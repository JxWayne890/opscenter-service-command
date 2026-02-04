import React, { useState, useMemo, useEffect } from 'react';
import { useOpsCenter } from '../../services/store';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, FileText, Send, Lock } from 'lucide-react';
import TimesheetDetailModal from '../timesheet/TimesheetDetailModal';

const PayrollView = () => {
    const { staff, timeEntries, payStubs, fetchPayStubs, createPayStub, updatePayStubStatus, currentUser, organization } = useOpsCenter();

    // STRICT GUARD: Managers/Owners Only
    if (currentUser.role === 'staff') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Lock size={64} className="mb-4 opacity-20" />
                <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
                <p className="text-sm max-w-xs text-center mt-2">
                    You do not have permission to view payroll information.
                </p>
            </div>
        );
    }

    // Normalize to midnight for consistent matching
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);

        const periodType = organization?.pay_period || 'weekly';
        const periodStartDay = organization?.pay_period_start_day !== undefined ? organization.pay_period_start_day : 1;

        const currentDay = d.getDay();
        let diff = d.getDate() - currentDay + periodStartDay;
        // If today is BEFORE the start day of this cycle, move back 7 days
        if (currentDay < periodStartDay) diff -= 7;

        d.setDate(diff);
        return d;
    });

    const [endDate, setEndDate] = useState(() => {
        const d = new Date(startDate);
        const periodType = organization?.pay_period || 'weekly';

        if (periodType === 'biweekly') {
            d.setDate(d.getDate() + 13);
        } else if (periodType === 'monthly') {
            d.setMonth(d.getMonth() + 1);
            d.setDate(0);
        } else {
            d.setDate(d.getDate() + 6);
        }
        d.setHours(23, 59, 59, 999);
        return d;
    });

    // Helper to get YYYY-MM-DD in local time
    const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedUserForPreview, setSelectedUserForPreview] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const periodStartString = useMemo(() => formatDateLocal(startDate), [startDate]);
    const periodEndString = useMemo(() => formatDateLocal(endDate), [endDate]);

    // Selection Reset Effect - ONLY on date change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [periodStartString, periodEndString]);

    // Data Fetching Effect - Store refresh
    useEffect(() => {
        if (currentUser.role !== 'staff') {
            fetchPayStubs(periodStartString, periodEndString);
        }
    }, [periodStartString, periodEndString, currentUser.role, fetchPayStubs]);

    // Navigate Periods
    const changePeriod = (offset: number) => {
        const periodType = organization?.pay_period || 'weekly';
        const newStart = new Date(startDate);

        if (periodType === 'biweekly') {
            newStart.setDate(newStart.getDate() + (offset * 14));
        } else if (periodType === 'monthly') {
            newStart.setMonth(newStart.getMonth() + offset);
            newStart.setDate(1);
        } else {
            newStart.setDate(newStart.getDate() + (offset * 7));
        }

        newStart.setHours(0, 0, 0, 0);
        setStartDate(newStart);

        const newEnd = new Date(newStart);
        if (periodType === 'biweekly') {
            newEnd.setDate(newEnd.getDate() + 13);
        } else if (periodType === 'monthly') {
            newEnd.setMonth(newEnd.getMonth() + 1);
            newEnd.setDate(0);
        } else {
            newEnd.setDate(newEnd.getDate() + 6);
        }
        newEnd.setHours(23, 59, 59, 999);
        setEndDate(newEnd);
    };

    // Robust matching logic for pay stubs
    const getStubForUser = (userId: string) => {
        const found = payStubs.find(p => {
            const userIdMatch = String(p.user_id) === String(userId);
            const pStart = p.period_start ? String(p.period_start).split('T')[0] : '';
            return userIdMatch && pStart === periodStartString;
        });
        return found;
    };

    // Calculate Summary Data
    const payrollData = useMemo(() => {
        return staff.map(employee => {
            // Filter timeEntries for this period
            const periodEntries = timeEntries.filter(te =>
                te.user_id === employee.id &&
                new Date(te.clock_in) <= endDate &&
                (te.clock_out ? new Date(te.clock_out) >= startDate : te.status === 'active')
            );

            // Calculate Live Stats
            let totalHours = 0;
            periodEntries.forEach(te => {
                if (!te.clock_out && te.status !== 'active') return;

                const start = new Date(te.clock_in).getTime();
                const end = te.clock_out ? new Date(te.clock_out).getTime() : new Date().getTime();
                const breakMins = te.total_break_minutes || 0;

                totalHours += ((end - start) / (1000 * 60 * 60)) - (breakMins / 60);
            });

            const rate = employee.hourly_rate || 0;
            const estPay = totalHours * rate;

            // Find existing stub
            const stub = getStubForUser(employee.id);

            return {
                employee,
                totalHours: Math.max(0, totalHours),
                estPay: Math.max(0, estPay),
                stub,
                status: stub?.status || 'draft'
            };
        });
    }, [staff, timeEntries, payStubs, startDate, endDate, periodStartString]);

    // Selection Handlers
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === payrollData.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(payrollData.map(d => d.employee.id)));
        }
    };

    // Actions
    const handleApprove = async (userId: string, hours: number, pay: number) => {
        setIsProcessing(userId);
        try {
            const stub = getStubForUser(userId);
            let result: { success: boolean; error: string | null } = { success: false, error: null };

            const payload = {
                organization_id: currentUser.organization_id,
                user_id: userId,
                period_start: periodStartString,
                period_end: periodEndString,
                status: 'approved' as const,
                total_hours: hours,
                gross_pay: pay
            };

            console.log('[PayrollView] handleApprove Payload:', payload);

            if (stub) {
                console.log('[PayrollView] Updating existing stub:', stub.id);
                result = await updatePayStubStatus(stub.id, 'approved');
            } else {
                console.log('[PayrollView] Creating new stub');
                result = await createPayStub(payload);
            }

            if (!result.success) {
                const msg = `Approval failed for ${userId}.\n\nDatabase Error: ${result.error || 'Unknown rejection'}`;
                console.error('[PayrollView]', msg);
                alert(msg);
            }
        } catch (error) {
            console.error('Error in handleApprove:', error);
            alert('Unexpected Error: ' + (error as Error).message);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleRelease = async (userId: string) => {
        setIsProcessing(userId);
        try {
            const stub = getStubForUser(userId);
            if (stub) {
                console.log('[PayrollView] Releasing stub:', stub.id);
                const { success, error } = await updatePayStubStatus(stub.id, 'released');
                if (!success) {
                    alert(`Release failed.\n\nDatabase Error: ${error || 'Unknown rejection'}`);
                }
            }
        } catch (error) {
            console.error('Error in handleRelease:', error);
            alert('Unexpected Error: ' + (error as Error).message);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleBulkRelease = async () => {
        const targets = selectedIds.size > 0
            ? payrollData.filter(d => selectedIds.has(d.employee.id) && d.status === 'approved')
            : payrollData.filter(d => d.status === 'approved');

        if (targets.length === 0) {
            alert('No approved pay stubs to release.');
            return;
        }

        setIsProcessing('bulk-release');
        for (const record of targets) {
            await handleRelease(record.employee.id);
        }
        setSelectedIds(new Set());
        setIsProcessing(null);
    };

    const handleBulkApprove = async () => {
        const targets = selectedIds.size > 0
            ? payrollData.filter(d => selectedIds.has(d.employee.id) && d.status === 'draft')
            : payrollData.filter(d => d.status === 'draft');

        if (targets.length === 0) {
            if (selectedIds.size > 0) alert('Selected items are already approved or released.');
            return;
        }

        setIsProcessing('bulk-approve');
        for (const record of targets) {
            await handleApprove(record.employee.id, record.totalHours, record.estPay);
        }
        setSelectedIds(new Set());
        setIsProcessing(null);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-slate-50 overflow-y-auto lg:overflow-hidden pb-32 lg:pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Payroll Manager</h1>
                    <p className="text-slate-500">Review and release pay stubs for staff.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto justify-between md:justify-start">
                    <button
                        onClick={() => changePeriod(-1)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 text-slate-900 font-bold">
                            <FileText size={16} className="text-indigo-500" />
                            <span>{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => changePeriod(1)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total Payroll</div>
                    <div className="text-2xl font-bold text-slate-900">
                        ${payrollData.reduce((sum, d) => sum + d.estPay, 0).toFixed(2)}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total Hours</div>
                    <div className="text-2xl font-bold text-slate-900">
                        {payrollData.reduce((sum, d) => sum + d.totalHours, 0).toFixed(0)} hrs
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Pending Release</div>
                    <div className="text-2xl font-bold text-amber-600">
                        {payrollData.filter(d => d.status === 'approved').length}
                    </div>
                </div>
                <div className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50 cursor-pointer group ${isProcessing === 'bulk-approve' ? 'opacity-50 pointer-events-none' : ''}`} onClick={handleBulkApprove}>
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={16} className={`${isProcessing === 'bulk-approve' ? 'animate-spin text-indigo-500' : 'text-slate-400 group-hover:text-emerald-500'} transition-colors`} />
                        <div className="text-slate-500 text-xs uppercase font-bold">Step 1</div>
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                        {selectedIds.size > 0 ? `Approve Selected (${selectedIds.size})` : 'Approve All Drafts'}
                    </div>
                </div>
                <div className={`bg-indigo-600 p-4 rounded-xl shadow-lg shadow-indigo-200 text-white cursor-pointer hover:bg-indigo-700 transition-colors ${isProcessing === 'bulk-release' ? 'opacity-50 pointer-events-none' : ''}`} onClick={handleBulkRelease}>
                    <div className="flex items-center gap-2 mb-1">
                        <Send size={16} className={isProcessing === 'bulk-release' ? 'animate-pulse' : ''} />
                        <div className="text-xs uppercase font-bold">Step 2</div>
                    </div>
                    <div className="text-lg font-bold">
                        {selectedIds.size > 0 ? `Release Selected (${selectedIds.size})` : 'Release All Approved'}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-none lg:flex-1 overflow-hidden flex flex-col min-h-[500px] lg:min-h-0">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left min-w-[800px]">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 pl-6 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={selectedIds.size === payrollData.length && payrollData.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="p-4">Employee</th>
                                <th className="p-4">Role</th>
                                <th className="p-4 text-right">Hours</th>
                                <th className="p-4 text-right">Gross Pay</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payrollData.map(({ employee, totalHours, estPay, status }) => (
                                <tr key={employee.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(employee.id) ? 'bg-indigo-50/50' : ''}`}>
                                    <td className="p-4 pl-6 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            checked={selectedIds.has(employee.id)}
                                            onChange={() => toggleSelect(employee.id)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {employee.avatar_url ? (
                                                <img src={employee.avatar_url} className="w-8 h-8 rounded-full" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs">
                                                    {employee.full_name[0]}
                                                </div>
                                            )}
                                            <span className="font-bold text-slate-900">{employee.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-500 uppercase text-[10px] font-bold">{employee.role}</td>
                                    <td className="p-4 text-right font-medium">{totalHours.toFixed(2)}</td>
                                    <td className="p-4 text-right font-bold text-slate-900">${estPay.toFixed(2)}</td>
                                    <td className="p-4">
                                        {status === 'released' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Released</span>}
                                        {status === 'approved' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><CheckCircle2 size={12} /> Approved</span>}
                                        {status === 'draft' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Draft</span>}
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedUserForPreview(employee.id)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Pay Stub"
                                            >
                                                <FileText size={16} />
                                            </button>

                                            {status !== 'released' && (
                                                <>
                                                    {status === 'draft' ? (
                                                        <button
                                                            disabled={isProcessing !== null}
                                                            onClick={() => handleApprove(employee.id, totalHours, estPay)}
                                                            className={`px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 font-bold text-xs rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-all ${isProcessing === employee.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {isProcessing === employee.id ? '...' : 'Approve'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled={isProcessing !== null}
                                                            onClick={() => handleRelease(employee.id)}
                                                            className={`px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 ${isProcessing === employee.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {isProcessing === employee.id ? '...' : <><Send size={12} /> Release</>}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Preview Modal */}
            {selectedUserForPreview && (
                <TimesheetDetailModal
                    isOpen={true}
                    onClose={() => setSelectedUserForPreview(null)}
                    staffId={selectedUserForPreview}
                    dateRange={{ start: startDate, end: endDate }}
                />
            )}
        </div>
    );
};

export default PayrollView;
