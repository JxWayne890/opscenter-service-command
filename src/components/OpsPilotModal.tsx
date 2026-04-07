import React from 'react';
import { X, Send, Sparkles, ChevronDown, ChevronRight, MessageSquare, HelpCircle } from 'lucide-react';
import { useOpsCenter } from '../services/store';
import { buildOpsPilotReply, getQuestionCatalog, OPS_PILOT_SUGGESTIONS, CatalogCategory } from '../services/opsPilot';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface OpsPilotModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendingPrompt?: string | null;
    onPromptHandled?: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const OpsPilotModal: React.FC<OpsPilotModalProps> = ({ isOpen, onClose, pendingPrompt, onPromptHandled }) => {
    const { knowledgeBase, shifts, staff, timeEntries, currentUser, clients, payStubs, requests, swaps, organization } = useOpsCenter();
    const [viewportHeight, setViewportHeight] = React.useState(window.visualViewport?.height || window.innerHeight);
    const [keyboardOffset, setKeyboardOffset] = React.useState(0);

    // Tab state
    const [activeTab, setActiveTab] = React.useState<'chat' | 'catalog'>('chat');

    // Chat State
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [inputValue, setInputValue] = React.useState('');
    const [isTyping, setIsTyping] = React.useState(false);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    // Catalog state
    const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

    useEscapeKey(onClose, isOpen);

    React.useEffect(() => {
        if (!isOpen) {
            setTimeout(() => { setMessages([]); setActiveTab('chat'); }, 300);
            return;
        }

        if (!window.visualViewport) return;

        const handleResize = () => {
            const viewport = window.visualViewport;
            if (!viewport) return;
            setViewportHeight(viewport.height);
            const offset = window.innerHeight - viewport.height;
            setKeyboardOffset(offset > 0 ? offset : 0);
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
        handleResize();

        // Initial Greeting
        if (messages.length === 0 && !pendingPrompt) {
            setIsTyping(true);
            setTimeout(() => {
                setMessages([{
                    id: 'init',
                    role: 'assistant',
                    content: "Hello! I'm OpsPilot. Ask me about schedules, attendance, dogs, your hours, and more. Tap the Questions tab to see everything I can answer.",
                    timestamp: new Date()
                }]);
                setIsTyping(false);
            }, 600);
        }

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, [isOpen, pendingPrompt]);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const buildContext = () => ({
        knowledgeBase, shifts, staff, timeEntries,
        currentUser: currentUser!,
        clients, payStubs, requests, swaps, organization,
    });

    const handleSend = (text: string) => {
        if (!text.trim() || !currentUser) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        setTimeout(() => {
            const responseContent = buildOpsPilotReply(text, buildContext());
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseContent, timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 500);
    };

    const handleCatalogQuestion = (question: string) => {
        setActiveTab('chat');
        setTimeout(() => handleSend(question), 100);
    };

    React.useEffect(() => {
        if (!isOpen || !pendingPrompt || isTyping) return;
        handleSend(pendingPrompt);
        onPromptHandled?.();
    }, [isOpen, pendingPrompt, isTyping]);

    const toggleCategory = (id: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    if (!isOpen) return null;

    const catalog: CatalogCategory[] = currentUser ? getQuestionCatalog(currentUser) : [];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 transition-[bottom] duration-300"
            style={{ bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : '0px', height: keyboardOffset > 0 ? `${viewportHeight}px` : '100%' }}
        >
            <div className="absolute inset-x-0 top-0 bg-slate-900/60 backdrop-blur-sm" style={{ height: '200vh', top: '-100vh' }} onClick={onClose} />

            <div className="relative w-full max-w-lg bg-slate-900 text-white rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh] sm:max-h-[700px]">
                {/* Header */}
                <div className="relative z-10 px-6 py-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-md flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center space-x-2">
                            <Sparkles className="text-indigo-400" size={20} />
                            <h3 className="text-xl font-bold tracking-tight">OpsPilot</h3>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <p className="text-emerald-400/80 text-xs font-medium">Intelligence layer active</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close OpsPilot" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Bar */}
                <div className="flex border-b border-white/10 shrink-0">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'chat' ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <MessageSquare size={14} /> Chat
                    </button>
                    <button
                        onClick={() => setActiveTab('catalog')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'catalog' ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <HelpCircle size={14} /> Questions
                    </button>
                </div>

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                    <>
                        <div className={`relative z-10 flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide ${keyboardOffset > 0 ? 'pb-2' : 'pb-4'}`}>
                            {messages.length < 2 && (
                                <div className="mb-4 mt-2">
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest text-center mb-3">Quick Questions</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {OPS_PILOT_SUGGESTIONS.map(q => (
                                            <button key={q} onClick={() => handleSend(q)} className="p-3 bg-white/5 rounded-xl text-sm font-medium text-left hover:bg-indigo-600/20 transition-all border border-white/10">
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white/10 text-slate-100 rounded-bl-sm border border-white/5'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-sm border border-white/5 flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className={`relative z-10 p-4 border-t border-white/10 bg-slate-900/80 shrink-0 ${keyboardOffset > 0 ? 'pb-2' : 'pb-8 sm:pb-4'}`}>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Sparkles size={14} className="text-white" />
                                </div>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend(inputValue)}
                                    placeholder="Ask OpsPilot..."
                                    aria-label="Ask OpsPilot a question"
                                    className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-14 pr-12 text-sm font-medium focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white placeholder-white/30"
                                />
                                <button
                                    onClick={() => handleSend(inputValue)}
                                    disabled={!inputValue.trim() || isTyping}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full text-slate-900 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Questions/Catalog Tab */}
                {activeTab === 'catalog' && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <p className="text-xs text-white/30 font-medium mb-3 px-1">
                            Tap any question to ask it. Questions are filtered by your role.
                        </p>
                        {catalog.map(cat => (
                            <div key={cat.id} className="rounded-xl overflow-hidden">
                                <button
                                    onClick={() => toggleCategory(cat.id)}
                                    className="w-full flex items-center justify-between p-3.5 bg-white/5 hover:bg-white/10 transition-colors rounded-xl text-left"
                                >
                                    <span className="text-sm font-bold text-white">{cat.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{cat.questions.length}</span>
                                        {expandedCategories.has(cat.id) ? <ChevronDown size={16} className="text-white/40" /> : <ChevronRight size={16} className="text-white/40" />}
                                    </div>
                                </button>
                                {expandedCategories.has(cat.id) && (
                                    <div className="space-y-1 mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {cat.questions.map(q => (
                                            <button
                                                key={q.intentId}
                                                onClick={() => handleCatalogQuestion(q.displayQuestion)}
                                                className="w-full text-left p-3 pl-6 text-sm text-white/70 hover:text-white hover:bg-indigo-600/20 rounded-lg transition-colors"
                                            >
                                                {q.displayQuestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OpsPilotModal;
