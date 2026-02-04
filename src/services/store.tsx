import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Shift, TimeEntry, Availability, TimeOffRequest, ShiftSwap, Message, KnowledgeEntry, CommTemplate, Profile, StaffingRatio, PayStub, Organization } from '../types';
import { SupabaseService } from './db';
import { AuthService } from './supabase';

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
    addStaff: (profile: Profile) => Promise<void>;
    updateStaff: (id: string, updates: Partial<Profile>) => Promise<void>;
    updateOrganizationSettings: (updates: Partial<Organization>) => Promise<void>;
    inviteStaff: (email: string, role: string) => Promise<void>;
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
    authLoading: boolean;
    hasMissingProfile: boolean;
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
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntry[]>([]);
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

    // ==================== DATA LOADING ====================
    const refreshData = async () => {
        console.log('=== REFRESHING DATA FROM SUPABASE ===');
        setIsLoading(true);

        try {
            const [fetchedStaff, fetchedShifts, fetchedRatios, fetchedTimeEntries, fetchedOrg] = await Promise.all([
                SupabaseService.getProfiles(),
                SupabaseService.getShifts(),
                SupabaseService.getRatios(),
                SupabaseService.getTimeEntries(),
                SupabaseService.getOrganization()
            ]);

            console.log('Data loaded:', {
                staff: fetchedStaff.length,
                shifts: fetchedShifts.length,
                ratios: fetchedRatios.length,
                timeEntries: fetchedTimeEntries.length,
                organization: !!fetchedOrg
            });

            setStaff(fetchedStaff);
            setShifts(fetchedShifts);
            setRatios(fetchedRatios);
            setTimeEntries(fetchedTimeEntries);
            setOrganization(fetchedOrg);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Listen to Supabase Auth state changes
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let isMounted = true;

        // Set up auth timeout - if nothing happens in 5 seconds, show login
        timeoutId = setTimeout(() => {
            if (isMounted) {
                console.warn('Auth check timeout - showing login screen');
                setAuthLoading(false);
            }
        }, 5000);

        // Subscribe to auth changes - this handles INITIAL_SESSION, SIGNED_IN, SIGNED_OUT
        const { data: { subscription } } = AuthService.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);

            // Clear timeout on any auth event
            if (timeoutId) clearTimeout(timeoutId);

            // Handle the different auth events
            if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
                // We have a session, fetch the profile
                try {
                    console.log('Fetching profiles from Supabase...');

                    // Add timeout to profile fetch to prevent infinite loading
                    const fetchWithTimeout = (promise: Promise<Profile[]>, ms: number) => {
                        return Promise.race([
                            promise,
                            new Promise<Profile[]>((_, reject) =>
                                setTimeout(() => reject(new Error('Profile fetch timeout')), ms)
                            )
                        ]);
                    };

                    const profiles = await fetchWithTimeout(SupabaseService.getProfiles(), 10000);
                    console.log('Profiles fetched:', profiles.length);

                    const userProfile = profiles.find(p => p.id === session.user.id);

                    if (isMounted) {
                        if (userProfile) {
                            console.log('Profile found:', userProfile.full_name);
                            setCurrentUser(userProfile);
                            setIsAuthenticated(true);
                            setHasMissingProfile(false);
                            setStaff(profiles);
                        } else {
                            console.warn('No profile found for user:', session.user.email);
                            setHasMissingProfile(true);
                            setIsAuthenticated(false);
                        }
                        setAuthLoading(false);
                    }
                } catch (error) {
                    console.error('Error fetching profile:', error);
                    if (isMounted) {
                        setHasMissingProfile(true);
                        setAuthLoading(false);
                    }
                }
            } else if (event === 'INITIAL_SESSION' && !session) {
                // No session on initial load - show login
                console.log('No session on initial load');
                if (isMounted) {
                    setAuthLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                if (isMounted) {
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                    setHasMissingProfile(false);
                    setStaff([]);
                    setShifts([]);
                    setAuthLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    // Load remaining data when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            refreshData();
        }
    }, [isAuthenticated]);

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
        await SupabaseService.updateTimeEntry(activeTimeEntry.id, updates);
    };

    const endBreak = async () => {
        if (!activeTimeEntry || !activeTimeEntry.break_start) return;

        const start = new Date(activeTimeEntry.break_start);
        const end = new Date();
        const diffMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);

        // Update the last break entry with end time and duration
        const existingBreaks = activeTimeEntry.breaks || [];
        const updatedBreaks = [...existingBreaks];
        if (updatedBreaks.length > 0) {
            const lastBreak = updatedBreaks[updatedBreaks.length - 1];
            // Verify it matches the start time we expect, or just update the last one
            if (!lastBreak.end) {
                lastBreak.end = end.toISOString();
                lastBreak.duration = diffMinutes;
            }
        }

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

    // ==================== OTHER ACTIONS (Local) ====================
    const submitTimeOff = async (req: TimeOffRequest) => {
        setRequests(prev => [req, ...prev]);
    };

    const offerShift = async (swap: ShiftSwap) => {
        setSwaps(prev => [swap, ...prev]);
    };

    const sendMessage = async (msg: Message) => {
        setMessages(prev => [...prev, msg]);
    };

    const searchKnowledge = (query: string) => {
        if (!query) return knowledgeBase;
        return knowledgeBase.filter(k => k.title.toLowerCase().includes(query.toLowerCase()));
    };

    // ==================== PAYROLL ACTIONS ====================
    const fetchPayStubs = useCallback(async (start: string, end: string) => {
        const data = await SupabaseService.getPayStubs(start, end);
        setPayStubs(data);
    }, []);

    const createPayStub = useCallback(async (stub: Partial<PayStub>) => {
        const { created_at, updated_at, ...clean } = stub;

        if (clean.status === 'approved' && !clean.approved_by) {
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
            endBreak
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
