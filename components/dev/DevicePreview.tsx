import React, { useState, useEffect } from 'react';
import { Smartphone, Tablet, Monitor, RotateCcw } from 'lucide-react';

interface DevicePreviewProps {
    children: React.ReactNode;
}

const DevicePreview: React.FC<DevicePreviewProps> = ({ children }) => {
    // Check local storage for persistence or default to desktop
    const [mode, setMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [key, setKey] = useState(0); // To force refresh

    // If we are ALREADY in the iframe (preview mode), render children directly
    const isPreviewFrame = window.location.search.includes('view=preview');

    if (isPreviewFrame) {
        return <>{children}</>;
    }

    const getDimensions = () => {
        switch (mode) {
            case 'mobile': return { width: '375px', height: '812px' }; // iPhone X/11/12/13/14/15 approx
            case 'tablet': return { width: '768px', height: '1024px' }; // iPad Portrait
            default: return { width: '100%', height: '100%' };
        }
    };

    const dims = getDimensions();

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Toolbar */}
            <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-center space-x-6 px-4 shadow-lg z-50">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mr-4">Preview Mode</span>

                <button
                    onClick={() => setMode('mobile')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${mode === 'mobile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    <Smartphone size={18} />
                    <span className="text-xs font-bold">Mobile</span>
                </button>

                <button
                    onClick={() => setMode('tablet')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${mode === 'tablet' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    <Tablet size={18} />
                    <span className="text-xs font-bold">Tablet</span>
                </button>

                <button
                    onClick={() => setMode('desktop')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${mode === 'desktop' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                >
                    <Monitor size={18} />
                    <span className="text-xs font-bold">Desktop</span>
                </button>

                <div className="w-px h-6 bg-slate-600 mx-4"></div>

                <button
                    onClick={() => setKey(k => k + 1)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <RotateCcw size={16} />
                </button>
            </div>

            {/* Viewport Area */}
            <div className={`flex-1 overflow-hidden relative ${mode !== 'desktop' ? 'flex items-center justify-center py-8' : ''}`}>
                {mode === 'desktop' ? (
                    <div className="w-full h-full bg-slate-50 overflow-y-auto">
                        {children}
                    </div>
                ) : (
                    <div
                        className="bg-white rounded-[32px] overflow-hidden shadow-2xl border-8 border-slate-800 relative transition-all duration-300"
                        style={{ width: dims.width, height: dims.height }}
                    >
                        {/* Notch simulation for mobile/tablet just for flavor */}
                        {mode === 'mobile' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-slate-800 rounded-b-2xl z-50 pointer-events-none"></div>}

                        <iframe
                            key={`${mode}-${key}`}
                            src={`${window.location.origin}?view=preview`}
                            className="w-full h-full border-0 bg-white"
                            title="Device Preview"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DevicePreview;
