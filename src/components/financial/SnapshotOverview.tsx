import React, { useState } from 'react';
import { FinancialMonthData } from '../../types';
import { AlertCircle, CheckCircle, DollarSign, TrendingUp, Users, Wallet } from 'lucide-react';
import { FinancialService } from '../../services/financial';
import { useOpsCenter } from '../../services/store';

interface Props {
    data: FinancialMonthData | null;
    month: Date;
    onUpdate: () => void;
}

const SnapshotOverview: React.FC<Props> = ({ data, month, onUpdate }) => {
    const { organization } = useOpsCenter();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Local state for editing
    const [bankBalance, setBankBalance] = useState(data?.inputs?.bank_balance?.toString() || '0');
    const [fixedOverhead, setFixedOverhead] = useState(data?.inputs?.fixed_overhead?.toString() || '0');
    const [boardingRev, setBoardingRev] = useState(data?.revenue?.boarding_revenue?.toString() || '0');
    const [daycareRev, setDaycareRev] = useState(data?.revenue?.daycare_revenue?.toString() || '0');
    const [trainingRev, setTrainingRev] = useState(data?.revenue?.training_revenue?.toString() || '0');
    const [otherRev, setOtherRev] = useState(data?.revenue?.other_revenue?.toString() || '0');
    const [payrollCost, setPayrollCost] = useState(data?.payroll?.total_payroll_cost?.toString() || '0');

    // Sync state when data changes
    React.useEffect(() => {
        if (!isEditing) {
            setBankBalance(data?.inputs?.bank_balance?.toString() || '0');
            setFixedOverhead(data?.inputs?.fixed_overhead?.toString() || '0');
            setBoardingRev(data?.revenue?.boarding_revenue?.toString() || '0');
            setDaycareRev(data?.revenue?.daycare_revenue?.toString() || '0');
            setTrainingRev(data?.revenue?.training_revenue?.toString() || '0');
            setOtherRev(data?.revenue?.other_revenue?.toString() || '0');
            setPayrollCost(data?.payroll?.total_payroll_cost?.toString() || '0');
        }
    }, [data, isEditing]);

    const handleSave = async () => {
        if (!organization?.id) return;
        setSaving(true);
        try {
            const monthStr = month.toISOString().slice(0, 7) + '-01';

            await Promise.all([
                FinancialService.upsertInputs({
                    organization_id: organization.id,
                    month: monthStr,
                    bank_balance: parseFloat(bankBalance) || 0,
                    fixed_overhead: parseFloat(fixedOverhead) || 0
                }),
                FinancialService.upsertRevenue({
                    organization_id: organization.id,
                    month: monthStr,
                    boarding_revenue: parseFloat(boardingRev) || 0,
                    daycare_revenue: parseFloat(daycareRev) || 0,
                    training_revenue: parseFloat(trainingRev) || 0,
                    other_revenue: parseFloat(otherRev) || 0
                }),
                FinancialService.upsertPayroll({
                    organization_id: organization.id,
                    month: monthStr,
                    total_payroll_cost: parseFloat(payrollCost) || 0
                })
            ]);

            setIsEditing(false);
            onUpdate();
        } catch (err) {
            console.error("Error saving data", err);
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    // Calculations
    const totalRevenue = (parseFloat(boardingRev) || 0) + (parseFloat(daycareRev) || 0) + (parseFloat(trainingRev) || 0) + (parseFloat(otherRev) || 0);
    const totalPayroll = parseFloat(payrollCost) || 0;
    const overhead = parseFloat(fixedOverhead) || 0;

    const payrollPercent = totalRevenue > 0 ? (totalPayroll / totalRevenue) * 100 : 0;
    const breakEvenTarget = overhead + totalPayroll;
    const breakEvenProgress = breakEvenTarget > 0 ? (totalRevenue / breakEvenTarget) * 100 : 0;
    const isBreakEven = totalRevenue >= breakEvenTarget;

    // Color Coding
    const getPayrollColor = (pct: number) => {
        if (pct === 0) return 'text-slate-500';
        if (pct < 50) return 'text-emerald-600';
        if (pct < 60) return 'text-amber-500';
        return 'text-rose-600';
    };

    return (
        <div className="glass-panel p-6 rounded-[2rem] relative overflow-hidden">

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Financial Snapshot</h2>
                    <p className="text-sm text-slate-500">Overview for {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>

                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                    >
                        Edit Data
                    </button>
                ) : (
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-brand-blue hover:bg-brand-dark text-white text-sm font-bold rounded-xl transition-colors flex items-center space-x-2"
                        >
                            {saving ? <span>Saving...</span> : <span>Save Changes</span>}
                        </button>
                    </div>
                )}
            </div>

            {/* EDIT MODE INPUTS */}
            {isEditing && (
                <div className="mb-8 p-6 bg-slate-50/80 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Bank Balance</label>
                        <input type="number" value={bankBalance} onChange={e => setBankBalance(e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Fixed Overhead</label>
                        <input type="number" value={fixedOverhead} onChange={e => setFixedOverhead(e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Payroll Cost</label>
                        <input type="number" value={payrollCost} onChange={e => setPayrollCost(e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Boarding Rev</label>
                        <input type="number" value={boardingRev} onChange={e => setBoardingRev(e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Daycare Rev</label>
                        <input type="number" value={daycareRev} onChange={e => setDaycareRev(e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Training Rev</label>
                        <input type="number" value={trainingRev} onChange={e => setTrainingRev(e.target.value)} className="w-full p-2 border rounded-lg" />
                    </div>
                    {/* Add More fields as needed for specific revenue inputs */}
                </div>
            )}

            {/* METRIC CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Card 1: Bank Balance */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/50">
                    <div className="flex items-center space-x-2 text-slate-500 mb-2">
                        <Wallet size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Bank Balance</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                        ${parseFloat(bankBalance).toLocaleString()}
                    </p>
                </div>

                {/* Card 2: Break Even Status */}
                <div className={`p-5 rounded-2xl border ${isBreakEven ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                    <div className="flex items-center space-x-2 text-slate-500 mb-2">
                        <TrendingUp size={18} className={isBreakEven ? 'text-emerald-500' : 'text-amber-500'} />
                        <span className="text-xs font-bold uppercase tracking-wider">Break-Even Status</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <p className={`text-2xl font-black ${isBreakEven ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {breakEvenProgress.toFixed(1)}%
                        </p>
                        <p className="text-xs font-bold text-slate-400 mb-1.5">of target</p>
                    </div>
                    <div className="w-full bg-black/5 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full ${isBreakEven ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(breakEvenProgress, 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Target Revenue: ${breakEvenTarget.toLocaleString()}</p>
                </div>

                {/* Card 3: Revenue */}
                <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                        <DollarSign size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                        ${totalRevenue.toLocaleString()}
                    </p>
                    <div className="flex space-x-2 mt-2">
                        <span className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded text-indigo-600 font-bold">B: ${parseFloat(boardingRev).toLocaleString()}</span>
                        <span className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded text-indigo-600 font-bold">D: ${parseFloat(daycareRev).toLocaleString()}</span>
                    </div>
                </div>

                {/* Card 4: Payroll % */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 -mr-10 -mt-10 ${payrollPercent > 60 ? 'bg-rose-500' : payrollPercent < 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <div className="flex items-center space-x-2 text-slate-500 mb-2 relative z-10">
                        <Users size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Payroll %</span>
                    </div>
                    <p className={`text-2xl font-black relative z-10 ${getPayrollColor(payrollPercent)}`}>
                        {payrollPercent.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium relative z-10 mt-1">
                        Goal: &lt;50%
                    </p>
                </div>

            </div>

        </div>
    );
};

export default SnapshotOverview;
