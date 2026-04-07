import React, { useState, useEffect } from 'react';
import { BookmarkPlus, Layers, Trash2, ChevronRight, X, Save } from 'lucide-react';
import { ScheduleTemplate, Shift } from '../../types';
import { ScheduleTemplateService } from '../../services/scheduleTemplates';
import { useToast } from '../ui/Toast';
import ConfirmDialog from '../ui/ConfirmDialog';

interface TemplatePanelProps {
  weekStart: Date;
  shifts: Shift[];
  organizationId: string;
  userId: string;
  onApplyTemplate: (shifts: Omit<Shift, 'profile'>[]) => void;
}

const TemplatePanel: React.FC<TemplatePanelProps> = ({
  weekStart,
  shifts,
  organizationId,
  userId,
  onApplyTemplate,
}) => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(ScheduleTemplateService.getAll());
  }, [isOpen]);

  const handleSave = () => {
    if (!newName.trim()) return;
    const template = ScheduleTemplateService.extractFromWeek(
      newName.trim(),
      shifts,
      weekStart,
      organizationId,
      userId
    );
    ScheduleTemplateService.save(template);
    setTemplates(ScheduleTemplateService.getAll());
    setNewName('');
    setIsSaving(false);
    showToast(`Template "${template.name}" saved!`);
  };

  const handleApply = (template: ScheduleTemplate) => {
    const newShifts = ScheduleTemplateService.applyToWeek(template, weekStart, organizationId);
    onApplyTemplate(newShifts);
    setIsOpen(false);
    showToast(`Applied "${template.name}" to current week`);
  };

  const handleDelete = (id: string) => {
    ScheduleTemplateService.remove(id);
    setTemplates(ScheduleTemplateService.getAll());
    setDeleteId(null);
    showToast('Template deleted');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 hover:shadow-sm transition-all"
        title="Schedule Templates"
      >
        <Layers size={16} className="text-violet-500" />
        <span>Templates</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Schedule Templates</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Save Current Week */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Template name..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <button
                    onClick={handleSave}
                    disabled={!newName.trim()}
                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                  </button>
                  <button onClick={() => setIsSaving(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSaving(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                >
                  <BookmarkPlus size={16} />
                  Save Current Week as Template
                </button>
              )}
            </div>

            {/* Template List */}
            <div className="max-h-64 overflow-y-auto">
              {templates.length === 0 ? (
                <div className="p-6 text-center">
                  <Layers size={24} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs font-medium text-slate-400">No templates saved yet</p>
                </div>
              ) : (
                templates.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group"
                  >
                    <button
                      onClick={() => handleApply(t)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-bold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.shifts.length} shifts</div>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleApply(t)}
                        className="p-1.5 hover:bg-indigo-50 text-indigo-500 rounded-lg transition-colors"
                        title="Apply to current week"
                      >
                        <ChevronRight size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-400 rounded-lg transition-colors"
                        title="Delete template"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Template?"
        message="This template will be permanently removed."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
};

export default TemplatePanel;
