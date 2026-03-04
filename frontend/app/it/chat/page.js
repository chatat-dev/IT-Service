'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { useModal } from '../../components/ModalProvider';

const renderMessageWithLinks = (text, isMe) => {
    if (!text) return null;

    const replyRegex = /\[REPLY:(.*?)\](.*?)\[\/REPLY\]([\s\S]*)/s;
    const match = text.match(replyRegex);

    let replyBlock = null;
    let mainText = text;

    if (match) {
        const replyName = match[1].trim();
        const replyMsg = match[2].trim();
        mainText = match[3].trim();

        replyBlock = (
            <div style={{
                borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.55)' : 'var(--color-primary)'}`,
                background: isMe ? 'rgba(255,255,255,0.13)' : 'rgba(99,102,241,0.09)',
                borderRadius: '0 6px 6px 0',
                padding: '0.3rem 0.55rem',
                marginBottom: '0.45rem',
            }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: isMe ? 'rgba(255,255,255,0.85)' : 'var(--color-primary)', marginBottom: '0.15rem' }}>
                    ↩ {replyName}
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.78, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {replyMsg}
                </div>
            </div>
        );
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = mainText.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a key={index} href={part} target="_blank" rel="noopener noreferrer"
                    style={{ color: isMe ? '#e0e7ff' : 'var(--color-primary)', textDecoration: 'underline' }}>
                    {part}
                </a>
            );
        }
        return <span key={index}>{part}</span>;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {replyBlock}
            <div>{parts}</div>
        </div>
    );
};

