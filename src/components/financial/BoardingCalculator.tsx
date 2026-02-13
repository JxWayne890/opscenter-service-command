import React, { useState, useEffect } from 'react';
import { FinancialMonthData } from '../../types';
import { Calculator, Target, Dog } from 'lucide-react';

interface Props {
    data: FinancialMonthData | null;
    onUpdate: () => void;
}

const BoardingCalculator: React.FC<Props> = ({ data, onUpdate }) => {
    // Inputs
    const [avgRevPerNight, setAvgRevPerNight] = useState('65'); // Default assumption
    const [currentBookedNights, setCurrentBookedNights] = useState('0');

    // Derived from data
    const fixedOverhead = data?.inputs?.fixed_overhead || 0;
    const payrollCost = data?.payroll?.total_payroll_cost || 0;

    // Interactive Target (Default to Break-Even)
    const breakEven = fixedOverhead + payrollCost;
    const [targetRevenue, setTargetRevenue] = useState(breakEven > 0 ? breakEven.toString() : '50000');

    // Update target assumption if break-even changes and user hasn't manually overridden (simplified logic: just sync on load)
    useEffect(() => {
        if (breakEven > 0 && targetRevenue === '50000') {
            setTargetRevenue(breakEven.toString());
        }
    }, [breakEven]);

    const avgRev = parseFloat(avgRevPerNight) || 0;
    const target = parseFloat(targetRevenue) || 0;
    const booked = parseFloat(currentBookedNights) || 0;

    const requiredNights = avgRev > 0 ? Math.ceil(target / avgRev) : 0;
    const remainingNights = Math.max(0, requiredNights - booked);
    const progress = requiredNights > 0 ? (booked / requiredNights) * 100 : 0;

    // Potential Revenue
    const projectedRevenue = booked * avgRev;
    const gapRevenue = target - projectedRevenue;

    return (
        <div className="glass-panel p-6 rounded-[2rem] h-full flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2.5 bg-brand-blue/10 rounded-xl text-brand-blue">
                    <Calculator size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Boarding Targets</h2>
                    <p className="text-xs text-slate-500 font-medium">Occupancy goal calculator</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* INPUTS */}
                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Target Monthly Revenue</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                value={targetRevenue}
                                onChange={e => setTargetRevenue(e.target.value)}
                                className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-blue/20 outline-none"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Break-Even: ${breakEven.toLocaleString()}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Avg Rev Per Dog/Night</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                value={avgRevPerNight}
                                onChange={e => setAvgRevPerNight(e.target.value)}
                                className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-blue/20 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Current Booked Nights</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">#</span>
                            <input
                                type="number"
                                value={currentBookedNights}
                                onChange={e => setCurrentBookedNights(e.target.value)}
                                className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-blue/20 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* RESULTS */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-center space-y-6">

                    <div className="text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Required Boarding Nights</p>
                        <p className="text-4xl font-black text-slate-900">{requiredNights.toLocaleString()}</p>
                        <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                            <div className="bg-brand-blue h-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 font-bold">{booked} Booked ({progress.toFixed(0)}%)</p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Gap Remaining</p>
                            <p className="text-xl font-black text-rose-500">{remainingNights.toLocaleString()} Nights</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase">Revenue Gap</p>
                            <p className="text-xl font-black text-rose-500">${gapRevenue > 0 ? gapRevenue.toLocaleString() : '0'}</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default BoardingCalculator;
