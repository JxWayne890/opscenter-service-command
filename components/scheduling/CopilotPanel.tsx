import React, { useState, useEffect } from 'react';
import { Play, Save, Settings, Users, AlertCircle } from 'lucide-react';
import { ScheduleGenerator } from '../../services/scheduler/generator';
import { StaffingRatio, Shift } from '../../types';
import { supabase } from '../../services/supabase';
import { useOpsCenter } from '../../services/store';

const CopilotPanel: React.FC = () => {
    const { currentOrg } = useOpsCenter();
    const [counts, setCounts] = useState({ daycare: 45, boarding: 30, suites: 10 });
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    const [generatedShifts, setGeneratedShifts] = useState<Shift[]>([]);
    const [ratios, setRatios] = useState<StaffingRatio[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        if (currentOrg) {
            fetchRatios();
        }
    }, [currentOrg]);

    const fetchRatios = async () => {
        if (!currentOrg) return;
        const { data } = await supabase.from('staffing_ratios').select('*').eq('organization_id', currentOrg.id);
        if (data) setRatios(data);
    };

    const handleGenerate = () => {
        if (!currentOrg) return;
        setIsGenerating(true);

        // Mock ratios if DB is empty for demo
        const activeRatios = ratios.length > 0 ? ratios : [
            { id: '1', organization_id: currentOrg.id, zone_name: 'Daycare', staff_count: 1, dog_count: 15 },
            { id: '2', organization_id: currentOrg.id, zone_name: 'Boarding', staff_count: 1, dog_count: 30 }
        ];

        const shifts = ScheduleGenerator.generate({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            projectedCounts: counts,
            organization_id: currentOrg.id,
            ratios: activeRatios,
            rules: [] // Rules implementation next
        });

        setTimeout(() => {
            setGeneratedShifts(shifts);
            setIsGenerating(false);
            setSaveStatus('idle');
        }, 800);
    };

    const handleExport = () => {
        if (generatedShifts.length === 0) return;

        const headers = ["Start Time", "End Time", "Role", "Notes"];
        const rows = generatedShifts.map(s => [
            s.start_time,
            s.end_time,
            s.role_type,
            s.notes || ''
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `roster_export_${startDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSave = async () => {
        setSaveStatus('saving');
        const { error } = await supabase.from('shifts').insert(generatedShifts.map(s => ({
            organization_id: s.organization_id,
            start_time: s.start_time,
            end_time: s.end_time,
            role_type: s.role_type,
            status: 'draft',
            is_open: true,
            notes: s.notes
        })));

        if (error) {
            console.error(error);
            setSaveStatus('error');
        } else {
            setSaveStatus('saved');
            // Optimistically or refetch shifts in main view? 
            // Ideally we'd trigger a refresh in parent, but for now simple feedback
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center space-x-3 text-brand-blue">
                <div className="p-2 bg-brand-blue/10 rounded-lg">
                    <Settings size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Scheduling Copilot</h3>
                    <p className="text-xs text-slate-500 font-medium">AI-Assisted Roster Generation</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:border-brand-blue" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:border-brand-blue" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="col-span-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Projected Daily Counts</div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Daycare</label>
                        <input type="number" value={counts.daycare} onChange={e => setCounts({ ...counts, daycare: parseInt(e.target.value) })} className="w-full p-2 text-center bg-white border border-slate-200 rounded-lg font-bold text-brand-blue" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Boarding</label>
                        <input type="number" value={counts.boarding} onChange={e => setCounts({ ...counts, boarding: parseInt(e.target.value) })} className="w-full p-2 text-center bg-white border border-slate-200 rounded-lg font-bold text-emerald-600" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Suites</label>
                        <input type="number" value={counts.suites} onChange={e => setCounts({ ...counts, suites: parseInt(e.target.value) })} className="w-full p-2 text-center bg-white border border-slate-200 rounded-lg font-bold text-purple-600" />
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-brand-dark transition-all disabled:opacity-50"
                >
                    {isGenerating ? (
                        <span className="animate-pulse">Analyzing...</span>
                    ) : (
                        <>
                            <Play size={18} fill="currentColor" />
                            <span>Generate Roster</span>
                        </>
                    )}
                </button>
            </div>

            {generatedShifts.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-bottom-5 fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Users size={16} className="text-slate-400" />
                            Preview: {generatedShifts.length} Shifts created
                        </h4>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {generatedShifts.slice(0, 10).map((s, i) => ( // Show first 10 preview
                            <div key={i} className="text-xs p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center text-slate-600">
                                <span className="font-bold">{new Date(s.start_time).toLocaleDateString()}</span>
                                <span className="truncate max-w-[100px]">{s.role_type}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-white border rounded text-slate-400">{new Date(s.start_time).getHours()}:00 - {new Date(s.end_time).getHours()}:00</span>
                            </div>
                        ))}
                        {generatedShifts.length > 10 && (
                            <div className="text-center text-xs text-slate-400 font-medium italic">
                                +{generatedShifts.length - 10} more shifts...
                            </div>
                        )}
                    </div>

                    {saveStatus === 'saved' ? (
                        <div className="w-full py-3 bg-green-50 text-green-600 border border-green-200 rounded-xl font-bold text-center text-sm">
                            ✓ Published to Schedule
                        </div>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all"
                        >
                            <Save size={18} />
                            <span>{saveStatus === 'saving' ? 'Publishing...' : 'Publish Drafts'}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default CopilotPanel;
