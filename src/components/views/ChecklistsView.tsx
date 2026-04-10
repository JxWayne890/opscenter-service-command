import React, { useState, useMemo } from 'react';
import { ClipboardCheck, Plus, ChevronDown, ChevronRight, Check, AlertTriangle, Calendar, User, Clock, Shield, Trash2, X } from 'lucide-react';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { useToast } from '../ui/Toast';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isManager } from '../../services/permissions';
import { ChecklistTemplate, ChecklistItemTemplate, ChecklistInstance, ChecklistItemInstance } from '../../types';
import BaseModal from '../ui/BaseModal';
import CustomSelect from '../ui/CustomSelect';

// ==================== DEFAULT TEMPLATES ====================
const DEFAULT_TEMPLATES: Omit<ChecklistTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>[] = [
    {
        name: 'Morning Opening',
        shift_type: 'morning',
        is_active: true,
        items: [
            { id: 'm1', label: 'Unlock facility and disarm alarm', is_non_negotiable: true, sort_order: 0 },
            { id: 'm2', label: 'Walk through all play areas for hazards', is_non_negotiable: true, sort_order: 1 },
            { id: 'm3', label: 'Check water bowls in all zones', is_non_negotiable: true, sort_order: 2 },
            { id: 'm4', label: 'Review overnight notes and incident reports', is_non_negotiable: true, sort_order: 3 },
            { id: 'm5', label: 'Verify medication list for AM meds', is_non_negotiable: true, sort_order: 4 },
            { id: 'm6', label: 'Confirm staff arrivals match schedule', is_non_negotiable: false, sort_order: 5 },
            { id: 'm7', label: 'Start morning feeding rounds', is_non_negotiable: true, sort_order: 6 },
            { id: 'm8', label: 'Check supply levels (food, cleaning, bags)', is_non_negotiable: false, sort_order: 7 },
        ],
    },
    {
        name: 'Evening Closing',
        shift_type: 'evening',
        is_active: true,
        items: [
            { id: 'e1', label: 'Complete evening feeding rounds', is_non_negotiable: true, sort_order: 0 },
            { id: 'e2', label: 'Administer PM medications', is_non_negotiable: true, sort_order: 1 },
            { id: 'e3', label: 'Final potty break for all boarding dogs', is_non_negotiable: true, sort_order: 2 },
            { id: 'e4', label: 'Clean and sanitize all play areas', is_non_negotiable: true, sort_order: 3 },
            { id: 'e5', label: 'Secure all kennel doors', is_non_negotiable: true, sort_order: 4 },
            { id: 'e6', label: 'Log overnight notes for each boarding dog', is_non_negotiable: false, sort_order: 5 },
            { id: 'e7', label: 'Set alarm and lock facility', is_non_negotiable: true, sort_order: 6 },
            { id: 'e8', label: 'Confirm overnight staff has arrived', is_non_negotiable: true, sort_order: 7 },
        ],
    },
    {
        name: 'Overnight Checks',
        shift_type: 'overnight',
        is_active: true,
        items: [
            { id: 'n1', label: 'Walk through all kennels every 2 hours', is_non_negotiable: true, sort_order: 0 },
            { id: 'n2', label: 'Check for signs of distress or illness', is_non_negotiable: true, sort_order: 1 },
            { id: 'n3', label: 'Potty breaks for flagged dogs', is_non_negotiable: true, sort_order: 2 },
            { id: 'n4', label: 'Log any incidents or concerns', is_non_negotiable: false, sort_order: 3 },
            { id: 'n5', label: 'Maintain temperature in all zones', is_non_negotiable: true, sort_order: 4 },
        ],
    },
];

