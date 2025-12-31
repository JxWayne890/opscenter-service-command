import React, { useState } from 'react';
import { MessageSquare, Users, User, ArrowLeft, Send, Search, Phone, Video, MoreVertical } from 'lucide-react';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { Message } from '../../types';

// Mock Client Data (since store mainly has staff)
const MOCK_CLIENTS = [
    { id: 'c1', name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', lastMsg: 'Is my appointment confirmed?', time: '10:30 AM', unread: 2 },
    { id: 'c2', name: 'Robert Smith', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', lastMsg: 'Thanks for the update!', time: 'Yesterday', unread: 0 },
    { id: 'c3', name: 'Emily Davis', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', lastMsg: 'Can I reschedule?', time: 'Yesterday', unread: 0 },
];

const CommsHub = () => {
    const { staff, messages, currentUser, sendMessage } = useOpsCenter();

    // State
    const [viewMode, setViewMode] = useState<'list' | 'thread'>('list');
    const [activeTab, setActiveTab] = useState<'team' | 'clients'>('team');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [newMessageText, setNewMessageText] = useState('');

    // Derived Data
    const activeThreadUser = activeTab === 'team'
        ? staff.find(u => u.id === selectedThreadId)
        : MOCK_CLIENTS.find(c => c.id === selectedThreadId);

    const handleThreadSelect = (id: string) => {
        setSelectedThreadId(id);
        setViewMode('thread');
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedThreadId(null);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim()) return;

        // In a real app, we'd send to the specific user/thread
        const msg: Message = {
            id: crypto.randomUUID(),
            organization_id: currentUser.organization_id,
            sender_id: currentUser.id,
            group_id: selectedThreadId || 'general',
            content: newMessageText,
            created_at: new Date().toISOString()
        };

        await sendMessage(msg);
        setNewMessageText('');
    };

    // Filter messages for the active thread (Mock logic for demo)
    const threadMessages = [...messages].filter(m =>
        // In a real app, check m.recipient_id === selectedThreadId || m.sender_id === selectedThreadId
        true // Showing all messages for demo purposes in this thread view
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());


    return (
        <div className="h-[calc(100vh-140px)] animate-in fade-in duration-500 flex flex-col">

            {/* --- LIST VIEW --- */}
            {viewMode === 'list' && (
                <div className="flex-1 flex flex-col space-y-4">
                    {/* Header & Toggle */}
                    <div className="flex flex-col space-y-4 px-1">
                        <h2 className="text-3xl font-black text-slate-900">Communication</h2>

                        {/* Segmented Control */}
                        <div className="bg-slate-100 p-1 rounded-xl flex font-bold text-sm">
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all ${activeTab === 'team' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                            >
                                <Users size={16} />
                                <span>Team Chat</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('clients')}
                                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all ${activeTab === 'clients' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                            >
                                <MessageSquare size={16} />
                                <span>Clients</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto px-1 space-y-2 custom-scrollbar pb-20">
                        {activeTab === 'team' ? (
                            // TEAM LIST
                            staff.filter(u => u.id !== currentUser.id).map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => handleThreadSelect(user.id)}
                                    className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-4 shadow-sm active:scale-[0.99] transition-transform"
                                >
                                    <div className="relative">
                                        <img src={user.avatar_url} alt={user.full_name} className="w-12 h-12 rounded-full object-cover" />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h3 className="font-bold text-slate-900 truncate">{user.full_name}</h3>
                                            <span className="text-[10px] font-bold text-slate-400">09:41 AM</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate font-medium">Hey, can you cover my shift effectively?</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            // CLIENTS LIST
                            MOCK_CLIENTS.map(client => (
                                <div
                                    key={client.id}
                                    onClick={() => handleThreadSelect(client.id)}
                                    className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-4 shadow-sm active:scale-[0.99] transition-transform"
                                >
                                    <div className="relative">
                                        <img src={client.avatar} alt={client.name} className="w-12 h-12 rounded-full object-cover" />
                                        {client.unread > 0 && (
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                                {client.unread}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h3 className="font-bold text-slate-900 truncate">{client.name}</h3>
                                            <span className="text-[10px] font-bold text-slate-400">{client.time}</span>
                                        </div>
                                        <p className={`text-xs truncate font-medium ${client.unread > 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                                            {client.lastMsg}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* --- THREAD VIEW --- */}
            {viewMode === 'thread' && (
                <div className="flex-1 flex flex-col bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100 h-full">

                    {/* Thread Header */}
                    <div className="bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-100 z-10 sticky top-0">
                        <div className="flex items-center space-x-3">
                            <button onClick={handleBackToList} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                                <ArrowLeft size={20} className="text-slate-600" />
                            </button>
                            <div className="flex items-center space-x-3">
                                <img
                                    src={activeTab === 'team' ? (activeThreadUser as any)?.avatar_url : (activeThreadUser as any)?.avatar}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        {activeTab === 'team' ? (activeThreadUser as any)?.full_name : (activeThreadUser as any)?.name}
                                    </h3>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                                <Phone size={20} />
                            </button>
                            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                                <Video size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {/* Date Separator */}
                        <div className="flex justify-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Today</span>
                        </div>

                        {threadMessages.map(msg => {
                            const isMe = msg.sender_id === currentUser.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    {!isMe && (
                                        <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" className="w-8 h-8 rounded-full rounded-tr-none mr-2 self-end mb-1" />
                                    )}
                                    <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                                        }`}>
                                        <p>{msg.content}</p>
                                        <p className={`text-[9px] mt-1.5 font-bold text-right ${isMe ? 'text-indigo-200' : 'text-slate-300'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-end space-x-2">
                        <button type="button" className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                            <PlusCircleIcon size={20} />
                        </button>
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 py-2">
                            <input
                                type="text"
                                value={newMessageText}
                                onChange={(e) => setNewMessageText(e.target.value)}
                                placeholder="Message..."
                                className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium h-10"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newMessageText.trim()}
                            className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

// Helper Icon
const PlusCircleIcon = ({ size, className }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
);

export default CommsHub;
