import React, { useState } from 'react';
import { Plus, Search, ChevronRight } from 'lucide-react';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';

import { isManager } from '../../services/permissions';

const KnowledgeHub = () => {
    const { searchKnowledge, currentUser } = useOpsCenter();
    const [query, setQuery] = useState('');

    // In a real app we might debounce this, but local filtering is fast enough
    const entries = searchKnowledge(query);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-extrabold tracking-tight">Staff FAQ & Knowledge</h2>
                {isManager(currentUser) && (
                    <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-xs shadow-lg flex items-center space-x-2 active:scale-95 transition-transform" onClick={() => alert('Create SOP Modal would open here')}>
                        <Plus size={16} />
                        <span>Create SOP</span>
                    </button>
                )}
            </div>
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Search protocols, wifi, codes..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-5 pl-12 pr-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {entries.length > 0 ? entries.map(entry => (
                    <SectionCard key={entry.id} className="hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest px-2 py-1 bg-indigo-50 rounded-md">{entry.category}</span>
                            <ChevronRight size={16} className="text-slate-300" />
                        </div>
                        <h4 className="font-bold text-lg mb-2">{entry.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">{entry.content_raw}</p>
                    </SectionCard>
                )) : (
                    <div className="col-span-3 text-center py-12 text-slate-400">
                        <p>No knowledge entries found for "{query}".</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeHub;
