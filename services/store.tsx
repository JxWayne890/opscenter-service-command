import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Shift, TimeEntry, Availability, TimeOffRequest, ShiftSwap, Message, KnowledgeEntry, CommTemplate, Profile, StaffingRatio } from '../types';
import { SupabaseService } from './db';

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
    currentUser: Profile;
    staff: Profile[];
    pendingInvites: Profile[];

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
    generateShiftsFromPattern: (userId: string, config: any, weeksAhead?: number) => Promise<void>;
    clockIn: (location?: any) => Promise<void>;
    clockOut: () => Promise<void>;
    updateTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<void>;
    submitTimeOff: (req: TimeOffRequest) => Promise<void>;
    offerShift: (swap: ShiftSwap) => Promise<void>;
    sendMessage: (msg: Message) => Promise<void>;
    addStaff: (profile: Profile) => Promise<void>;
    updateStaff: (id: string, updates: Partial<Profile>) => Promise<void>;
    inviteStaff: (email: string, role: string) => Promise<void>;
    searchKnowledge: (query: string) => KnowledgeEntry[];
    approveShifts: (shiftIds: string[]) => Promise<void>;
    forceClockOut: (shiftId: string) => Promise<void>;
    loginAs: (user: Profile) => void;
    logout: () => void;
    refreshData: () => Promise<void>;
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
    const [currentUser, setCurrentUser] = useState<Profile>(DEFAULT_USER);
    const [pendingInvites, setPendingInvites] = useState<Profile[]>([]);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [navigatedUser, setNavigatedUser] = useState<string | null>(null);

    // ==================== DATA LOADING ====================
    const refreshData = async () => {
        console.log('=== REFRESHING DATA FROM SUPABASE ===');
        setIsLoading(true);

        try {
            const [fetchedStaff, fetchedShifts, fetchedRatios, fetchedTimeEntries] = await Promise.all([
                SupabaseService.getProfiles(),
                SupabaseService.getShifts(),
                SupabaseService.getRatios(),
                SupabaseService.getTimeEntries()
            ]);

            console.log('Data loaded:', {
                staff: fetchedStaff.length,
                shifts: fetchedShifts.length,
                ratios: fetchedRatios.length,
                timeEntries: fetchedTimeEntries.length
            });

            setStaff(fetchedStaff);
            setShifts(fetchedShifts);
            setRatios(fetchedRatios);
            setTimeEntries(fetchedTimeEntries);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load profiles on mount for login screen
    useEffect(() => {
        const loadInitial = async () => {
            const fetchedStaff = await SupabaseService.getProfiles();

            // Explicit hardcoded manager for guaranteed access
            const david: Profile = {
                id: 'a3f5f4b1-09d3-7f7a-2b02-8b0e80188913',
                organization_id: ORG_ID,
                email: 'david@adogs.world',
                full_name: 'David Chen',
                role: 'manager',
                status: 'active',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david'
            };

            // Data normalization for demo
            const normalizedStaff = [david, ...fetchedStaff.filter(s => s.id !== david.id)].map(s => {
                // Ensure Sarah is also treated as owner if she exists
                if (s.full_name === 'Sarah Jenkins') return { ...s, role: 'owner' as any };
                return s;
            });

            setStaff(normalizedStaff);
        };
        loadInitial();
    }, []);

    // Load remaining data when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            refreshData();
        }
    }, [isAuthenticated]);

    // ==================== AUTH ====================
    const loginAs = (user: Profile) => {
        // Fail-safe: Force roles for known management profiles
        let normalizedUser = { ...user };
        if (user.full_name === 'Sarah Jenkins' || user.email === 'sarah@adogs.world') {
            normalizedUser.role = 'owner';
        } else if (user.full_name === 'David Chen' || user.email === 'david@adogs.world') {
            normalizedUser.role = 'manager';
        }

        setCurrentUser(normalizedUser);
        setIsAuthenticated(true);
    };

    const logout = () => {
        setIsAuthenticated(false);
        setStaff([]);
        setShifts([]);
    };

    // ==================== COMPUTED ====================
    const activeTimeEntry = timeEntries.find(te =>
        te.user_id === currentUser.id && te.status === 'active' && !te.clock_out
    ) || null;
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

    // Generate shifts from a rotating pattern (e.g., 4 on / 4 off)
    const generateShiftsFromPattern = async (userId: string, config: any, weeksAhead: number = 4) => {
        if (!config || config.type !== 'rotating') return;

        const { days_on, days_off, anchor_date, shift_start_time, shift_end_time } = config;
        const cycleLength = days_on + days_off;
        const startDate = new Date(anchor_date || new Date());
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (weeksAhead * 7));

        // Parse shift times (default to 9:00 and 17:00)
        const [startHour, startMin] = (shift_start_time || '09:00').split(':').map(Number);
        const [endHour, endMin] = (shift_end_time || '17:00').split(':').map(Number);

        const newShifts: Shift[] = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            // Calculate where we are in the cycle
            const daysSinceAnchor = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const positionInCycle = daysSinceAnchor % cycleLength;
            const isWorkDay = positionInCycle < days_on;

            if (isWorkDay) {
                // Create shift with configured times
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

        // Create all the shifts
        console.log(`Generating ${newShifts.length} shifts (${shift_start_time || '09:00'} - ${shift_end_time || '17:00'}) for pattern ${days_on}-on/${days_off}-off`);
        for (const shift of newShifts) {
            await createShift(shift);
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

    const updateTimeEntry = async (id: string, data: Partial<TimeEntry>) => {
        setTimeEntries(prev => prev.map(te => te.id === id ? { ...te, ...data } : te));
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
            generateShiftsFromPattern,
            clockIn,
            clockOut,
            updateTimeEntry,
            submitTimeOff,
            offerShift,
            sendMessage,
            addStaff,
            updateStaff,
            inviteStaff,
            searchKnowledge,
            approveShifts,
            forceClockOut,
            loginAs,
            logout,
            refreshData
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
