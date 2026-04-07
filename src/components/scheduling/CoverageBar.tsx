import React from 'react';
import { CoverageRequirement, Shift } from '../../types';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface CoverageBarProps {
  date: Date;
  shifts: Shift[];
  requirements: CoverageRequirement[];
}

const CoverageBar: React.FC<CoverageBarProps> = ({ date, shifts, requirements }) => {
  const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Mon=0
  const dayRequirements = requirements.filter(r => r.day_of_week === dayOfWeek);

  if (dayRequirements.length === 0) return null;

  const assignedShifts = shifts.filter(s => !s.is_open);

  const gaps: { role: string; needed: number; have: number }[] = [];
  let allMet = true;

  for (const req of dayRequirements) {
    const count = assignedShifts.filter(s =>
      s.role_type.toLowerCase() === req.role_type.toLowerCase()
    ).length;
    if (count < req.required_count) {
      allMet = false;
      gaps.push({ role: req.role_type, needed: req.required_count, have: count });
    }
  }

  if (allMet) {
    return (
      <div className="flex items-center justify-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg mb-1">
        <CheckCircle size={10} className="text-emerald-500" />
        <span className="text-xs font-bold text-emerald-600">Covered</span>
      </div>
    );
  }

  return (
    <div className="px-2 py-1 bg-amber-50 rounded-lg mb-1 space-y-0.5" title={gaps.map(g => `${g.role}: ${g.have}/${g.needed}`).join('\n')}>
      <div className="flex items-center gap-1">
        <AlertTriangle size={10} className="text-amber-500" />
        <span className="text-xs font-bold text-amber-600">
          {gaps.length} gap{gaps.length > 1 ? 's' : ''}
        </span>
      </div>
      {gaps.map((g, i) => (
        <div key={i} className="text-xs text-amber-500 truncate">
          {g.role}: {g.have}/{g.needed}
        </div>
      ))}
    </div>
  );
};

export default CoverageBar;
