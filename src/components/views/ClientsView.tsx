import React, { useState, useMemo, useCallback } from 'react';
import { Search, Filter, Plus, Dog, Phone, Mail, MapPin, MoreVertical, ChevronRight, Star, AlertCircle, Heart, Trash2, CheckSquare, Square, X, Users, LogIn, ShieldCheck, UtensilsCrossed, Pill, LogOut as LogOutIcon } from 'lucide-react';
import { Client, Pet } from '../../types';
import AddClientModal from '../clients/AddClientModal';
import CheckInModal from '../clients/CheckInModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useOpsCenter } from '../../services/store';
import { isManager } from '../../services/permissions';
import { formatPhoneNumber } from '../../utils/formatters';
import { usePageTitle } from '../../hooks/usePageTitle';
import SectionCard from '../SectionCard';

// Mock Data Generation


const ClientsView: React.FC = () => {
    usePageTitle('Clients');
    const { clients, addClient, deleteClient, deleteClientsBulk, assignments, staff, assignPet, unassignPet, currentUser } = useOpsCenter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isAddClientOpen, setIsAddClientOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [checkInClient, setCheckInClient] = useState<Client | null>(null);

    // Multi-select state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Confirmation state
    const [clientToDelete, setClientToDelete] = useState<string | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    const handleSaveNewClient = (clientData: Partial<Client>, petsData: Partial<Pet>[]) => {
        const clientToSave: Client = {
            id: clientData.id || `c${clients.length + 1}`,
            organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Use the fixed org ID
            full_name: clientData.full_name || '',
            email: clientData.email || '',
            phone_primary: clientData.phone_primary || '',
            address: clientData.address || '',
            city: clientData.city || '',
            state: clientData.state || '',
            zip: clientData.zip || '',
            emergency_contact_name: clientData.emergency_contact_name || '',
            emergency_contact_phone: clientData.emergency_contact_phone || '',
            status: (clientData.status as any) || 'active',
            created_at: clientData.created_at || new Date().toISOString(),
            pets: petsData.map((p, idx) => ({
                ...p,
                id: p.id?.startsWith('temp') ? `p-${Date.now()}-${idx}` : p.id,
                client_id: clientData.id || `c${clients.length + 1}`,
                organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                status: p.status || 'active'
            })) as Pet[]
        };

        addClient(clientToSave);
        setIsAddClientOpen(false);
        setEditingClient(null);
        if (selectedClient && selectedClient.id === clientToSave.id) {
            setSelectedClient(clientToSave);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        await deleteClientsBulk(selectedIds);
        setSelectedIds([]);
        setIsSelectionMode(false);
        setShowBulkDeleteConfirm(false);
    };

    const handleDeleteSingle = async () => {
        if (clientToDelete) {
            await deleteClient(clientToDelete);
            if (selectedClient?.id === clientToDelete) {
                setSelectedClient(null);
            }
            setClientToDelete(null);
        }
    };

    // Check-in state — persisted in localStorage for the day
    const todayKey = new Date().toISOString().split('T')[0];
    const [checkedInPets, setCheckedInPets] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem(`checkedIn_${todayKey}`);
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch { return new Set(); }
    });

    const toggleCheckIn = useCallback((petId: string) => {
        setCheckedInPets(prev => {
            const next = new Set(prev);
            if (next.has(petId)) next.delete(petId); else next.add(petId);
            localStorage.setItem(`checkedIn_${todayKey}`, JSON.stringify([...next]));
            return next;
        });
    }, [todayKey]);

    // Today's Dogs filter
    const [dogFilter, setDogFilter] = useState<'all' | 'in_facility' | 'medical' | 'behavior'>('all');

    // All pets from active clients with owner info
    const allTodayDogs = useMemo(() => {
        const results: { pet: Pet; ownerName: string; assignedStaff?: string }[] = [];
        for (const client of clients) {
            if (client.status !== 'active') continue;
            for (const pet of client.pets || []) {
                if (pet.status !== 'active') continue;
                const assignedStaffId = assignments.find(a => a.pet_id === pet.id)?.staff_id;
                const assignedStaff = assignedStaffId ? staff.find(s => s.id === assignedStaffId)?.full_name : undefined;
                results.push({ pet, ownerName: client.full_name, assignedStaff });
            }
        }
        // Sort: medical alerts first
        results.sort((a, b) => {
            const aHas = (a.pet.medical_alerts?.length || 0) > 0 ? 0 : 1;
            const bHas = (b.pet.medical_alerts?.length || 0) > 0 ? 0 : 1;
            return aHas - bHas;
        });
        return results;
    }, [clients, assignments, staff]);

    const filteredDogs = useMemo(() => {
        switch (dogFilter) {
            case 'in_facility': return allTodayDogs.filter(d => checkedInPets.has(d.pet.id));
            case 'medical': return allTodayDogs.filter(d => d.pet.medical_alerts && d.pet.medical_alerts.length > 0);
            case 'behavior': return allTodayDogs.filter(d => d.pet.behavior_tags && d.pet.behavior_tags.length > 0);
            default: return allTodayDogs;
        }
    }, [allTodayDogs, dogFilter, checkedInPets]);

    const canManage = isManager(currentUser);

    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const matchesSearch =
                client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.pets?.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStatus = filterStatus === 'all' || client.status === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [clients, searchQuery, filterStatus]);

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 animate-in fade-in duration-300 relative">
            {/* Header */}
            <header className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Dog className="text-brand-blue" size={32} />
                        Clients & Pets
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Directory of {clients.length} owners and their furry companions</p>
                </div>

                <div className="flex w-full lg:w-auto gap-3">
                    {/* Bulk Action Toggle */}
                    <button
                        onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            setSelectedIds([]);
                        }}
                        className={`p-3 rounded-xl border transition-all ${isSelectionMode
                            ? 'bg-brand-blue text-white border-brand-blue'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        title="Bulk Actions"
                    >
                        <CheckSquare size={20} />
                    </button>

                    <div className="relative group flex-1 lg:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400 group-focus-within:text-brand-blue transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by dog or owner name..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all shadow-sm group-hover:border-slate-300"
                        />
                    </div>

                    <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
                        <Filter size={20} />
                    </button>

                    <button
                        onClick={() => {
                            setEditingClient(null);
                            setIsAddClientOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-brand-blue/25 hover:bg-brand-dark hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus size={20} className="stroke-[3]" />
                        <span className="hidden lg:inline">Add Client</span>
                    </button>
                </div>
            </header>

            {/* Today's Dogs Section */}
            <SectionCard className="!p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Dog size={16} className="text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Dogs</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            {checkedInPets.size} in facility
                        </span>
                        <span className="text-xs font-bold text-slate-500">{allTodayDogs.length} total</span>
                    </div>
                </div>

                {/* Quick Filter Bar */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4">
                    {([
                        { key: 'all', label: 'All' },
                        { key: 'in_facility', label: 'In Facility' },
                        { key: 'medical', label: 'Medical Alerts' },
                        { key: 'behavior', label: 'Behavior Flags' },
                    ] as const).map(f => (
                        <button
                            key={f.key}
                            onClick={() => setDogFilter(f.key)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${dogFilter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {filteredDogs.length === 0 ? (
                    <div className="flex items-center gap-3 py-4">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <p className="text-sm font-medium text-slate-500">
                            {dogFilter === 'all' ? 'No active pets found.' : dogFilter === 'medical' ? 'All clear — no medical alerts.' : dogFilter === 'behavior' ? 'No behavior flags.' : 'No dogs checked in.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                        {filteredDogs.map(({ pet, ownerName, assignedStaff }) => {
                            const isIn = checkedInPets.has(pet.id);
                            return (
                                <div key={pet.id} className={`flex gap-3 p-3 rounded-2xl border transition-all ${isIn ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                    {pet.avatar_url ? (
                                        <img src={pet.avatar_url} alt={pet.name} loading="lazy" className="w-12 h-12 rounded-xl object-cover shadow-sm flex-shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                                            <Dog size={20} className="text-slate-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-baseline gap-2 min-w-0">
                                                <h4 className="font-bold text-slate-900 text-sm truncate">{pet.name}</h4>
                                                <span className="text-xs text-slate-400 truncate">{pet.breed}</span>
                                            </div>
                                            <button
                                                onClick={() => toggleCheckIn(pet.id)}
                                                className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border transition-all ${isIn
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                                                }`}
                                            >
                                                {isIn ? 'Check Out' : 'Check In'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium truncate">
                                            Owner: {ownerName}
                                            {assignedStaff && <span className="text-indigo-500"> · Staff: {assignedStaff}</span>}
                                        </p>
                                        {isIn && <span className="text-[10px] font-bold text-emerald-600 uppercase">In Facility</span>}

                                        {/* Flags */}
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {pet.medical_alerts?.map(tag => (
                                                <span key={`med-${tag}`} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                    <AlertCircle size={8} /> {tag}
                                                </span>
                                            ))}
                                            {pet.behavior_tags?.map(tag => (
                                                <span key={`beh-${tag}`} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                    <Star size={8} /> {tag}
                                                </span>
                                            ))}
                                            {pet.dietary_restrictions?.map(tag => (
                                                <span key={`diet-${tag}`} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                    <UtensilsCrossed size={8} /> {tag}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Feeding & Medication */}
                                        {pet.feeding_instructions && (
                                            <p className="text-[10px] text-slate-400 mt-1 truncate" title={pet.feeding_instructions}>
                                                <UtensilsCrossed size={8} className="inline mr-0.5" /> {pet.feeding_instructions}
                                            </p>
                                        )}
                                        {pet.medication_instructions && (
                                            <p className="text-[10px] text-purple-500 mt-0.5 truncate" title={pet.medication_instructions}>
                                                <Pill size={8} className="inline mr-0.5" /> {pet.medication_instructions}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            {/* Bulk Action Bar */}
            {isSelectionMode && selectedIds.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl text-white animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="p-1 hover:bg-white/10 rounded-lg">
                            <X size={20} />
                        </button>
                        <span className="font-bold">{selectedIds.length} Selected</span>
                    </div>
                    <button
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl font-bold transition-all"
                    >
                        <Trash2 size={18} />
                        Delete {selectedIds.length} Clients
                    </button>
                </div>
            )}

            <AddClientModal
                isOpen={isAddClientOpen}
                onClose={() => {
                    setIsAddClientOpen(false);
                    setEditingClient(null);
                }}
                onSave={handleSaveNewClient}
                initialClient={editingClient}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {filteredClients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-[2rem] text-center border-dashed">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Search size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No matches found</h3>
                        <p className="text-slate-500">Try adjusting your search terms</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredClients.map(client => (
                            <div
                                key={client.id}
                                onClick={() => setSelectedClient(client)}
                                className="bg-white border border-slate-200 rounded-3xl p-1 overflow-hidden hover:shadow-xl hover:border-brand-blue/30 transition-all duration-300 group cursor-pointer"
                            >
                                {/* Card Body */}
                                <div className="p-5">
                                    {/* Client Header */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex gap-4">
                                            {isSelectionMode ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleSelection(client.id); }}
                                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${selectedIds.includes(client.id) ? 'bg-brand-blue text-white shadow-lg' : 'bg-slate-50 text-slate-300 border border-slate-200'}`}
                                                >
                                                    {selectedIds.includes(client.id) ? <CheckSquare size={24} /> : <Square size={24} />}
                                                </button>
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
                                                    {client.full_name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-brand-blue transition-colors">
                                                    {client.full_name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-slate-400 hover:text-brand-blue transition-colors p-1 -ml-1 rounded-md hover:bg-brand-blue/5" onClick={(e) => e.stopPropagation()}>
                                                        <Mail size={14} />
                                                    </span>
                                                    <span className="text-slate-400 hover:text-emerald-600 transition-colors p-1 rounded-md hover:bg-emerald-50" onClick={(e) => e.stopPropagation()}>
                                                        <Phone size={14} />
                                                    </span>
                                                    {client.address && (
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <MapPin size={12} /> {client.city}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setClientToDelete(client.id);
                                            }}
                                            className="text-slate-300 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Delete Client"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    {/* Pets List */}
                                    <div className="space-y-3">
                                        {client.pets?.map(pet => (
                                            <div key={pet.id} className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-brand-blue/[0.02] transition-colors">
                                                <img
                                                    src={pet.avatar_url}
                                                    alt={pet.name}
                                                    loading="lazy"
                                                    className="w-16 h-16 rounded-xl object-cover shadow-sm"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-slate-900 truncate">{pet.name}</h4>
                                                        <div className="flex gap-1 items-center">
                                                            {pet.is_spayed_neutered && (
                                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                                    {pet.gender === 'male' ? 'NEUTERED' : 'SPAYED'}
                                                                </span>
                                                            )}
                                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${pet.gender === 'male'
                                                                ? 'text-blue-600 bg-blue-50 border-blue-200'
                                                                : 'text-pink-600 bg-pink-50 border-pink-200'
                                                                }`}>
                                                                {pet.gender === 'male' ? 'BOY' : 'GIRL'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                                        {pet.breed} • {pet.age} yrs • {pet.weight} lbs
                                                    </p>

                                                    {/* Tags */}
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {pet.medical_alerts && pet.medical_alerts.length > 0 && (
                                                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                                                <AlertCircle size={8} />
                                                                {pet.medical_alerts[0]}
                                                            </span>
                                                        )}
                                                        {pet.behavior_tags && pet.behavior_tags.length > 0 && (
                                                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                                <Star size={8} />
                                                                {pet.behavior_tags[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer Action */}
                                <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end">
                                    <button className="text-xs font-bold text-brand-blue flex items-center gap-1 hover:gap-2 transition-all px-3 py-1.5 rounded-lg hover:bg-brand-blue/10">
                                        View Profile <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal Overlay */}
            {selectedClient && (
                <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200" onClick={() => setSelectedClient(null)}>
                    {/* Side Drawer */}
                    <div
                        className="w-full lg:w-2/5 xl:w-[600px] bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{selectedClient.full_name}</h2>
                                <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                                    <span className={`w-2 h-2 rounded-full ${selectedClient.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    {selectedClient.status === 'active' ? 'Active Client' : 'Inactive'} • Since {new Date(selectedClient.created_at).getFullYear()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCheckInClient(selectedClient)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                    <LogIn size={14} />
                                    Check In
                                </button>
                                <button
                                    onClick={() => setSelectedClient(null)}
                                    className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                                >
                                    <ChevronRight size={20} className="text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Contact Info */}
                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Phone size={14} className="text-slate-400" />
                                            <span className="text-xs font-bold text-slate-500 uppercase">Phone</span>
                                        </div>
                                        <a href={`tel:${selectedClient.phone_primary}`} className="text-lg font-bold text-slate-900 hover:text-brand-blue">{formatPhoneNumber(selectedClient.phone_primary)}</a>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Mail size={14} className="text-slate-400" />
                                            <span className="text-xs font-bold text-slate-500 uppercase">Email</span>
                                        </div>
                                        <a href={`mailto:${selectedClient.email}`} className="text-base font-bold text-slate-900 hover:text-brand-blue break-all">{selectedClient.email}</a>
                                    </div>
                                    <div className="col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <MapPin size={14} className="text-slate-400" />
                                            <span className="text-xs font-bold text-slate-500 uppercase">Address</span>
                                        </div>
                                        <p className="text-base font-medium text-slate-900">
                                            {selectedClient.address}<br />
                                            {selectedClient.city}, {selectedClient.state} {selectedClient.zip}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Emergency Contact</h3>
                                <div className="p-4 border border-rose-100 bg-rose-50/30 rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-rose-900">{selectedClient.emergency_contact_name}</p>
                                        <p className="text-sm text-rose-700">{formatPhoneNumber(selectedClient.emergency_contact_phone || '')}</p>
                                    </div>
                                    <a href={`tel:${selectedClient.emergency_contact_phone}`} className="p-2 bg-white rounded-lg shadow-sm text-rose-600 hover:bg-rose-50">
                                        <Phone size={18} />
                                    </a>
                                </div>
                            </section>

                            {/* Pets Section */}
                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pets ({selectedClient.pets?.length || 0})</h3>
                                <div className="space-y-6">
                                    {selectedClient.pets?.map(pet => (
                                        <div key={pet.id} className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden">
                                            {/* Pet Header */}
                                            <div className="bg-indigo-50/50 p-6 flex gap-6 items-start">
                                                <img
                                                    src={pet.avatar_url}
                                                    alt={pet.name}
                                                    loading="lazy"
                                                    className="w-24 h-24 rounded-2xl object-cover shadow-lg ring-4 ring-white"
                                                />
                                                <div>
                                                    <h3 className="text-2xl font-bold text-slate-900">{pet.name}</h3>
                                                    <p className="text-slate-500 font-medium">{pet.breed} • {pet.age} Years • {pet.weight} lbs</p>
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {pet.medical_alerts?.map(tag => (
                                                            <span key={tag} className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1">
                                                                <AlertCircle size={10} /> {tag}
                                                            </span>
                                                        ))}
                                                        {pet.behavior_tags?.map(tag => (
                                                            <span key={tag} className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 flex items-center gap-1">
                                                                <Star size={10} /> {tag}
                                                            </span>
                                                        ))}
                                                        {pet.dietary_restrictions?.map(tag => (
                                                            <span key={tag} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                                                                Diet: {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pet Details */}
                                            <div className="p-6 grid gap-6">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Details</h4>
                                                        <ul className="space-y-2 text-sm font-medium text-slate-700">
                                                            <li className="flex justify-between border-b border-slate-50 pb-1">
                                                                <span>Gender</span>
                                                                <span className="capitalize">{pet.gender}</span>
                                                            </li>
                                                            <li className="flex justify-between border-b border-slate-50 pb-1">
                                                                <span>Fixed</span>
                                                                <span>{pet.is_spayed_neutered ? 'Yes' : 'No'}</span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                {/* Assignments Section */}
                                                <div className="col-span-2 pt-4 border-t border-slate-50">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                                        <Users size={12} /> Assigned Staff
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {assignments.filter(a => a.pet_id === pet.id).length > 0 && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {assignments
                                                                    .filter(a => a.pet_id === pet.id)
                                                                    .map(assignment => {
                                                                        const assignedStaff = staff.find(s => s.id === assignment.staff_id);
                                                                        if (!assignedStaff) return null;
                                                                        return (
                                                                            <div key={assignment.id} className="flex items-center gap-2 pl-2 pr-1 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                                                                                {assignedStaff.full_name}
                                                                                <button
                                                                                    onClick={() => unassignPet(pet.id, assignedStaff.id)}
                                                                                    className="p-0.5 hover:bg-indigo-100 rounded text-indigo-400 hover:text-indigo-600 transition-colors"
                                                                                >
                                                                                    <X size={12} />
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>
                                                        )}
                                                        <div className="relative">
                                                            <select
                                                                className="w-full text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        assignPet(pet.id, e.target.value);
                                                                        e.target.value = '';
                                                                    }
                                                                }}
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>+ Assign Staff Member</option>
                                                                {staff
                                                                    .filter(s => !assignments.some(a => a.pet_id === pet.id && a.staff_id === s.id))
                                                                    .map(s => (
                                                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                                                    ))}
                                                            </select>
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                                <ChevronRight size={12} className="rotate-90" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
                            <button
                                onClick={() => {
                                    setEditingClient(selectedClient);
                                    setIsAddClientOpen(true);
                                }}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={() => setClientToDelete(selectedClient.id)}
                                className="flex-1 py-3 bg-rose-50 border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-100 shadow-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialogs */}
            <ConfirmDialog
                isOpen={!!clientToDelete}
                onClose={() => setClientToDelete(null)}
                onConfirm={handleDeleteSingle}
                title="Delete Client"
                message="Are you sure you want to delete this client? This will also remove all associated pet records. This action cannot be undone."
                confirmText="Delete Client"
                variant="danger"
            />

            <ConfirmDialog
                isOpen={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                onConfirm={handleBulkDelete}
                title="Bulk Delete Clients"
                message={`Are you sure you want to delete ${selectedIds.length} clients and all their associated pet records? This action cannot be undone.`}
                confirmText={`Delete ${selectedIds.length} Clients`}
                variant="danger"
            />

            {/* Check In Modal */}
            {checkInClient && (
                <CheckInModal
                    isOpen={!!checkInClient}
                    onClose={() => setCheckInClient(null)}
                    clientId={checkInClient.id}
                    pets={checkInClient.pets || []}
                    onSuccess={() => setCheckInClient(null)}
                />
            )}
        </div>
    );
};

export default ClientsView;
