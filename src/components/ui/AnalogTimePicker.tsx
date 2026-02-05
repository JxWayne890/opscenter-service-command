import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface AnalogTimePickerProps {
    value: string; // HH:MM format
    onChange: (time: string) => void;
    label?: string;
    disabled?: boolean;
}

const AnalogTimePicker: React.FC<AnalogTimePickerProps> = ({ value, onChange, label, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'hour' | 'minute'>('hour');
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const [hours, minutes] = (value || '09:00').split(':').map(Number);
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const setHour = (hour: number) => {
        const newHour = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
        onChange(`${String(newHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        setMode('minute');
    };

    const setMinute = (minute: number) => {
        onChange(`${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        setIsOpen(false);
    };

    const toggleAMPM = () => {
        const newHours = isPM ? hours - 12 : hours + 12;
        onChange(`${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    };

    const incrementHour = () => {
        const newHours = (hours + 1) % 24;
        onChange(`${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    };

    const decrementHour = () => {
        const newHours = (hours - 1 + 24) % 24;
        onChange(`${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    };

    const incrementMinute = () => {
        const newMinutes = (minutes + 15) % 60;
        onChange(`${String(hours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`);
    };

    const decrementMinute = () => {
        const newMinutes = (minutes - 15 + 60) % 60;
        onChange(`${String(hours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`);
    };

    const formatDisplay = () => {
        return `${displayHours}:${String(minutes).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
    };

    // Clock face rendering
    const renderClockFace = () => {
        const numbers = mode === 'hour' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

        return (
            <div className="relative w-48 h-48 rounded-full bg-slate-50 border-2 border-slate-200 mx-auto">
                {/* Clock numbers */}
                {numbers.map((num, i) => {
                    const angle = (i * 30 - 90) * (Math.PI / 180);
                    const x = 50 + 40 * Math.cos(angle);
                    const y = 50 + 40 * Math.sin(angle);
                    const isSelected = mode === 'hour' ? displayHours === num : minutes === num;

                    return (
                        <button
                            key={num}
                            onClick={() => mode === 'hour' ? setHour(num) : setMinute(num)}
                            className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full text-sm font-bold transition-all ${isSelected
                                ? 'bg-indigo-600 text-white shadow-lg scale-110'
                                : 'text-slate-700 hover:bg-indigo-100 hover:text-indigo-700'
                                }`}
                            style={{ left: `${x}%`, top: `${y}%` }}
                        >
                            {mode === 'minute' ? String(num).padStart(2, '0') : num}
                        </button>
                    );
                })}

                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 w-3 h-3 -ml-1.5 -mt-1.5 bg-indigo-600 rounded-full" />

                {/* Clock hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-1 bg-indigo-600 rounded-full origin-bottom transition-transform duration-200"
                    style={{
                        height: '35%',
                        transform: `translateX(-50%) translateY(-100%) rotate(${mode === 'hour'
                            ? (displayHours % 12) * 30
                            : minutes * 6
                            }deg)`
                    }}
                />
            </div>
        );
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

            {/* Display Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl transition-all group ${disabled ? 'bg-slate-100/50 border-slate-100 cursor-not-allowed' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md ${disabled ? 'bg-slate-300' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                        <Clock size={20} />
                    </div>
                    <span className={`text-lg font-bold ${disabled ? 'text-slate-400' : 'text-slate-900'}`}>{formatDisplay()}</span>
                </div>
                {!disabled && (
                    <div className="flex flex-col">
                        <ChevronUp size={14} className="text-slate-400" />
                        <ChevronDown size={14} className="text-slate-400 -mt-1" />
                    </div>
                )}
            </button>

            {/* Modal Picker - Centered */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={() => setIsOpen(false)}
                    />
                    {/* Modal */}
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="text-center mb-4">
                            <p className="text-sm font-medium text-slate-500">{label}</p>
                            <p className="text-3xl font-black text-slate-900 mt-1">{formatDisplay()}</p>
                        </div>

                        {/* Mode tabs */}
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <button
                                onClick={() => setMode('hour')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'hour'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                Hour
                            </button>
                            <button
                                onClick={() => setMode('minute')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'minute'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                Minute
                            </button>
                        </div>

                        {/* Clock Face */}
                        {renderClockFace()}

                        {/* AM/PM Toggle */}
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <button
                                onClick={toggleAMPM}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${!isPM
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                AM
                            </button>
                            <button
                                onClick={toggleAMPM}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isPM
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                PM
                            </button>
                        </div>

                        {/* Done Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full mt-5 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default AnalogTimePicker;
