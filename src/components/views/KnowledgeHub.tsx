import React, { useState, useMemo } from 'react';
import { Plus, Search, ChevronRight, AlertTriangle } from 'lucide-react';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { useToast } from '../ui/Toast';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isManager } from '../../services/permissions';

// Critical tags/categories that indicate critical procedures
const CRITICAL_KEYWORDS = ['emergency', 'critical', 'safety', 'incident', 'evacuation', 'bite', 'seizure', 'allergic'];

const isCriticalEntry = (entry: { title: string; tags: string[]; category: string }) => {
    const lower = `${entry.title} ${entry.category} ${(entry.tags || []).join(' ')}`.toLowerCase();
    return CRITICAL_KEYWORDS.some(kw => lower.includes(kw)) || (entry.tags || []).some(t => t.toLowerCase() === 'critical');
};

const KnowledgeHub = () => {
    const { searchKnowledge, currentUser, knowledgeBase } = useOpsCenter();
    const { showToast } = useToast();
    usePageTitle('Knowledge Hub');
    const [query, setQuery] = useState('');

    const entries = searchKnowledge(query);

    // Separate critical entries
    const criticalEntries = useMemo(() => knowledgeBase.filter(isCriticalEntry), [knowledgeBase]);
    const regularEntries = useMemo(() => entries.filter(e => !isCriticalEntry(e)), [entries]);
    const criticalInResults = useMemo(() => entries.filter(isCriticalEntry), [entries]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Staff FAQ & Knowledge</h1>
                {isManager(currentUser) && (
                    <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-xs shadow-lg flex items-center space-x-2 active:scale-95 transition-transform" onClick={() => showToast('Create SOP coming soon', 'info')}>
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
                    className="w-full bg-white border border-slate-200 rounded-[2rem] py-5 pl-12 pr-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
            </div>

            {/* Critical Procedures Section */}
            {!query && criticalEntries.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={16} className="text-rose-500" />
                        <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest">Critical Procedures</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {criticalEntries.map(entry => (
                            <SectionCard key={entry.id} className="hover:scale-[1.02] transition-transform cursor-pointer border-l-4 !border-l-rose-500">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-extrabold text-rose-600 uppercase tracking-widest px-2 py-1 bg-rose-50 rounded-md">{entry.category}</span>
                                        <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 uppercase">Critical</span>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300" />
                                </div>
                                <h4 className="font-bold text-lg mb-2">{entry.title}</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">{entry.content_raw}</p>
                            </SectionCard>
                        ))}
                    </div>
                </div>
            )}

            {/* Search results — critical entries in results get special styling */}
            {query && criticalInResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {criticalInResults.map(entry => (
                        <SectionCard key={entry.id} className="hover:scale-[1.02] transition-transform cursor-pointer border-l-4 !border-l-rose-500">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-rose-600 uppercase tracking-widest px-2 py-1 bg-rose-50 rounded-md">{entry.category}</span>
                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 uppercase">Critical</span>
                                </div>
                                <ChevronRight size={16} className="text-slate-300" />
                            </div>
                            <h4 className="font-bold text-lg mb-2">{entry.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">{entry.content_raw}</p>
                        </SectionCard>
                    ))}
                </div>
            )}

            {/* Regular entries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(query ? regularEntries : entries.filter(e => !isCriticalEntry(e))).length > 0 ? (query ? regularEntries : entries.filter(e => !isCriticalEntry(e))).map(entry => (
                    <SectionCard key={entry.id} className="hover:scale-[1.02] transition-transform cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest px-2 py-1 bg-indigo-50 rounded-md">{entry.category}</span>
                            <ChevronRight size={16} className="text-slate-300" />
                        </div>
                        <h4 className="font-bold text-lg mb-2">{entry.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">{entry.content_raw}</p>
                    </SectionCard>
                )) : (
                    query && regularEntries.length === 0 && criticalInResults.length === 0 && (
                        <div className="col-span-3 text-center py-12 text-slate-400">
                            <Search size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold text-slate-400">No knowledge entries found for "{query}"</p>
                            <p className="text-xs text-slate-300 mt-1">Try a different search term</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default KnowledgeHub;
