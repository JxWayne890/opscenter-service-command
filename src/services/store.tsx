import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Shift, TimeEntry, Availability, TimeOffRequest, ShiftSwap, Message, KnowledgeEntry, CommTemplate, Profile, StaffingRatio, PayStub, Organization, Client, Pet } from '../types';
import { SupabaseService } from './db';
import { AuthService } from './supabase';
import { DEFAULT_KNOWLEDGE_ENTRIES, filterKnowledgeEntries, mergeKnowledgeEntries } from './knowledge';

// ==================== CONTEXT TYPE ====================
interface OpsCenterContextType {
    // Data
    shifts: Shift[];
    timeEntries: TimeEntry[];
    availability: Availability[];
    requests: TimeOffRequest[];
    swaps: ShiftSwap[];
    messages: Message[];
    knowledgeBase: KnowledgeEntry[];
    templates: CommTemplate[];
    ratios: StaffingRatio[];
    currentUser: Profile | null;
    staff: Profile[];
    payStubs: PayStub[];
    organization: Organization | null;
    pendingInvites: Profile[]; // Restored to match implementation usage if needed
    clients: Client[];

    // UI State
    isInviteModalOpen: boolean;
    setInviteModalOpen: (open: boolean) => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    navigatedUser: string | null;
    setNavigatedUser: (id: string | null) => void;

    // Computed
    activeTimeEntry: TimeEntry | null;
    isClockedIn: boolean;

