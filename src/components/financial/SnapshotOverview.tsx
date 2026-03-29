import React, { useState } from 'react';
import { FinancialMonthData } from '../../types';
import { AlertCircle, CheckCircle, DollarSign, TrendingUp, Users, Wallet, Zap } from 'lucide-react';
import { FinancialService } from '../../services/financial';
import { useOpsCenter } from '../../services/store';
import { TimeMath } from '../../utils/timeMath';

interface Props {
    data: FinancialMonthData | null;
    month: Date;
    onUpdate: () => void;
    autoRevenue?: { boarding: number; daycare: number; training: number; grooming: number; other: number; total: number; recordCount: number } | null;
    autoPayroll?: { totalCost: number; totalHours: number } | null;
}

const SnapshotOverview: React.FC<Props> = ({ data, month, onUpdate, autoRevenue, autoPayroll }) => {
    const { organization } = useOpsCenter();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Local state for manual editing
    const [bankBalance, setBankBalance] = useState(data?.inputs?.bank_balance?.toString() || '0');
    const [fixedOverhead, setFixedOverhead] = useState(data?.inputs?.fixed_overhead?.toString() || '0');
    const [boardingRev, setBoardingRev] = useState(data?.revenue?.boarding_revenue?.toString() || '0');
    const [daycareRev, setDaycareRev] = useState(data?.revenue?.daycare_revenue?.toString() || '0');
    const [trainingRev, setTrainingRev] = useState(data?.revenue?.training_revenue?.toString() || '0');
    const [groomingRev, setGroomingRev] = useState(data?.revenue?.grooming_revenue?.toString() || '0');
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
            setGroomingRev(data?.revenue?.grooming_revenue?.toString() || '0');
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
                    grooming_revenue: parseFloat(groomingRev) || 0,
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
        } finally {
            setSaving(false);
        }
    };

    // Use auto-calculated values if available, fall back to manual
    const hasAutoRevenue = autoRevenue && autoRevenue.recordCount > 0;
    const hasAutoPayroll = autoPayroll && autoPayroll.totalHours > 0;

    const effectiveBoardingRev = hasAutoRevenue ? autoRevenue!.boarding : parseFloat(boardingRev) || 0;
    const effectiveDaycareRev = hasAutoRevenue ? autoRevenue!.daycare : parseFloat(daycareRev) || 0;
    const effectiveTrainingRev = hasAutoRevenue ? autoRevenue!.training : parseFloat(trainingRev) || 0;
    const effectiveGroomingRev = hasAutoRevenue ? autoRevenue!.grooming : parseFloat(groomingRev) || 0;
    const effectiveOtherRev = hasAutoRevenue ? autoRevenue!.other : parseFloat(otherRev) || 0;
    const totalRevenue = effectiveBoardingRev + effectiveDaycareRev + effectiveTrainingRev + effectiveGroomingRev + effectiveOtherRev;

    const effectivePayroll = hasAutoPayroll ? autoPayroll!.totalCost : parseFloat(payrollCost) || 0;
    const overhead = parseFloat(fixedOverhead) || 0;

    const payrollPercent = totalRevenue > 0 ? (effectivePayroll / totalRevenue) * 100 : 0;
    const breakEvenTarget = overhead + effectivePayroll;
    const breakEvenProgress = breakEvenTarget > 0 ? (totalRevenue / breakEvenTarget) * 100 : 0;
    const isBreakEven = totalRevenue >= breakEvenTarget;
    const netIncome = totalRevenue - overhead - effectivePayroll;

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
                    <p className="text-sm text-slate-500">
                        {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        {hasAutoRevenue && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                                <Zap size={10} /> Auto-calculated from {autoRevenue!.recordCount} service records
                            </span>
                        )}
                    </p>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                    >
                        {hasAutoRevenue ? 'Manual Override' : 'Edit Data'}
                    </button>
                ) : (
                    <div className="flex space-x-2">
                        <button onClick={() => setIsEditing(false)} disabled={saving} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-blue hover:bg-brand-dark text-white text-sm font-bold rounded-xl transition-colors">
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* EDIT MODE */}
            {isEditing && (
                <div className="mb-8 p-6 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2">
                    {hasAutoRevenue && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs font-medium text-amber-700">
                            Revenue is auto-calculated from service records. Manual values here will override the auto-calculated amounts.
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Bank Balance</label>
                            <input type="number" value={bankBalance} onChange={e => setBankBalance(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Fixed Overhead</label>
                            <input type="number" value={fixedOverhead} onChange={e => setFixedOverhead(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Payroll Cost {hasAutoPayroll && '(override)'}</label>
                            <input type="number" value={payrollCost} onChange={e => setPayrollCost(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Boarding Revenue</label>
                            <input type="number" value={boardingRev} onChange={e => setBoardingRev(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Daycare Revenue</label>
                            <input type="number" value={daycareRev} onChange={e => setDaycareRev(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Training Revenue</label>
                            <input type="number" value={trainingRev} onChange={e => setTrainingRev(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Grooming Revenue</label>
                            <input type="number" value={groomingRev} onChange={e => setGroomingRev(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Other Revenue</label>
                            <input type="number" value={otherRev} onChange={e => setOtherRev(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                        </div>
                    </div>
                </div>
            )}

            {/* METRIC CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Bank Balance */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/50">
                    <div className="flex items-center space-x-2 text-slate-500 mb-2">
                        <Wallet size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Bank Balance</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{TimeMath.formatCurrency(parseFloat(bankBalance) || 0)}</p>
                </div>

                {/* Break Even */}
                <div className={`p-5 rounded-2xl border ${isBreakEven ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                    <div className="flex items-center space-x-2 text-slate-500 mb-2">
                        <TrendingUp size={18} className={isBreakEven ? 'text-emerald-500' : 'text-amber-500'} />
                        <span className="text-xs font-bold uppercase tracking-wider">Break-Even</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <p className={`text-2xl font-black ${isBreakEven ? 'text-emerald-700' : 'text-amber-700'}`}>{breakEvenProgress.toFixed(0)}%</p>
                    </div>
                    <div className="w-full bg-black/5 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isBreakEven ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(breakEvenProgress, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Target: {TimeMath.formatCurrency(breakEvenTarget)}</p>
                </div>

                {/* Total Revenue */}
                <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                        <DollarSign size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">Revenue</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{TimeMath.formatCurrency(totalRevenue)}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {effectiveBoardingRev > 0 && <span className="text-[9px] bg-white/60 px-1.5 py-0.5 rounded text-indigo-600 font-bold">Board: {TimeMath.formatCurrency(effectiveBoardingRev)}</span>}
                        {effectiveDaycareRev > 0 && <span className="text-[9px] bg-white/60 px-1.5 py-0.5 rounded text-indigo-600 font-bold">Day: {TimeMath.formatCurrency(effectiveDaycareRev)}</span>}
                        {effectiveTrainingRev > 0 && <span className="text-[9px] bg-white/60 px-1.5 py-0.5 rounded text-indigo-600 font-bold">Train: {TimeMath.formatCurrency(effectiveTrainingRev)}</span>}
                        {effectiveGroomingRev > 0 && <span className="text-[9px] bg-white/60 px-1.5 py-0.5 rounded text-indigo-600 font-bold">Groom: {TimeMath.formatCurrency(effectiveGroomingRev)}</span>}
                    </div>
                </div>

                {/* Payroll % */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 relative overflow-hidden">
                    <div className="flex items-center space-x-2 text-slate-500 mb-2">
                        <Users size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Payroll</span>
                    </div>
                    <p className={`text-2xl font-black ${getPayrollColor(payrollPercent)}`}>{payrollPercent.toFixed(0)}%</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">{TimeMath.formatCurrency(effectivePayroll)} • Goal: &lt;50%</p>
                    {hasAutoPayroll && (
                        <p className="text-[9px] text-emerald-600 font-bold mt-1">{autoPayroll!.totalHours.toFixed(0)}h tracked</p>
                    )}
                </div>

                {/* Net Income */}
                <div className={`p-5 rounded-2xl border ${netIncome >= 0 ? 'bg-emerald-50/30 border-emerald-100' : 'bg-rose-50/30 border-rose-100'}`}>
                    <div className="flex items-center space-x-2 text-slate-500 mb-2">
                        {netIncome >= 0 ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-rose-500" />}
                        <span className="text-xs font-bold uppercase tracking-wider">Net Income</span>
                    </div>
                    <p className={`text-2xl font-black ${netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {TimeMath.formatCurrency(netIncome)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Rev - Overhead - Payroll</p>
                </div>
            </div>
        </div>
    );
};

export default SnapshotOverview;
