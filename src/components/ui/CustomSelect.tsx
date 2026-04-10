import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface Option {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    label,
    icon,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const idx = options.findIndex(opt => opt.value === value);
            setFocusedIndex(idx >= 0 ? idx : 0);
        }
    }, [isOpen, options, value]);

    const handleSelect = (optValue: string) => {
        onChange(optValue);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => Math.min(prev + 1, options.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < options.length) {
                    handleSelect(options[focusedIndex].value);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
        }
    };

    return (
        <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
            {label && (
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{label}</label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl text-left transition-all group ${disabled ? 'bg-slate-100/50 border-slate-100 cursor-not-allowed text-slate-400' : (isOpen ? 'bg-slate-50 border-indigo-400 ring-2 ring-indigo-100' : 'bg-slate-50 border-slate-200 hover:border-indigo-300')
                    }`}
            >
                <div className="flex items-center gap-3">
                    {icon && (
                        <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                            {icon}
                        </span>
                    )}
                    <div>
                        <span className={`text-sm font-semibold ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}>
                            {selectedOption?.label || placeholder}
                        </span>
                        {selectedOption?.description && (
                            <span className="text-slate-400 text-xs ml-2">• {selectedOption.description}</span>
                        )}
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown - Inline below trigger */}
            {isOpen && (
                <div role="listbox" className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="max-h-56 overflow-y-auto py-1">
                        {options.map((option, idx) => (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={value === option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${value === option.value
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : idx === focusedIndex ? 'bg-slate-100 text-slate-700' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {option.icon && <span>{option.icon}</span>}
                                    <div>
                                        <span className="text-sm font-semibold">{option.label}</span>
                                        {option.description && (
                                            <p className="text-xs text-slate-400">{option.description}</p>
                                        )}
                                    </div>
                                </div>
                                {value === option.value && (
                                    <Check size={16} className="text-indigo-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
