import React, { useState, useEffect } from 'react';
import { useOpsCenter } from '../../services/store';
import { FinancialService } from '../../services/financial';
import { BillingService } from '../../services/billing';
import { FinancialMonthData } from '../../types';
import { ErrorTracking } from '../../services/errorTracking';
import SnapshotOverview from '../financial/SnapshotOverview';
import BoardingCalculator from '../financial/BoardingCalculator';
import ScenarioPlanner from '../financial/ScenarioPlanner';
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';

const FinancialView: React.FC = () => {
    const { organization } = useOpsCenter();
    usePageTitle('Financial');
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [data, setData] = useState<FinancialMonthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [autoRevenue, setAutoRevenue] = useState<{ boarding: number; daycare: number; training: number; grooming: number; other: number; total: number; recordCount: number } | null>(null);
    const [autoPayroll, setAutoPayroll] = useState<{ totalCost: number; totalHours: number } | null>(null);
    const { timeEntries, staff } = useOpsCenter();

    // Set to first day of current month
    useEffect(() => {
        const now = new Date();
        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }, []);

    const fetchData = async () => {
        if (!organization?.id) return;

        setLoading(true);
        try {
            const monthStr = currentMonth.toISOString().slice(0, 7);
            const [result, revenue] = await Promise.all([
                FinancialService.getMonthlyData(organization.id, currentMonth),
                BillingService.getMonthlyRevenue(monthStr),
            ]);
            setData(result);
            setAutoRevenue(revenue);

            // Auto-calculate payroll from time entries
            const payroll = BillingService.calculateMonthlyPayroll(timeEntries, staff, monthStr);
            setAutoPayroll(payroll);
        } catch (err) {
            ErrorTracking.captureException(err instanceof Error ? err : new Error(String(err)), { context: 'Financial data load' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [organization?.id, currentMonth, refreshKey]);

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentMonth);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentMonth(newDate);
    };

    const handleDataUpdate = () => {
        setRefreshKey(prev => prev + 1);
    };

    const formatMonth = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    if (!organization) return <div className="p-8">Loading Organization...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header & Month Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Financial Clarity</h1>
                    <p className="text-slate-500 font-medium">Operational financial visibility & decision support</p>
                </div>

                <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                    <button
                        onClick={() => handleMonthChange('prev')}
                        className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center space-x-2 px-4 min-w-[160px] justify-center font-bold text-slate-700">
                        <Calendar size={18} className="text-brand-blue" />
                        <span>{formatMonth(currentMonth)}</span>
                    </div>

                    <button
                        onClick={() => handleMonthChange('next')}
                        className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
                </div>
            ) : (
                <>
                    {/* SECTION 1: Snapshot Overview */}
                    <SnapshotOverview
                        data={data}
                        month={currentMonth}
                        onUpdate={handleDataUpdate}
                        autoRevenue={autoRevenue}
                        autoPayroll={autoPayroll}
                    />

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* SECTION 2: Boarding Target Calculator */}
                        <BoardingCalculator
                            data={data}
                            onUpdate={handleDataUpdate}
                        />

                        {/* SECTION 3: Scenario Planning Tool */}
                        <ScenarioPlanner
                            data={data}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default FinancialView;
