/**
 * Audit logging service for sensitive actions.
 *
 * Logs payroll approvals/releases, role changes, staff offboarding,
 * and other actions that need a paper trail.
 *
 * Currently logs to console and in-memory buffer.
 * To persist: store to a Supabase `audit_log` table.
 */

export type AuditAction =
  | 'payroll.approved'
  | 'payroll.released'
  | 'payroll.exported'
  | 'staff.role_changed'
  | 'staff.offboarded'
  | 'staff.restored'
  | 'staff.invited'
  | 'time_entry.approved'
  | 'time_entry.deleted'
  | 'shift.deleted'
  | 'client.deleted'
  | 'settings.updated';

export interface AuditEntry {
  action: AuditAction;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

const auditBuffer: AuditEntry[] = [];
const MAX_BUFFER_SIZE = 500;

export const AuditLog = {
  log(entry: Omit<AuditEntry, 'timestamp'>) {
    const full: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    auditBuffer.push(full);
    if (auditBuffer.length > MAX_BUFFER_SIZE) auditBuffer.shift();

    console.info(
      `[AUDIT] ${full.action} by ${full.actorName} (${full.actorId})` +
      (full.targetName ? ` → ${full.targetName}` : '') +
      (full.details ? ` | ${JSON.stringify(full.details)}` : '')
    );

    return full;
  },

  getLog(): AuditEntry[] {
    return [...auditBuffer];
  },

  getLogForActor(actorId: string): AuditEntry[] {
    return auditBuffer.filter(e => e.actorId === actorId);
  },

  getLogForAction(action: AuditAction): AuditEntry[] {
    return auditBuffer.filter(e => e.action === action);
  },

  clear() {
    auditBuffer.length = 0;
  },
};