export default function ITChat() {
    const searchParams = useSearchParams();
    const ticketId = searchParams.get('ticketId');
    const { showConfirm } = useModal();

    const [tickets, setTickets] = useState([]);
    const [selectedTicketId, setSelectedTicketId] = useState(ticketId || '');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [token, setToken] = useState('');
    const [userId, setUserId] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [unreadMap, setUnreadMap] = useState({}); // ticketId -> count

    const [itStaff, setItStaff] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null); // Controls the ··· dropdown per ticket
    const [replyingTo, setReplyingTo] = useState(null);
    const [hoveredMsgId, setHoveredMsgId] = useState(null);
    const [mobileMenuMsgId, setMobileMenuMsgId] = useState(null); // Explicit state for mobile clicks

    const socketRef = useRef(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const selectedTicketIdRef = useRef(selectedTicketId);

    useEffect(() => {
        selectedTicketIdRef.current = selectedTicketId;
    }, [selectedTicketId]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.token) {
            setToken(user.token);
            setUserId(user.id);
            fetchTickets(user.token);

            socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}`, {
                query: { token: user.token, userId: user.id }
            });

            socketRef.current.on('receive_message', (msg) => {
                if (msg.ticket_id == selectedTicketIdRef.current) {
                    setMessages(prev => [...prev, msg]);
                    // Mark as read
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/${msg.ticket_id}/read`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${user.token}` }
                    }).catch(console.error);
                } else {
                    // Mark as unread
                    setUnreadMap(prev => ({ ...prev, [msg.ticket_id]: (prev[msg.ticket_id] || 0) + 1 }));
                }
            });

            socketRef.current.on('refresh_tickets', () => {
                fetchTickets(user.token);
            });

            socketRef.current.on('message_unsent', (msgId) => {
                setMessages(prev => prev.filter(m => String(m.id) !== String(msgId)));
            });

            socketRef.current.on('online_users', (users) => {
                setOnlineUsers(users || []);
            });

            socketRef.current.on('chat_cleared', () => {
                setMessages([]);
            });

            // Emit online
            socketRef.current.emit('user_online', { user_id: user.id, name: user.name });

            // Fetch IT Staff for invite modal
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/it-staff/list`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            }).then(r => r.json()).then(data => {
                if (Array.isArray(data)) setItStaff(data.filter(u => u.id !== user.id));
            }).catch(console.error);

            return () => socketRef.current.disconnect();
        }
    }, []);

    useEffect(() => {
        if (selectedTicketId && socketRef.current && token) {
            socketRef.current.emit('join_ticket', selectedTicketId);
            fetchChatHistory(selectedTicketId);

            // Mark as read for this ticket
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/${selectedTicketId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(() => {
                window.dispatchEvent(new Event('chat_read'));
            }).catch(console.error);

            // Clear unread for this ticket
            setUnreadMap(prev => { const n = { ...prev }; delete n[selectedTicketId]; return n; });
        }
    }, [selectedTicketId, token]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = () => {
            setHoveredMsgId(null);
            setMobileMenuMsgId(null);
        }
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchTickets = async (t) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/board`, { headers: { 'Authorization': `Bearer ${t}` } });
            const data = await res.json();
            if (Array.isArray(data)) {
                // Show tickets assigned to ME OR where I am a participant, and not guest tickets (guests can't chat)
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const myTickets = data.filter(tk =>
                    (tk.assigned_to === currentUser.id || (tk.participant_ids && tk.participant_ids.split(',').includes(String(currentUser.id))))
                    && !tk.guest_name
                );
                setTickets(myTickets);
                if (!selectedTicketId && myTickets.length > 0) setSelectedTicketId(myTickets[0].id);
            }
        } catch (err) { console.error(err); }
    };

    const fetchChatHistory = async (tId) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/${tId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (Array.isArray(data)) setMessages(data);
        } catch (err) { console.error(err); }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        let finalMessage = newMessage;
        if (replyingTo) {
            const shortMsg = replyingTo.message.replace(/\[REPLY:.*?\[\/REPLY\]/, '').trim(); // Remove nested replies
            const truncatedMsg = shortMsg.length > 50 ? shortMsg.substring(0, 50) + '...' : shortMsg;
            const senderName = String(replyingTo.sender_id) === String(userId) ? 'You' : (replyingTo.sender_name || 'User');
            finalMessage = `[REPLY: ${senderName}] ${truncatedMsg} [/REPLY] ${newMessage}`;
        }

        const msgData = { ticket_id: selectedTicketId, sender_id: userId, message: finalMessage };
        socketRef.current.emit('send_message', msgData);
        setNewMessage('');
        setReplyingTo(null);
    };

    const handleUnsend = async (msgId) => {
        showConfirm({
            title: 'ยกเลิกข้อความ',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกข้อความนี้?',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/message/${msgId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        alert(data.message || 'Cannot unsend message');
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        });
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        formData.append('ticket_id', selectedTicketId);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                // Send file message
                const fileNames = data.files?.map(f => f.name).join(', ') || 'File(s)';
                const msgData = {
                    ticket_id: selectedTicketId,
                    sender_id: userId,
                    message: `📎 Attached: ${fileNames}`,
                    file_urls: JSON.stringify(data.files || [])
                };
                socketRef.current.emit('send_message', msgData);
            }
        } catch (err) { console.error(err); }
        fileInputRef.current.value = '';
    };

    const handlePaste = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        if (!items) return;
        const files = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image/') !== -1) {
                files.push(items[i].getAsFile());
            }
        }
        if (files.length > 0) {
            handleFileUpload({ target: { files: files } });
        }
    };

    const handleInvite = async (staffId) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${selectedTicketId}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: staffId })
            });
            if (res.ok) {
                setShowInviteModal(false);
                // The socket 'refresh_tickets' broadcast will update all IT clients.
                // Optionally send a chat message
                const staff = itStaff.find(s => s.id === staffId);
                const msgData = {
                    ticket_id: selectedTicketId,
                    sender_id: userId,
                    message: `📢 Invited ${staff?.name || 'an IT member'} to the chat.`
                };
                socketRef.current.emit('send_message', msgData);
            } else {
                alert('Failed to invite user');
            }
        } catch (err) { console.error(err); }
    };

    const handleClearChat = async (ticketIdToClear, e) => {
        if (e) e.stopPropagation();
        showConfirm({
            title: 'ล้างประวัติแชท',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัติแชทนี้อย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/${ticketIdToClear}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        if (selectedTicketId === ticketIdToClear) {
                            setMessages([]);
                        }
                    }
                } catch (err) { console.error(err); }
            }
        });
    };

    const handleToggleKeep = async (ticketId, currentKeep, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${ticketId}/keep-history`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ keep: !currentKeep })
            });
            if (res.ok) {
                // Optimistically update the local ticket list
                setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, keep_chat_history: !currentKeep ? 1 : 0 } : t));
            }
        } catch (err) { console.error(err); }
    };

    const handleTogglePin = async (ticketId, currentPinned, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${ticketId}/pin`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_pinned: !currentPinned })
            });
            if (res.ok) {
                setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, is_pinned: !currentPinned ? 1 : 0 } : t));
            }
        } catch (err) { console.error(err); }
    };

    const selectedTicket = tickets.find(t => t.id == selectedTicketId);

    // Split tickets and sort by is_pinned first
    const activeTickets = tickets.filter(t => !t.keep_chat_history).sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
    const savedTickets = tickets.filter(t => t.keep_chat_history).sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

    const renderTicketItem = (t) => {
        const rName = t.guest_name || t.user_name || 'Unknown';
        const unread = unreadMap[t.id] || 0;
        const menuOpen = openMenuId === t.id;
        return (
            <li key={t.id} onClick={() => { setSelectedTicketId(t.id); setOpenMenuId(null); }}
                style={{
                    padding: '0.85rem', cursor: 'pointer', borderRadius: '8px',
                    backgroundColor: selectedTicketId == t.id ? 'var(--color-glass)' : 'transparent',
                    border: selectedTicketId == t.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                {t.ticket_no}
                                {t.is_pinned ? (
                                    <span title="Pinned" style={{ display: 'inline-flex', color: 'var(--color-primary)' }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>
                                    </span>
                                ) : null}
                                {t.keep_chat_history ? (
                                    <span title="Saved History" style={{ display: 'inline-flex', color: '#10b981' }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                                    </span>
                                ) : null}
                            </strong>
                            {unread > 0 && (
                                <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700' }}>
                                    {unread}
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {t.guest_name ? `Guest: ${rName}` : `User: ${rName}`}
                            {t.status === 'closed' && <span style={{ marginLeft: '0.5rem', color: 'var(--color-error)', fontStyle: 'italic' }}>(Closed)</span>}
                        </div>
                        {/* Deletion countdown */}
                        {t.status === 'closed' && !t.keep_chat_history && t.days_until_delete !== null && t.days_until_delete !== undefined && (
                            <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: t.days_until_delete <= 1 ? '#ef4444' : t.days_until_delete <= 3 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><rect x="5" y="6" width="14" height="15" rx="2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                Chat deleted in {t.days_until_delete}d
                            </div>
                        )}
                    </div>

                    {/* Action Menu Trigger */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : t.id); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--color-text-muted)', fontSize: '1.2rem',
                                padding: '0 0.3rem', lineHeight: 1,
                                borderRadius: '6px',
                                transition: 'background 0.15s'
                            }}
                            title="More options"
                        >···</button>

                        {menuOpen && (
                            <div onClick={(e) => e.stopPropagation()} style={{
                                position: 'absolute', right: 0, top: '100%', zIndex: 100,
                                background: 'var(--color-bg-card, #fff)',
                                border: '1px solid var(--color-glass-border)',
                                borderRadius: '10px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                minWidth: '175px',
                                padding: '0.4rem 0',
                                overflow: 'hidden'
                            }}>
                                <button onClick={(e) => { handleTogglePin(t.id, t.is_pinned, e); setOpenMenuId(null); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    width: '100%', padding: '0.6rem 1rem', background: 'none',
                                    border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                                    color: t.is_pinned ? 'var(--color-primary)' : 'var(--color-text-main)',
                                    textAlign: 'left', whiteSpace: 'nowrap'
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>
                                    {t.is_pinned ? 'Unpin' : 'Pin to Top'}
                                </button>
                                <button onClick={(e) => { handleToggleKeep(t.id, t.keep_chat_history, e); setOpenMenuId(null); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    width: '100%', padding: '0.6rem 1rem', background: 'none',
                                    border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                                    color: t.keep_chat_history ? '#10b981' : 'var(--color-text-main)',
                                    textAlign: 'left', whiteSpace: 'nowrap'
                                }}>
                                    {/* Bookmark / Save icon */}
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill={t.keep_chat_history ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                                    {t.keep_chat_history ? 'Remove from Saved' : 'Save History'}
                                </button>
                                <div style={{ borderTop: '1px solid var(--color-glass-border)', margin: '0.25rem 0' }} />
                                <button onClick={(e) => { handleClearChat(t.id, e); setOpenMenuId(null); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    width: '100%', padding: '0.6rem 1rem', background: 'none',
                                    border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                                    color: '#ef4444', textAlign: 'left', whiteSpace: 'nowrap'
                                }}>
                                    {/* Modern rounded trash icon */}
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><rect x="5" y="6" width="14" height="15" rx="2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                    ล้างประวัติแชท
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </li>
        );
    };

    return (
        <div className="animate-fade-in chat-wrapper" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', margin: '-1rem' }}>
            <h2 className="desktop-only" style={{ color: 'var(--color-primary)', marginBottom: '1.5rem', padding: '0 1rem' }}>IT Support Chat</h2>

            <div className={`chat-layout ${selectedTicketId ? 'ticket-selected' : ''}`} style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>

                {/* Ticket List (own tickets only) */}
                <div className="glass-card chat-sidebar" style={{ width: '310px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <h3 style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-glass-border)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        My Tickets
                        <span style={{ fontSize: '0.7rem', background: 'var(--color-primary)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{activeTickets.length}</span>
                    </h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
                        {activeTickets.map(t => renderTicketItem(t))}
                        {activeTickets.length === 0 && (
                            <li style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1rem', fontSize: '0.85rem' }}>No active tickets</li>
                        )}
                    </ul>

                    {savedTickets.length > 0 && (
                        <>
                            <h3 style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-glass-border)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Saved History
                                <span style={{ fontSize: '0.7rem', background: 'var(--color-primary)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{savedTickets.length}</span>
                            </h3>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {savedTickets.map(t => renderTicketItem(t))}
                            </ul>
                        </>
                    )}
                </div>

                {/* Chat Area */}
                <div className="glass-card chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
                    {selectedTicketId ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--color-glass-border)', backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '56px' }}>
                                {/* Back button (mobile only) */}
                                <button className="mobile-only btn btn-outline" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setSelectedTicketId('')}>
                                    ← Back
                                </button>
                                {/* Title area */}
                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap', overflow: 'hidden' }}>
                                        <span style={{ fontWeight: '700', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text-main)' }}>
                                            #{selectedTicket?.ticket_no}
                                        </span>
                                        {selectedTicket?.keep_chat_history === 1 || selectedTicket?.keep_chat_history === true ? (
                                            <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '8px', backgroundColor: '#10b981', color: '#fff', fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                                💾 Saved
                                            </span>
                                        ) : null}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {selectedTicket?.guest_name ? `Guest: ${selectedTicket.guest_name}` : `User: ${selectedTicket?.user_name || ''}`}
                                    </div>
                                </div>
                                {/* Invite button */}
                                <button className="btn btn-outline" style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setShowInviteModal(true)}>
                                    👥 Invite
                                </button>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                                {messages.length > 0 ? messages.map((m, idx) => {
                                    const isMe = String(m.sender_id) === String(userId);
                                    const msgTime = new Date(m.created_at).getTime();
                                    const canUnsend = isMe && (Date.now() - msgTime <= 3600000); // 1 hour 
                                    const showMenu = hoveredMsgId === m.id || mobileMenuMsgId === m.id;

                                    return (
                                        <div
                                            key={idx}
                                            style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', position: 'relative', display: 'flex', flexDirection: 'column' }}
                                            onMouseEnter={() => setHoveredMsgId(m.id)}
                                            onMouseLeave={() => setHoveredMsgId(null)}
                                        >
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem', textAlign: isMe ? 'right' : 'left' }}>
                                                {isMe ? 'You' : (m.sender_name || 'User')} · {new Date(m.created_at).toLocaleTimeString()}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                                {/* Chat Bubble */}
                                                <div
                                                    style={{
                                                        padding: '0.6rem 1rem', borderRadius: '12px',
                                                        backgroundColor: isMe ? 'var(--color-secondary)' : 'var(--color-glass)',
                                                        color: isMe ? '#fff' : 'var(--color-text-main)',
                                                        border: isMe ? 'none' : '1px solid var(--color-glass-border)',
                                                        fontSize: '0.9rem', wordBreak: 'break-word',
                                                        transition: 'opacity 0.2s', opacity: 1,
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={(e) => { e.stopPropagation(); setMobileMenuMsgId(mobileMenuMsgId === m.id ? null : m.id); }}
                                                >
                                                    {renderMessageWithLinks(m.message, isMe)}
                                                    {m.file_urls && (() => {
                                                        try {
                                                            const files = typeof m.file_urls === 'string' ? JSON.parse(m.file_urls) : m.file_urls;
                                                            if (Array.isArray(files) && files.length > 0) {
                                                                return (
                                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                                                                        {files.map((f, i) => {
                                                                            const fileUrl = f.url ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}${f.url}` : '#';
                                                                            const isImage = f.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.url);
                                                                            return (
                                                                                <div key={i} style={{ marginTop: '0.5rem' }}>
                                                                                    {isImage ? (
                                                                                        <a href={fileUrl} target="_blank" rel="noopener">
                                                                                            <img src={fileUrl} alt={f.name} style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--color-glass-border)', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.1)' }} />
                                                                                        </a>
                                                                                    ) : (
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                                                                                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" /></svg>
                                                                                            <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{f.name || `File ${i + 1}`}</span>
                                                                                            <a href={fileUrl} download target="_blank" rel="noopener" style={{ marginLeft: 'auto', background: 'var(--color-primary)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.75rem' }}>
                                                                                                Download
                                                                                            </a>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            }
                                                        } catch (e) { }
                                                        return null;
                                                    })()}
                                                </div>

                                                {/* Hover Action Menu */}
                                                {showMenu && (
                                                    <div style={{
                                                        display: 'flex', gap: '0.2rem',
                                                        background: 'var(--color-bg-card)',
                                                        padding: '0.3rem',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                                        border: '1px solid var(--color-glass-border)',
                                                        animation: 'fadeDropdown 0.2s ease-out',
                                                        zIndex: 10
                                                    }} onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => { setReplyingTo(m); setHoveredMsgId(null); setMobileMenuMsgId(null); }}
                                                            style={{ background: 'none', border: 'none', padding: '0.4rem', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-glass)'}
                                                            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            title="ตอบกลับ (Reply)"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-main)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                                                        </button>
                                                        {canUnsend && (
                                                            <button
                                                                onClick={() => { handleUnsend(m.id); setHoveredMsgId(null); setMobileMenuMsgId(null); }}
                                                                style={{ background: 'none', border: 'none', padding: '0.4rem', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                title="ยกเลิกข้อความ (Unsend)"
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }) : <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>No messages yet.</div>}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Message Input */}
                            {selectedTicket?.status === 'closed' ? (
                                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-glass-border)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    This ticket is closed. Chat is read-only.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--color-glass-border)' }}>
                                    {replyingTo && (
                                        <div style={{
                                            padding: '0.5rem 1rem',
                                            background: 'var(--color-bg-surface)',
                                            borderBottom: '1px solid var(--color-glass-border)',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                    Replying to {String(replyingTo.sender_id) === String(userId) ? 'Yourself' : (replyingTo.sender_name || 'User')}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {replyingTo.message.replace(/\[REPLY:.*?\[\/REPLY\]/, '')}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setReplyingTo(null)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.2rem', padding: '0 0.5rem' }}
                                            >×</button>
                                        </div>
                                    )}
                                    <form onSubmit={sendMessage} style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} multiple />
                                        <button type="button" className="btn btn-outline" style={{ padding: '0.4rem', borderColor: 'var(--color-text-muted)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => fileInputRef.current?.click()} title="Attach files">
                                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
                                        </button>
                                        <input type="text" className="input" style={{ flex: 1, marginBottom: 0, padding: '0.5rem', borderRadius: '20px' }}
                                            placeholder="Type your message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onPaste={handlePaste} />
                                        <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px' }} disabled={!newMessage.trim()}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                        </button>
                                    </form>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                            Select a ticket to join the conversation.
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {
                showInviteModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div className="glass-card" style={{ width: '400px', maxWidth: '95vw', padding: '1.5rem', position: 'relative' }}>
                            <h3 style={{ marginTop: 0 }}>Invite IT Staff to Chat</h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Select an IT personnel to join the current ticket's conversation.</p>

                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {itStaff.map(s => {
                                    // check if already participant
                                    const isParticipant = selectedTicket?.participant_ids?.split(',').includes(String(s.id));
                                    const isAssignee = selectedTicket?.assigned_to === s.id;
                                    const alreadyIn = isParticipant || isAssignee;

                                    return (
                                        <li key={s.id} style={{ padding: '0.75rem', border: '1px solid var(--color-glass-border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong>{s.name} {s.lname}</strong>
                                                {alreadyIn && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--color-success)' }}>(Joined)</span>}
                                            </div>
                                            {!alreadyIn && (
                                                <button className="btn btn-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleInvite(s.id)}>
                                                    Invite
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                                {itStaff.length === 0 && <div style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No other IT staff available.</div>}
                            </ul>
                            <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setShowInviteModal(false)}>Close</button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
