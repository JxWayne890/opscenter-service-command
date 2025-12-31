// --- Types based on Schema Parity ---

export type UserRole = 'owner' | 'manager' | 'staff';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string;
  settings?: Record<string, any>;
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
}

export interface Shift {
  id: string;
  organization_id: string;
  user_id?: string; // Nullable for Open Shifts
  start_time: string;
  end_time: string;
  role_type: string;
  status: 'active' | 'published' | 'draft';
  is_open: boolean;
  notes?: string;

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

// --- View Types ---
export type ViewType = 'pulse' | 'roster' | 'knowledge' | 'comms' | 'settings' | 'schedule' | 'requests' | 'timeclock';
