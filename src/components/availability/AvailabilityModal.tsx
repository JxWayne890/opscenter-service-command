import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useOpsCenter } from '../../services/store';

interface AvailabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ isOpen, onClose }) => {
    // In a real app, we'd load existing availability here
    const [unavailableDays, setUnavailableDays] = useState<number[]>([]);

    const toggleDay = (index: number) => {
        setUnavailableDays(prev =>
            prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, we'd save this to the store/DB
        alert('Availability Updated!');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 m-4 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Set Availability</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-slate-500 mb-6">Select the days you are <span className="font-bold text-rose-600">UNAVAILABLE</span> to work.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                        {DAYS.map((day, i) => {
                            const isUnavailable = unavailableDays.includes(i);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(i)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isUnavailable
                                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className="font-bold text-sm">{day}</span>
                                    {isUnavailable ? (
                                        <span className="text-[10px] uppercase font-bold bg-rose-200 px-2 py-1 rounded-md">Unavailable</span>
                                    ) : (
                                        <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded-md">Available</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-[0.98]"
                        >
                            Save Availability
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AvailabilityModal;
