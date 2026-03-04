'use client';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useLanguage } from '../../components/LanguageProvider';

export default function UserTrack() {
    const { t } = useLanguage();
    const [tickets, setTickets] = useState([]);
    const [token, setToken] = useState('');
    const [user, setUser] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [unreadTickets, setUnreadTickets] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(u);
        setToken(u.token);
        if (u.token) {
            fetchMyTickets(u.token);
            fetchUnreadTickets(u.token);

            // Setup socket.io for real-time unread ticket updates
            socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250', {
                transports: ['websocket'],
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            socketRef.current.on('connect', () => {
                socketRef.current.emit('user_online', { user_id: u.id, name: u.name });
            });

            socketRef.current.on('refresh_chats', () => { fetchUnreadTickets(u.token); });
            socketRef.current.on('receive_message_global', (msgData) => {
                if (msgData?.sender_id !== u.id && msgData?.ticket_owner_id === u.id) {
                    fetchUnreadTickets(u.token);
                }
            });

            const handleChatRead = () => fetchUnreadTickets(u.token);
            window.addEventListener('chat_read', handleChatRead);

            return () => {
                socketRef.current?.disconnect();
                window.removeEventListener('chat_read', handleChatRead);
            };
        }
    }, []);

    const fetchMyTickets = async (tk) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/my-tickets`, { headers: { 'Authorization': `Bearer ${tk}` } });
            const data = await res.json();
            if (Array.isArray(data)) setTickets(data);
        } catch (err) { console.error(err); }
    };

    const fetchUnreadTickets = async (tk) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/user-unread-tickets`, {
                headers: { 'Authorization': `Bearer ${tk}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setUnreadTickets(data);
        } catch (err) { console.error(err); }
    };

    const statusColor = (status) => {
        if (status === 'closed') return { border: '#10b981', bg: 'rgba(16,185,129,0.08)', text: '#10b981' };
        if (status === 'in_progress') return { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', text: '#d97706' };
        return { border: '#6366f1', bg: 'rgba(99,102,241,0.08)', text: '#6366f1' };
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('trackMyIssues')}</h2>

            {/* ── Desktop: Table ── */}
            <div className="table-container glass-card desktop-only">
                <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>{t('ticketNo')}</th>
                            <th>{t('dateTime')}</th>
                            <th>{t('description')}</th>
                            <th>{t('status')}</th>
                            <th>{t('assignedIt')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.length > 0 ? tickets.map(tk => {
                            const dt = new Date(tk.created_at);
                            const hasUnread = unreadTickets.includes(tk.id);
                            return (
                                <tr key={tk.id}>
                                    <td><strong>{tk.ticket_no}</strong></td>
                                    <td>{dt.toLocaleDateString()}<br /><span style={{ color: 'var(--color-text-muted)' }}>{dt.toLocaleTimeString()}</span></td>
                                    <td title={tk.description}>
                                        {tk.description?.substring(0, 40)}...
                                        {tk.status === 'closed' && (
                                            <div style={{ marginTop: '0.4rem', fontSize: '0.75rem' }}>
                                                {tk.keep_chat_history ? (
                                                    <span style={{ color: '#10b981' }}>💾 ประวัติแชทถูกเก็บไว้</span>
                                                ) : (tk.closed_at || tk.updated_at) ? (
                                                    <span style={{ color: '#ef4444' }}>⚠️ แชทจะถูกลบ: {new Date(new Date(tk.closed_at || tk.updated_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('th-TH')}</span>
                                                ) : null}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${tk.status === 'closed' ? 'success' : tk.status === 'in_progress' ? 'warning' : 'info'}`}>
                                            {tk.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>{tk.assigned_name || t('pendingAssignment')}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                                            <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }}
                                                onClick={() => setSelectedTicket(tk)}>
                                                {t('detail')}
                                            </button>
                                            <a href={`/user/chat?ticket=${tk.id}`} className="btn btn-outline" style={{ position: 'relative', padding: '0.2rem 0.5rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: 'text-bottom' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                                Chat
                                                {hasUnread && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', boxShadow: '0 0 0 2px var(--color-bg-base)' }}></span>}
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : <tr><td colSpan="6" style={{ textAlign: 'center' }}>{t('noRecordedIssues')}</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* ── Mobile: Cards ── */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tickets.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.75rem', opacity: 0.4 }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                        </svg>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('noRecordedIssues')}</p>
                    </div>
                ) : tickets.map(tk => {
                    const dt = new Date(tk.created_at);
                    const sc = statusColor(tk.status);
                    const hasUnread = unreadTickets.includes(tk.id);
                    return (
                        <div key={tk.id} style={{
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            borderLeft: `4px solid ${sc.border}`,
                            borderRadius: 'var(--radius-lg)',
                            padding: '1rem',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.55rem',
                        }}>
                            {/* Row 1: Ticket No + Status Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-primary)', letterSpacing: '0.01em' }}>
                                    #{tk.ticket_no}
                                </span>
                                <span style={{
                                    fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.65rem',
                                    borderRadius: '20px', background: sc.bg, color: sc.text,
                                    border: `1px solid ${sc.border}`, whiteSpace: 'nowrap', textTransform: 'capitalize',
                                }}>
                                    {tk.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Row 2: Date + Time */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span>{dt.toLocaleDateString()}</span>
                                <span style={{ color: 'var(--color-glass-border)' }}>•</span>
                                <span>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Row 3: Assigned IT */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                                <span style={{ color: 'var(--color-text-muted)', marginRight: '0.15rem' }}>{t('assignedIt')}:</span>
                                <span style={{ fontWeight: '500', color: tk.assigned_name ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontStyle: tk.assigned_name ? 'normal' : 'italic' }}>
                                    {tk.assigned_name || t('pendingAssignment')}
                                </span>
                            </div>

                            {/* Row 4: Description */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}>
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {tk.description}
                                    </p>
                                    {tk.status === 'closed' && (
                                        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}>
                                            {tk.keep_chat_history ? (
                                                <span style={{ color: '#10b981' }}>💾 ประวัติแชทถูกเก็บไว้โดยเจ้าหน้าที่</span>
                                            ) : (tk.closed_at || tk.updated_at) ? (
                                                <span style={{ color: '#ef4444' }}>⚠️ แชทจะถูกลบอัตโนมัติ: {new Date(new Date(tk.closed_at || tk.updated_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('th-TH')}</span>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 5: Detail Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem', borderTop: '1px solid var(--color-glass-border)', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-outline"
                                    style={{ padding: '0.3rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    onClick={() => setSelectedTicket(tk)}
                                >
                                    {t('detail')}
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                                <a href={`/user/chat?ticket=${tk.id}`} className="btn btn-outline" style={{ position: 'relative', padding: '0.3rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    Chat
                                    {hasUnread && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', boxShadow: '0 0 0 2px var(--color-bg-base)' }}></span>}
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedTicket && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem', boxSizing: 'border-box' }}
                    onClick={() => setSelectedTicket(null)}>
                    <div className="glass-card animate-slide-up"
                        style={{ width: '100%', maxWidth: '500px', maxHeight: '85dvh', overflow: 'auto', padding: '1.25rem', position: 'relative' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1rem' }}>
                                {t('ticketDetail')}: <strong>{selectedTicket.ticket_no}</strong>
                            </h3>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: '600', padding: '0.2rem 0.65rem',
                                borderRadius: '20px', textTransform: 'capitalize',
                                background: statusColor(selectedTicket.status).bg,
                                color: statusColor(selectedTicket.status).text,
                                border: `1px solid ${statusColor(selectedTicket.status).border}`,
                            }}>
                                {selectedTicket.status.replace('_', ' ')}
                            </span>
                        </div>

                        {/* Info rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                            {[
                                [t('created'), new Date(selectedTicket.created_at).toLocaleString()],
                                [t('category'), selectedTicket.category_name || '-'],
                                [t('assignedIt'), selectedTicket.assigned_name || t('pendingAssignment')],
                                [t('closedAt'), selectedTicket.closed_at ? new Date(selectedTicket.closed_at).toLocaleString() : '-'],
                            ].map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: '600', minWidth: '110px', color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
                                    <span style={{ color: 'var(--color-text-main)' }}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: '0.75rem' }}>
                            <label className="label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t('issueDetails')}</label>
                            <p style={{ padding: '0.75rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontSize: '0.85rem', margin: '0.4rem 0 0', lineHeight: 1.6 }}>
                                {selectedTicket.description}
                            </p>
                        </div>

                        {/* Attachments */}
                        {selectedTicket.attachment_urls && (() => {
                            try {
                                const parsed = typeof selectedTicket.attachment_urls === 'string' ? JSON.parse(selectedTicket.attachment_urls) : selectedTicket.attachment_urls;
                                return parsed.length > 0 ? (
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label className="label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>📎 {t('attached')}</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                            {parsed.map((f, i) => (
                                                <a key={i} href={`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}${f.url}`} target="_blank" rel="noreferrer"
                                                    style={{ padding: '0.4rem 0.8rem', background: '#e0e7ff', color: '#4338ca', borderRadius: '4px', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                                    {f.name}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ) : null;
                            } catch (err) { return null; }
                        })()}

                        {selectedTicket.solution && (
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label className="label" style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--color-success)' }}>{t('solution')}</label>
                                <p style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontSize: '0.85rem', margin: '0.4rem 0 0', lineHeight: 1.6 }}>
                                    {selectedTicket.solution}
                                </p>
                            </div>
                        )}

                        <button className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem' }}
                            onClick={() => setSelectedTicket(null)}>{t('close')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
