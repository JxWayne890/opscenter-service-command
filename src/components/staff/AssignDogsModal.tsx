import React, { useState, useMemo } from 'react';
import { useOpsCenter } from '../../services/store';
import { X, Search, Dog, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Client, Pet } from '../../types';

interface AssignDogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffId: string | null;
}

const AssignDogsModal: React.FC<AssignDogsModalProps> = ({ isOpen, onClose, staffId }) => {
    const { clients, assignments, bulkAssignPets, staff } = useOpsCenter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Get the staff member details
    const staffMember = staff.find(s => s.id === staffId);

    // Initialize selection with existing assignments when modal opens
    React.useEffect(() => {
        if (isOpen && staffId) {
            const existing = assignments
                .filter(a => a.staff_id === staffId)
                .map(a => a.pet_id);
            setSelectedPetIds(existing);
        }
    }, [isOpen, staffId, assignments]);

    const filteredClients = useMemo(() => {
        if (!searchQuery) return clients;
        return clients.filter(c =>
            c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.pets?.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [clients, searchQuery]);

    const togglePet = (petId: string) => {
        setSelectedPetIds(prev =>
            prev.includes(petId)
                ? prev.filter(id => id !== petId)
                : [...prev, petId]
        );
    };

    const handleSave = async () => {
        if (!staffId) return;
        setIsSaving(true);
        try {
            await bulkAssignPets(selectedPetIds, staffId);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to save assignments');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !staffMember) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Assign Dogs</h2>
                        <p className="text-sm text-slate-500">
                            Assigning to <span className="font-bold text-indigo-600">{staffMember.full_name}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by client or dog name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {filteredClients.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Dog size={48} className="mx-auto mb-3 opacity-20" />
                            <p className="font-bold">No clients found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-end px-2">
                                <button
                                    onClick={() => {
                                        const allPetIds = filteredClients.flatMap(c => c.pets?.map(p => p.id) || []);
                                        const allSelected = allPetIds.every(id => selectedPetIds.includes(id));
                                        if (allSelected) {
                                            setSelectedPetIds([]);
                                        } else {
                                            setSelectedPetIds(allPetIds);
                                        }
                                    }}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                >
                                    {filteredClients.flatMap(c => c.pets || []).every(p => selectedPetIds.includes(p.id)) ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            {filteredClients.map(client => (
                                <div key={client.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-700 text-sm">{client.full_name}</h3>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{client.pets?.length || 0} Pets</span>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {client.pets?.map(pet => {
                                            const isSelected = selectedPetIds.includes(pet.id);
                                            return (
                                                <div
                                                    key={pet.id}
                                                    onClick={() => togglePet(pet.id)}
                                                    className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                        {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                                    </div>

                                                    <img src={pet.avatar_url} alt={pet.name} className="w-10 h-10 rounded-full object-cover bg-slate-100" />

                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-900">{pet.name}</h4>
                                                        <p className="text-xs text-slate-500">{pet.breed}</p>
                                                    </div>

                                                    {pet.medical_alerts && pet.medical_alerts.length > 0 && (
                                                        <div className="flex items-center gap-1 text-rose-500 text-[10px] font-bold bg-rose-50 px-2 py-1 rounded-lg">
                                                            <AlertCircle size={12} />
                                                            <span className="hidden sm:inline">Medical Alert</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                    >
                        {isSaving ? 'Saving...' : `Assign ${selectedPetIds.length} Dogs`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignDogsModal;
