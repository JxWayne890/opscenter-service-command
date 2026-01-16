import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
    value: string; // YYYY-MM-DD format
    onChange: (date: string) => void;
    label?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const selectedDate = value ? new Date(value + 'T00:00:00') : new Date();
    const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
    const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

    useEffect(() => {
        if (isOpen && value) {
            const d = new Date(value + 'T00:00:00');
            setViewMonth(d.getMonth());
            setViewYear(d.getFullYear());
        }
    }, [isOpen, value]);

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const formatDisplay = () => {
        if (!value) return 'Select date';
        const d = new Date(value + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(viewYear, viewMonth, day);
        const formatted = newDate.toISOString().split('T')[0];
        onChange(formatted);
        setIsOpen(false);
    };

    const goToPrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const goToToday = () => {
        const today = new Date();
        setViewMonth(today.getMonth());
        setViewYear(today.getFullYear());
        const formatted = today.toISOString().split('T')[0];
        onChange(formatted);
        setIsOpen(false);
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(viewYear, viewMonth);
        const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
        const cells = [];

        // Empty cells for days before first of month
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="w-10 h-10" />);
        }

        // Day cells
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === value;
            const isToday = dateStr === todayStr;

            cells.push(
                <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center ${isSelected
                            ? 'bg-indigo-600 text-white shadow-lg scale-110'
                            : isToday
                                ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                                : 'text-slate-700 hover:bg-slate-100'
                        }`}
                >
                    {day}
                </button>
            );
        }

        return cells;
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

            {/* Display Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <Calendar size={20} />
                    </div>
                    <span className="text-lg font-bold text-slate-900">{formatDisplay()}</span>
                </div>
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
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={goToPrevMonth}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={20} className="text-slate-600" />
                            </button>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-slate-900">
                                    {months[viewMonth]} {viewYear}
                                </h3>
                            </div>
                            <button
                                onClick={goToNextMonth}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronRight size={20} className="text-slate-600" />
                            </button>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {days.map(day => (
                                <div key={day} className="w-10 h-8 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendar()}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => { onChange(''); setIsOpen(false); }}
                                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                onClick={goToToday}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Today
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CustomDatePicker;
