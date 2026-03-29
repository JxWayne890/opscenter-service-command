import React, { useState, useEffect } from 'react';
import { X, Dog, Calendar, DollarSign } from 'lucide-react';
import { Pet, ServiceType } from '../../types';
import { BillingService } from '../../services/billing';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  pets: Pet[];
  onSuccess: () => void;
}

const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, clientId, pets, onSuccess }) => {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      BillingService.getServiceTypes().then(types => {
        setServiceTypes(types.filter(t => t.is_active));
      });
      setSelectedPetId(pets.length === 1 ? pets[0].id : '');
      setSelectedServiceId('');
      setQuantity('1');
      setNotes('');
      setError(null);
    }
  }, [isOpen, pets]);

  const selectedService = serviceTypes.find(s => s.id === selectedServiceId);
  const unitRate = selectedService?.rate || 0;
  const totalAmount = (parseFloat(quantity) || 0) * unitRate;

  const unitLabels: Record<string, string> = {
    per_night: 'nights',
    per_day: 'days',
    per_session: 'sessions',
    per_hour: 'hours',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPetId) { setError('Please select a pet.'); return; }
    if (!selectedServiceId || !selectedService) { setError('Please select a service.'); return; }
    if (!quantity || parseFloat(quantity) <= 0) { setError('Quantity must be greater than 0.'); return; }

    setSaving(true);
    try {
      const record = await BillingService.createServiceRecord({
        client_id: clientId,
        pet_id: selectedPetId,
        service_type_id: selectedServiceId,
        service_category: selectedService.category,
        check_in: new Date().toISOString(),
        quantity: parseFloat(quantity),
        unit_rate: unitRate,
        status: 'active',
        notes: notes.trim() || undefined,
      });

      if (record) {
        onSuccess();
        onClose();
      } else {
        setError('Failed to create service record. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-xl border border-white/50 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 m-4 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-80" />

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Check In</h2>
            <p className="text-sm font-medium text-slate-500">Record a service for billing</p>
          </div>
          <button onClick={onClose} aria-label="Close check-in modal" className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Pet Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pet</label>
            <div className="grid grid-cols-2 gap-2">
              {pets.map(pet => (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                    selectedPetId === pet.id
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Dog size={16} />
                  <span className="text-sm font-bold truncate">{pet.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service</label>
            {serviceTypes.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                No services defined. Add services in Settings first.
              </div>
            ) : (
              <div className="space-y-2">
                {serviceTypes.map(svc => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => setSelectedServiceId(svc.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      selectedServiceId === svc.id
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-900">{svc.name}</span>
                    <span className="text-sm font-black text-indigo-600">${svc.rate.toFixed(2)}<span className="text-[10px] text-slate-400 font-medium">/{unitLabels[svc.rate_unit]?.replace('s', '')}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          {selectedService && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Quantity ({unitLabels[selectedService.rate_unit]})
              </label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="0.5"
                step="0.5"
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none h-16"
              placeholder="Special instructions..."
            />
          </div>

          {/* Total Preview */}
          {selectedService && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-600" />
                <span className="text-sm font-bold text-emerald-900">Estimated Total</span>
              </div>
              <span className="text-xl font-black text-emerald-700">${totalAmount.toFixed(2)}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !selectedPetId || !selectedServiceId}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Processing...' : `Check In — $${totalAmount.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CheckInModal;
