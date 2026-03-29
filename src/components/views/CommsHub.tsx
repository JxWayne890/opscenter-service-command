import React, { useState } from 'react';
import { MessageSquare, Users, User, ArrowLeft, Send, Search, MoreVertical, PlusCircle, Trash2, CheckSquare, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import SectionCard from '../SectionCard';
import { useOpsCenter } from '../../services/store';
import { Message, Profile } from '../../types';

// Mock Client Data removed, using global store

const CommsHub = () => {
    const { staff, messages, currentUser, sendMessage, deleteMessage, deleteConversation, clients } = useOpsCenter();

    // State
    const [activeTab, setActiveTab] = useState<'team' | 'clients'>('team');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [mobileViewMode, setMobileViewMode] = useState<'list' | 'thread'>('list'); // For mobile responsiveness

    // Bulk Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());

    // New Chat Modal State
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [newChatTab, setNewChatTab] = useState<'team' | 'clients'>('team');

    // Image Upload State
    const [isSending, setIsSending] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]); // New: Queue System
    const [lightboxImage, setLightboxImage] = useState<string | null>(null); // New: Lightbox
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || '';

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedConversations);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedConversations(newSet);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedConversations.size} conversations?`)) return;

        for (const id of Array.from(selectedConversations)) {
            await deleteConversation(id);
        }
        setSelectedConversations(new Set());
        setIsSelectionMode(false);
        if (selectedConversations.has(selectedThreadId || '')) {
            setSelectedThreadId(null);
        }
    };



    // Filter messages for the active thread (Real 1:1 logic)
    const threadMessages = [...messages].filter(m => {
        if (!selectedThreadId) return false;
        // Show if (Sender is Me AND Recipient is Them) OR (Sender is Them AND Recipient is Me)
        return (
            (m.sender_id === currentUser.id && m.recipient_id === selectedThreadId) ||
            (m.sender_id === selectedThreadId && m.recipient_id === currentUser.id)
        );
    }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Helper: Get the last message with a specific user
    const getLastMessageWithUser = (userId: string) => {
        const conversation = messages.filter(m =>
            (m.sender_id === currentUser.id && m.recipient_id === userId) ||
            (m.sender_id === userId && m.recipient_id === currentUser.id)
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return conversation[0] || null;
    };

    // Auto-Scroll Ref
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Scroll when messages change
    React.useEffect(() => {
        scrollToBottom();
    }, [threadMessages, selectedThreadId, lightboxImage]); // Trigger on messages, thread switch, or lightbox close

    // Helper: Clean Preview Text
    const getPreviewText = (content: string) => {
        if (!content) return 'No messages';
        if (content.startsWith('http') && (content.match(/\.(jpeg|jpg|gif|png)$/) != null || content.includes('ibb.co'))) {
            return '📷 Sent an image';
        }
        return content;
    };

    // Get list of users who have message history with current user
    const usersWithConversations = staff.filter(u => {
        if (u.id === currentUser.id) return false;
        return getLastMessageWithUser(u.id) !== null;
    });

    // Format time for display
    const formatMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Derived Data
    const activeThreadUser = activeTab === 'team'
        ? staff.find(u => u.id === selectedThreadId)
        : clients.find(c => c.id === selectedThreadId);

    const handleThreadSelect = (id: string) => {
        setSelectedThreadId(id);
        setMobileViewMode('thread');
        // Timeout to allow render then scroll
        setTimeout(scrollToBottom, 100);
    };

    const handleBackToList = () => {
        setMobileViewMode('list');
        // We don't clear selectedThreadId so desktop state persists
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessageText.trim() && pendingFiles.length === 0) || !selectedThreadId) return;

        setIsSending(true);

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
                            alert(`Failed to upload ${file.name}: ${data.error?.message}`);
                        }
                    } catch (err) {
                        console.error('Upload error:', err);
                    }
                }

                // Send all images as a single grouped message
                if (uploadedUrls.length > 0) {
                    const content = uploadedUrls.length === 1 ? uploadedUrls[0] : JSON.stringify(uploadedUrls);
                    const msg: Message = {
                        id: crypto.randomUUID(),
                        organization_id: currentUser.organization_id,
                        sender_id: currentUser.id,
                        recipient_id: selectedThreadId,
                        group_id: selectedThreadId,
                        content: content,
                        created_at: new Date().toISOString()
                    };
                    await sendMessage(msg);
                }
            }

            // 2. Send Text Message (if any)
            if (newMessageText.trim()) {
                const msg: Message = {
                    id: crypto.randomUUID(),
                    organization_id: currentUser.organization_id,
                    sender_id: currentUser.id,
                    recipient_id: selectedThreadId,
                    group_id: selectedThreadId,
                    content: newMessageText.trim(),
                    created_at: new Date().toISOString()
                };
                await sendMessage(msg);
            }

            // Reset
            setNewMessageText('');
            setPendingFiles([]);
        } catch (error) {
            console.error('Error sending messages:', error);
        } finally {
            setIsSending(false);
        }
    };

    // Modified to Queue instead of Upload Immediately
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
            setPendingFiles(prev => [...prev, ...validImages].slice(0, 5)); // Limit 5
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
            setPendingFiles(prev => [...prev, ...newFiles].slice(0, 5));
        }
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Remove file from queue
    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="h-[calc(100vh-140px)] animate-in fade-in duration-500 flex flex-col lg:flex-row gap-6">

            {/* --- SIDEBAR (List View) --- */}
            <div className={`
                lg:w-96 lg:flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden
                ${mobileViewMode === 'list' ? 'flex w-full h-full' : 'hidden'}
            `}>
                {/* Header & Toggle */}
                <div className="p-6 border-b border-slate-100 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                        {isSelectionMode ? (
                            <div className="flex items-center space-x-2 animate-in slide-in-from-left-2">
                                <button onClick={() => { setIsSelectionMode(false); setSelectedConversations(new Set()); }} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200">
                                    <X size={20} />
                                </button>
                                <span className="font-bold text-slate-900">{selectedConversations.size} selected</span>
                            </div>
                        ) : (
                            <h2 className="text-2xl font-black text-slate-900">Inbox</h2>
                        )}

                        <div className="flex items-center space-x-2">
                            {isSelectionMode ? (
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={selectedConversations.size === 0}
                                    className="p-2 bg-rose-500 text-white rounded-xl shadow-md hover:bg-rose-600 disabled:opacity-50 disabled:shadow-none transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsSelectionMode(true)}
                                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors"
                                        title="Select conversations"
                                    >
                                        <CheckSquare size={20} />
                                    </button>
                                    <button
                                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors"
                                        onClick={() => setIsNewChatOpen(true)}
                                    >
                                        <PlusCircle size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Segmented Control */}
                    <div className="bg-slate-100 p-1 rounded-xl flex font-bold text-xs">
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all ${activeTab === 'team' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={14} />
                            <span>Team</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('clients')}
                            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all ${activeTab === 'clients' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <MessageSquare size={14} />
                            <span>Clients</span>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    {activeTab === 'team' ? (
                        // TEAM LIST - Only show users with message history
                        usersWithConversations.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No conversations yet</p>
                                <p className="text-xs mt-1">Click + to start a new chat</p>
                            </div>
                        ) : (
                            usersWithConversations.map(user => {
                                const isSelected = selectedThreadId === user.id;
                                const isChecked = selectedConversations.has(user.id);
                                const lastMsg = getLastMessageWithUser(user.id);
                                const previewText = lastMsg ? getPreviewText(lastMsg.content) : 'No messages';
                                const timeText = lastMsg ? formatMessageTime(lastMsg.created_at) : '';

                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => isSelectionMode ? toggleSelection(user.id) : handleThreadSelect(user.id)}
                                        className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all text-left group ${isSelected && !isSelectionMode
                                            ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                                            : 'hover:bg-slate-50 border border-transparent'
                                            } ${isChecked ? 'bg-slate-50 border-slate-200' : ''}`}
                                    >
                                        {isSelectionMode && (
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                                {isChecked && <CheckSquare size={12} className="text-white" />}
                                            </div>
                                        )}
                                        <div className="relative flex-shrink-0">
                                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`} alt={user.full_name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                                                    {user.full_name}
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
                        )
                    ) : (
                        // CLIENTS LIST
                        clients.map(client => {
                            const isSelected = selectedThreadId === client.id;
                            const isChecked = selectedConversations.has(client.id);
                            const lastMsg = getLastMessageWithUser(client.id);
                            const previewText = lastMsg ? getPreviewText(lastMsg.content) : 'No messages';
                            const timeText = lastMsg ? formatMessageTime(lastMsg.created_at) : '';

                            return (
                                <button
                                    key={client.id}
                                    onClick={() => isSelectionMode ? toggleSelection(client.id) : handleThreadSelect(client.id)}
                                    className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all text-left group ${isSelected && !isSelectionMode
                                        ? 'bg-indigo-50 border border-indigo-100 shadow-sm'
                                        : 'hover:bg-slate-50 border border-transparent'
                                        } ${isChecked ? 'bg-slate-50 border-slate-200' : ''}`}
                                >
                                    {isSelectionMode && (
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                            {isChecked && <CheckSquare size={12} className="text-white" />}
                                        </div>
                                    )}
                                    <div className="relative flex-shrink-0">
                                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name)}&background=random`} alt={client.full_name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                                                {client.full_name}
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
            <div className={`
                flex-1 lg:flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden relative
                ${mobileViewMode === 'thread' ? 'flex w-full h-full absolute inset-0 z-50 lg:relative lg:z-auto' : 'hidden'}
            `}>
                {!selectedThreadId ? (
                    // EMPTY STATE
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 animate-in zoom-in duration-500 text-indigo-500">
                            <MessageSquare size={40} className="ml-1" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Select a Conversation</h3>
                        <p className="text-slate-400 font-medium max-w-xs">
                            Choose a team member or client from the sidebar to start chatting.
                        </p>
                    </div>
                ) : (
                    // ACTIVE THREAD
                    <>
                        {/* Thread Header */}
                        <div className="bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-100 z-10 sticky top-0">
                            <div className="flex items-center space-x-3">
                                <button onClick={handleBackToList} className="lg:hidden p-2 hover:bg-slate-50 rounded-full transition-colors -ml-2">
                                    <ArrowLeft size={20} className="text-slate-600" />
                                </button>
                                <div className="flex items-center space-x-3">
                                    <img
                                        src={activeTab === 'team'
                                            ? (activeThreadUser as Profile)?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((activeThreadUser as Profile)?.full_name || '')}&background=random`
                                            : `https://ui-avatars.com/api/?name=${encodeURIComponent((activeThreadUser as any)?.full_name || '')}&background=random`}
                                        className="w-10 h-10 rounded-full object-cover shadow-sm"
                                        alt=""
                                    />
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">
                                            {activeTab === 'team' ? (activeThreadUser as any)?.full_name : (activeThreadUser as any)?.full_name}
                                        </h3>
                                        <div className="flex items-center space-x-1.5">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span className="text-[10px] font-bold text-emerald-600">Online</span>
                                        </div>
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
                                const isMe = msg.sender_id === currentUser.id;

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
                                            <img
                                                src={activeTab === 'team'
                                                    ? (activeThreadUser as Profile)?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((activeThreadUser as Profile)?.full_name || '')}&background=random`
                                                    : `https://ui-avatars.com/api/?name=${encodeURIComponent((activeThreadUser as any)?.full_name || '')}&background=random`}
                                                className="w-8 h-8 rounded-full rounded-tr-none mr-3 self-end mb-1 shadow-sm"
                                                alt=""
                                            />
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

                                                {/* Delete Button - Visible on Hover */}
                                                <button
                                                    onClick={() => deleteMessage(msg.id)}
                                                    className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-md text-rose-500 opacity-0 group-hover/msg:opacity-100 transition-all active:scale-95 ${isMe ? '-left-12' : '-right-12'
                                                        }`}
                                                    title="Delete message"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
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
                                    disabled={!newMessageText.trim() && !isSending}
                                    className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700"
                                >
                                    {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
            {/* New Chat Modal */}
            {
                isNewChatOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-lg">New Message</h3>
                                <button onClick={() => setIsNewChatOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/50">
                                <div className="bg-slate-200/50 p-1 rounded-xl flex font-bold text-xs">
                                    <button
                                        onClick={() => setNewChatTab('team')}
                                        className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all ${newChatTab === 'team' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Users size={14} />
                                        <span>Team</span>
                                    </button>
                                    <button
                                        onClick={() => setNewChatTab('clients')}
                                        className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all ${newChatTab === 'clients' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <MessageSquare size={14} />
                                        <span>Clients</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-2 overflow-y-auto max-h-[50vh] custom-scrollbar">
                                {newChatTab === 'team' ? (
                                    <div className="p-2 space-y-1">
                                        {staff.filter(u => u.id !== currentUser?.id).map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => {
                                                    setActiveTab('team');
                                                    handleThreadSelect(user.id);
                                                    setIsNewChatOpen(false);
                                                }}
                                                className="w-full flex items-center space-x-3 p-3 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors text-left group"
                                            >
                                                <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-indigo-600">{user.full_name}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-1">
                                        {clients.map(client => (
                                            <button
                                                key={client.id}
                                                onClick={() => {
                                                    setActiveTab('clients');
                                                    handleThreadSelect(client.id);
                                                    setIsNewChatOpen(false);
                                                }}
                                                className="w-full flex items-center space-x-3 p-3 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors text-left group"
                                            >
                                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name)}&background=random`} alt={client.full_name} className="w-10 h-10 rounded-full object-cover" />
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-indigo-600">{client.full_name}</p>
                                                    <p className="text-xs text-slate-500">Client</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Lightbox */}
            {
                lightboxImage && (
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
                )
            }
        </div >
    );
};

export default CommsHub;
