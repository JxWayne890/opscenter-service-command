import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/db';
import { useNavigate } from 'react-router-dom';
import { Client, Pet } from '../../types';
import { LogOut, Phone, MessageSquare, User, LayoutGrid, Calendar, X, Edit, Save, AlertCircle } from 'lucide-react';
import { ErrorTracking } from '../../services/errorTracking';
import PortalCommsModal from './PortalCommsModal';

const PortalDashboard = () => {
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | null>(null);
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [orgId, setOrgId] = useState<string>('');
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editPetData, setEditPetData] = useState<Partial<Pet>>({});

    useEffect(() => {
        const storedClientId = localStorage.getItem('portal_client_id');
        const storedOrgId = localStorage.getItem('portal_org_id');

        if (!storedClientId || !storedOrgId) {
            navigate('/portal/login');
            return;
        }

        setOrgId(storedOrgId);

        const fetchData = async () => {
            try {
                // Fetch Client
                const { data: clientData, error: clientError } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', storedClientId)
                    .single();

                if (clientError) throw clientError;
                setClient(clientData);

                // Fetch Pets
                const { data: petData, error: petError } = await supabase
                    .from('pets')
                    .select('*')
                    .eq('client_id', storedClientId);

                if (petError) throw petError;
                setPets(petData || []);

            } catch (err) {
                ErrorTracking.captureException(err instanceof Error ? err : new Error(String(err)), { context: 'Portal data fetch' });
                navigate('/portal/login');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('portal_client_id');
        localStorage.removeItem('portal_org_id');
        navigate('/portal/login');
    };

    const openPetProfile = (pet: Pet, editMode = false) => {
        setSelectedPet(pet);
        setEditPetData(pet);
        setIsEditing(editMode);
    };

    const closePetModal = () => {
        setSelectedPet(null);
        setIsEditing(false);
        setEditPetData({});
    };

    const handleEditChange = (field: keyof Pet, value: any) => {
        setEditPetData(prev => ({ ...prev, [field]: value }));
    };

    const handleSavePet = async () => {
        if (!selectedPet) return;
        try {
            const { error } = await supabase
                .from('pets')
                .update({
                    name: editPetData.name,
                    breed: editPetData.breed,
                    age: editPetData.age,
                    weight: editPetData.weight,
                    gender: editPetData.gender,
                    behavior_notes: editPetData.behavior_notes,
                    feeding_instructions: editPetData.feeding_instructions,
                    medication_instructions: editPetData.medication_instructions
                })
                .eq('id', selectedPet.id);

            if (error) throw error;

            // Update local state
            setPets(prev => prev.map(p => p.id === selectedPet.id ? { ...p, ...editPetData } : p));
            setSelectedPet({ ...selectedPet, ...editPetData } as Pet);
            setIsEditing(false);
        } catch (err) {
            ErrorTracking.captureException(err instanceof Error ? err : new Error(String(err)), { context: 'Update pet' });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!client) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
            {/* Sidebar Navigation (Desktop) */}
            <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed inset-y-0 z-20">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <span className="text-lg font-bold text-indigo-700 tracking-tight">Portal</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium transition-colors">
                        <LayoutGrid size={20} />
                        Dashboard
                    </a>
                    <button onClick={() => setIsChatOpen(true)} className="flex w-full items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors">
                        <MessageSquare size={20} />
                        Messages
                    </button>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium transition-colors">
                        <Calendar size={20} />
                        Schedule
                    </a>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {client.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{client.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{client.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 relative">
                {/* Mobile Header */}
                <header className="md:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-10">
                    <span className="font-bold text-indigo-700">Portal</span>
                    <button onClick={() => setIsChatOpen(true)} className="p-2 text-gray-600">
                        <MessageSquare size={24} />
                    </button>
                </header>

                <div className="max-w-5xl mx-auto px-6 py-8">
                    {/* Welcome Section */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-500">Welcome back, {client.full_name.split(' ')[0]}. Here is an overview of your pets.</p>
                    </div>

                    {/* Account Stats */}
                    {client.current_balance && Number(client.current_balance) > 0 && (
                        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between shadow-sm">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Outstanding Balance</h3>
                                <p className="text-3xl font-bold text-gray-900 mt-1">${client.current_balance}</p>
                            </div>
                            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm">
                                Pay Invoice
                            </button>
                        </div>
                    )}

                    {/* Account Stats - always show */}
                    {(!client.current_balance || Number(client.current_balance) <= 0) && (
                        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between shadow-sm">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Account Balance</h3>
                                <p className="text-3xl font-bold text-emerald-600 mt-1">$0.00</p>
                            </div>
                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">All Paid</span>
                        </div>
                    )}

                    {/* Pets Grid */}
                    <h2 className="text-lg font-bold text-gray-900 mb-4">My Pets</h2>
                    {pets.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <User size={32} className="text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">No pets on file yet.</p>
                            <p className="text-sm text-gray-400 mt-1">Contact the facility to add your pets.</p>
                        </div>
                    ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pets.map(pet => (
                            <div key={pet.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-48 bg-gray-100 relative">
                                    <img
                                        src={pet.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name)}&background=random`}
                                        alt={pet.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-gray-900">{pet.name}</h3>
                                        {pet.is_spayed_neutered && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">{pet.breed} • {pet.age} yrs • {pet.gender === 'male' ? 'Male' : 'Female'}</p>

                                    <div className="border-t border-gray-100 pt-4 flex gap-4 text-sm">
                                        <button
                                            onClick={() => openPetProfile(pet, false)}
                                            className="flex-1 text-indigo-600 font-medium hover:text-indigo-800 text-center"
                                        >
                                            View Profile
                                        </button>
                                        <div className="w-px bg-gray-200"></div>
                                        <button
                                            onClick={() => openPetProfile(pet, true)}
                                            className="flex-1 text-gray-600 font-medium hover:text-gray-900 text-center"
                                        >
                                            Edit Info
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    )}

                    {/* Quick Contacts (Mobile Footer equivalent) */}
                    <div className="mt-12 p-6 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                                <Phone size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-indigo-900">Need immediate assistance?</h4>
                                <p className="text-sm text-indigo-700">Our support team is available 24/7.</p>
                            </div>
                        </div>
                        <a href="tel:5551234567" className="px-4 py-2 bg-white text-indigo-700 border border-indigo-200 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap">
                            Call (555) 123-4567
                        </a>
                    </div>
                </div>
            </main>

            {/* Messaging Portal Modal */}
            <PortalCommsModal
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                client={client}
                orgId={orgId}
            />

            {/* Pet Detail Modal */}
            {selectedPet && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={closePetModal}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row"
                        onClick={(e) => e.stopPropagation()}
                    >

                        {/* Left Column: Photo Area */}
                        <div className="w-full md:w-5/12 bg-gray-900 relative flex items-center justify-center p-8">
                            <img
                                src={selectedPet.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPet.name)}&background=random&size=400`}
                                alt={selectedPet.name}
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                            />

                            {/* Mobile Close button */}
                            <button
                                onClick={closePetModal}
                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm z-10 md:hidden"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Right Column: Details Area */}
                        <div className="w-full md:w-7/12 flex flex-col h-full bg-white relative">
                            {/* Desktop Close button */}
                            <button
                                onClick={closePetModal}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors z-10 hidden md:block"
                            >
                                <X size={24} />
                            </button>

                            <div className="p-8 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-start mb-8 pr-10">
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editPetData.name || ''}
                                                onChange={(e) => handleEditChange('name', e.target.value)}
                                                className="text-4xl font-bold text-gray-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent w-full placeholder-gray-300"
                                                placeholder="Pet Name"
                                                autoFocus
                                            />
                                        ) : (
                                            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">{selectedPet.name}</h2>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => isEditing ? handleSavePet() : setIsEditing(true)}
                                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ml-4 shadow-sm ${isEditing
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md hover:scale-105'
                                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                            }`}
                                    >
                                        {isEditing ? <><Save size={16} /> Save Changes</> : <><Edit size={16} /> Edit Info</>}
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* Medical Alerts Badge */}
                                    {selectedPet.medical_alerts && selectedPet.medical_alerts.length > 0 && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-pulse-slow">
                                            <div className="flex items-center gap-2 text-red-700 font-bold mb-3 uppercase tracking-wide text-xs">
                                                <AlertCircle size={14} />
                                                Medical Alerts
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedPet.medical_alerts.map((alert, idx) => (
                                                    <span key={idx} className="px-3 py-1.5 bg-white text-red-700 border border-red-200/50 rounded-lg text-sm font-semibold shadow-sm">{alert}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Breed</label>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editPetData.breed || ''}
                                                    onChange={(e) => handleEditChange('breed', e.target.value)}
                                                    className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium"
                                                />
                                            ) : (
                                                <p className="text-lg text-gray-900 font-medium">{selectedPet.breed || '—'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Age</label>
                                            {isEditing ? (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        value={editPetData.age || ''}
                                                        onChange={(e) => handleEditChange('age', parseInt(e.target.value))}
                                                        className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium"
                                                    />
                                                    <span className="text-gray-500 font-medium whitespace-nowrap">years old</span>
                                                </div>
                                            ) : (
                                                <p className="text-lg text-gray-900 font-medium">{selectedPet.age ? `${selectedPet.age} years old` : '—'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Weight</label>
                                            {isEditing ? (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        value={editPetData.weight || ''}
                                                        onChange={(e) => handleEditChange('weight', parseFloat(e.target.value))}
                                                        className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium"
                                                    />
                                                    <span className="text-gray-500 font-medium whitespace-nowrap">lbs</span>
                                                </div>
                                            ) : (
                                                <p className="text-lg text-gray-900 font-medium">{selectedPet.weight ? `${selectedPet.weight} lbs` : '—'}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Gender</label>
                                            {isEditing ? (
                                                <select
                                                    value={editPetData.gender || ''}
                                                    onChange={(e) => handleEditChange('gender', e.target.value)}
                                                    className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium"
                                                >
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                </select>
                                            ) : (
                                                <p className="text-lg text-gray-900 font-medium capitalize">{selectedPet.gender || '—'}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-8 space-y-8">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                Feeding Instructions
                                            </label>
                                            {isEditing ? (
                                                <textarea
                                                    value={editPetData.feeding_instructions || ''}
                                                    onChange={(e) => handleEditChange('feeding_instructions', e.target.value)}
                                                    rows={4}
                                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-gray-900 leading-relaxed resize-none"
                                                    placeholder="Enter details..."
                                                />
                                            ) : (
                                                <div className="bg-indigo-50/50 rounded-2xl p-5 text-gray-700 leading-relaxed border border-indigo-100/50">
                                                    {selectedPet.feeding_instructions || 'No special feeding instructions provided.'}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                Behavior Notes
                                            </label>
                                            {isEditing ? (
                                                <textarea
                                                    value={editPetData.behavior_notes || ''}
                                                    onChange={(e) => handleEditChange('behavior_notes', e.target.value)}
                                                    rows={4}
                                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-gray-900 leading-relaxed resize-none"
                                                    placeholder="Enter details..."
                                                />
                                            ) : (
                                                <div className="bg-gray-50 rounded-2xl p-5 text-gray-700 leading-relaxed border border-gray-100">
                                                    {selectedPet.behavior_notes || 'No behavior notes available.'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalDashboard;