    // Actions
    publishSchedule: () => Promise<void>;
    updateShift: (shiftId: string, data: Partial<Shift>) => Promise<void>;
    createShift: (shift: Shift) => Promise<void>;
    deleteShift: (shiftId: string) => Promise<void>;
    deleteShifts: (shiftIds: string[]) => Promise<void>;
    deleteTimeEntries: (ids: string[]) => Promise<void>;
    createPayStub: (stub: Partial<PayStub>) => Promise<{ success: boolean; error: string | null }>;
    updatePayStubStatus: (id: string, status: 'draft' | 'approved' | 'released') => Promise<{ success: boolean; error: string | null }>;
    clearUserSchedule: (userId: string) => Promise<void>;
    generateShiftsFromPattern: (userId: string, config: any, weeksAhead?: number, fromDate?: Date) => Promise<void>;
    clockIn: (location?: any) => Promise<void>;
    clockOut: () => Promise<void>;
    updateTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<void>;
    submitTimeOff: (req: TimeOffRequest) => Promise<void>;
    offerShift: (swap: ShiftSwap) => Promise<void>;
    sendMessage: (msg: Message) => Promise<void>;
    deleteMessage: (id: string) => Promise<void>;
    deleteConversation: (groupId: string) => Promise<void>;
    addStaff: (profile: Profile) => Promise<void>;
    updateStaff: (id: string, updates: Partial<Profile>) => Promise<void>;
    updateOrganizationSettings: (updates: Partial<Organization>) => Promise<void>;
    inviteStaff: (email: string, role: string) => Promise<void>;
    addClient: (client: Client) => void;
    deleteClient: (id: string) => Promise<void>;
    deleteClientsBulk: (ids: string[]) => Promise<void>;
    searchKnowledge: (query: string) => KnowledgeEntry[];
    approveShifts: (shiftIds: string[]) => Promise<void>;
    forceClockOut: (shiftId: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
    signUp: (email: string, password: string, fullName: string, orgId: string, role: 'staff' | 'manager') => Promise<{ success: boolean; error: string | null }>;
    logout: () => Promise<void>;
    refreshData: () => Promise<void>;
    fetchPayStubs: (start: string, end: string) => Promise<void>;
    startBreak: () => Promise<void>;
    endBreak: () => Promise<void>;
    addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<void>;
    bulkRestoreStaff: (restorations: any[]) => Promise<void>;
    authLoading: boolean;
    hasMissingProfile: boolean;

    // assignments
    assignments: { id: string, pet_id: string, staff_id: string }[];
    assignPet: (petId: string, staffId: string) => Promise<void>;
    unassignPet: (petId: string, staffId: string) => Promise<void>;
    bulkAssignPets: (petIds: string[], staffId: string) => Promise<void>;
}

const OpsCenterContext = createContext<OpsCenterContextType | undefined>(undefined);

// Demo organization ID - matches complete_setup.sql
const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// Default user (before login)
const DEFAULT_USER: Profile = {
    id: 'd0c2c1e8-76a0-4c4f-9e79-5e7b57855680',
    organization_id: ORG_ID,
    email: 'sarah@adogs.world',
    full_name: 'Sarah Jenkins',
    role: 'owner',
    status: 'active',
    hourly_rate: 45
};

const MOCK_CLIENTS: Client[] = [
    {
        id: 'c1',
        organization_id: 'org1',
        full_name: 'Sarah Jenkins',
        email: 'sarah.j@example.com',
        phone_primary: '(555) 123-4567',
        address: '123 Maple Ave',
        city: 'Springfield',
        state: 'IL',
        zip: '62704',
        emergency_contact_name: 'Mike Jenkins',
        emergency_contact_phone: '(555) 987-6543',
        status: 'active',
        created_at: '2023-01-15T10:00:00Z',
        pets: [
            {
                id: 'p1',
                client_id: 'c1',
                organization_id: 'org1',
                name: 'Cooper',
                breed: 'Golden Retriever',
                gender: 'male',
                is_spayed_neutered: true,
                age: 3,
                weight: 65,
                medical_alerts: ['Hip Dysplasia'],
                dietary_restrictions: ['Chicken Allergy'],
                behavior_tags: ['Friendly', 'High Energy'],
                status: 'active',
                avatar_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80'
            },
            {
                id: 'p2',
                client_id: 'c1',
                organization_id: 'org1',
                name: 'Luna',
                breed: 'French Bulldog',
                gender: 'female',
                is_spayed_neutered: true,
                age: 2,
                weight: 24,
                status: 'active',
                avatar_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=150&q=80'
            }
        ]
    },
    {
        id: 'c2',
        organization_id: 'org1',
        full_name: 'Robert Chen',
        email: 'r.chen@tech.co',
        phone_primary: '(555) 555-0199',
        address: '450 Oak St, Apt 4B',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        status: 'active',
        created_at: '2023-03-20T14:30:00Z',
        pets: [
            {
                id: 'p3',
                client_id: 'c2',
                organization_id: 'org1',
                name: 'Max',
                breed: 'German Shepherd',
                gender: 'male',
                is_spayed_neutered: true,
                age: 5,
                weight: 85,
                behavior_tags: ['Protective', 'Ball Obsessed'],
                status: 'active',
                avatar_url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?auto=format&fit=crop&w=150&q=80'
            }
        ]
    },
    {
        id: 'c3',
        organization_id: 'org1',
        full_name: 'Emily Davis',
        email: 'emily.d@canvas.net',
        phone_primary: '(555) 246-8135',
        status: 'inactive',
        created_at: '2022-11-05T09:15:00Z',
        pets: [
            {
                id: 'p4',
                client_id: 'c3',
                organization_id: 'org1',
                name: 'Bella',
                breed: 'Poodle Mix',
                gender: 'female',
                is_spayed_neutered: true,
                age: 8,
                status: 'active',
                medical_alerts: ['Diabetic - Insulin Required'],
                avatar_url: 'https://images.unsplash.com/photo-1591769225440-811ad7d6eca6?auto=format&fit=crop&w=150&q=80'
            }
        ]
    }
];

export const OpsCenterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // ==================== STATE ====================
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [staff, setStaff] = useState<Profile[]>([]);
    const [ratios, setRatios] = useState<StaffingRatio[]>([]);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntry[]>(DEFAULT_KNOWLEDGE_ENTRIES);
    const [templates, setTemplates] = useState<CommTemplate[]>([]);
    const [currentUser, setCurrentUser] = useState<Profile | null>(null);
    const [pendingInvites, setPendingInvites] = useState<Profile[]>([]);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [hasMissingProfile, setHasMissingProfile] = useState(false);
    const [navigatedUser, setNavigatedUser] = useState<string | null>(null);
    const [payStubs, setPayStubs] = useState<PayStub[]>([]);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [assignments, setAssignments] = useState<{ id: string, pet_id: string, staff_id: string }[]>([]);

    // Ref to track auth state for use in callbacks (avoids stale closure)
    const isAuthenticatedRef = useRef(false);

