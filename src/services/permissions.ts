// Role-based permission helper
// Staff: Can only view their own data
// Manager/Owner: Full access

import { Profile } from '../types';

export type Permission =
    | 'view_all_staff'
    | 'add_staff'
    | 'edit_staff'
    | 'view_all_schedules'
    | 'edit_schedules'
    | 'view_all_timesheets'
    | 'edit_timesheets'
    | 'approve_requests'
    | 'view_payroll'
    | 'manage_settings';

const MANAGER_PERMISSIONS: Permission[] = [
    'view_all_staff',
    'add_staff',
    'edit_staff',
    'view_all_schedules',
    'edit_schedules',
    'view_all_timesheets',
    'edit_timesheets',
    'approve_requests',
    'view_payroll',
    'manage_settings'
];

const STAFF_PERMISSIONS: Permission[] = [
    // Staff can only view their own data - no special permissions
];

export const hasPermission = (user: Profile | null, permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === 'owner' || user.role === 'manager' || user.role === 'admin') {
        return MANAGER_PERMISSIONS.includes(permission);
    }
    return STAFF_PERMISSIONS.includes(permission);
};

export const isManager = (user: Profile | null): boolean => {
    if (!user) return false;
    return user.role === 'owner' || user.role === 'manager' || user.role === 'admin';
};

export const isStaff = (user: Profile | null): boolean => {
    if (!user) return false;
    return user.role === 'staff';
};
