import React, { useMemo, useEffect } from 'react';
import { X, Printer, Download, CheckCircle2, AlertTriangle, Clock, Calendar, DollarSign, ArrowRight, Lock, Coffee, Play, StopCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Shift, TimeEntry, Profile } from '../../types';
import { useOpsCenter } from '../../services/store';
import { TimeMath } from '../../utils/timeMath';

interface TimesheetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string;
    dateRange: { start: Date; end: Date };
}

const TimesheetDetailModal: React.FC<TimesheetDetailModalProps> = ({ isOpen, onClose, staffId, dateRange }) => {
    const { staff, shifts, timeEntries, approveShifts, payStubs, fetchPayStubs, currentUser } = useOpsCenter();
    const [expandedEntryIds, setExpandedEntryIds] = React.useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedEntryIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedEntryIds(newSet);
    };

    // Fetch stubs for this period when opening
    useEffect(() => {
        if (isOpen) {
            fetchPayStubs(dateRange.start.toISOString(), dateRange.end.toISOString());
        }
    }, [isOpen, dateRange, fetchPayStubs]);

    const staffMember = staff.find(s => s.id === staffId);

    // Filter data for this user and period
    const periodData = useMemo(() => {
        if (!staffMember) return [];

        // Ensure we include the entire end day
        const endDay = new Date(dateRange.end);
        endDay.setHours(23, 59, 59, 999);

        const relevantEntries = timeEntries.filter(te => {
            const clockIn = new Date(te.clock_in);
            const clockOut = te.clock_out ? new Date(te.clock_out) : null;
            return te.user_id === staffId &&
                clockIn <= endDay &&
                (clockOut ? clockOut >= dateRange.start : true);
        });

        // Sort by date desc
        return relevantEntries.sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
    }, [staffId, timeEntries, dateRange, staffMember]); // Added staffMember to dependencies for completeness

    // Financial calculations
    const stats = useMemo(() => {
        const approvedHours = periodData
            .filter(e => e.status === 'approved' && e.clock_out)
            .reduce((sum, e) => {
                const netMS = TimeMath.calculateNetDurationMS(
                    e.clock_in,
                    e.clock_out,
                    e.total_break_minutes
                );
                return sum + TimeMath.msToDecimalHours(netMS);
            }, 0);

        const pendingHours = periodData
            .filter(e => e.status === 'pending_approval' && e.clock_out)
            .reduce((sum, e) => {
                const netMS = TimeMath.calculateNetDurationMS(
                    e.clock_in,
                    e.clock_out,
                    e.total_break_minutes
                );
                return sum + TimeMath.msToDecimalHours(netMS);
            }, 0);

        const clockedHours = periodData
            .filter(e => e.clock_out)
            .reduce((sum, e) => {
                const netMS = TimeMath.calculateNetDurationMS(
                    e.clock_in,
                    e.clock_out,
                    e.total_break_minutes
                );
                return sum + TimeMath.msToDecimalHours(netMS);
            }, 0);

        const hourlyRate = staffMember?.hourly_rate || 25.00;
        const estPay = approvedHours * hourlyRate;

        return {
            approvedHours: Math.max(0, approvedHours),
            pendingHours: Math.max(0, pendingHours),
            clockedHours: Math.max(0, clockedHours),
            estPay: Math.max(0, estPay),
            pendingCount: periodData.filter(e => e.status === 'pending_approval').length,
            hourlyRate
        };
    }, [periodData, staffMember]);

    const currentStub = payStubs.find(p => p.user_id === staffId);
    const isApproved = currentStub?.status === 'approved';
    const isReleased = currentStub?.status === 'released';
    const isManagerUser = currentUser.role !== 'staff';

    // Blocker logic: Only block if it's staff viewing some ELSE'S unreleased stub (shouldn't happen with security)
    // or if the period hasn't been started at all and we want to prevent partial data view (optional).
    // For now, let's remove the "Blocker" and use "Status Banners" instead.
    const showBlocker = false;
    const showFinancials = isManagerUser || isApproved || isReleased;

    if (!isOpen || !staffMember) return null;

    const { updateTimeEntry } = useOpsCenter();

    const handleApproveAll = async () => {
        const pendingIds = periodData
            .filter(entry => entry.status === 'pending_approval')
            .map(entry => entry.id);

        for (const id of pendingIds) {
            await updateTimeEntry(id, { status: 'approved' });
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert('Please allow popups to print the pay stub.');
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pay Statement - ${staffMember.full_name}</title>
                <style>
                    :root {
                        --gray-50: #f9fafb;
                        --gray-100: #f3f4f6;
                        --gray-200: #e5e7eb;
                        --gray-800: #1f2937;
                        --gray-900: #111827;
                    }
                    body { 
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        padding: 40px;
                        color: var(--gray-900);
                        max-width: 1000px;
                        margin: 0 auto;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    /* Utility Class-ish */
                    .flex { display: flex; }
                    .justify-between { justify-content: space-between; }
                    .items-center { align-items: center; }
                    .items-end { align-items: flex-end; }
                    .font-bold { font-weight: 700; }
                    .text-sm { font-size: 12px; }
                    .text-xs { font-size: 10px; }
                    .uppercase { text-transform: uppercase; }
                    .text-gray { color: #6b7280; }
                    
                    /* Header */
                    .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
                    .doc-title { font-size: 18px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; }

                    /* Info Boxes */
                    .info-grid { 
                        display: grid; 
                        grid-template-columns: 1fr 1fr; 
                        gap: 24px; 
                        margin: 32px 0;
                        border-top: 2px solid var(--gray-900);
                        padding-top: 24px;
                    }
                    .info-box {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 1px solid var(--gray-200);
                        padding-bottom: 4px;
                    }
                    .label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
                    .value { font-size: 13px; font-weight: 500; }

                    /* Tables */
                    .table-section { margin-bottom: 32px; }
                    .section-title { 
                        font-size: 12px; 
                        font-weight: 700; 
                        text-transform: uppercase; 
                        margin-bottom: 8px; 
                        color: #374151;
                    }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    thead { background-color: var(--gray-50); border-top: 1px solid var(--gray-200); border-bottom: 1px solid var(--gray-200); }
                    th { text-align: left; padding: 12px 8px; font-size: 11px; text-transform: uppercase; color: #4b5563; font-weight: 600; }
                    td { padding: 12px 8px; border-bottom: 1px solid var(--gray-100); color: #374151; }
                    .text-right { text-align: right; }
                    
                    /* Summary Box */
                    .summary-box {
                        background-color: var(--gray-50);
                        border: 1px solid var(--gray-200);
                        border-radius: 8px;
                        padding: 24px;
                        display: flex;
                        justify-content: flex-end;
                        gap: 40px;
                    }
                    .total-group { text-align: right; }
                    .total-label { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
                    .total-value { font-size: 24px; font-weight: 800; color: var(--gray-900); }

                    /* Footer */
                    .footer { 
                        margin-top: 60px; 
                        border-top: 1px dashed var(--gray-200); 
                        padding-top: 20px;
                        font-size: 10px;
                        color: #9ca3af;
                        display: flex;
                        justify-content: space-between;
                    }
                </style>
            </head>
            <body>
                <div class="flex justify-between items-end" style="margin-bottom: 10px">
                    <div class="brand">OpsCenter</div>
                    <div class="doc-title">Earnings Statement</div>
                </div>

                <div class="info-grid">
                    <div class="info-box">
                        <div class="info-row">
                            <span class="label">Employee</span>
                            <span class="value font-bold">${staffMember.full_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">ID / Role</span>
                            <span class="value">${staffMember.role.toUpperCase()}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Email</span>
                            <span class="value">${staffMember.email}</span>
                        </div>
                    </div>
                    
                    <div class="info-box">
                        <div class="info-row">
                            <span class="label">Pay Period Start</span>
                            <span class="value">${dateRange.start.toLocaleDateString()}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Pay Period End</span>
                            <span class="value">${dateRange.end.toLocaleDateString()}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Pay Date</span>
                            <span class="value">${new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div class="table-section">
                    <div class="section-title">Earnings</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th class="text-right">Rate</th>
                                <th class="text-right">Hours</th>
                                <th class="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Regular Pay</td>
                                <td class="text-right">${TimeMath.formatCurrency(stats.hourlyRate)}</td>
                                <td class="text-right">${TimeMath.formatDecimalHours(stats.approvedHours)}</td>
                                <td class="text-right font-bold">${TimeMath.formatCurrency(stats.estPay)}</td>
                            </tr>
                            <!-- Placeholders for other earnings -->
                        </tbody>
                    </table>
                </div>

                <div class="table-section">
                    <div class="section-title">Attendance Detail</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Activity Type</th>
                                <th>Clock In / Out</th>
                                <th class="text-right">Net Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${periodData.filter(e => e.status === 'approved').map(entry => {
            const start = new Date(entry.clock_in);
            const end = entry.clock_out ? new Date(entry.clock_out) : null;
            const netMS = TimeMath.calculateNetDurationMS(entry.clock_in, entry.clock_out || new Date(), entry.total_break_minutes);

            return `
                                    <tr>
                                        <td>${start.toLocaleDateString()}</td>
                                        <td>Punch Entry</td>
                                        <td>
                                            ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - 
                                            ${end ? end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'ACTIVE'}
                                        </td>
                                        <td class="text-right">
                                            ${TimeMath.formatDuration(netMS)}
                                        </td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="summary-box">
                    <div class="total-group">
                        <div class="total-label">Approved Hours</div>
                        <div class="total-value" style="font-size: 18px">${TimeMath.formatDecimalHours(stats.approvedHours)}</div>
                    </div>
                    <div class="total-group">
                        <div class="total-label">Total Clocked</div>
                        <div class="total-value" style="font-size: 18px">${TimeMath.formatDecimalHours(stats.clockedHours)}</div>
                    </div>
                    <div class="total-group">
                        <div class="total-label">Net Pay</div>
                        <div class="total-value">${TimeMath.formatCurrency(stats.estPay)}</div>
                    </div>
                </div>

                <div class="footer">
                    <div>Generated by OpsCenter Payroll System</div>
                    <div>Page 1 of 1</div>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleDownloadPDF = () => {
        // Generate a self-contained HTML blob that triggers print-to-PDF
        const html = `<!DOCTYPE html><html><head>
            <title>PayStub_${staffMember.full_name.replace(/\s+/g, '_')}_${dateRange.start.toLocaleDateString().replace(/\//g, '-')}</title>
            <style>
                body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #111827; max-width: 900px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
                .brand { font-size: 24px; font-weight: 800; }
                .doc-title { font-size: 16px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; border-top: 2px solid #111827; padding-top: 20px; }
                .info-row { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding: 4px 0; }
                .label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
                .value { font-size: 13px; font-weight: 500; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
                .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; color: #374151; }
                thead { background: #f9fafb; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
                th { text-align: left; padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #4b5563; font-weight: 600; }
                td { padding: 10px 8px; border-bottom: 1px solid #f3f4f6; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 700; }
                .summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; display: flex; justify-content: flex-end; gap: 40px; }
                .total-label { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
                .total-value { font-size: 20px; font-weight: 800; }
                .footer { margin-top: 48px; border-top: 1px dashed #e5e7eb; padding-top: 16px; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
            </style></head><body>
            <div class="header"><div class="brand">OpsCenter</div><div class="doc-title">Earnings Statement</div></div>
            <div class="info-grid">
                <div>
                    <div class="info-row"><span class="label">Employee</span><span class="value font-bold">${staffMember.full_name}</span></div>
                    <div class="info-row"><span class="label">Role</span><span class="value">${staffMember.role.toUpperCase()}</span></div>
                    <div class="info-row"><span class="label">Email</span><span class="value">${staffMember.email || '—'}</span></div>
                </div>
                <div>
                    <div class="info-row"><span class="label">Period Start</span><span class="value">${dateRange.start.toLocaleDateString()}</span></div>
                    <div class="info-row"><span class="label">Period End</span><span class="value">${dateRange.end.toLocaleDateString()}</span></div>
                    <div class="info-row"><span class="label">Pay Date</span><span class="value">${new Date().toLocaleDateString()}</span></div>
                </div>
            </div>
            <div class="section-title">Earnings</div>
            <table><thead><tr><th>Description</th><th class="text-right">Rate</th><th class="text-right">Hours</th><th class="text-right">Amount</th></tr></thead>
            <tbody><tr><td>Regular Pay</td><td class="text-right">${TimeMath.formatCurrency(stats.hourlyRate)}</td><td class="text-right">${TimeMath.formatDecimalHours(stats.approvedHours)}</td><td class="text-right font-bold">${TimeMath.formatCurrency(stats.estPay)}</td></tr></tbody></table>
            <div class="section-title">Attendance Detail</div>
            <table><thead><tr><th>Date</th><th>Type</th><th>Clock In / Out</th><th class="text-right">Net Hours</th></tr></thead>
            <tbody>${periodData.filter(e => e.status === 'approved').map(entry => {
                const s = new Date(entry.clock_in);
                const end = entry.clock_out ? new Date(entry.clock_out) : null;
                const netMS = TimeMath.calculateNetDurationMS(entry.clock_in, entry.clock_out || new Date(), entry.total_break_minutes);
                return `<tr><td>${s.toLocaleDateString()}</td><td>Punch</td><td>${s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end ? end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'ACTIVE'}</td><td class="text-right">${TimeMath.formatDuration(netMS)}</td></tr>`;
            }).join('')}</tbody></table>
            <div class="summary">
                <div style="text-align:right"><div class="total-label">Approved Hours</div><div class="total-value">${TimeMath.formatDecimalHours(stats.approvedHours)}</div></div>
                <div style="text-align:right"><div class="total-label">Net Pay</div><div class="total-value">${TimeMath.formatCurrency(stats.estPay)}</div></div>
            </div>
            <div class="footer"><div>Generated by OpsCenter Payroll System</div><div>${new Date().toLocaleDateString()}</div></div>
        </body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PayStub_${staffMember.full_name.replace(/\s+/g, '_')}_${dateRange.start.toLocaleDateString().replace(/\//g, '-')}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header - Pay Stub Style */}
                <div className="bg-slate-900 text-white p-6 lg:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl -ml-12 -mb-12" />

                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex items-center gap-6">
                            {staffMember.avatar_url ? (
                                <img src={staffMember.avatar_url} className="w-20 h-20 rounded-2xl border-4 border-white/10 shadow-xl" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-indigo-500 flex items-center justify-center text-2xl font-bold border-4 border-white/10 shadow-xl">
                                    {staffMember.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{staffMember.full_name}</h2>
                                <p className="text-slate-400 font-medium mt-1 flex items-center gap-2 text-sm lg:text-base">
                                    {staffMember.role.toUpperCase()} • {staffMember.email}
                                </p>
                                <div className="mt-4 flex items-center gap-3 text-sm font-medium bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-白/10">
                                    <Calendar size={14} className="text-indigo-400" />
                                    <span>Pay Period: {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>



                {/* Body Content */}
                <div className="flex-1 overflow-auto bg-slate-50 flex flex-col lg:flex-row relative">

                    {/* Access Blocker Overlay for Staff */}
                    {showBlocker && (
                        <div className="absolute inset-0 z-10 bg-slate-100/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-slate-200">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                                    <Lock size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Pay Statement Processing</h3>
                                <p className="text-slate-500 mb-6">
                                    This pay period has not been finalized yet. You will receive a notification once your earnings statement is available for review.
                                </p>
                                <button onClick={onClose} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors w-full">
                                    Return to Dashboard
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Left Panel: Summary Card */}
                    <div className="w-full lg:w-1/3 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white space-y-6">
                        <div className={`rounded-2xl p-6 border transition-colors ${showFinancials ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`font-bold flex items-center gap-2 ${showFinancials ? 'text-indigo-900' : 'text-slate-500'}`}>
                                    <DollarSign size={18} />
                                    {showFinancials ? (isReleased ? 'Current Pay Stub' : 'Estimated Pay') : 'Pay Processing'}
                                </h3>
                                {isReleased && <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">FINALIZED</span>}
                                {isApproved && !isReleased && <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">APPROVED</span>}
                                {!showFinancials && <span className="text-[10px] font-bold bg-slate-400 text-white px-2 py-0.5 rounded-full">DRAFT</span>}
                            </div>

                            {!showFinancials ? (
                                <div className="py-4">
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Your pay statement is still being processed by management. Estimated totals will appear once approved.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-slate-500 text-sm font-medium">Hourly Rate</span>
                                        <span className="text-slate-900 font-bold">{TimeMath.formatCurrency(stats.hourlyRate)}/hr</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-slate-500 text-sm font-medium">Approved Hours</span>
                                        <span className="text-slate-900 font-bold">{TimeMath.formatDecimalHours(stats.approvedHours)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-slate-500 text-sm font-medium">Pending Hours</span>
                                        <span className="text-amber-600 font-bold">{TimeMath.formatDecimalHours(stats.pendingHours)}</span>
                                    </div>
                                    <div className="h-px bg-indigo-200 my-2" />
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-indigo-900 font-bold text-lg">Gross Pay</span>
                                        <span className="text-indigo-600 font-bold text-2xl">{TimeMath.formatCurrency(stats.estPay)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Always show Hours Summary even if financials are hidden */}
                        {!showFinancials && (
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                <h3 className="text-slate-700 font-bold mb-4 flex items-center gap-2">
                                    <Clock size={18} className="text-indigo-500" />
                                    Hours Summary
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-slate-500 text-sm font-medium">Approved Hours</span>
                                        <span className="text-emerald-600 font-bold">{TimeMath.formatDecimalHours(stats.approvedHours)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-slate-500 text-sm font-medium">Pending Hours</span>
                                        <span className="text-amber-600 font-bold">{TimeMath.formatDecimalHours(stats.pendingHours)}</span>
                                    </div>
                                    <div className="h-px bg-slate-100 my-1" />
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-slate-900 text-sm font-bold">Total Clocked</span>
                                        <span className="text-slate-900 font-black">{TimeMath.formatDecimalHours(stats.clockedHours)}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic leading-tight mt-2">
                                        Only approved hours are converted to pay. Pending hours are awaiting manager review.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action Needed - Manager Only */}
                        {isManagerUser && stats.pendingCount > 0 && (
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-start gap-3">
                                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <h4 className="text-amber-900 font-bold text-sm">Action Needed</h4>
                                    <p className="text-amber-700 text-xs mt-1">
                                        There are {stats.pendingCount} shifts awaiting approval for this period.
                                    </p>
                                    <button
                                        onClick={handleApproveAll}
                                        className="mt-3 w-full bg-amber-500 text-white py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-amber-600 transition-colors"
                                    >
                                        Approve All
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handlePrint}
                            className="w-full border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Printer size={16} /> Print Pay Stub
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            className="w-full border border-indigo-200 bg-indigo-50 text-indigo-700 py-3 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Download size={16} /> Download Pay Stub
                        </button>
                    </div>

                    {/* Right Panel: Detailed List */}
                    <div className="flex-1 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-slate-900 font-bold text-lg">Shift Breakdown</h3>
                            <div className="flex gap-2">
                                {/* Filters could go here */}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {periodData.map(entry => {
                                const isApproved = entry.status === 'approved';
                                const pending = entry.status === 'pending_approval';
                                const clockInDate = new Date(entry.clock_in);
                                const clockOutDate = entry.clock_out ? new Date(entry.clock_out) : null;

                                return (
                                    <div
                                        key={entry.id}
                                        className={`bg-white border rounded-xl transition-all cursor-pointer group ${expandedEntryIds.has(entry.id) ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}
                                        onClick={() => toggleExpand(entry.id)}
                                    >
                                        {/* Header: Date & Status - CLICK TO TOGGLE */}
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold border ${isApproved ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                    <span className="text-xs uppercase">{clockInDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                                                    <span className="text-lg">{clockInDate.getDate()}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-900 font-bold">Punch Entry</span>
                                                        {pending && <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">PENDING</span>}
                                                        {isApproved && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10} /> APPROVED</span>}
                                                        {entry.status === 'active' && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
                                                    </div>

                                                    {/* Summary Line (Visible when collapsed OR expanded) */}
                                                    <div className="flex items-center gap-4 mt-1 text-slate-500 text-xs font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {clockInDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {clockOutDate ? clockOutDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '...'}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="text-slate-700 font-bold">
                                                            {clockOutDate ? TimeMath.formatDuration(TimeMath.calculateNetDurationMS(entry.clock_in, entry.clock_out!, entry.total_break_minutes)) : (entry.status === 'active' ? '...' : '0h 0m')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {isManagerUser && pending && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateTimeEntry(entry.id, { status: 'approved' });
                                                        }}
                                                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow hover:bg-indigo-700 transition-colors z-10 relative"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                <button className={`p-2 rounded-full hover:bg-slate-100 transition-transform duration-200 ${expandedEntryIds.has(entry.id) ? 'rotate-180 bg-slate-50' : ''}`}>
                                                    <ChevronDown size={20} className="text-slate-400" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Timeline (Collapsible) */}
                                        <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${expandedEntryIds.has(entry.id) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                            <div className="overflow-hidden">
                                                <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                                                    <div className="pl-2 pt-4">
                                                        {/* Clock In */}
                                                        <div className="relative pl-8 pb-6 border-l border-slate-200">
                                                            <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-indigo-50 border-2 border-indigo-500 flex items-center justify-center">
                                                                <Play size={10} className="text-indigo-600 ml-0.5" />
                                                            </div>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">Clock In</p>
                                                                    <p className="text-sm font-mono text-slate-600">{clockInDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Breaks */}
                                                        {entry.breaks && entry.breaks.map((brk, idx) => (
                                                            <React.Fragment key={idx}>
                                                                <div className="relative pl-8 pb-6 border-l border-slate-200">
                                                                    <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center">
                                                                        <Coffee size={10} className="text-amber-600" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">Start Break</p>
                                                                        <p className="text-sm font-mono text-slate-600">{new Date(brk.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                                                                    </div>
                                                                </div>
                                                                {brk.end && (
                                                                    <div className="relative pl-8 pb-6 border-l border-slate-200">
                                                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center">
                                                                            <Play size={10} className="text-amber-600 ml-0.5" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">End Break</p>
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-sm font-mono text-slate-600">{new Date(brk.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                                                                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                                                    {TimeMath.formatMinutes(brk.duration || 0)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </React.Fragment>
                                                        ))}

                                                        {/* Fallback for legacy breaks without detailed logs */}
                                                        {(!entry.breaks || entry.breaks.length === 0) && (entry.total_break_minutes || 0) > 0 && (
                                                            <div className="relative pl-8 pb-6 border-l border-slate-200">
                                                                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                                                                    <Coffee size={10} className="text-amber-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Break (Summary)</p>
                                                                    <p className="text-sm font-medium text-slate-500">{TimeMath.formatMinutes(entry.total_break_minutes)} total</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Clock Out */}
                                                        <div className="relative pl-8">
                                                            <div className={`absolute -left-3 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${clockOutDate ? 'bg-slate-50 border-slate-400' : 'bg-emerald-50 border-emerald-500 animate-pulse'}`}>
                                                                {clockOutDate ? <StopCircle size={10} className="text-slate-600" /> : <Clock size={10} className="text-emerald-600" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">
                                                                    {clockOutDate ? 'Clock Out' : 'Currently Active'}
                                                                </p>
                                                                {clockOutDate ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-mono text-slate-600">{clockOutDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                                                                        <div className="flex items-center gap-1 ml-2 pl-3 border-l border-slate-200">
                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Worked:</span>
                                                                            <span className="text-sm font-black text-indigo-600">
                                                                                {TimeMath.formatDuration(TimeMath.calculateNetDurationMS(entry.clock_in, entry.clock_out!, entry.total_break_minutes))}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-sm font-bold text-emerald-600">Tracking...</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {periodData.length === 0 && (
                                <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                                    <p className="text-slate-400 font-medium">No shifts found for this pay period.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default TimesheetDetailModal;