    // ==================== DATA LOADING ====================
    const refreshData = async (silent = false) => {
        if (!silent) {
            console.log('=== REFRESHING DATA FROM SUPABASE ===');
            setIsLoading(true);
        } else {
            console.log('=== SILENT REFRESH FROM SUPABASE ===');
        }

        try {
            const [fetchedStaff, fetchedShifts, fetchedRatios, fetchedTimeEntries, fetchedOrg, fetchedMessages, fetchedClients, fetchedKnowledge] = await Promise.all([
                SupabaseService.getProfiles(),
                SupabaseService.getShifts(),
                SupabaseService.getRatios(),
                SupabaseService.getTimeEntries(),
                SupabaseService.getOrganization(),
                SupabaseService.getMessages(),
                SupabaseService.getClients(),
                SupabaseService.getKnowledgeEntries()
            ]);

            setStaff(fetchedStaff);
            setShifts(fetchedShifts);
            setRatios(fetchedRatios);
            setTimeEntries(fetchedTimeEntries);
            setOrganization(fetchedOrg);
            setMessages(fetchedMessages);
            setClients(fetchedClients.length > 0 ? fetchedClients : MOCK_CLIENTS);
            setKnowledgeBase(mergeKnowledgeEntries(fetchedKnowledge));

            // fetch assignments
            const fetchedAssignments = await SupabaseService.getPetAssignments();
            setAssignments(fetchedAssignments);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // Listen to Supabase Auth state changes
    useEffect(() => {
        let isMounted = true;

        // Helper function to load the user profile with retries
        const loadUserProfile = async (userId: string, email: string, retries = 2, silent = false) => {
            try {
                if (!silent) {
                    console.log(`[Auth] Fetching user profile (attempt ${3 - retries}/2)...`);
                }

                const userProfile = await SupabaseService.getProfileById(userId);

                if (isMounted) {
                    if (userProfile) {
                        if (!silent) console.log('[Auth] Profile found:', userProfile.full_name);
                        setCurrentUser(userProfile);
                        setIsAuthenticated(true);
                        isAuthenticatedRef.current = true;
                        setHasMissingProfile(false);
                        // Show the dashboard IMMEDIATELY, load data in background
                        setAuthLoading(false);
                        refreshData(silent);
                        return true;
                    } else if (retries > 0) {
                        console.warn(`[Auth] Profile not found for ${email}, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 500));
                        return loadUserProfile(userId, email, retries - 1, silent);
                    } else {
                        console.error('[Auth] No profile found after retries for user:', email);
                        setHasMissingProfile(true);
                        setIsAuthenticated(false);
                        isAuthenticatedRef.current = false;
                        setAuthLoading(false);
                        return false;
                    }
                }
            } catch (error) {
                console.error('[Auth] Error fetching profile:', error);
                if (isMounted) {
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        return loadUserProfile(userId, email, retries - 1, silent);
                    } else {
                        setHasMissingProfile(true);
                        setIsAuthenticated(false);
                        isAuthenticatedRef.current = false;
                        setAuthLoading(false);
                    }
                }
            }
        };

        // Step 1: Check for existing session IMMEDIATELY on mount
        const initializeAuth = async () => {
            try {
                console.log('[Auth] Checking for existing session...');
                const session = await AuthService.getSession();

                if (session?.user) {
                    console.log('[Auth] Found existing session for:', session.user.email);
                    await loadUserProfile(session.user.id, session.user.email || '');
                } else {
                    console.log('[Auth] No existing session, showing login');
                    if (isMounted) {
                        setAuthLoading(false);
                    }
                }
            } catch (error) {
                console.error('[Auth] Failed to initialize auth:', error);
                if (isMounted) {
                    setAuthLoading(false);
                }
            }
        };

        // Safety timeout: if auth takes longer than 5s, force loading to end
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                console.warn('[Auth] Safety timeout reached — forcing authLoading to false');
                setAuthLoading(false);
            }
        }, 5000);

        initializeAuth().finally(() => {
            clearTimeout(safetyTimeout);
        });

        // Step 2: Subscribe to FUTURE auth changes (sign in, sign out, token refresh)
        const { data: { subscription } } = AuthService.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);

            // Skip INITIAL_SESSION since we already handled it above
            if (event === 'INITIAL_SESSION') {
                return;
            }

            if (event === 'SIGNED_IN' && session?.user) {
                // Use ref to check if already authenticated (avoids stale closure)
                const isSilent = isAuthenticatedRef.current;
                if (!isSilent) {
                    setAuthLoading(true);
                }
                await loadUserProfile(session.user.id, session.user.email || '', 3, isSilent);
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                if (isMounted) {
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                    isAuthenticatedRef.current = false;
                    setHasMissingProfile(false);
                    setStaff([]);
                    setShifts([]);
                    setAuthLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Load remaining data when authenticated
    useEffect(() => {
        // Only refresh if authenticated AND we don't have staff data yet
        // This prevents double-calling refreshData when loadUserProfile just did it
        if (isAuthenticated && staff.length === 0) {
            refreshData();
        }
    }, [isAuthenticated, staff.length]);

    // ==================== AUTH ====================
    const signIn = async (email: string, password: string): Promise<{ success: boolean; error: string | null }> => {
        const { user, error } = await AuthService.signIn(email, password);
        if (error || !user) {
            return { success: false, error: error || 'Failed to sign in' };
        }
        // Profile will be set by the auth state change listener
        return { success: true, error: null };
    };

    const signUp = async (
        email: string,
        password: string,
        fullName: string,
        orgId: string,
        role: 'staff' | 'manager'
    ): Promise<{ success: boolean; error: string | null }> => {
        // Create Supabase Auth user
        const { user, error } = await AuthService.signUp(email, password, { full_name: fullName });
        if (error || !user) {
            return { success: false, error: error || 'Failed to create account' };
        }

        // Create profile linked to the auth user
        const profile = await SupabaseService.createProfile({
            id: user.id, // Link profile to auth user
            organization_id: orgId,
            email,
            full_name: fullName,
            role,
            status: 'active'
        });

        if (!profile) {
            return { success: false, error: 'Account created but failed to create profile' };
        }

        return { success: true, error: null };
    };

    const logout = async () => {
        await AuthService.signOut();
        // State will be cleared by the auth state change listener
    };

    // ==================== COMPUTED ====================
    const activeTimeEntry = currentUser ? timeEntries.find(te =>
        te.user_id === currentUser.id && te.status === 'active' && !te.clock_out
    ) || null : null;
    const isClockedIn = !!activeTimeEntry;

    // ==================== STAFF ACTIONS ====================
    const addClient = async (client: Client) => {
        console.log('=== SAVING CLIENT ===', client);
        const pets = client.pets || [];

        // Determine if this is an update or create
        // Mock IDs start with 'c' or 'local-'
        const isUpdate = client.id && !client.id.startsWith('c') && !client.id.startsWith('local-');

        const savedClient = isUpdate
            ? await SupabaseService.updateClient(client, pets)
            : await SupabaseService.createClient(client, pets);

        if (savedClient) {
            setClients(prev => {
                const filtered = prev.filter(c => c.id !== savedClient.id);
                return [savedClient, ...filtered];
            });
        } else {
            setClients(prev => {
                const filtered = prev.filter(c => c.id !== client.id);
                return [{ ...client, id: client.id || `local-${Date.now()}` }, ...filtered];
            });
        }
    };

    const deleteClient = async (id: string) => {
        console.log('=== DELETING CLIENT ===', id);
        const success = await SupabaseService.deleteClient(id);
        if (success) {
            setClients(prev => prev.filter(c => c.id !== id));
        } else {
            console.error('Failed to delete client');
        }
    };

    const deleteClientsBulk = async (ids: string[]) => {
        console.log('=== BULK DELETING CLIENTS ===', ids);
        const success = await SupabaseService.deleteClientsBulk(ids);
        if (success) {
            setClients(prev => prev.filter(c => !ids.includes(c.id)));
        } else {
            console.error('Failed to bulk delete clients');
        }
    };

    const addStaff = async (profile: Profile) => {
        console.log('=== ADDING STAFF ===', profile);

        // Save to Supabase first
        const created = await SupabaseService.createProfile(profile);

        if (created) {
            // Update local state with the created record
            setStaff(prev => [...prev, created]);
            console.log('Staff added successfully!');
        } else {
            console.error('Failed to add staff to database');
            alert('Failed to save to database. Check console for errors.');
        }
    };

    const updateStaff = async (id: string, updates: Partial<Profile>) => {
        const success = await SupabaseService.updateProfile(id, updates);
        if (success) {
            setStaff(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        }
    };

    const updateOrganizationSettings = async (updates: Partial<Organization>) => {
        if (!organization) return;
        const success = await SupabaseService.updateOrganization(organization.id, updates);
        if (success) {
            setOrganization(prev => prev ? { ...prev, ...updates } : null);
        }
    };

    const inviteStaff = async (email: string, role: string) => {
        const newProfile: Profile = {
            id: crypto.randomUUID(),
            organization_id: ORG_ID,
            email,
            full_name: email.split('@')[0],
            role: role as any,
            status: 'pending'
        };
        await addStaff(newProfile);
    };

    // ==================== SHIFT ACTIONS ====================
    const createShift = async (shift: Shift) => {
        const created = await SupabaseService.createShift(shift);
        if (created) {
            setShifts(prev => [...prev, created]);
        }
    };

    const updateShift = async (id: string, data: Partial<Shift>) => {
        const success = await SupabaseService.updateShift(id, data);
        if (success) {
            setShifts(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
        }
    };

    const deleteShift = async (shiftId: string) => {
        const success = await SupabaseService.deleteShift(shiftId);
        if (success) {
            setShifts(prev => prev.filter(s => s.id !== shiftId));
        }
    };

    const deleteShifts = async (shiftIds: string[]) => {
        const success = await SupabaseService.deleteShifts(shiftIds);
        if (success) {
            setShifts(prev => prev.filter(s => !shiftIds.includes(s.id)));
        }
    };

    const clearUserSchedule = async (userId: string) => {
        const today = new Date().toISOString();
        const success = await SupabaseService.deleteShiftsForUser(userId, today);
        if (success) {
            // Remove future shifts from local state
            setShifts(prev => prev.filter(s =>
                !(s.user_id === userId && new Date(s.start_time) >= new Date(today))
            ));
        }
    };

    // Generate shifts from a schedule pattern (fixed weekly or rotating)
    // fromDate: optional start date for generation (used when extending an existing schedule)
    const generateShiftsFromPattern = async (userId: string, config: any, weeksAhead: number = 4, fromDate?: Date) => {
        if (!config) return;

        const { shift_start_time, shift_end_time } = config;

        // Parse shift times (default to 9:00 and 17:00)
        const [startHour, startMin] = (shift_start_time || '09:00').split(':').map(Number);
        const [endHour, endMin] = (shift_end_time || '17:00').split(':').map(Number);

        const newShifts: Shift[] = [];

        // Use provided fromDate or default to today
        const startDate = fromDate ? new Date(fromDate) : new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (weeksAhead * 7));

        let currentDate = new Date(startDate);

        if (config.type === 'fixed') {
            // Fixed Weekly Pattern - use fixed_days array (0 = Sunday, 1 = Monday, etc.)
            const workDays = config.fixed_days || [1, 2, 3, 4, 5]; // Default M-F

            while (currentDate <= endDate) {
                const dayOfWeek = currentDate.getDay();

                if (workDays.includes(dayOfWeek)) {
                    const shiftStart = new Date(currentDate);
                    shiftStart.setHours(startHour, startMin, 0, 0);
                    const shiftEnd = new Date(currentDate);
                    shiftEnd.setHours(endHour, endMin, 0, 0);

                    newShifts.push({
                        id: crypto.randomUUID(),
                        organization_id: ORG_ID,
                        user_id: userId,
                        start_time: shiftStart.toISOString(),
                        end_time: shiftEnd.toISOString(),
                        role_type: 'Staff',
                        status: 'published',
                        is_open: false
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            console.log(`Generated ${newShifts.length} fixed weekly shifts for days: ${workDays.join(', ')} `);

        } else if (config.type === 'rotating') {
            // Rotating Pattern (e.g., 4 on / 4 off)
            const { days_on, days_off, anchor_date } = config;
            const cycleLength = days_on + days_off;
            const anchorStart = new Date(anchor_date || new Date());
            anchorStart.setHours(0, 0, 0, 0);

            while (currentDate <= endDate) {
                const daysSinceAnchor = Math.floor((currentDate.getTime() - anchorStart.getTime()) / (1000 * 60 * 60 * 24));
                const positionInCycle = ((daysSinceAnchor % cycleLength) + cycleLength) % cycleLength; // Handle negative
                const isWorkDay = positionInCycle < days_on;

                if (isWorkDay) {
                    const shiftStart = new Date(currentDate);
                    shiftStart.setHours(startHour, startMin, 0, 0);
                    const shiftEnd = new Date(currentDate);
                    shiftEnd.setHours(endHour, endMin, 0, 0);

                    newShifts.push({
                        id: crypto.randomUUID(),
                        organization_id: ORG_ID,
                        user_id: userId,
                        start_time: shiftStart.toISOString(),
                        end_time: shiftEnd.toISOString(),
                        role_type: 'Staff',
                        status: 'published',
                        is_open: false
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            console.log(`Generated ${newShifts.length} rotating shifts(${days_on} - on / ${days_off} - off)`);
        }

        // Bulk create shifts
        if (newShifts.length > 0) {
            console.log(`Bulk creating ${newShifts.length} shifts...`);
            const createdShifts = await SupabaseService.createShifts(newShifts);
            if (createdShifts.length > 0) {
                setShifts(prev => [...prev, ...createdShifts]);
                console.log('Bulk creation successful.');
            } else {
                console.error('Bulk creation failed.');
            }
        }
    };

    const publishSchedule = async () => {
        // Update all draft shifts to published
        for (const shift of shifts.filter(s => s.status === 'draft')) {
            await updateShift(shift.id, { status: 'published' });
        }
    };

    const approveShifts = async (shiftIds: string[]) => {
        for (const id of shiftIds) {
            await updateShift(id, { status: 'approved' });
        }
    };

    const forceClockOut = async (shiftId: string) => {
        await updateShift(shiftId, {
            end_time: new Date().toISOString(),
            status: 'pending_approval'
        });
    };

    // ==================== TIME CLOCK ====================
    const clockIn = async (location?: any) => {
        if (!currentUser) return;
        if (isClockedIn) return; // Prevent double clock-in
        const newEntry: TimeEntry = {
            id: crypto.randomUUID(),
            organization_id: ORG_ID,
            user_id: currentUser.id,
            clock_in: new Date().toISOString(),
            total_break_minutes: 0,
            status: 'active',
            location_data: location
        };

        // Optimistic update
        setTimeEntries(prev => [newEntry, ...prev]);

        // Persist to DB
        const created = await SupabaseService.createTimeEntry(newEntry);
        if (!created) {
            // Revert if failed (simple revert for now)
            setTimeEntries(prev => prev.filter(e => e.id !== newEntry.id));
            alert('Failed to clock in. Please check your connection.');
        }
    };

    const clockOut = async () => {
        if (!activeTimeEntry) return;

        const updates = {
            clock_out: new Date().toISOString(),
            status: 'pending_approval' as const
        };

        // Optimistic update
        setTimeEntries(prev => prev.map(te =>
            te.id === activeTimeEntry.id
                ? { ...te, ...updates }
                : te
        ));

        // Persist to DB
        const success = await SupabaseService.updateTimeEntry(activeTimeEntry.id, updates);
        if (!success) {
            // Revert (simplified)
            console.error('Failed to persist clock out');
            alert('Failed to clock out. Please try again.');
        }
    };

    const deleteTimeEntries = async (ids: string[]) => {
        const success = await SupabaseService.deleteTimeEntries(ids);
        if (success) {
            setTimeEntries(prev => prev.filter(te => !ids.includes(te.id)));
        }
    };

    const updateTimeEntry = async (id: string, data: Partial<TimeEntry>) => {
        // Optimistic update
        setTimeEntries(prev => prev.map(te => te.id === id ? { ...te, ...data } : te));

        // Persist to DB
        const success = await SupabaseService.updateTimeEntry(id, data);
        if (!success) {
            // Revert state on failure (optional, but good practice)
            await refreshData();
        }
    };

    const startBreak = async () => {
        if (!activeTimeEntry) return;

        const now = new Date().toISOString();
        const existingBreaks = activeTimeEntry.breaks || [];

        const updates = {
            break_start: now,
            breaks: [...existingBreaks, { start: now }]
        };

        // Optimistic
        setTimeEntries(prev => prev.map(te => te.id === activeTimeEntry.id ? { ...te, ...updates } : te));

        // DB
        const success = await SupabaseService.updateTimeEntry(activeTimeEntry.id, updates);
        if (!success) {
            // Revert on failure
            setTimeEntries(prev => prev.map(te =>
                te.id === activeTimeEntry.id
                    ? { ...te, break_start: undefined, breaks: existingBreaks }
                    : te
            ));
        }
    };

    const endBreak = async () => {
        if (!activeTimeEntry || !activeTimeEntry.break_start) return;

        const start = new Date(activeTimeEntry.break_start);
        const end = new Date();
        const diffMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);

        // Update the last break entry with end time and duration
        const existingBreaks = activeTimeEntry.breaks || [];
        const updatedBreaks = existingBreaks.map((b: any, idx: number) =>
            idx === existingBreaks.length - 1 && !b.end
                ? { ...b, end: end.toISOString(), duration: diffMinutes }
                : b
        );

        const updates = {
            break_start: undefined, // Clear start so we are not "on break" anymore
            total_break_minutes: (activeTimeEntry.total_break_minutes || 0) + diffMinutes,
            breaks: updatedBreaks
        };

        // Optimistic
        setTimeEntries(prev => prev.map(te =>
            te.id === activeTimeEntry.id ? { ...te, ...updates, break_start: undefined } : te
        ));

        // DB - Note: we might need to send null explicitly for break_start depending on DB, 
        // but here we just update what we have. 
        // If Supabase/SQL expects NULL, we might need 'break_start: null' casted as any if strict types complain.
        // Assuming undefined/null clears it or we just ignore it.
        // Actually, to "clear" it in DB, we likely need to send null.
        await SupabaseService.updateTimeEntry(activeTimeEntry.id, {
            ...updates,
            break_start: null as any
        });
    };

    const addTimeEntry = async (entry: Omit<TimeEntry, 'id'>) => {
        const newEntry: TimeEntry = {
            ...entry,
            id: crypto.randomUUID(),
            organization_id: entry.organization_id || ORG_ID
        };

        // Optimistic
        setTimeEntries(prev => [newEntry, ...prev]);

        // DB
        const created = await SupabaseService.createTimeEntry(newEntry);
        if (!created) {
            setTimeEntries(prev => prev.filter(e => e.id !== newEntry.id));
            alert('Failed to create time entry.');
        }
    };

    const bulkRestoreStaff = async (restorations: any[]) => {
        console.log('=== BULK RESTORING STAFF ===', restorations.length);
        setIsLoading(true);

        try {
            // 1. Create all profiles
            const profilesToCreate = restorations.map(r => r.profile).filter(Boolean);
            const createdProfiles = await SupabaseService.createProfiles(profilesToCreate);
            setStaff(prev => [...prev, ...createdProfiles]);

            // 2. Create all shifts
            const allShifts = restorations.flatMap(r => r.shifts || []);
            const createdShifts = await SupabaseService.createShifts(allShifts);
            setShifts(prev => [...prev, ...createdShifts]);

            // 3. Create all time entries
            const allTimeEntries = restorations.flatMap(r => r.timesheets || []);
            const createdTimeEntries = await SupabaseService.createTimeEntries(allTimeEntries);
            setTimeEntries(prev => [...prev, ...createdTimeEntries]);

            console.log('Bulk restoration complete!');
        } catch (error) {
            console.error('Bulk restoration failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ==================== PET ASSIGNMENTS ====================
    const assignPet = async (petId: string, staffId: string) => {
        // Optimistic
        const tempId = crypto.randomUUID();
        setAssignments(prev => [...prev, { id: tempId, pet_id: petId, staff_id: staffId }]);

        await SupabaseService.assignPet(petId, staffId, currentUser?.id);
    };

    const unassignPet = async (petId: string, staffId: string) => {
        setAssignments(prev => prev.filter(a => !(a.pet_id === petId && a.staff_id === staffId)));
        await SupabaseService.unassignPet(petId, staffId);
    };

    const bulkAssignPets = async (petIds: string[], staffId: string) => {
        // Optimistic
        const newAssignments = petIds.map(petId => ({
            id: crypto.randomUUID(),
            pet_id: petId,
            staff_id: staffId
        }));

        // Remove duplicates if any exist in optimistic update (simplified)
        setAssignments(prev => {
            const filtered = prev.filter(p => !(petIds.includes(p.pet_id) && p.staff_id === staffId));
            return [...filtered, ...newAssignments];
        });

        await SupabaseService.bulkAssignPets(petIds, staffId, currentUser?.id);
    };

    // ==================== OTHER ACTIONS (Local) ====================
    const submitTimeOff = async (req: TimeOffRequest) => {
        setRequests(prev => [req, ...prev]);
    };

    const offerShift = async (swap: ShiftSwap) => {
        setSwaps(prev => [swap, ...prev]);
    };

    const sendMessage = async (msg: Message) => {
        setMessages(prev => [...prev, msg]);
        const created = await SupabaseService.sendMessage(msg);
        if (!created) {
            setMessages(prev => prev.filter(m => m.id !== msg.id));
        }
    };

    const deleteMessage = async (id: string) => {
        const original = messages.find(m => m.id === id);
        setMessages(prev => prev.filter(m => m.id !== id));
        const success = await SupabaseService.deleteMessage(id);
        if (!success && original) {
            setMessages(prev => [...prev, original]);
        }
    };

    const deleteConversation = async (targetUserId: string) => {
        // Optimistic local delete for 1:1 conversation
        setMessages(prev => prev.filter(m => {
            if (!currentUser) return true;
            // Check if message belongs to this pair
            const isRelated = (m.sender_id === currentUser.id && m.recipient_id === targetUserId) ||
                (m.sender_id === targetUserId && m.recipient_id === currentUser.id) ||
                (m.group_id === targetUserId); // Fallback
            return !isRelated;
        }));

        if (currentUser) {
            await SupabaseService.deleteConversation(targetUserId);
        }
    };

    const searchKnowledge = (query: string) => {
        return filterKnowledgeEntries(knowledgeBase, query);
    };

    // ==================== PAYROLL ACTIONS ====================
    const fetchPayStubs = useCallback(async (start: string, end: string) => {
        const data = await SupabaseService.getPayStubs(start, end);
        setPayStubs(data);
    }, []);

    const createPayStub = useCallback(async (stub: Partial<PayStub>) => {
        const { created_at, updated_at, ...clean } = stub;

        if (clean.status === 'approved' && !clean.approved_by && currentUser) {
            clean.approved_by = currentUser.id;
        }

        const { data: created, error } = await SupabaseService.createPayStub(clean as any);
        if (created) {
            const normalized = {
                ...created,
                period_start: created.period_start.split('T')[0]
            };

            setPayStubs(prev => {
                const existing = prev.findIndex(p => p.user_id === normalized.user_id && p.period_start.split('T')[0] === normalized.period_start);
                if (existing >= 0) {
                    const copy = [...prev];
                    copy[existing] = normalized;
                    return copy;
                }
                return [...prev, normalized];
            });
            return { success: true, error: null };
        }
        return { success: false, error: error || 'Unknown database error' };
    }, [currentUser?.id]);

    const updatePayStubStatus = useCallback(async (id: string, status: 'draft' | 'approved' | 'released') => {
        const released_at = status === 'released' ? new Date().toISOString() : undefined;
        const approved_by = currentUser?.id;

        const { success, error } = await SupabaseService.updatePayStubStatus(id, status, released_at, approved_by);
        if (success) {
            setPayStubs(prev => prev.map(p => p.id === id ? { ...p, status, released_at, approved_by } : p));
        }
        return { success, error };
    }, [currentUser?.id]);

    // ==================== PROVIDE CONTEXT ====================
    return (
        <OpsCenterContext.Provider value={{
            shifts,
            timeEntries,
            availability,
            requests,
            swaps,
            messages,
            knowledgeBase,
            templates,
            ratios,
            organization,
            currentUser,
            staff,
            pendingInvites,
            isInviteModalOpen,
            setInviteModalOpen,
            isAuthenticated,
            isLoading,
            navigatedUser,
            setNavigatedUser,
            clients,
            addClient,
            deleteClient,
            deleteClientsBulk,
            activeTimeEntry,
            isClockedIn,
            publishSchedule,
            updateShift,
            createShift,
            deleteShift,
            deleteShifts,
            deleteTimeEntries,
            clearUserSchedule,
            generateShiftsFromPattern,
            clockIn,
            clockOut,
            updateTimeEntry,
            submitTimeOff,
            offerShift,
            sendMessage,
            deleteMessage,
            deleteConversation,
            addStaff,
            updateStaff,
            updateOrganizationSettings,
            inviteStaff,
            searchKnowledge,
            approveShifts,
            forceClockOut,
            signIn,
            signUp,
            logout,
            refreshData,
            authLoading,
            hasMissingProfile,
            payStubs,
            fetchPayStubs,
            updatePayStubStatus,
            createPayStub,
            startBreak,
            endBreak,
            addTimeEntry,
            bulkRestoreStaff,
            assignments,
            assignPet,
            unassignPet,
            bulkAssignPets
        }}>
            {children}
        </OpsCenterContext.Provider>
    );
};

export const useOpsCenter = () => {
    const context = useContext(OpsCenterContext);
    if (!context) throw new Error('useOpsCenter must be used within an OpsCenterProvider');
    return context;
};
