import { supabase } from './supabase';
import { Profile, Shift, StaffingRatio, Invitation, Organization, TimeEntry, PayStub } from '../types';

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

  async createShifts(shifts: Omit<Shift, 'created_at'>[]): Promise<Shift[]> {
    if (shifts.length === 0) return [];

    // Ensure all have org ID
    const shiftsWithOrg = shifts.map(s => ({
      ...s,
      organization_id: ORG_ID
    }));

    const { data, error } = await supabase
      .from('shifts')
      .insert(shiftsWithOrg)
      .select();

    if (error) {
      console.error('Error creating shifts (bulk):', error);
      return [];
    }
    return data || [];
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

  async deleteShiftsForUser(userId: string, fromDate?: string): Promise<boolean> {
    const start = fromDate || new Date().toISOString();
    console.log(`[DB] Deleting shifts for user ${userId} from ${start}`);

    // Using delete with filters
    const { count, error } = await supabase
      .from('shifts')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .gte('start_time', start);

    if (error) {
      console.error('[DB] Error deleting user shifts:', error);
      return false;
    }
    console.log(`[DB] Deleted ${count} shifts`);
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

  async deleteTimeEntry(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting time entry:', error);
      return false;
    }
    return true;
  },

  async deleteTimeEntries(ids: string[]): Promise<boolean> {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error deleting time entries:', error);
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

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<boolean> {
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating organization:', error);
      return false;
    }
    return true;
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
  },

  // ==================== PAY STUBS ====================
  async getPayStubs(periodStart?: string, periodEnd?: string): Promise<PayStub[]> {
    let query = supabase.from('pay_stubs').select('*').eq('organization_id', ORG_ID);
    if (periodStart) query = query.gte('period_start', periodStart);
    if (periodEnd) query = query.lte('period_end', periodEnd);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching pay stubs:', error);
      return [];
    }
    return data as PayStub[];
  },

  async createPayStub(payStub: Partial<PayStub>): Promise<{ data: PayStub | null; error: string | null }> {
    console.log('[DB] Upserting pay stub:', payStub);

    // Ensure organization_id is set to prevent RLS failures
    if (!payStub.organization_id) {
      payStub.organization_id = ORG_ID;
    }

    const { data, error } = await supabase
      .from('pay_stubs')
      .upsert(payStub as any, {
        onConflict: 'user_id,period_start,period_end',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('[DB] Upsert Failure:', error);
      return { data: null, error: `${error.message} (${error.code})` };
    }
    return { data: data as PayStub, error: null };
  },

  async updatePayStubStatus(id: string, status: 'draft' | 'approved' | 'released', released_at?: string, approved_by?: string): Promise<{ success: boolean; error: string | null }> {
    const updates: any = { status };
    if (released_at) updates.released_at = released_at;
    if (approved_by) updates.approved_by = approved_by;

    const { error } = await supabase.from('pay_stubs').update(updates).eq('id', id);
    if (error) {
      console.error('[DB] Status Update Failure:', error);
      return { success: false, error: `${error.message} (${error.code})` };
    }
    return { success: true, error: null };
  }
};
