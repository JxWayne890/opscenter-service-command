import { expect, test, describe } from 'vitest';
import { hasPermission, isManager, isStaff, Permission } from './permissions';
import { Profile } from '../types';

const makeProfile = (role: 'owner' | 'manager' | 'staff'): Profile => ({
  id: 'test-id',
  organization_id: 'org-id',
  user_id: 'user-id',
  full_name: 'Test User',
  role,
  status: 'active',
});

describe('isManager', () => {
  test('returns true for owner', () => {
    expect(isManager(makeProfile('owner'))).toBe(true);
  });

  test('returns true for manager', () => {
    expect(isManager(makeProfile('manager'))).toBe(true);
  });

  test('returns false for staff', () => {
    expect(isManager(makeProfile('staff'))).toBe(false);
  });

  test('returns false for null', () => {
    expect(isManager(null)).toBe(false);
  });
});

describe('isStaff', () => {
  test('returns true for staff', () => {
    expect(isStaff(makeProfile('staff'))).toBe(true);
  });

  test('returns false for manager', () => {
    expect(isStaff(makeProfile('manager'))).toBe(false);
  });

  test('returns false for null', () => {
    expect(isStaff(null)).toBe(false);
  });
});

describe('hasPermission', () => {
  const allPermissions: Permission[] = [
    'view_all_staff', 'add_staff', 'edit_staff',
    'view_all_schedules', 'edit_schedules',
    'view_all_timesheets', 'edit_timesheets',
    'approve_requests', 'view_payroll', 'manage_settings',
  ];

  test('owner has all permissions', () => {
    const owner = makeProfile('owner');
    allPermissions.forEach(perm => {
      expect(hasPermission(owner, perm)).toBe(true);
    });
  });

  test('manager has all permissions', () => {
    const manager = makeProfile('manager');
    allPermissions.forEach(perm => {
      expect(hasPermission(manager, perm)).toBe(true);
    });
  });

  test('staff has no special permissions', () => {
    const staff = makeProfile('staff');
    allPermissions.forEach(perm => {
      expect(hasPermission(staff, perm)).toBe(false);
    });
  });

  test('null user has no permissions', () => {
    allPermissions.forEach(perm => {
      expect(hasPermission(null, perm)).toBe(false);
    });
  });
});
