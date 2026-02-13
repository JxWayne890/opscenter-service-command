import React, { useState, useEffect } from 'react';
import { useOpsCenter } from '../../services/store';
import { FinancialService } from '../../services/financial';
import { FinancialMonthData } from '../../types';
import SnapshotOverview from '../financial/SnapshotOverview';
import BoardingCalculator from '../financial/BoardingCalculator';
import ScenarioPlanner from '../financial/ScenarioPlanner';
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const FinancialView: React.FC = () => {
    const { organization } = useOpsCenter();
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [data, setData] = useState<FinancialMonthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Set to first day of current month
    useEffect(() => {
        const now = new Date();
        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }, []);

    const fetchData = async () => {
        if (!organization?.id) return;

        setLoading(true);
        try {
            const result = await FinancialService.getMonthlyData(organization.id, currentMonth);
            setData(result);
        } catch (err) {
            console.error("Failed to load financial data", err);
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
