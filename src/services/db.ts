import { supabase } from './supabase';
import { Profile, Shift, StaffingRatio, Invitation, Organization, TimeEntry, PayStub, Message, Client, Pet, KnowledgeEntry } from '../types';
import { parsePhoneNumber } from '../utils/formatters';

// Organization ID for the demo
const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export { supabase }; // Updated export for use in other files

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

  async getProfileById(userId: string): Promise<Profile | null> {
    const supabaseUrl = (supabase as any).supabaseUrl;
    const supabaseKey = (supabase as any).supabaseKey;

    const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[Auth] Profile fetch error:', response.statusText);
        return null;
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return data[0] as Profile;
      }
      return null;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('[Auth] Profile fetch timed out');
      } else {
        console.error('[Auth] Profile fetch error:', err);
      }
      return null;
    }
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

  async createProfiles(profiles: Omit<Profile, 'created_at' | 'updated_at'>[]): Promise<Profile[]> {
    console.log(`Bulk creating ${profiles.length} profiles...`);
    const profilesWithOrg = profiles.map(p => ({
      ...p,
      organization_id: p.organization_id || ORG_ID,
      status: p.status || 'active',
      hourly_rate: p.hourly_rate || 0
    }));

    const { data, error } = await supabase
      .from('profiles')
      .insert(profilesWithOrg)
      .select();

    if (error) {
      console.error('Error creating profiles (bulk):', error.message);
      return [];
    }
    return data || [];
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
    console.log('[DB] Creating shift:', shift);

    // Clean the object: Remove 'profile' as it's not a DB column
    const { profile, ...cleanShift } = shift as any;

    const { data, error } = await supabase
      .from('shifts')
      .insert([{
        ...cleanShift,
        organization_id: cleanShift.organization_id || ORG_ID
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating shift:', error.message);
      return null;
    }
    return data;
  },

  async createShifts(shifts: Omit<Shift, 'created_at'>[]): Promise<Shift[]> {
    if (shifts.length === 0) return [];

    // Ensure all have org ID and no extra fields
    const shiftsWithOrg = shifts.map(s => {
      const { profile, ...clean } = s as any;
      return {
        ...clean,
        organization_id: clean.organization_id || ORG_ID
      };
    });

    const { data, error } = await supabase
      .from('shifts')
      .insert(shiftsWithOrg)
      .select();

    if (error) {
      console.error('Error creating shifts (bulk):', error.message);
      return [];
    }
    return data || [];
  },

  async updateShift(id: string, updates: Partial<Shift>): Promise<boolean> {
    console.log('[DB] Updating shift:', id, updates);

    // Clean the object: Remove 'profile' as it's not a DB column
    const { profile, ...cleanUpdates } = updates as any;

    const { error } = await supabase
      .from('shifts')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating shift:', error.message);
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

  async createTimeEntries(entries: Omit<TimeEntry, 'id'>[]): Promise<TimeEntry[]> {
    if (entries.length === 0) return [];
    console.log(`Bulk creating ${entries.length} time entries...`);

    const entriesWithOrg = entries.map(e => ({
      ...e,
      id: (e as any).id || crypto.randomUUID(),
      organization_id: e.organization_id || ORG_ID
    }));

    const { data, error } = await supabase
      .from('time_entries')
      .insert(entriesWithOrg)
      .select();

    if (error) {
      console.error('Error creating time entries (bulk):', error.message);
      return [];
    }
    return data || [];
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

  async getKnowledgeEntries(): Promise<KnowledgeEntry[]> {
    console.log('Fetching knowledge entries from Supabase...');
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge entries:', error);
      return [];
    }

    return data || [];
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
    const payload = {
      ...payStub,
      organization_id: payStub.organization_id || ORG_ID,
    };

    const { data, error } = await supabase
      .from('pay_stubs')
      .upsert(payload as any, {
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
  },

  // ==================== MESSAGES ====================
  async getMessages(): Promise<Message[]> {
    console.log('Fetching messages from Supabase...');
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    return data || [];
  },

  async sendMessage(message: Message): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }
    return data;
  },

  async deleteMessage(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting message:', error);
      return false;
    }
    return true;
  },

  async deleteConversation(targetUserId: string): Promise<boolean> {
    // Note: This relies on group_id being set to the OTHER user's ID in 1:1 chats
    // OR strictly relying on sender/recipient pairs.
    // Given CommsHub uses group_id = activeUserId, we will try to delete via group_id first.

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('group_id', targetUserId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
    return true;
  },

  // ==================== CLIENTS & PETS ====================
  async getClients(): Promise<Client[]> {
    console.log('Fetching clients from Supabase...');
    const { data, error } = await supabase
      .from('clients')
      .select('*, pets(*)')
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
    return data || [];
  },

  async createClient(client: Client, pets: Pet[]): Promise<Client | null> {
    console.log('Creating client and pets in Supabase:', client.full_name);

    // 1. Create the client first
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert([{
        organization_id: ORG_ID,
        full_name: client.full_name,
        email: client.email,
        phone_primary: parsePhoneNumber(client.phone_primary),
        phone_secondary: client.phone_secondary ? parsePhoneNumber(client.phone_secondary) : null,
        address: client.address,
        city: client.city,
        state: client.state,
        zip: client.zip,
        access_code: client.access_code,
        notes: client.notes,
        emergency_contact_name: client.emergency_contact_name,
        emergency_contact_phone: client.emergency_contact_phone ? parsePhoneNumber(client.emergency_contact_phone) : null,
        vet_clinic_name: client.vet_clinic_name,
        vet_clinic_phone: client.vet_clinic_phone ? parsePhoneNumber(client.vet_clinic_phone) : null,
        status: client.status || 'active'
      }])
      .select()
      .single();

    if (clientError || !clientData) {
      console.error('Error creating client:', clientError);
      return null;
    }

    // 2. Create the pets linked to this client
    if (pets.length > 0) {
      const petsWithIds = pets.map(p => ({
        client_id: clientData.id,
        organization_id: ORG_ID,
        name: p.name,
        breed: p.breed,
        gender: p.gender,
        is_spayed_neutered: p.is_spayed_neutered,
        age: p.age,
        weight: p.weight,
        medical_alerts: p.medical_alerts || [],
        behavior_tags: p.behavior_tags || [],
        dietary_restrictions: p.dietary_restrictions || [],
        feeding_instructions: p.feeding_instructions,
        medication_instructions: p.medication_instructions,
        behavior_notes: p.behavior_notes,
        avatar_url: p.avatar_url,
        status: p.status || 'active'
      }));

      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .insert(petsWithIds)
        .select();

      if (petsError) {
        console.error('Error creating pets:', petsError);
        // We still return the client since it was created
      } else {
        clientData.pets = petsData;
      }
    }

    return clientData;
  },

  async updateClient(client: Client, pets: Pet[]): Promise<Client | null> {
    console.log('Updating client and pets in Supabase:', client.full_name);

    // 1. Update the client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .update({
        full_name: client.full_name,
        email: client.email,
        phone_primary: parsePhoneNumber(client.phone_primary),
        phone_secondary: client.phone_secondary ? parsePhoneNumber(client.phone_secondary) : null,
        address: client.address,
        city: client.city,
        state: client.state,
        zip: client.zip,
        access_code: client.access_code,
        notes: client.notes,
        emergency_contact_name: client.emergency_contact_name,
        emergency_contact_phone: client.emergency_contact_phone ? parsePhoneNumber(client.emergency_contact_phone) : null,
        vet_clinic_name: client.vet_clinic_name,
        vet_clinic_phone: client.vet_clinic_phone ? parsePhoneNumber(client.vet_clinic_phone) : null,
        status: client.status || 'active'
      })
      .eq('id', client.id)
      .select()
      .single();

    if (clientError || !clientData) {
      console.error('Error updating client:', clientError);
      return null;
    }

    // 2. Handle Pets (Simple approach: delete and re-insert for this demo, 
    // or upsert if IDs are valid. Since IDs might be temp, we handle carefully)
    const petsToInsert = pets.map(p => ({
      id: p.id?.startsWith('temp') || p.id?.startsWith('p-') ? undefined : p.id,
      client_id: clientData.id,
      organization_id: ORG_ID,
      name: p.name,
      breed: p.breed,
      gender: p.gender,
      is_spayed_neutered: p.is_spayed_neutered,
      age: p.age,
      weight: p.weight,
      medical_alerts: p.medical_alerts || [],
      behavior_tags: p.behavior_tags || [],
      dietary_restrictions: p.dietary_restrictions || [],
      feeding_instructions: p.feeding_instructions,
      medication_instructions: p.medication_instructions,
      behavior_notes: p.behavior_notes,
      avatar_url: p.avatar_url,
      status: p.status || 'active'
    }));

    // For simplicity in this demo, we'll upsert based on ID if present, else insert
    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .upsert(petsToInsert)
      .select();

    if (petsError) {
      console.error('Error updating pets:', petsError);
    } else {
      clientData.pets = petsData;
    }

    return clientData;
  },

  async deleteClient(id: string): Promise<boolean> {
    console.log('Deleting client from Supabase:', id);
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      return false;
    }
    return true;
  },

  async deleteClientsBulk(ids: string[]): Promise<boolean> {
    console.log('Bulk deleting clients from Supabase:', ids);
    const { error } = await supabase
      .from('clients')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error bulk deleting clients:', error);
      return false;
    }
    return true;
  },

  // ==================== PET ASSIGNMENTS ====================
  async getPetAssignments(): Promise<{ id: string, pet_id: string, staff_id: string }[]> {
    console.log('Fetching pet assignments...');
    const { data, error } = await supabase
      .from('pet_assignments')
      .select('*')
      .eq('organization_id', ORG_ID);

    if (error) {
      console.error('Error fetching pet assignments:', error);
      return [];
    }
    return data || [];
  },

  async assignPet(petId: string, staffId: string, assignedBy?: string): Promise<boolean> {
    console.log(`Assigning pet ${petId} to staff ${staffId}`);
    const { error } = await supabase
      .from('pet_assignments')
      .insert([{
        pet_id: petId,
        staff_id: staffId,
        assigned_by: assignedBy
      }]);

    if (error) {
      // Ignore unique constraint violation (already assigned)
      if (error.code === '23505') return true;
      console.error('Error assigning pet:', error);
      return false;
    }
    return true;
  },

  async unassignPet(petId: string, staffId: string): Promise<boolean> {
    console.log(`Unassigning pet ${petId} from staff ${staffId}`);
    const { error } = await supabase
      .from('pet_assignments')
      .delete()
      .match({ pet_id: petId, staff_id: staffId });

    if (error) {
      console.error('Error unassigning pet:', error);
      return false;
    }
    return true;
  },

  async bulkAssignPets(petIds: string[], staffId: string, assignedBy?: string): Promise<boolean> {
    if (petIds.length === 0) return true;
    console.log(`Bulk assigning ${petIds.length} pets to staff ${staffId}`);

    const assignments = petIds.map(petId => ({
      pet_id: petId,
      staff_id: staffId,
      assigned_by: assignedBy
    }));

    const { error } = await supabase
      .from('pet_assignments')
      .upsert(assignments, { onConflict: 'pet_id,staff_id', ignoreDuplicates: true });

    if (error) {
      console.error('Error bulk assigning pets:', error);
      return false;
    }
    return true;
  }
};
