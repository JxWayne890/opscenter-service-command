import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, MessageSquare, Image as ImageIcon, Search, MoreVertical, CheckSquare, PlusCircle } from 'lucide-react';
import { supabase } from '../../services/db';
import { Message, Profile, Client } from '../../types';

// Helper: Get Initials
const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Helper: Get consistent color from name
const getAvatarColor = (name: string) => {
    const colors = [
        'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
        'bg-cyan-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

interface PortalCommsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
    orgId: string;
}

const PortalCommsModal: React.FC<PortalCommsModalProps> = ({ isOpen, onClose, client, orgId }) => {
    // State
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [staffContacts, setStaffContacts] = useState<Profile[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Image Upload State
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const IMGBB_API_KEY = '21c70359a24d1d10335f4f41a8867b08';

    // Auto-Scroll Ref
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeConversationId, lightboxImage]);

    // Helper: Get last message with a specific staff member
    const getLastMessageWithUser = (userId: string) => {
        const conversation = messages.filter(m =>
            (m.sender_id === client.id && m.recipient_id === userId) ||
            (m.sender_id === userId && m.recipient_id === client.id)
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return conversation[0] || null;
    };

    // Helper: Format time for display
    const formatMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Helper: Clean Preview Text
    const getPreviewText = (content: string) => {
        if (!content) return 'No messages';

        // Handle single image
        if (content.startsWith('http') && (content.match(/\.(jpeg|jpg|gif|png)$/) != null || content.includes('ibb.co'))) {
            return '📷 Sent an image';
        }

        // Handle multiple images (JSON array)
        if (content.startsWith('[') && content.includes('http') && content.includes('ibb.co')) {
            return '📷 Sent photos';
        }

        return content;
    };

    // 1. Fetch Contacts (Assigned Staff + Managers)
    useEffect(() => {
        if (!isOpen) return;

        const fetchContacts = async () => {
            setLoading(true);
            try {
                const { data: petData } = await supabase
                    .from('pets')
                    .select('id')
                    .eq('client_id', client.id);

                const petIds = petData?.map(p => p.id) || [];

                let assignedStaffIds: string[] = [];
                if (petIds.length > 0) {
                    const { data: assignmentData } = await supabase
                        .from('pet_assignments')
                        .select('staff_id')
                        .in('pet_id', petIds);

                    assignedStaffIds = assignmentData?.map(a => a.staff_id) || [];
                }

                const uniqueIds = [...new Set(assignedStaffIds)];

                let query = supabase
                    .from('profiles')
                    .select('*')
                    .eq('organization_id', orgId);

                if (uniqueIds.length > 0) {
                    query = query.or(`role.in.(owner,manager),id.in.(${uniqueIds.join(',')})`);
                } else {
                    query = query.in('role', ['owner', 'manager']);
                }

                const { data: profiles, error } = await query;

                if (error) throw error;

                const validProfiles = profiles || [];
                setStaffContacts(validProfiles);

                if (!activeConversationId && validProfiles.length > 0) {
                    setActiveConversationId(validProfiles[0].id);
                }
            } catch (err) {
                console.error('Error fetching contacts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchContacts();
    }, [isOpen, client.id, orgId]);

    // 2. Fetch Messages for Active Conversation
    useEffect(() => {
        if (!isOpen || !activeConversationId) return;

        const fetchMessages = async () => {
            try {
                const { data: msgData, error: msgError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('organization_id', orgId)
                    .or(`and(sender_id.eq.${client.id},recipient_id.eq.${activeConversationId}),and(sender_id.eq.${activeConversationId},recipient_id.eq.${client.id})`)
                    .order('created_at', { ascending: true });

                if (msgError) throw msgError;
                setMessages(msgData || []);
            } catch (err) {
                console.error('Error fetching messages:', err);
            }
        };

        fetchMessages();

        const channel = supabase
            .channel(`chat-${client.id}-${activeConversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `organization_id=eq.${orgId}`
            }, (payload) => {
                const newMsg = payload.new as Message;
                const isRelevant = (newMsg.sender_id === client.id && newMsg.recipient_id === activeConversationId) ||
                    (newMsg.sender_id === activeConversationId && newMsg.recipient_id === client.id);

                if (isRelevant) {
                    setMessages(prev => [...prev, newMsg]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, activeConversationId, client.id, orgId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessageText.trim() && pendingFiles.length === 0) || !activeConversationId) return;

        setSending(true);

        try {
            // 1. Upload Pending Images as a Group
            if (pendingFiles.length > 0) {
                const uploadedUrls: string[] = [];

                for (const file of pendingFiles) {
                    const formData = new FormData();
                    formData.append('image', file);

                    try {
                        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                            method: 'POST',
                            body: formData,
                        });
                        const data = await response.json();

                        if (data.success) {
                            uploadedUrls.push(data.data.url);
                        } else {
                            console.error('Upload failed:', data.error);
                        }
                    } catch (err) {
                        console.error('Upload error:', err);
                    }
                }

                // Send all images as a single grouped message
                if (uploadedUrls.length > 0) {
                    const content = uploadedUrls.length === 1 ? uploadedUrls[0] : JSON.stringify(uploadedUrls);
                    const msg: Omit<Message, 'id'> = {
                        organization_id: orgId,
                        sender_id: client.id,
                        recipient_id: activeConversationId,
                        content: content,
                        created_at: new Date().toISOString()
                    };
                    const { data: insertedMsg, error: insertError } = await supabase.from('messages').insert([msg]).select().single();
                    if (insertError) {
                        console.error('Supabase insert error (images):', insertError);
                        alert(`Failed to send images: ${insertError.message}`);
                    } else if (insertedMsg) {
                        setMessages(prev => [...prev, insertedMsg]);
                    }
                }
            }

            // 2. Send Text
            if (newMessageText.trim()) {
                const msg: Omit<Message, 'id'> = {
                    organization_id: orgId,
                    sender_id: client.id,
                    recipient_id: activeConversationId,
                    content: newMessageText.trim(),
                    created_at: new Date().toISOString()
                };
                const { data: insertedMsg, error: insertError } = await supabase.from('messages').insert([msg]).select().single();
                if (insertError) {
                    console.error('Supabase insert error (text):', insertError);
                    alert(`Failed to send message: ${insertError.message}`);
                } else if (insertedMsg) {
                    setMessages(prev => [...prev, insertedMsg]);
                }
            }

            setNewMessageText('');
            setPendingFiles([]);
        } catch (err) {
            console.error('Error sending:', err);
        } finally {
            setSending(false);
        }
    };

    // Drag & Drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        const validImages = files.filter(f => f.type.startsWith('image/'));
        if (validImages.length > 0) {
            setPendingFiles(prev => [...prev, ...validImages].slice(0, 5));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
            setPendingFiles(prev => [...prev, ...newFiles].slice(0, 5));
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    const activeContact = staffContacts.find(s => s.id === activeConversationId);

    // Filter messages for the active thread
    const threadMessages = messages.filter(m => {
        if (!activeConversationId) return false;
        return (
            (m.sender_id === client.id && m.recipient_id === activeConversationId) ||
            (m.sender_id === activeConversationId && m.recipient_id === client.id)
        );
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-slate-50 w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-300 font-sans gap-4 p-4"
                onClick={(e) => e.stopPropagation()}
            >

                {/* --- SIDEBAR (List View) --- */}
                <div className="w-96 flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-900">Inbox</h2>
                            <div className="flex items-center space-x-2">
                                <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors">
                                    <CheckSquare size={20} />
                                </button>
                                <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors">
                                    <PlusCircle size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                        {loading && staffContacts.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                                <p className="text-sm font-medium">Loading contacts...</p>
                            </div>
                        ) : staffContacts.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No conversations yet</p>
                            </div>
                        ) : (
                            staffContacts
                                .filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(contact => {
                                    const isSelected = activeConversationId === contact.id;
                                    const lastMsg = getLastMessageWithUser(contact.id);
                                    const previewText = lastMsg ? getPreviewText(lastMsg.content) : 'No messages';
                                    const timeText = lastMsg ? formatMessageTime(lastMsg.created_at) : '';

                                    return (
                                        <button
                                            key={contact.id}
                                            onClick={() => setActiveConversationId(contact.id)}
                                            className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all text-left group ${isSelected
                                                ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                                                : 'hover:bg-slate-50 border border-transparent'
                                                }`}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white ${getAvatarColor(contact.full_name)}`}>
                                                    {getInitials(contact.full_name)}
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                                                        {contact.full_name}
                                                    </h3>
                                                    <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>{timeText}</span>
                                                </div>
                                                <p className={`text-xs truncate font-medium ${isSelected ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-600'}`}>
                                                    {previewText}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                        )}
                    </div>
                </div>

                {/* --- MAIN CHAT AREA --- */}
                <div className="flex-1 flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden relative">
                    {!activeContact ? (
                        // EMPTY STATE
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 animate-in zoom-in duration-500 text-indigo-500">
                                <MessageSquare size={40} className="ml-1" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Select a Conversation</h3>
                            <p className="text-slate-400 font-medium max-w-xs">
                                Choose a team member from the sidebar to start chatting.
                            </p>
                        </div>
                    ) : (
                        // ACTIVE THREAD
                        <>
                            {/* Thread Header */}
                            <div className="bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-100 z-10 sticky top-0">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${getAvatarColor(activeContact.full_name)}`}>
                                        {getInitials(activeContact.full_name)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">{activeContact.full_name}</h3>
                                        <div className="flex items-center space-x-1.5">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span className="text-[10px] font-bold text-emerald-600">Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div
                                className={`flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar transition-colors ${isDragging ? 'bg-indigo-50 border-2 border-dashed border-indigo-300 m-2 rounded-xl relative' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {isDragging && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                                <ImageIcon size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-indigo-900">Drop image here</h3>
                                            <p className="text-indigo-600">to send immediately</p>
                                        </div>
                                    </div>
                                )}

                                {/* Date Separator */}
                                <div className="flex justify-center my-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/80 px-4 py-1.5 rounded-full backdrop-blur-sm border border-slate-200/50">Today</span>
                                </div>

                                {threadMessages.map(msg => {
                                    const isMe = msg.sender_id === client.id;

                                    // Detect gallery (JSON array of URLs) vs single image
                                    let isGallery = false;
                                    let galleryUrls: string[] = [];
                                    try {
                                        if (msg.content.startsWith('[')) {
                                            const parsed = JSON.parse(msg.content);
                                            if (Array.isArray(parsed) && parsed.every((u: unknown) => typeof u === 'string' && u.includes('http'))) {
                                                isGallery = true;
                                                galleryUrls = parsed;
                                            }
                                        }
                                    } catch { /* not JSON */ }

                                    const isImage = !isGallery && msg.content.startsWith('http') && (msg.content.match(/\.(jpeg|jpg|gif|png)$/) != null || msg.content.includes('ibb.co'));

                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                            {!isMe && (
                                                <div className={`w-8 h-8 rounded-full rounded-tr-none mr-3 self-end mb-1 shadow-sm flex items-center justify-center text-white font-bold text-xs ${getAvatarColor(activeContact.full_name)}`}>
                                                    {getInitials(activeContact.full_name)}
                                                </div>
                                            )}
                                            <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col group/msg relative`}>
                                                <div className="relative">
                                                    {isGallery ? (
                                                        // Gallery Grid Layout (like iMessage/Messenger)
                                                        <div className={`grid gap-1 rounded-lg overflow-hidden ${galleryUrls.length === 2 ? 'grid-cols-2' : galleryUrls.length >= 3 ? 'grid-cols-2' : 'grid-cols-1'}`} style={{ maxWidth: '280px' }}>
                                                            {galleryUrls.slice(0, 4).map((url, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`relative cursor-zoom-in overflow-hidden ${galleryUrls.length === 3 && idx === 0 ? 'row-span-2' : ''}`}
                                                                    onClick={() => setLightboxImage(url)}
                                                                >
                                                                    <img
                                                                        src={url}
                                                                        alt={`Photo ${idx + 1}`}
                                                                        className={`w-full object-cover hover:brightness-95 transition-all ${galleryUrls.length === 1 ? 'max-h-56 rounded-lg' : galleryUrls.length === 2 ? 'h-32' : 'h-28'}`}
                                                                    />
                                                                    {/* Show +X overlay for more than 4 images */}
                                                                    {idx === 3 && galleryUrls.length > 4 && (
                                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                            <span className="text-white text-xl font-bold">+{galleryUrls.length - 4}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : isImage ? (
                                                        <div className="relative group/image">
                                                            <img
                                                                src={msg.content}
                                                                alt="Attachment"
                                                                className="max-w-xs max-h-56 object-cover rounded-lg cursor-zoom-in hover:brightness-95 transition-all border border-slate-100 shadow-sm"
                                                                onClick={() => setLightboxImage(msg.content)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative transition-shadow ${isMe
                                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                                            : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                                                            }`}>
                                                            <p>{msg.content}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-300 mt-1.5 px-1">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Pending Files Preview */}
                            {pendingFiles.length > 0 && (
                                <div className="px-6 pb-2 flex gap-2 overflow-x-auto">
                                    {pendingFiles.map((file, idx) => (
                                        <div key={idx} className="relative w-20 h-20 shrink-0 group">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                className="w-full h-full object-cover rounded-lg border border-slate-200"
                                                alt="Preview"
                                            />
                                            <button
                                                onClick={() => removePendingFile(idx)}
                                                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            >
                                                <X size={12} />
                                            </button>
                                            <span className="text-[9px] text-slate-500 truncate block mt-1 w-full">{file.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-slate-100">
                                <form onSubmit={handleSendMessage} className="flex items-end space-x-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-sm">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-white rounded-xl transition-all"
                                    >
                                        <ImageIcon size={20} />
                                    </button>
                                    <input
                                        type="text"
                                        value={newMessageText}
                                        onChange={(e) => setNewMessageText(e.target.value)}
                                        placeholder="Type your message..."
                                        className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium h-10 min-h-[40px] max-h-32 py-2"
                                    />
                                    <button
                                        type="submit"
                                        disabled={(!newMessageText.trim() && pendingFiles.length === 0) || sending}
                                        className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700"
                                    >
                                        {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={lightboxImage}
                        className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                        alt="Full size"
                    />
                </div>
            )}
        </div>
    );
};

export default PortalCommsModal;
