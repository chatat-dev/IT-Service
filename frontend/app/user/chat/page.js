'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';

const renderMessageContent = (text, isMe) => {
    if (!text) return null;
    const replyMatch = text.match(/^\[REPLY: ([^\]]+)\] ([\s\S]*?)\[\/REPLY\] ([\s\S]*)$/);
    if (replyMatch) {
        const [, senderName, quotedText, actualMessage] = replyMatch;
        return (
            <>
                <div style={{
                    borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.55)' : 'var(--color-primary)'}`,
                    background: isMe ? 'rgba(255,255,255,0.13)' : 'rgba(99,102,241,0.09)',
                    borderRadius: '0 6px 6px 0',
                    padding: '0.3rem 0.55rem',
                    marginBottom: '0.45rem',
                }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: isMe ? 'rgba(255,255,255,0.85)' : 'var(--color-primary)', marginBottom: '0.15rem' }}>
                        ↩ {senderName}
                    </div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.78, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {quotedText}
                    </div>
                </div>
                <div>{renderMessageWithLinks(actualMessage, isMe)}</div>
            </>
        );
    }
    return renderMessageWithLinks(text, isMe);
};

const renderMessageWithLinks = (text, isMe) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
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
};

export default function UserChat() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const ticketId = searchParams.get('ticket');
    const { showConfirm } = useModal();

    const [tickets, setTickets] = useState([]);
    const [selectedTicketId, setSelectedTicketId] = useState(ticketId || '');
    const [messages, setMessages] = useState([]);
    const [unreadTickets, setUnreadTickets] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [token, setToken] = useState('');
    const [userId, setUserId] = useState(null);
    const [hoveredMsgId, setHoveredMsgId] = useState(null);
    const [mobileMenuMsgId, setMobileMenuMsgId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);

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
            fetchMyTickets(user.token);
            fetchUnreadTickets(user.token);

            socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}`, { query: { token: user.token } });

            socketRef.current.on('receive_message', (msg) => {
                if (msg.ticket_id == selectedTicketIdRef.current) {
                    setMessages(prev => [...prev, msg]);
                    // Auto-mark as read since user is viewing this ticket
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/${msg.ticket_id}/read`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${user.token}` }
                    }).then(() => {
                        window.dispatchEvent(new Event('chat_read'));
                        fetchUnreadTickets(user.token);
                    }).catch(err => console.error(err));
                } else {
                    // Update unread badges if message is for another ticket
                    fetchUnreadTickets(user.token);
                }
            });

            socketRef.current.on('receive_message_global', (msgData) => {
                if (msgData?.sender_id !== user.id && msgData?.ticket_owner_id === user.id) {
                    fetchUnreadTickets(user.token);
                }
            });

            socketRef.current.on('refresh_chats', () => {
                fetchUnreadTickets(user.token);
            });

            socketRef.current.on('refresh_tickets', () => {
                fetchMyTickets(user.token);
                fetchUnreadTickets(user.token);
            });

            socketRef.current.on('message_unsent', (msgId) => {
                setMessages(prev => prev.filter(m => String(m.id) !== String(msgId)));
            });

            socketRef.current.on('chat_cleared', () => {
                setMessages([]);
            });

            const handleChatRead = () => fetchUnreadTickets(user.token);
            window.addEventListener('chat_read', handleChatRead);

            return () => {
                socketRef.current.disconnect();
                window.removeEventListener('chat_read', handleChatRead);
            };
        }
    }, []);

    useEffect(() => {
        if (selectedTicketId && socketRef.current && token) {
            socketRef.current.emit('join_ticket', selectedTicketId);
            fetchChatHistory(selectedTicketId);
            // Mark chat as read
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/${selectedTicketId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(() => {
                window.dispatchEvent(new Event('chat_read'));
            }).catch(err => console.error(err));
        }
    }, [selectedTicketId, token]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = () => setMobileMenuMsgId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchMyTickets = async (t) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/my-tickets`, { headers: { 'Authorization': `Bearer ${t}` } });
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setTickets(list);
        } catch (err) { console.error(err); }
    };

    const fetchUnreadTickets = async (t) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/user-unread-tickets`, {
                headers: { 'Authorization': `Bearer ${t}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setUnreadTickets(data);
        } catch (err) { console.error(err); }
    };

    const fetchChatHistory = async (tId) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/${tId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            setMessages(await res.json());
        } catch (err) { console.error(err); }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        let finalMsg = newMessage;
        if (replyingTo) {
            const stripped = replyingTo.message.replace(/\[REPLY:[\s\S]*?\[\/REPLY\]/, '').trim();
            const senderLabel = String(replyingTo.sender_id) === String(userId) ? t('you') : (replyingTo.sender_name || t('itSupportLabel'));
            finalMsg = `[REPLY: ${senderLabel}] ${stripped}[/REPLY] ${newMessage}`;
        }
        const msgData = { ticket_id: selectedTicketId, sender_id: userId, message: finalMsg };
        socketRef.current.emit('send_message', msgData);
        setNewMessage('');
        setReplyingTo(null);
    };

    const handleUnsend = async (msgId) => {
        showConfirm({
            title: t('confirmUnsend') || 'ยกเลิกข้อความ',
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

    return (
        <div className="animate-fade-in chat-wrapper" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', margin: '-1rem' }}>
            <h2 className="desktop-only" style={{ color: 'var(--color-primary)', marginBottom: '1.5rem', padding: '0 1rem' }}>{t('itSupportChat')}</h2>

            <div className={`chat-layout ${selectedTicketId ? 'ticket-selected' : ''}`} style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>

                <div className="glass-card chat-sidebar" style={{ width: '300px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <h3 style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-glass-border)' }}>{t('myTickets')}</h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {tickets.map(tk => {
                            const hasUnread = unreadTickets.includes(tk.id) && selectedTicketId != tk.id;
                            return (
                                <li
                                    key={tk.id}
                                    onClick={() => setSelectedTicketId(tk.id)}
                                    style={{
                                        position: 'relative', padding: '1rem', cursor: 'pointer', borderRadius: '8px',
                                        backgroundColor: selectedTicketId == tk.id ? 'var(--color-glass)' : 'transparent',
                                        border: selectedTicketId == tk.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <strong>{tk.ticket_no}</strong>
                                    {hasUnread && <span style={{ position: 'absolute', top: '12px', right: '12px', width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', boxShadow: '0 0 0 2px var(--color-bg-base)' }}></span>}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: tk.status === 'closed' ? 'var(--color-error)' : 'var(--color-text-muted)', fontStyle: tk.status === 'closed' ? 'italic' : 'normal' }}>
                                            {tk.status === 'closed' ? t('closed') : tk.status}
                                        </div>
                                        {tk.status === 'closed' && (
                                            <div style={{ fontSize: '0.72rem' }}>
                                                {tk.keep_chat_history ? (
                                                    <span style={{ color: '#10b981' }}>| 💾 เก็บแชท</span>
                                                ) : (tk.closed_at || tk.updated_at) ? (
                                                    <span style={{ color: '#ef4444' }}>| ⚠️ ลบ {new Date(new Date(tk.closed_at || tk.updated_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('th-TH')}</span>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="glass-card chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
                    {selectedTicketId ? (
                        <>
                            <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--color-glass-border)', backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '56px' }}>
                                <button className="mobile-only btn btn-outline" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setSelectedTicketId('')}>
                                    ← Back
                                </button>
                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                                        <span style={{ fontWeight: '700', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text-main)' }}>
                                            #{tickets.find(tk => tk.id == selectedTicketId)?.ticket_no}
                                        </span>
                                        {!!tickets.find(tk => tk.id == selectedTicketId)?.keep_chat_history && (
                                            <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '8px', backgroundColor: '#10b981', color: '#fff', fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                                💾 {t('savedHistory')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {messages.length > 0 ? messages.map((m, idx) => {
                                    const isMe = String(m.sender_id) === String(userId);
                                    const msgTime = new Date(m.created_at).getTime();
                                    const canUnsend = isMe && (Date.now() - msgTime <= 3600000); // 1 hour 
                                    let parsedFiles = [];
                                    try {
                                        if (m.file_urls) parsedFiles = JSON.parse(m.file_urls);
                                    } catch (e) { }

                                    const showMenu = hoveredMsgId === m.id || mobileMenuMsgId === m.id;
                                    return (
                                        <div
                                            key={idx}
                                            style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', position: 'relative', display: 'flex', flexDirection: 'column' }}
                                            onMouseEnter={() => setHoveredMsgId(m.id)}
                                            onMouseLeave={() => setHoveredMsgId(null)}
                                        >
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textAlign: isMe ? 'right' : 'left' }}>
                                                {isMe ? t('you') : (m.sender_name || t('itSupportLabel'))} · {new Date(m.created_at).toLocaleTimeString()}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                                <div style={{
                                                    padding: '0.75rem 1rem', borderRadius: '12px',
                                                    backgroundColor: isMe ? 'var(--color-primary)' : 'var(--color-glass)',
                                                    color: isMe ? '#fff' : 'var(--color-text-main)',
                                                    border: isMe ? 'none' : '1px solid var(--color-glass-border)',
                                                    wordBreak: 'break-word', transition: 'opacity 0.2s', opacity: 1, cursor: 'pointer'
                                                }}
                                                    onClick={(e) => { e.stopPropagation(); setMobileMenuMsgId(mobileMenuMsgId === m.id ? null : m.id); }}
                                                >
                                                    {renderMessageContent(m.message, isMe)}
                                                    {parsedFiles.length > 0 && (
                                                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                            {parsedFiles.map((f, fi) => {
                                                                const fileUrl = f.url ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}${f.url}` : '#';
                                                                const isImage = f.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.url);
                                                                return (
                                                                    <div key={fi} style={{ marginTop: '0.25rem' }}>
                                                                        {isImage ? (
                                                                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                                                                <img src={fileUrl} alt={f.name} style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--color-glass-border)', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.1)' }} />
                                                                            </a>
                                                                        ) : (
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                                                                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" /></svg>
                                                                                <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px', color: isMe ? '#fff' : 'var(--color-text-main)' }}>{f.name || `File ${fi + 1}`}</span>
                                                                                <a href={fileUrl} download target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', background: isMe ? 'rgba(255,255,255,0.3)' : 'var(--color-primary)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.75rem' }}>
                                                                                    Download
                                                                                </a>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Hover / Tap Action Menu */}
                                                {showMenu && (
                                                    <div style={{
                                                        display: 'flex', gap: '0.2rem',
                                                        background: 'var(--color-bg-card)',
                                                        padding: '0.3rem', borderRadius: '8px',
                                                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                                        border: '1px solid var(--color-glass-border)',
                                                        animation: 'fadeDropdown 0.2s ease-out', zIndex: 10
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
                                                                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
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
                                }) : <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>{t('noMessagesYet')}</div>}
                                <div ref={chatEndRef} />
                            </div>

                            {tickets.find(tk => tk.id == selectedTicketId)?.status === 'closed' ? (
                                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-glass-border)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ fontWeight: '500', marginBottom: '0.3rem' }}>{t('ticketClosedReadOnly')}</div>
                                    {(() => {
                                        const tkk = tickets.find(tk => tk.id == selectedTicketId);
                                        if (tkk && tkk.closed_at && !tkk.keep_chat_history) {
                                            const deleteDate = new Date(tkk.closed_at);
                                            deleteDate.setDate(deleteDate.getDate() + 7);
                                            return <div style={{ fontSize: '0.82rem', color: '#ef4444', marginTop: '0.2rem' }}>⚠️ ประวัติแชทนี้จะถูกลบออกจากระบบในวันที่ {deleteDate.toLocaleDateString('th-TH')}</div>;
                                        } else if (tkk && tkk.keep_chat_history) {
                                            return <div style={{ fontSize: '0.82rem', color: '#10b981', marginTop: '0.2rem' }}>💾 ประวัติแชทนี้ถูกบันทึกเก็บไว้โดยเจ้าหน้าที่</div>;
                                        }
                                        return null;
                                    })()}
                                </div>
                            ) : !tickets.find(tk => tk.id == selectedTicketId)?.assigned_to ? (
                                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-glass-border)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    ⏳ {t('waitingForAssignment')}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--color-glass-border)' }}>
                                    {replyingTo && (
                                        <div style={{ padding: '0.5rem 1rem', background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', overflow: 'hidden' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                    {t('replyingTo') || 'Replying to'} {String(replyingTo.sender_id) === String(userId) ? t('you') : (replyingTo.sender_name || t('itSupportLabel'))}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {replyingTo.message.replace(/\[REPLY:[\s\S]*?\[\/REPLY\]/, '').trim()}
                                                </span>
                                            </div>
                                            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.2rem', padding: '0 0.5rem' }}>×</button>
                                        </div>
                                    )}
                                    <form onSubmit={sendMessage} style={{ padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} multiple />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-outline" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('attachFiles')}>
                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
                                        </button>
                                        <input
                                            type="text" className="input" style={{ flex: 1, marginBottom: 0 }}
                                            placeholder={t('typeMessage') + " (or Ctrl+V to paste image)"}
                                            value={newMessage} onChange={e => setNewMessage(e.target.value)} onPaste={handlePaste}
                                        />
                                        <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>{t('send')}</button>
                                    </form>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                            {t('selectTicketPrompt')}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
