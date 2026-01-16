import { supabase } from './supabase';
import { Profile, Shift, StaffingRatio, Invitation, Organization, TimeEntry } from '../types';

// Organization ID for the demo
const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export const SupabaseService = {
  // ==================== PROFILES ====================
  async getProfiles(): Promise<Profile[]> {
    console.log('Fetching profiles from Supabase...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', ORG_ID);

    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
    console.log('Profiles fetched:', data?.length || 0);
    return data || [];
  },

  async createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile | null> {
    console.log('Creating profile in Supabase:', profile.full_name);

    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        id: profile.id,
        organization_id: ORG_ID,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        status: profile.status || 'active',
        hourly_rate: profile.hourly_rate || 0,
        avatar_url: profile.avatar_url
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error.message, error.details, error.hint);
      return null;
    }
    console.log('Profile created successfully:', data);
    return data;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }
    return true;
  },

  // ==================== SHIFTS ====================
  async getShifts(): Promise<Shift[]> {
    console.log('Fetching shifts from Supabase...');
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', ORG_ID);

    if (error) {
      console.error('Error fetching shifts:', error);
      return [];
    }
    console.log('Shifts fetched:', data?.length || 0);
    return data || [];
  },

  async createShift(shift: Omit<Shift, 'created_at'>): Promise<Shift | null> {
    const { data, error } = await supabase
      .from('shifts')
      .insert([{
        ...shift,
        organization_id: ORG_ID
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating shift:', error);
      return null;
    }
    return data;
  },

  async updateShift(id: string, updates: Partial<Shift>): Promise<boolean> {
    const { error } = await supabase
      .from('shifts')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating shift:', error);
      return false;
    }
    return true;
  },

  async deleteShift(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting shift:', error);
      return false;
    }
    return true;
  },

  async deleteShifts(ids: string[]): Promise<boolean> {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error deleting shifts:', error);
      return false;
    }
    return true;
  },

  // ==================== STAFFING RATIOS ====================
  async getRatios(): Promise<StaffingRatio[]> {
    const { data, error } = await supabase
      .from('staffing_ratios')
      .select('*')
      .eq('organization_id', ORG_ID);

    if (error) {
      console.error('Error fetching ratios:', error);
      return [];
    }
    return data || [];
  },

  async getTimeEntries(): Promise<TimeEntry[]> {
    console.log('Fetching time entries for organization:', ORG_ID);
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('clock_in', { ascending: false });

    if (error) {
      console.error('Error fetching time entries:', error);
      return [];
    }
    return data || [];
  },

  async createTimeEntry(entry: TimeEntry): Promise<TimeEntry | null> {
    const { data, error } = await supabase
      .from('time_entries')
      .insert([entry])
      .select()
      .single();

    if (error) {
      console.error('Error creating time entry:', error);
      return null;
    }
    return data;
  },

  async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<boolean> {
    const { error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating time entry:', error);
      return false;
    }
    return true;
  },

  // ==================== ORGANIZATION ====================
  async getOrganization(): Promise<Organization | null> {
    console.log('Fetching organization with ID:', ORG_ID);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', ORG_ID)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return null;
    }
    console.log('Organization fetched:', data);
    console.log('Invite code:', data?.invite_code);
    return data;
  },

  // ==================== INVITATIONS ====================
  async createInvitation(email: string, role: 'manager' | 'staff'): Promise<Invitation | null> {
    console.log('Creating invitation for:', email, 'as', role);

    const { data, error } = await supabase
      .from('invitations')
      .insert([{
        organization_id: ORG_ID,
        email,
        role,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return null;
    }
    console.log('Invitation created:', data);
    return data;
  },

  async getInvitations(): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', ORG_ID)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }
    return data || [];
  },

  async getInvitationByCode(inviteCode: string): Promise<{ invitation: Invitation; organization: Organization } | null> {
    // First find organization by invite code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (orgError || !org) {
      console.error('Invalid invite code:', inviteCode);
      return null;
    }

    return { invitation: null as any, organization: org };
  },

  async acceptInvitation(invitationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    if (error) {
      console.error('Error accepting invitation:', error);
      return false;
    }
    return true;
  }
};
