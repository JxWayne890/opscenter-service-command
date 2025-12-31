import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Shift, TimeEntry, Availability, TimeOffRequest, ShiftSwap, Message, KnowledgeEntry, CommTemplate, Profile } from '../types';
import { MOCK_SHIFTS, MOCK_TIME_ENTRIES, MOCK_AVAILABILITY, MOCK_REQUESTS, MOCK_SWAPS, MOCK_MESSAGES, MOCK_KB, MOCK_TEMPLATES, MOCK_USER, MOCK_STAFF } from './mockData';

// --- Context Types ---
interface OpsCenterContextType {
    // --- Data Stores ---
    shifts: Shift[];
    timeEntries: TimeEntry[];
    availability: Availability[];
    requests: TimeOffRequest[];
    swaps: ShiftSwap[];
    messages: Message[];
    knowledgeBase: KnowledgeEntry[];
    templates: CommTemplate[];

    currentUser: Profile;
    staff: Profile[];
    pendingInvites: Profile[];

    // --- UI State ---
    isInviteModalOpen: boolean;
    setInviteModalOpen: (open: boolean) => void;

    // --- Computed Status ---
    activeTimeEntry: TimeEntry | null; // The "Clocked In" status comes from here now
    isClockedIn: boolean;

    // --- Actions: Scheduling ---
    publishSchedule: () => Promise<void>;
    updateShift: (shiftId: string, data: Partial<Shift>) => Promise<void>;
    createShift: (shift: Shift) => Promise<void>;
    deleteShift: (shiftId: string) => Promise<void>;

    // --- Actions: Time Clock ---
    clockIn: (location?: any) => Promise<void>;
    clockOut: () => Promise<void>;
    updateTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<void>;

    // --- Actions: Requests & Comms ---
    submitTimeOff: (req: TimeOffRequest) => Promise<void>;
    offerShift: (swap: ShiftSwap) => Promise<void>;
    sendMessage: (msg: Message) => Promise<void>;

    // --- Actions: Admin ---
    inviteStaff: (email: string, role: string) => Promise<void>;
    searchKnowledge: (query: string) => KnowledgeEntry[];

    // --- Actions: Timesheet Management ---
    approveShifts: (shiftIds: string[]) => Promise<void>;
    forceClockOut: (shiftId: string) => Promise<void>;
}

const OpsCenterContext = createContext<OpsCenterContextType | undefined>(undefined);

export const OpsCenterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- State Initialization ---
    const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(MOCK_TIME_ENTRIES);
    const [availability, setAvailability] = useState<Availability[]>(MOCK_AVAILABILITY);
    const [requests, setRequests] = useState<TimeOffRequest[]>(MOCK_REQUESTS);
    const [swaps, setSwaps] = useState<ShiftSwap[]>(MOCK_SWAPS);
    const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

    // Legacy / Shared
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntry[]>(MOCK_KB);
    const [templates, setTemplates] = useState<CommTemplate[]>(MOCK_TEMPLATES);
    const [currentUser] = useState<Profile>(MOCK_USER);
    const [staff, setStaff] = useState<Profile[]>(MOCK_STAFF);
    const [pendingInvites, setPendingInvites] = useState<Profile[]>([]);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);

    // --- Computed State ---
    // User is clocked in if they have an active time entry (no clock_out time)
    const activeTimeEntry = timeEntries.find(te => te.user_id === currentUser.id && te.status === 'active' && !te.clock_out) || null;
    const isClockedIn = !!activeTimeEntry;

    // --- Actions ---

    // 1. Time Clock Logic (Parity with "When I Work")
    const clockIn = async (location?: any) => {
        const newEntry: TimeEntry = {
            id: crypto.randomUUID(),
            organization_id: currentUser.organization_id,
            user_id: currentUser.id,
            clock_in: new Date().toISOString(),
            total_break_minutes: 0,
            status: 'active',
            location_data: location
        };
        setTimeEntries(prev => [newEntry, ...prev]);
    };

    const clockOut = async () => {
        if (!activeTimeEntry) return;

        const updatedEntry = {
            ...activeTimeEntry,
            clock_out: new Date().toISOString(),
            status: 'pending_approval' as const // Needs manager sign-off by default
        };

        setTimeEntries(prev => prev.map(te => te.id === updatedEntry.id ? updatedEntry : te));
    };

    const updateTimeEntry = async (id: string, data: Partial<TimeEntry>) => {
        setTimeEntries(prev => prev.map(te => te.id === id ? { ...te, ...data } : te));
    };

    // 2. Scheduling Logic
    const publishSchedule = async () => {
        setShifts(prev => prev.map(s => ({ ...s, status: 'published' })));
    };

    const updateShift = async (id: string, data: Partial<Shift>) => {
        setShifts(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    };

    const createShift = async (shift: Shift) => {
        setShifts(prev => [...prev, shift]);
    };

    const deleteShift = async (shiftId: string) => {
        setShifts(prev => prev.filter(s => s.id !== shiftId));
    };

    // 3. Requests & Comms
    const submitTimeOff = async (req: TimeOffRequest) => {
        setRequests(prev => [req, ...prev]);
    };

    const offerShift = async (swap: ShiftSwap) => {
        setSwaps(prev => [swap, ...prev]);
    };

    const sendMessage = async (msg: Message) => {
        setMessages(prev => [...prev, msg]);
    };

    // 4. Admin
    const inviteStaff = async (email: string, role: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const newProfile: Profile = {
            id: crypto.randomUUID(),
            organization_id: currentUser.organization_id,
            email,
            full_name: email.split('@')[0],
            role: role as any,
            status: 'pending'
        };
        setPendingInvites(prev => [...prev, newProfile]);
    };

    const searchKnowledge = (query: string) => {
        if (!query) return knowledgeBase;
        const lowerQ = query.toLowerCase();
        return knowledgeBase.filter(k => k.title.toLowerCase().includes(lowerQ));
    };

    // 5. Timesheet Management
    const approveShifts = async (shiftIds: string[]) => {
        setShifts(prev => prev.map(s =>
            shiftIds.includes(s.id) ? { ...s, status: 'approved' as const } : s
        ));
    };

    const forceClockOut = async (shiftId: string) => {
        setShifts(prev => prev.map(s =>
            s.id === shiftId ? { ...s, end_time: new Date().toISOString(), status: 'pending_approval' as const } : s
        ));
    };

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
            currentUser,
            staff,
            pendingInvites,
            isInviteModalOpen,
            setInviteModalOpen,
            activeTimeEntry,
            isClockedIn,
            publishSchedule,
            updateShift,
            createShift,
            deleteShift,
            clockIn,
            clockOut,
            updateTimeEntry,
            submitTimeOff,
            offerShift,
            sendMessage,
            inviteStaff,
            searchKnowledge,
            approveShifts,
            forceClockOut
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
