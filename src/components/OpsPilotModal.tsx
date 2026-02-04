import React from 'react';
import { X, Send, Sparkles } from 'lucide-react';

interface OpsPilotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MOCK_RESPONSES: Record<string, string> = {
    'summary of knowledge base updates': `I've analyzed the Knowledge Base changes from the last 24 hours.

**Recent Updates:**
• **Opening Procedures (SOP-101):** Updated by *Mike Chen* to include new alarm codes.
• **Uniform Policy:** Revised to allow seasonal summer wear.
• **Emergency Contacts:** Added local fire department direct line.

Would you like me to flag any of these for team review?`,

    'who is late for shift?': `Scanning timeclock data...

⚠️ **Attendance Alert**
**Sarah Jenkins** is currently **15 minutes late** for her 08:00 AM shift.

*History:* This is her second occurrence this month.
*Contact:* I can draft a text message to her checking on her status.`,

    'check opening sops': `Retrieving **Standard Operating Procedures**...

**Opening Checklist Status (Today):**
✅ Alarm Deactivated (07:45 AM)
✅ Lights & HVAC On (07:50 AM)
✅ Cash Drawers Counted (08:00 AM)
❌ **Perishables Inventory** - *Pending*

*Action:* The inventory check is 5 minutes overdue. I've sent a reminder to the Supervisor on duty.`,

    'default': `I'm processing that request using the Service Command neural engine...

I can help you with:
• **Real-time Roster Status**
• **Compliance & SOP Verification**
• **Instant Team Communication**

Try asking "Who is on site?" or "Draft a shift summary."`
};

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const OpsPilotModal: React.FC<OpsPilotModalProps> = ({ isOpen, onClose }) => {
    const [viewportHeight, setViewportHeight] = React.useState(window.visualViewport?.height || window.innerHeight);
    const [keyboardOffset, setKeyboardOffset] = React.useState(0);

    // Chat State
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [inputValue, setInputValue] = React.useState('');
    const [isTyping, setIsTyping] = React.useState(false);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!isOpen) {
            // Reset chat slightly after close for smooth re-entry
            setTimeout(() => setMessages([]), 300);
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
        if (messages.length === 0) {
            setIsTyping(true);
            setTimeout(() => {
                setMessages([{
                    id: 'init',
                    role: 'assistant',
                    content: "Hello! I'm OpsPilot. I'm connected to your location's real-time data feeds. How can I assist you today?",
                    timestamp: new Date()
                }]);
                setIsTyping(false);
            }, 800);
        }

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, [isOpen]);

    // Auto-scroll to bottom
    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulate AI Latency
        setTimeout(() => {
            const lowerText = text.toLowerCase();
            const responseKey = Object.keys(MOCK_RESPONSES).find(k => lowerText.includes(k)) || 'default';
            const responseContent = MOCK_RESPONSES[responseKey];

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 transition-[bottom] duration-300"
            style={{
                bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : '0px',
                height: keyboardOffset > 0 ? `${viewportHeight}px` : '100%'
            }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-x-0 top-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                style={{ height: '200vh', top: '-100vh' }}
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-slate-900 text-white rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh] sm:max-h-[700px]">
                {/* Background Image Layer */}
                <img
                    src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&q=80&w=600"
                    className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
                />

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
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Area */}
                <div className={`relative z-10 flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide transition-all duration-300 ${keyboardOffset > 0 ? 'pb-2' : 'pb-4'}`}>

                    {/* Welcome Suggestions (Only show if few messages) */}
                    {messages.length < 2 && (
                        <div className="mb-6 mt-4">
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest text-center mb-4">Suggested Queries</p>
                            <div className="grid grid-cols-1 gap-2">
                                {['Summary of Knowledge Base updates', 'Who is late for shift?', 'Check Opening SOPs'].map(q => (
                                    <button
                                        key={q}
                                        onClick={() => handleSend(q)}
                                        className="p-3 bg-white/5 backdrop-blur-sm rounded-xl text-sm font-medium text-left hover:bg-indigo-600/20 hover:border-indigo-500/30 transition-all border border-white/10 flex items-center justify-between group"
                                    >
                                        <span>{q}</span>
                                        <ArrowRightIcon className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-300" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message Stream */}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div
                                className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                        : 'bg-white/10 backdrop-blur-md text-slate-100 rounded-bl-sm border border-white/5'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl rounded-bl-sm border border-white/5 flex items-center space-x-1">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className={`relative z-10 p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-xl shrink-0 transition-all duration-300 ${keyboardOffset > 0 ? 'pb-2' : 'pb-8 sm:pb-4'}`}>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                            placeholder="Ask OpsPilot..."
                            className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-14 pr-12 text-sm font-medium focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-white placeholder-white/30"
                        />
                        <button
                            onClick={() => handleSend(inputValue)}
                            disabled={!inputValue.trim() || isTyping}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full text-slate-900 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ArrowRightIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

export default OpsPilotModal;
