import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Plus, Trash2, Dog, User, Phone, Mail, MapPin, Camera, Loader2, Sparkles, Settings } from 'lucide-react';
import { Client, Pet } from '../../types';
import { formatPhoneNumber } from '../../utils/formatters';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (clientData: Partial<Client>, petsData: Partial<Pet>[]) => void;
    initialClient?: Client | null;
}

interface PetFormState extends Partial<Pet> {
    medical_alerts_raw?: string;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onSave, initialClient }) => {
    // Client State
    const [clientDisplay, setClientDisplay] = useState({
        full_name: '',
        email: '',
        phone_primary: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        vet_clinic_name: '',
        vet_clinic_phone: '',
        access_code: '',
        notes: ''
    });

    // Pets State
    const [pets, setPets] = useState<PetFormState[]>([
        { id: 'temp-1', name: '', breed: '', gender: 'male', is_spayed_neutered: false, medical_alerts: [], behavior_tags: [] }
    ]);

    const isEditMode = !!initialClient;

    const [activePetIndex, setActivePetIndex] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || '';

    const uploadToImgBB = async (file: File) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (data.success) {
                handlePetChange(activePetIndex, 'avatar_url', data.data.url);
            } else {
                console.error('Upload failed:', data.error);
                alert('Photo upload failed. Please try again.');
            }
        } catch (error) {
            console.error('Error uploading to ImgBB:', error);
            alert('Error uploading photo. Please check your connection.');
        } finally {
            setIsUploading(false);
        }
    };

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialClient) {
                setClientDisplay({
                    full_name: initialClient.full_name,
                    email: initialClient.email,
                    phone_primary: formatPhoneNumber(initialClient.phone_primary),
                    address: initialClient.address || '',
                    city: initialClient.city || '',
                    state: initialClient.state || '',
                    zip: initialClient.zip || '',
                    emergency_contact_name: initialClient.emergency_contact_name || '',
                    emergency_contact_phone: formatPhoneNumber(initialClient.emergency_contact_phone || ''),
                    vet_clinic_name: initialClient.vet_clinic_name || '',
                    vet_clinic_phone: formatPhoneNumber(initialClient.vet_clinic_phone || ''),
                    access_code: initialClient.access_code || '',
                    notes: initialClient.notes || ''
                });
                setPets(initialClient.pets?.map(p => ({
                    ...p,
                    medical_alerts_raw: p.medical_alerts?.join(', ') || ''
                })) || [
                        { id: 'temp-1', name: '', breed: '', gender: 'male', is_spayed_neutered: false, medical_alerts: [], behavior_tags: [] }
                    ]);
            } else {
                setClientDisplay({
                    full_name: '',
                    email: '',
                    phone_primary: '',
                    address: '',
                    city: '',
                    state: '',
                    zip: '',
                    emergency_contact_name: '',
                    emergency_contact_phone: '',
                    vet_clinic_name: '',
                    vet_clinic_phone: '',
                    access_code: '',
                    notes: ''
                });
                setPets([
                    { id: 'temp-1', name: '', breed: '', gender: 'male', is_spayed_neutered: false, medical_alerts: [], behavior_tags: [] }
                ]);
            }
            setActivePetIndex(0);
        }
    }, [isOpen, initialClient]);

    const handleClientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const phoneFields = ['phone_primary', 'emergency_contact_phone', 'vet_clinic_phone'];
        if (phoneFields.includes(name)) {
            setClientDisplay(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
        } else {
            setClientDisplay(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePetChange = (index: number, field: keyof Pet, value: any) => {
        const newPets = [...pets];
        newPets[index] = { ...newPets[index], [field]: value };
        setPets(newPets);
    };

    const addPet = () => {
        const newId = `temp-${pets.length + 1}`;
        setPets([...pets, { id: newId, name: '', breed: '', gender: 'male', is_spayed_neutered: false, medical_alerts: [], behavior_tags: [] }]);
        setActivePetIndex(pets.length);
    };

    const removePet = (index: number) => {
        if (pets.length === 1) return; // Prevent removing the last pet
        const newPets = pets.filter((_, i) => i !== index);
        setPets(newPets);
        setActivePetIndex(Math.max(0, index - 1));
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadToImgBB(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            uploadToImgBB(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(
            initialClient ? { ...clientDisplay, id: initialClient.id } : clientDisplay,
            pets
        );
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Client Profile' : 'Add New Client'}</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {isEditMode ? 'Update client information and pet records' : 'Create a new client profile and add their pets'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-8 grid lg:grid-cols-2 gap-12">

                        {/* LEFT COLUMN: Client Details */}
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <User size={16} /> Owner Information
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                                        <input
                                            name="full_name"
                                            required
                                            value={clientDisplay.full_name}
                                            onChange={handleClientChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                            placeholder="e.g. Jane Doe"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
                                            <div className="relative">
                                                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    name="email"
                                                    type="email"
                                                    value={clientDisplay.email}
                                                    onChange={handleClientChange}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                    placeholder="jane@example.com"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone</label>
                                            <div className="relative">
                                                <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                                                <input
                                                    name="phone_primary"
                                                    value={clientDisplay.phone_primary}
                                                    onChange={handleClientChange}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                    placeholder="(555) 000-0000"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Address</label>
                                        <div className="relative">
                                            <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                                            <input
                                                name="address"
                                                value={clientDisplay.address}
                                                onChange={handleClientChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                placeholder="123 Dogwood Lane"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">City</label>
                                            <input
                                                name="city"
                                                value={clientDisplay.city}
                                                onChange={handleClientChange}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                placeholder="City"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">State</label>
                                            <input
                                                name="state"
                                                value={clientDisplay.state}
                                                onChange={handleClientChange}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                placeholder="State"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Zip</label>
                                            <input
                                                name="zip"
                                                value={clientDisplay.zip}
                                                onChange={handleClientChange}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                placeholder="Zip"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Phone size={16} /> Emergency Contact
                                </h3>
                                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-rose-900 mb-1.5 uppercase">Contact Name</label>
                                        <input
                                            name="emergency_contact_name"
                                            value={clientDisplay.emergency_contact_name}
                                            onChange={handleClientChange}
                                            className="w-full px-4 py-2 bg-white border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all text-sm"
                                            placeholder="Emergency Contact Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-rose-900 mb-1.5 uppercase">Contact Phone</label>
                                        <input
                                            name="emergency_contact_phone"
                                            value={clientDisplay.emergency_contact_phone}
                                            onChange={handleClientChange}
                                            className="w-full px-4 py-2 bg-white border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all text-sm"
                                            placeholder="Emergency Contact Phone"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sparkles size={16} className="text-indigo-400" /> Veterinary Information
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Vet Clinic Name</label>
                                        <input
                                            name="vet_clinic_name"
                                            value={clientDisplay.vet_clinic_name}
                                            onChange={handleClientChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            placeholder="e.g. Westside Animal Hospital"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Vet Phone</label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                                            <input
                                                name="vet_clinic_phone"
                                                value={clientDisplay.vet_clinic_phone}
                                                onChange={handleClientChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                placeholder="(555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Settings size={16} /> Access & Notes
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Access Code / Entry Instructions</label>
                                        <input
                                            name="access_code"
                                            value={clientDisplay.access_code}
                                            onChange={handleClientChange}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all"
                                            placeholder="Gate code, hidden key location, etc."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Internal Notes</label>
                                        <textarea
                                            name="notes"
                                            value={clientDisplay.notes}
                                            onChange={handleClientChange}
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all resize-none"
                                            placeholder="Any other important info about this client..."
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Pet Details */}
                        <div className="space-y-8">
                            <section className="flex justify-between items-center">
                                <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest flex items-center gap-2">
                                    <Dog size={16} /> Pets
                                </h3>
                                <button type="button" onClick={addPet} className="text-xs font-bold text-brand-blue hover:text-brand-dark flex items-center gap-1 transition-colors">
                                    <Plus size={14} /> Add Another Pet
                                </button>
                            </section>

                            {/* Pet Tabs */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {pets.map((pet, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActivePetIndex(idx)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activePetIndex === idx
                                            ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/25'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        {pet.name || `Pet ${idx + 1}`}
                                    </button>
                                ))}
                            </div>

                            {/* Active Pet Form */}
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative animate-in fade-in slide-in-from-right-4 duration-300">
                                {pets.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removePet(activePetIndex)}
                                        className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                                        title="Remove Pet"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}

                                {/* Photo Upload */}
                                <div className="flex justify-center mb-8">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                    />
                                    <div
                                        onClick={handlePhotoClick}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`relative w-32 h-32 rounded-full cursor-pointer group transition-all duration-300 ${pets[activePetIndex].avatar_url
                                            ? 'ring-4 ring-white shadow-xl'
                                            : `border-2 border-dashed bg-white hover:bg-blue-50 ${isDragging ? 'border-brand-blue border-solid scale-105' : 'border-slate-300 hover:border-brand-blue'}`
                                            }`}
                                    >
                                        {isUploading ? (
                                            <div className="flex flex-col items-center justify-center h-full text-brand-blue">
                                                <Loader2 size={24} className="animate-spin mb-2" />
                                                <span className="text-[10px] font-bold uppercase tracking-wide">Uploading...</span>
                                            </div>
                                        ) : pets[activePetIndex].avatar_url ? (
                                            <img
                                                src={pets[activePetIndex].avatar_url}
                                                alt="Pet"
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 group-hover:text-brand-blue">
                                                <Camera size={24} className="mb-2" />
                                                <span className="text-[10px] font-bold uppercase tracking-wide">Add Photo</span>
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        {!isUploading && (
                                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Upload size={24} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Pet Name</label>
                                            <input
                                                value={pets[activePetIndex].name}
                                                onChange={(e) => handlePetChange(activePetIndex, 'name', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                placeholder="Spot"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Breed</label>
                                            <input
                                                value={pets[activePetIndex].breed}
                                                onChange={(e) => handlePetChange(activePetIndex, 'breed', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                placeholder="Dalmatian"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Age (yrs)</label>
                                            <input
                                                type="number"
                                                value={pets[activePetIndex].age || ''}
                                                onChange={(e) => handlePetChange(activePetIndex, 'age', parseInt(e.target.value))}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                placeholder="3"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Weight (lbs)</label>
                                            <input
                                                type="number"
                                                value={pets[activePetIndex].weight || ''}
                                                onChange={(e) => handlePetChange(activePetIndex, 'weight', parseInt(e.target.value))}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                                placeholder="45"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Gender</label>
                                            <select
                                                value={pets[activePetIndex].gender}
                                                onChange={(e) => handlePetChange(activePetIndex, 'gender', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none"
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-brand-blue transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={pets[activePetIndex].is_spayed_neutered}
                                                onChange={(e) => handlePetChange(activePetIndex, 'is_spayed_neutered', e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                                            />
                                            <span className="font-bold text-slate-700">Spayed / Neutered</span>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Medical / Behavioral Alerts</label>
                                        <textarea
                                            value={pets[activePetIndex].medical_alerts_raw || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const newPets = [...pets];
                                                newPets[activePetIndex] = {
                                                    ...newPets[activePetIndex],
                                                    medical_alerts_raw: val,
                                                    medical_alerts: val.split(',').map(s => s.trim()).filter(s => s !== '')
                                                };
                                                setPets(newPets);
                                            }}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all h-20 text-sm"
                                            placeholder="Separate tags with commas... e.g. Diabetic, Dog Selective"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 sticky bottom-0 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-brand-blue/25 hover:bg-brand-dark hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                    >
                        <User size={20} />
                        {isEditMode ? 'Update Profile' : 'Create Client Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddClientModal;