// ==================== CREATE TEMPLATE MODAL ====================
const CreateTemplateModal = ({ isOpen, onClose, onSave, editTemplate }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: Omit<ChecklistTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => void;
    editTemplate?: ChecklistTemplate | null;
}) => {
    const [name, setName] = useState(editTemplate?.name || '');
    const [shiftType, setShiftType] = useState<ChecklistTemplate['shift_type']>(editTemplate?.shift_type || 'any');
    const [items, setItems] = useState<ChecklistItemTemplate[]>(editTemplate?.items || []);
    const [newItemLabel, setNewItemLabel] = useState('');
    const [newItemNonNeg, setNewItemNonNeg] = useState(false);

    React.useEffect(() => {
        if (editTemplate) {
            setName(editTemplate.name);
            setShiftType(editTemplate.shift_type);
            setItems(editTemplate.items);
        } else {
            setName('');
            setShiftType('any');
            setItems([]);
        }
    }, [editTemplate, isOpen]);

    const addItem = () => {
        if (!newItemLabel.trim()) return;
        setItems(prev => [...prev, {
            id: `item-${Date.now()}`,
            label: newItemLabel.trim(),
            is_non_negotiable: newItemNonNeg,
            sort_order: prev.length,
        }]);
        setNewItemLabel('');
        setNewItemNonNeg(false);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleSave = () => {
        if (!name.trim() || items.length === 0) return;
        onSave({ name: name.trim(), shift_type: shiftType, items, is_active: true });
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
            <div className="p-6 space-y-6">
                <div>
                    <h2 className="text-xl font-display font-bold text-slate-900">{editTemplate ? 'Edit Checklist Template' : 'Create Checklist Template'}</h2>
                    <p className="text-sm text-slate-400 mt-1">Define the tasks for a shift checklist</p>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Template Name</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Morning Opening"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white transition-colors"
                    />
                </div>

                <CustomSelect
                    label="Shift Type"
                    value={shiftType}
                    onChange={v => setShiftType(v as ChecklistTemplate['shift_type'])}
                    placeholder="Select shift type..."
                    options={[
                        { value: 'morning', label: 'Morning', description: 'Opening shift' },
                        { value: 'afternoon', label: 'Afternoon', description: 'Midday shift' },
                        { value: 'evening', label: 'Evening', description: 'Closing shift' },
                        { value: 'overnight', label: 'Overnight', description: 'Night shift' },
                        { value: 'any', label: 'Any Shift', description: 'Applies to all shifts' },
                    ]}
                />

                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Checklist Items</label>
                    <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                        {items.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                <span className="text-xs font-bold text-slate-300 w-6">{idx + 1}</span>
                                {item.is_non_negotiable && (
                                    <Shield size={14} className="text-amber-500 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium text-slate-700 flex-1">{item.label}</span>
                                <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {items.length === 0 && (
                            <p className="text-sm text-slate-400 italic text-center py-4">No items yet. Add items below.</p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <input
                            value={newItemLabel}
                            onChange={e => setNewItemLabel(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addItem()}
                            placeholder="Add checklist item..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white transition-colors"
                        />
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-2xl cursor-pointer hover:bg-amber-100 transition-colors">
                            <input type="checkbox" checked={newItemNonNeg} onChange={e => setNewItemNonNeg(e.target.checked)} className="rounded" />
                            <Shield size={14} className="text-amber-600" />
                            <span className="text-xs font-bold text-amber-700 hidden sm:inline">Required</span>
                        </label>
                        <button onClick={addItem} className="px-4 py-2 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 active:scale-[0.98] transition-all">
                            Add
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-3.5 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || items.length === 0}
                        className="flex-1 py-3.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 hover:shadow-xl disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed active:scale-[0.98] transition-all text-sm"
                    >
                        {editTemplate ? 'Update Template' : 'Create Template'}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

// ==================== ASSIGN CHECKLIST MODAL ====================
const AssignChecklistModal = ({ isOpen, onClose, templates, staff: staffList, onAssign }: {
    isOpen: boolean;
    onClose: () => void;
    templates: ChecklistTemplate[];
    staff: { id: string; full_name: string }[];
    onAssign: (templateId: string, assignedTo: string, date: string) => void;
}) => {
    const [templateId, setTemplateId] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleAssign = () => {
        if (!templateId || !assignedTo || !date) return;
        onAssign(templateId, assignedTo, date);
        onClose();
        setTemplateId('');
        setAssignedTo('');
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose}>
            <div className="p-6 space-y-6">
                <div>
                    <h2 className="text-xl font-display font-bold text-slate-900">Assign Checklist</h2>
                    <p className="text-sm text-slate-400 mt-1">Assign a daily checklist to a team member</p>
                </div>
                <CustomSelect
                    label="Checklist Template"
                    value={templateId}
                    onChange={setTemplateId}
                    placeholder="Select template..."
                    options={templates.filter(t => t.is_active).map(t => ({
                        value: t.id,
                        label: t.name,
                        description: `${t.shift_type} shift • ${t.items.length} items`,
                    }))}
                />
                <CustomSelect
                    label="Assign To"
                    value={assignedTo}
                    onChange={setAssignedTo}
                    placeholder="Select staff member..."
                    options={staffList.map(s => ({
                        value: s.id,
                        label: s.full_name,
                    }))}
                />
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white transition-colors" />
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-3.5 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all text-sm">Cancel</button>
                    <button onClick={handleAssign} disabled={!templateId || !assignedTo} className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed active:scale-[0.98] transition-all text-sm">Assign</button>
                </div>
            </div>
        </BaseModal>
    );
};

// ==================== MAIN VIEW ====================
const ChecklistsView = () => {
    const { currentUser, staff } = useOpsCenter();
    const { showToast } = useToast();
    usePageTitle('Checklists');

    const canManage = isManager(currentUser);
    const today = new Date().toISOString().split('T')[0];

    // Local state (will connect to Supabase when tables are deployed)
    const [templates, setTemplates] = useState<ChecklistTemplate[]>(() => {
        const saved = localStorage.getItem('ops_checklist_templates');
        if (saved) return JSON.parse(saved);
        // Initialize with defaults
        const defaults: ChecklistTemplate[] = DEFAULT_TEMPLATES.map((t, i) => ({
            ...t,
            id: `default-${i}`,
            organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }));
        localStorage.setItem('ops_checklist_templates', JSON.stringify(defaults));
        return defaults;
    });

    const [instances, setInstances] = useState<ChecklistInstance[]>(() => {
        const saved = localStorage.getItem('ops_checklist_instances');
        return saved ? JSON.parse(saved) : [];
    });

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
    const [viewTab, setViewTab] = useState<'today' | 'templates' | 'history'>('today');
    const [selectedDate, setSelectedDate] = useState(today);
    const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);

    // Persist to localStorage
    React.useEffect(() => {
        localStorage.setItem('ops_checklist_templates', JSON.stringify(templates));
    }, [templates]);

    React.useEffect(() => {
        localStorage.setItem('ops_checklist_instances', JSON.stringify(instances));
    }, [instances]);

    // Filter instances by date
    const dateInstances = useMemo(() =>
        instances.filter(inst => inst.date === selectedDate).sort((a, b) => {
            const order = { morning: 0, afternoon: 1, evening: 2, overnight: 3, any: 4 };
            return (order[a.shift_type as keyof typeof order] || 4) - (order[b.shift_type as keyof typeof order] || 4);
        }),
    [instances, selectedDate]);

    // Summary stats
    const todayInstances = instances.filter(i => i.date === today);
    const completedToday = todayInstances.filter(i => i.status === 'complete').length;
    const pendingToday = todayInstances.filter(i => i.status !== 'complete').length;
    const nonNegMissed = todayInstances.reduce((count, inst) => {
        return count + inst.items.filter(item => item.is_non_negotiable && !item.completed).length;
    }, 0);

    // Template actions
    const handleSaveTemplate = (data: Omit<ChecklistTemplate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
        if (editingTemplate) {
            setTemplates(prev => prev.map(t => t.id === editingTemplate.id
                ? { ...t, ...data, updated_at: new Date().toISOString() }
                : t
            ));
            showToast('Template updated', 'success');
        } else {
            const newTemplate: ChecklistTemplate = {
                ...data,
                id: `tmpl-${Date.now()}`,
                organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setTemplates(prev => [...prev, newTemplate]);
            showToast('Template created', 'success');
        }
        setEditingTemplate(null);
    };

    const handleDeleteTemplate = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        showToast('Template removed', 'info');
    };

    // Assign checklist
    const handleAssignChecklist = (templateId: string, assignedTo: string, date: string) => {
        const template = templates.find(t => t.id === templateId);
        const assignee = staff.find(s => s.id === assignedTo);
        if (!template || !assignee) return;

        const instance: ChecklistInstance = {
            id: `inst-${Date.now()}`,
            organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            template_id: template.id,
            template_name: template.name,
            shift_type: template.shift_type,
            date,
            assigned_to: assignee.id,
            assigned_name: assignee.full_name,
            items: template.items.map(item => ({
                id: `ci-${Date.now()}-${item.id}`,
                label: item.label,
                is_non_negotiable: item.is_non_negotiable,
                completed: false,
            })),
            status: 'pending',
            created_at: new Date().toISOString(),
        };

        setInstances(prev => [...prev, instance]);
        showToast(`Checklist assigned to ${assignee.full_name}`, 'success');
    };

    // Toggle item completion
    const toggleItem = (instanceId: string, itemId: string) => {
        setInstances(prev => prev.map(inst => {
            if (inst.id !== instanceId) return inst;

            // Only assigned person or managers can check items
            if (!canManage && inst.assigned_to !== currentUser?.id) return inst;

            const updatedItems = inst.items.map(item => {
                if (item.id !== itemId) return item;
                return {
                    ...item,
                    completed: !item.completed,
                    completed_by: !item.completed ? currentUser?.id : undefined,
                    completed_by_name: !item.completed ? currentUser?.full_name : undefined,
                    completed_at: !item.completed ? new Date().toISOString() : undefined,
                };
            });

            const allDone = updatedItems.every(i => i.completed);
            return {
                ...inst,
                items: updatedItems,
                status: allDone ? 'complete' : updatedItems.some(i => i.completed) ? 'in_progress' : 'pending',
                completed_at: allDone ? new Date().toISOString() : undefined,
            };
        }));
    };

    // Shift type badge
    const shiftBadge = (type: string) => {
        const colors: Record<string, string> = {
            morning: 'bg-amber-100 text-amber-700 border-amber-200',
            afternoon: 'bg-sky-100 text-sky-700 border-sky-200',
            evening: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            overnight: 'bg-slate-700 text-slate-100 border-slate-600',
            any: 'bg-slate-100 text-slate-600 border-slate-200',
        };
        return colors[type] || colors.any;
    };

    const statusBadge = (status: string) => {
        if (status === 'complete') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (status === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-slate-100 text-slate-500 border-slate-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <ClipboardCheck size={20} className="text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Accountability</h1>
                        <p className="text-sm text-slate-500 font-medium">Daily checklists and follow-through</p>
                    </div>
                </div>
                {canManage && (
                    <div className="flex gap-2">
                        <button onClick={() => setShowAssignModal(true)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2">
                            <ClipboardCheck size={16} />
                            Assign Checklist
                        </button>
                        <button onClick={() => { setEditingTemplate(null); setShowCreateModal(true); }} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2">
                            <Plus size={16} />
                            New Template
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SectionCard>
                    <div className="p-5">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Checklists</div>
                        <div className="text-2xl font-black text-slate-900">{todayInstances.length}</div>
                        <div className="text-xs text-slate-400 mt-1">{completedToday} completed</div>
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="p-5">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pending</div>
                        <div className={`text-2xl font-black ${pendingToday > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{pendingToday}</div>
                        <div className="text-xs text-slate-400 mt-1">{pendingToday > 0 ? 'Needs attention' : 'All clear'}</div>
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="p-5">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Completion</div>
                        <div className="text-2xl font-black text-slate-900">
                            {todayInstances.length > 0 ? Math.round((completedToday / todayInstances.length) * 100) : '--'}%
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            {todayInstances.length > 0 ? 'Today\'s rate' : 'No checklists assigned'}
                        </div>
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="p-5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Shield size={12} className="text-amber-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Required Items</span>
                        </div>
                        <div className={`text-2xl font-black ${nonNegMissed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{nonNegMissed > 0 ? nonNegMissed : todayInstances.length > 0 ? '0' : '--'}</div>
                        <div className="text-xs text-slate-400 mt-1">{nonNegMissed > 0 ? 'Still incomplete' : todayInstances.length > 0 ? 'All completed' : 'No data'}</div>
                    </div>
                </SectionCard>
            </div>

            {/* Tab Navigation */}
            <div className="flex p-1 bg-slate-100/80 rounded-xl w-fit">
                {(['today', 'templates', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setViewTab(tab)}
                        className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${viewTab === tab
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {tab === 'today' ? "Today's Tasks" : tab === 'templates' ? 'Templates' : 'History'}
                    </button>
                ))}
            </div>

            {/* TODAY'S TASKS TAB */}
            {viewTab === 'today' && (
                <div className="space-y-4">
                    {dateInstances.length === 0 ? (
                        <SectionCard>
                            <div className="p-12 text-center">
                                <ClipboardCheck size={48} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 mb-2">No checklists for {selectedDate === today ? 'today' : selectedDate}</h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    {canManage ? 'Assign a checklist from a template to get started.' : 'Check with your manager for today\'s tasks.'}
                                </p>
                                {canManage && (
                                    <button onClick={() => setShowAssignModal(true)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
                                        Assign Checklist
                                    </button>
                                )}
                            </div>
                        </SectionCard>
                    ) : (
                        dateInstances.map(inst => {
                            const isExpanded = expandedChecklist === inst.id;
                            const completedCount = inst.items.filter(i => i.completed).length;
                            const totalCount = inst.items.length;
                            const pct = Math.round((completedCount / totalCount) * 100);
                            const canEdit = canManage || inst.assigned_to === currentUser?.id;

                            return (
                                <SectionCard key={inst.id} className="overflow-hidden">
                                    {/* Checklist Header */}
                                    <button
                                        onClick={() => setExpandedChecklist(isExpanded ? null : inst.id)}
                                        className="w-full p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${inst.status === 'complete' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                                {inst.status === 'complete' ? (
                                                    <Check size={24} className="text-emerald-600" />
                                                ) : (
                                                    <ClipboardCheck size={24} className="text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-slate-900">{inst.template_name}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${shiftBadge(inst.shift_type)}`}>
                                                        {inst.shift_type}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${statusBadge(inst.status)}`}>
                                                        {inst.status === 'complete' ? 'Done' : inst.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <User size={12} />
                                                        {inst.assigned_name}
                                                    </span>
                                                    <span>{completedCount}/{totalCount} items</span>
                                                    {inst.completed_at && (
                                                        <span className="flex items-center gap-1 text-emerald-500">
                                                            <Clock size={12} />
                                                            Done at {new Date(inst.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {/* Progress bar */}
                                            <div className="hidden sm:block w-32">
                                                <div className="w-full bg-slate-100 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-400 text-right mt-1 font-bold">{pct}%</p>
                                            </div>
                                            {isExpanded ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                                        </div>
                                    </button>

                                    {/* Expanded Items */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 divide-y divide-slate-50">
                                            {inst.items.map(item => (
                                                <div
                                                    key={item.id}
                                                    className={`flex items-center gap-4 px-5 py-4 transition-colors ${item.completed ? 'bg-emerald-50/30' : item.is_non_negotiable ? 'bg-amber-50/20' : ''} ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                                                    onClick={() => canEdit && toggleItem(inst.id, item.id)}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                        item.completed
                                                            ? 'bg-emerald-500 border-emerald-500'
                                                            : item.is_non_negotiable
                                                                ? 'border-amber-400'
                                                                : 'border-slate-200'
                                                    }`}>
                                                        {item.completed && <Check size={14} className="text-white" strokeWidth={3} />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-medium ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                                {item.label}
                                                            </span>
                                                            {item.is_non_negotiable && !item.completed && (
                                                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded border border-amber-200 flex items-center gap-1">
                                                                    <Shield size={10} />
                                                                    Required
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.completed && item.completed_by_name && (
                                                            <p className="text-xs text-slate-400 mt-0.5">
                                                                {item.completed_by_name} at {item.completed_at && new Date(item.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </SectionCard>
                            );
                        })
                    )}
                </div>
            )}

            {/* TEMPLATES TAB */}
            {viewTab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {templates.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-400">
                            <ClipboardCheck size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-medium">No templates yet. Create one to get started.</p>
                        </div>
                    ) : templates.map(template => (
                        <SectionCard key={template.id} className="hover:shadow-md transition-shadow">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${shiftBadge(template.shift_type)}`}>
                                        {template.shift_type}
                                    </span>
                                    {canManage && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => { setEditingTemplate(template); setShowCreateModal(true); }}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(template.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 mb-2">{template.name}</h3>
                                <p className="text-xs text-slate-400 mb-3">{template.items.length} items</p>
                                <div className="space-y-1.5">
                                    {template.items.slice(0, 4).map(item => (
                                        <div key={item.id} className="flex items-center gap-2 text-xs text-slate-500">
                                            {item.is_non_negotiable ? (
                                                <Shield size={12} className="text-amber-500 flex-shrink-0" />
                                            ) : (
                                                <div className="w-3 h-3 rounded border border-slate-200 flex-shrink-0" />
                                            )}
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                    ))}
                                    {template.items.length > 4 && (
                                        <p className="text-xs text-slate-300 font-medium pl-5">+{template.items.length - 4} more</p>
                                    )}
                                </div>
                            </div>
                        </SectionCard>
                    ))}
                </div>
            )}

            {/* HISTORY TAB */}
            {viewTab === 'history' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button onClick={() => setSelectedDate(today)} className="px-4 py-2.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">
                            Today
                        </button>
                    </div>

                    {/* Rollup Summary for selected date */}
                    {(() => {
                        const dateInsts = instances.filter(i => i.date === selectedDate);
                        if (dateInsts.length === 0) {
                            return (
                                <SectionCard>
                                    <div className="p-8 text-center text-slate-400">
                                        <p className="font-medium">No checklists found for this date.</p>
                                    </div>
                                </SectionCard>
                            );
                        }
                        const completed = dateInsts.filter(i => i.status === 'complete').length;
                        const totalItems = dateInsts.reduce((sum, i) => sum + i.items.length, 0);
                        const completedItems = dateInsts.reduce((sum, i) => sum + i.items.filter(it => it.completed).length, 0);

                        return (
                            <>
                                <SectionCard>
                                    <div className="p-5">
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Daily Summary</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">Checklists</p>
                                                <p className="text-xl font-black text-slate-900">{completed}/{dateInsts.length}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">Items Done</p>
                                                <p className="text-xl font-black text-slate-900">{completedItems}/{totalItems}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">Rate</p>
                                                <p className="text-xl font-black text-slate-900">{totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </SectionCard>

                                {/* Individual checklists for that date */}
                                {dateInsts.map(inst => (
                                    <SectionCard key={inst.id}>
                                        <div className="p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-900">{inst.template_name}</h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${statusBadge(inst.status)}`}>
                                                        {inst.status}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-400">{inst.assigned_name}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {inst.items.map(item => (
                                                    <div key={item.id} className="flex items-center gap-2 text-xs">
                                                        {item.completed ? (
                                                            <Check size={14} className="text-emerald-500 flex-shrink-0" />
                                                        ) : item.is_non_negotiable ? (
                                                            <AlertTriangle size={14} className="text-rose-500 flex-shrink-0" />
                                                        ) : (
                                                            <X size={14} className="text-slate-300 flex-shrink-0" />
                                                        )}
                                                        <span className={item.completed ? 'text-slate-400' : item.is_non_negotiable ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                                                            {item.label}
                                                        </span>
                                                        {item.completed && item.completed_at && (
                                                            <span className="text-slate-300 ml-auto">
                                                                {new Date(item.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </SectionCard>
                                ))}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Modals */}
            <CreateTemplateModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setEditingTemplate(null); }}
                onSave={handleSaveTemplate}
                editTemplate={editingTemplate}
            />
            <AssignChecklistModal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                templates={templates}
                staff={staff.filter(s => s.status === 'active')}
                onAssign={handleAssignChecklist}
            />
        </div>
    );
};

export default ChecklistsView;
