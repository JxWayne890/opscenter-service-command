import React, { useState } from 'react';
import { FinancialMonthData } from '../../types';
import { GitBranch, TrendingUp } from 'lucide-react';

interface Props {
    data: FinancialMonthData | null;
}

const ScenarioPlanner: React.FC<Props> = ({ data }) => {
    // Base Data
    const baseRevenue = (data?.revenue?.boarding_revenue || 0) +
        (data?.revenue?.daycare_revenue || 0) +
        (data?.revenue?.training_revenue || 0) +
        (data?.revenue?.other_revenue || 0);

    const basePayroll = data?.payroll?.total_payroll_cost || 0;
    const baseHours = data?.payroll?.total_hours_worked || 0;
    const baseOverhead = data?.inputs?.fixed_overhead || 0;

    // Scenario Inputs
    const [payRateIncrease, setPayRateIncrease] = useState(0); // $ per hour
    const [addStaffCount, setAddStaffCount] = useState(0); // FTEs
    const [avgStaffCost, setAvgStaffCost] = useState(3500); // Cost per FTE/Month
    const [revIncrease, setRevIncrease] = useState(0); // Direct $ add

    // Calculations
    // 1. Payroll Impact
    //    - Rate increase * Total Hours (assuming hours stay same)
    //    - + New Staff Cost
    const payrollDelta = Math.round(((payRateIncrease * baseHours) + (addStaffCount * avgStaffCost)) * 100) / 100;
    const newPayroll = Math.round((basePayroll + payrollDelta) * 100) / 100;

    // 2. Revenue Impact
    const newRevenue = Math.round((baseRevenue + revIncrease) * 100) / 100;

    // 3. New Net
    const newRefExpenses = Math.round((baseOverhead + newPayroll) * 100) / 100;
    const newNet = Math.round((newRevenue - newRefExpenses) * 100) / 100;
    const baseNet = Math.round((baseRevenue - (baseOverhead + basePayroll)) * 100) / 100;

    const newPayrollPercent = newRevenue > 0 ? (newPayroll / newRevenue) * 100 : 0;
    const basePayrollPercent = baseRevenue > 0 ? (basePayroll / baseRevenue) * 100 : 0;

    return (
        <div className="glass-panel p-6 rounded-[2rem] h-full flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-600">
                    <GitBranch size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Scenario Planning</h2>
                    <p className="text-xs text-slate-500 font-medium">"What If" simulation engine</p>
                </div>
            </div>

            <div className="flex-1 space-y-8">

                {/* SLIDERS / INPUTS */}
                <div className="space-y-6">

                    {/* Pay Rate Slider */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Increase Pay Rate (avg)</label>
                            <span className="text-sm font-bold text-slate-900">+${payRateIncrease}/hr</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.25"
                            value={payRateIncrease}
                            onChange={e => setPayRateIncrease(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <p className="text-xs text-slate-400 mt-1">Impacts {baseHours} logged hours</p>
                    </div>

                    {/* Add Staff */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Add Full-Time Staff</label>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setAddStaffCount(Math.max(0, addStaffCount - 1))} className="w-8 h-8 rounded-lg bg-slate-100 font-bold hover:bg-slate-200">-</button>
                                <span className="flex-1 text-center font-bold text-slate-900">{addStaffCount}</span>
                                <button onClick={() => setAddStaffCount(addStaffCount + 1)} className="w-8 h-8 rounded-lg bg-slate-100 font-bold hover:bg-slate-200">+</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Avg Cost / Staff</label>
                            <input
                                type="number"
                                value={avgStaffCost}
                                onChange={e => setAvgStaffCost(parseFloat(e.target.value))}
                                className="w-full p-1.5 border border-slate-200 rounded-lg text-sm font-bold"
                            />
                        </div>
                    </div>

                    {/* Revenue Boost */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Projected Revenue Increase</label>
                            <span className="text-sm font-bold text-emerald-600">+${revIncrease.toLocaleString()}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="20000"
                            step="500"
                            value={revIncrease}
                            onChange={e => setRevIncrease(parseFloat(e.target.value))}
                            className="w-full h-2 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                    </div>

                </div>

                {/* RESULTS BOX */}
                <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full blur-[60px] opacity-20"></div>

                    <div className="relative z-10 grid grid-cols-2 gap-6">

                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">New Net Margin</p>
                            <p className={`text-2xl font-black ${newNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ${newNet.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Previous: ${baseNet.toLocaleString()}</p>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">New Payroll %</p>
                            <p className={`text-2xl font-black ${newPayrollPercent > 60 ? 'text-rose-400' : newPayrollPercent < 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {newPayrollPercent.toFixed(1)}%
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Previous: {basePayrollPercent.toFixed(1)}%</p>
                        </div>

                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Payroll Delta</span>
                        <span className="font-mono font-bold text-rose-300">+${payrollDelta.toLocaleString()}</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ScenarioPlanner;
