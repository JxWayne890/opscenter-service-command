// --- Types based on Schema Parity ---

export type UserRole = 'owner' | 'manager' | 'staff';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string;
  invite_code?: string;
  client_invite_code?: string;
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

export interface ScheduleTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  shifts: TemplateShift[];
  created_by: string;
  created_at?: string;
}

export interface TemplateShift {
  day_of_week: number; // 0=Mon, 1=Tue, ... 6=Sun
  start_time: string; // "09:00"
  end_time: string; // "17:00"
  role_type: string;
  user_id?: string;
  is_open: boolean;
}

export interface CoverageRequirement {
  id: string;
  organization_id: string;
  day_of_week: number; // 0=Mon ... 6=Sun
  role_type: string;
  required_count: number;
}

export interface ScheduleConflict {
  type: 'double_booking' | 'time_off' | 'availability' | 'overtime';
  shift_id: string;
  user_id: string;
  message: string;
  severity: 'error' | 'warning';
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

// --- Clients & Pets Types ---
export interface Pet {
  id: string;
  client_id: string;
  organization_id: string;
  name: string;
  breed: string;
  age?: number; // Years
  weight?: number; // lbs
  gender: 'male' | 'female';
  is_spayed_neutered: boolean;
  avatar_url?: string;

  // Care Flags
  medical_alerts?: string[]; // e.g., ["Diabetic", "Seizures"]
  behavior_tags?: string[]; // e.g., ["Dog Selective", "Jumper", "Anxious"]
  dietary_restrictions?: string[];

  // Notes
  feeding_instructions?: string;
  medication_instructions?: string;
  behavior_notes?: string;
  last_visit?: string;

  status: 'active' | 'inactive' | 'deceased';
}

export interface Client {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone_primary: string;
  phone_secondary?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Access
  access_code?: string; // For door/gate
  notes?: string;

  // Emergency
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  vet_clinic_name?: string;
  vet_clinic_phone?: string;

  // Relationships
  pets?: Pet[];

  created_at: string;
  last_visit_at?: string;
  status: 'active' | 'inactive' | 'banned';
  current_balance?: number; // Added for Portal View
}

// --- Notifications ---
export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'shift' | 'payroll' | 'timeoff' | 'system';
  read: boolean;
  created_at: string;
}

// --- View Types ---
export type ViewType = 'pulse' | 'roster' | 'clients' | 'knowledge' | 'comms' | 'settings' | 'schedule' | 'requests' | 'timeclock' | 'financial' | 'analytics' | 'checklists';

// --- Staff Accountability / Checklists ---

export interface ChecklistTemplate {
  id: string;
  organization_id: string;
  name: string;
  shift_type: 'morning' | 'afternoon' | 'evening' | 'overnight' | 'any';
  items: ChecklistItemTemplate[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemTemplate {
  id: string;
  label: string;
  is_non_negotiable: boolean;
  sort_order: number;
}

export interface ChecklistInstance {
  id: string;
  organization_id: string;
  template_id: string;
  template_name: string;
  shift_type: string;
  date: string;
  assigned_to: string;
  assigned_name: string;
  items: ChecklistItemInstance[];
  status: 'pending' | 'in_progress' | 'complete';
  completed_at?: string;
  created_at: string;
}

export interface ChecklistItemInstance {
  id: string;
  label: string;
  is_non_negotiable: boolean;
  completed: boolean;
  completed_by?: string;
  completed_by_name?: string;
  completed_at?: string;
}

// --- Services & Billing Types ---

export interface ServiceType {
  id: string;
  organization_id: string;
  name: string; // "Boarding", "Daycare", "Training", "Grooming"
  category: 'boarding' | 'daycare' | 'training' | 'grooming' | 'other';
  rate: number; // price per unit
  rate_unit: 'per_night' | 'per_day' | 'per_session' | 'per_hour';
  is_active: boolean;
  created_at?: string;
}

export interface ServiceRecord {
  id: string;
  organization_id: string;
  client_id: string;
  pet_id: string;
  service_type_id: string;
  service_category: ServiceType['category'];
  check_in: string; // ISO date
  check_out?: string; // ISO date (null = still active)
  quantity: number; // nights, days, sessions, hours
  unit_rate: number; // rate at time of booking
  total_amount: number; // quantity * unit_rate
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
}

// --- Financial Dashboard Types ---

export interface FinancialInput {
  id: string;
  organization_id: string;
  month: string; // ISO Date "YYYY-MM-01"
  fixed_overhead: number;
  bank_balance: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RevenueRecord {
  id: string;
  organization_id: string;
  month: string;
  boarding_revenue: number;
  daycare_revenue: number;
  training_revenue: number;
  grooming_revenue: number;
  other_revenue: number;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollRecord {
  id: string;
  organization_id: string;
  month: string;
  total_payroll_cost: number;
  total_hours_worked: number;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialMonthData {
  inputs: FinancialInput | null;
  revenue: RevenueRecord | null;
  payroll: PayrollRecord | null;
}
