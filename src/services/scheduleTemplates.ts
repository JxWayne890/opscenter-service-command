import { ScheduleTemplate, TemplateShift, Shift } from '../types';

const STORAGE_KEY = 'ops_schedule_templates';

// Persist templates in localStorage (upgrade to Supabase later)
export const ScheduleTemplateService = {
  getAll(): ScheduleTemplate[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  save(template: ScheduleTemplate): void {
    const templates = this.getAll();
    const idx = templates.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      templates[idx] = template;
    } else {
      templates.push(template);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  },

  remove(id: string): void {
    const templates = this.getAll().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  },

  /**
   * Extract a template from an existing week of shifts.
   * weekStart should be a Monday.
   */
  extractFromWeek(
    name: string,
    shifts: Shift[],
    weekStart: Date,
    organizationId: string,
    userId: string
  ): ScheduleTemplate {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekShifts = shifts.filter(s => {
      const d = new Date(s.start_time);
      return d >= weekStart && d < weekEnd;
    });

    const templateShifts: TemplateShift[] = weekShifts.map(s => {
      const start = new Date(s.start_time);
      const dayOfWeek = start.getDay() === 0 ? 6 : start.getDay() - 1; // Mon=0

      return {
        day_of_week: dayOfWeek,
        start_time: start.toTimeString().substring(0, 5),
        end_time: new Date(s.end_time).toTimeString().substring(0, 5),
        role_type: s.role_type,
        user_id: s.user_id,
        is_open: s.is_open,
      };
    });

    return {
      id: crypto.randomUUID(),
      organization_id: organizationId,
      name,
      shifts: templateShifts,
      created_by: userId,
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Generate Shift objects from a template for a given week.
   */
  applyToWeek(
    template: ScheduleTemplate,
    weekStart: Date,
    organizationId: string
  ): Omit<Shift, 'profile'>[] {
    const monday = new Date(weekStart);
    // Ensure it's a Monday
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    return template.shifts.map(ts => {
      const shiftDate = new Date(monday);
      shiftDate.setDate(shiftDate.getDate() + ts.day_of_week);

      const [sh, sm] = ts.start_time.split(':').map(Number);
      const [eh, em] = ts.end_time.split(':').map(Number);

      const start = new Date(shiftDate);
      start.setHours(sh, sm, 0, 0);

      const end = new Date(shiftDate);
      end.setHours(eh, em, 0, 0);
      if (end <= start) end.setDate(end.getDate() + 1); // overnight

      return {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        user_id: ts.user_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        role_type: ts.role_type,
        status: 'published' as const,
        is_open: ts.is_open,
      };
    });
  },
};
