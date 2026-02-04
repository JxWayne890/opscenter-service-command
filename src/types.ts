// --- Types based on Schema Parity ---

export type UserRole = 'owner' | 'manager' | 'staff' | 'admin';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string;
  invite_code?: string;
  pay_period?: 'weekly' | 'biweekly' | 'monthly';
  pay_period_start_day?: number; // 0-6 (Sunday-Saturday)
  settings?: Record<string, any>;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'manager' | 'staff';
  status: 'pending' | 'accepted' | 'expired';
  created_at?: string;
  expires_at?: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'pending';
  hourly_rate?: number;
  schedule_config?: ScheduleConfig;
}

export type ScheduleType = 'fixed' | 'rotating';

export interface ScheduleConfig {
  type: ScheduleType;
  // For Fixed:
  fixed_days?: number[]; // 0-6, e.g. [1,2,3,4,5] for M-F
  // For Rotating:
  days_on?: number;
  days_off?: number;
  anchor_date?: string; // Date to start the rotation calculation
  // Shift times (HH:MM format)
  shift_start_time?: string; // e.g. "09:00"
  shift_end_time?: string;   // e.g. "17:00"
}

export interface PayStub {
  id: string;
  organization_id: string;
  user_id: string;
  period_start: string; // ISO Date
  period_end: string;   // ISO Date
  status: 'draft' | 'approved' | 'released';
  total_hours: number;
  gross_pay: number;
  approved_by?: string;
  released_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Shift {
  id: string;
  organization_id: string;
  user_id?: string; // Nullable for Open Shifts
  start_time: string;
  end_time: string;
  role_type: string;
  status: 'active' | 'published' | 'draft' | 'approved' | 'pending_approval' | 'completed' | 'rejected';
  is_open: boolean;
  notes?: string;
  break_duration?: number; // Joined/Computed field for UI

  // Local/Joined fields (not in DB table directly but useful for UI)
  profile?: Profile;
}

export interface TimeEntry {
  id: string;
  organization_id: string;
  user_id: string;
  shift_id?: string;
  clock_in: string; // ISO string
  clock_out?: string; // ISO string
  break_start?: string;
  break_end?: string;
  total_break_minutes: number;
  breaks?: { start: string; end?: string; duration?: number }[]; // Explicit break log
  location_data?: { lat: number; lng: number; ip?: string };
  status: 'active' | 'pending_approval' | 'approved' | 'rejected';
  manager_notes?: string;
}

export interface Availability {
  id: string;
  organization_id: string;
  user_id: string;
  day_of_week: number; // 0-6
  start_time?: string; // "09:00"
  end_time?: string; // "17:00"
  is_unavailable: boolean;
  date_specific?: string; // ISO Date "2024-01-01"
}

export interface TimeOffRequest {
  id: string;
  organization_id: string;
  user_id: string;
  start_date: string; // ISO Date
  end_date: string;   // ISO Date
  type: 'paid' | 'unpaid' | 'sick' | 'holiday';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  manager_notes?: string;
}

export interface ShiftSwap {
  id: string;
  organization_id: string;
  requester_id: string;
  shift_id: string;
  recipient_id?: string; // Null = Open Offer
  status: 'pending' | 'approved' | 'rejected' | 'claimed';
}

export interface Message {
  id: string;
  organization_id: string;
  sender_id: string;
  recipient_id?: string;
  group_id?: string;
  content: string;
  read_at?: string;
  created_at: string;
}

// --- Legacy / Optional Parity Types ---
export interface KnowledgeEntry {
  id: string;
  organization_id: string;
  category: string;
  title: string;
  content_raw: string;
  tags: string[];
}

export interface CommTemplate {
  id: string;
  organization_id: string;
  category: string;
  name: string;
  subject?: string;
  body: string;
}

// --- Copilot Types ---
export interface StaffingRatio {
  id: string;
  organization_id: string;
  zone_name: string;
  staff_count: number;
  dog_count: number;
}

export interface StaffingRule {
  id: string;
  organization_id: string;
  name: string;
  rule_config: {
    min_staff?: number;
    roles?: string[];
    [key: string]: any;
  };
  is_active: boolean;
}

// --- View Types ---
export type ViewType = 'pulse' | 'roster' | 'knowledge' | 'comms' | 'settings' | 'schedule' | 'requests' | 'timeclock';
