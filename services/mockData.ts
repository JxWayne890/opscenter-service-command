import { Organization, Profile, Shift, KnowledgeEntry, CommTemplate, TimeEntry, Availability, TimeOffRequest, ShiftSwap, Message } from '../types';

export const MOCK_ORG: Organization = {
  id: 'org_123',
  name: 'Alpine Veterinary Clinic',
  slug: 'alpine-vet',
  industry: 'Veterinary',
  settings: {
    week_start: 1, // Monday
    overtime_threshold: 40
  }
};

export const MOCK_USER: Profile = {
  id: 'user_456',
  organization_id: 'org_123',
  email: 'sarah@alpinevet.com',
  full_name: 'Dr. Sarah Jenkins',
  role: 'owner',
  avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  status: 'active',
  hourly_rate: 85.00
};

export const MOCK_STAFF: Profile[] = [
  MOCK_USER,
  {
    id: 'user_789',
    organization_id: 'org_123',
    email: 'mark@alpinevet.com',
    full_name: 'Mark Thompson',
    role: 'staff',
    avatar_url: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    status: 'active',
    hourly_rate: 22.50
  },
  {
    id: 'user_101',
    organization_id: 'org_123',
    email: 'jessica@alpinevet.com',
    full_name: 'Jessica Lee',
    role: 'staff',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    status: 'active',
    hourly_rate: 24.00
  },
  {
    id: 'user_202',
    organization_id: 'org_123',
    email: 'david@alpinevet.com',
    full_name: 'David Chen',
    role: 'manager',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    status: 'active',
    hourly_rate: 35.00
  }
];

// Shifts (Scheduled)
// Ensure timestamps are realistic relative to current time for demo
const NOW = new Date();
const TODAY_START = new Date(NOW.setHours(8, 0, 0, 0)).toISOString();
const TODAY_END = new Date(NOW.setHours(17, 0, 0, 0)).toISOString();
const TOMORROW_START = new Date(NOW.getTime() + 24 * 60 * 60 * 1000).toISOString();
const TOMORROW_END = new Date(new Date(TOMORROW_START).setHours(17, 0, 0, 0)).toISOString();

export const MOCK_SHIFTS: Shift[] = [
  {
    id: 'shift_1',
    organization_id: 'org_123',
    user_id: 'user_456',
    start_time: TODAY_START,
    end_time: TODAY_END,
    role_type: 'Lead Vet',
    status: 'published',
    is_open: false,
    notes: 'Surgery day',
    profile: MOCK_USER
  },
  {
    id: 'shift_2',
    organization_id: 'org_123',
    user_id: 'user_789',
    start_time: TODAY_START,
    end_time: TODAY_END,
    role_type: 'Vet Tech',
    status: 'published',
    is_open: false,
    profile: MOCK_STAFF[1]
  },
  {
    id: 'shift_3',
    organization_id: 'org_123',
    user_id: 'user_101',
    start_time: TOMORROW_START,
    end_time: TOMORROW_END,
    role_type: 'Reception',
    status: 'published',
    is_open: false,
    profile: MOCK_STAFF[2]
  },
  {
    id: 'shift_open_1',
    organization_id: 'org_123',
    start_time: TOMORROW_START,
    end_time: TOMORROW_END,
    role_type: 'Vet Tech',
    status: 'published',
    is_open: true,
    notes: 'Please pick up if available'
  }
];

// Time Entries (Actual)
export const MOCK_TIME_ENTRIES: TimeEntry[] = [
  {
    id: 'entry_1',
    organization_id: 'org_123',
    user_id: 'user_456',
    shift_id: 'shift_1',
    clock_in: new Date(new Date().setHours(7, 55, 0, 0)).toISOString(),
    total_break_minutes: 0,
    status: 'active',
    location_data: { lat: 34.0522, lng: -118.2437 }
  },
  {
    id: 'entry_2',
    organization_id: 'org_123',
    user_id: 'user_789',
    shift_id: 'shift_2',
    clock_in: new Date(new Date().setHours(8, 2, 0, 0)).toISOString(),
    total_break_minutes: 0,
    status: 'active'
  }
];

// Availability
export const MOCK_AVAILABILITY: Availability[] = [
  {
    id: 'avail_1',
    organization_id: 'org_123',
    user_id: 'user_789',
    day_of_week: 0, // Sunday
    is_unavailable: true
  },
  {
    id: 'avail_2',
    organization_id: 'org_123',
    user_id: 'user_789',
    day_of_week: 6, // Saturday
    is_unavailable: true
  }
];

// Requests
export const MOCK_REQUESTS: TimeOffRequest[] = [
  {
    id: 'req_1',
    organization_id: 'org_123',
    user_id: 'user_101',
    start_date: '2025-01-10',
    end_date: '2025-01-15',
    type: 'paid',
    reason: 'Family vacation',
    status: 'pending'
  }
];

export const MOCK_SWAPS: ShiftSwap[] = [
  {
    id: 'swap_1',
    organization_id: 'org_123',
    requester_id: 'user_789',
    shift_id: 'shift_2',
    status: 'pending'
  }
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg_1',
    organization_id: 'org_123',
    sender_id: 'user_202',
    group_id: 'all_staff',
    content: 'Welcome to the new scheduling system everyone!',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg_2',
    organization_id: 'org_123',
    sender_id: 'user_456',
    recipient_id: 'user_789',
    content: 'Can you cover the morning inputs tomorrow?',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

export const MOCK_KB: KnowledgeEntry[] = [
  {
    id: 'kb_1',
    organization_id: 'org_123',
    category: 'SOP',
    title: 'Emergency Intake Procedure',
    content_raw: '1. Stabilize the patient. 2. Notify the lead clinician. 3. Obtain emergency contact details...',
    tags: ['emergency', 'procedure']
  }
];

export const MOCK_TEMPLATES: CommTemplate[] = [
  {
    id: 'temp_1',
    organization_id: 'org_123',
    category: 'Aftercare',
    name: 'Post-Surgery Instructions',
    body: 'Dear client, your pet is recovering well...'
  }
];
