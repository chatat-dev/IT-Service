'use client';
import { useState, useEffect } from 'react';
import { useModal } from '../components/ModalProvider';
import { useLanguage } from '../components/LanguageProvider';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ITDashboard() {
    const { showAlert } = useModal();
    const { t } = useLanguage();
    const [stats, setStats] = useState(null);
    const [token, setToken] = useState('');

    // Export
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [counts, setCounts] = useState({ openTickets: 0, unreadChats: 0, pendingUsers: 0 });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) {
            fetchStats(user.token);
            fetchCounts(user.token);

            // Establish socket for realtime updates
            import('socket.io-client').then(({ io }) => {
                const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250', {
                    query: { token: user.token, userId: user.id }
                });

                socket.on('refresh_tickets', () => fetchCounts(user.token));
                socket.on('refresh_users', () => fetchCounts(user.token)); // For realtime user approval changes
                socket.on('receive_message', () => {
                    fetchCounts(user.token);
                });
                socket.on('receive_message_global', () => {
                    fetchCounts(user.token);
                });

                const handleChatRead = () => fetchCounts(user.token);
                window.addEventListener('chat_read', handleChatRead);

                // cleanup
                return () => {
                    socket.disconnect();
                    window.removeEventListener('chat_read', handleChatRead);
                };
            });
        }
    }, []);

    const fetchCounts = async (t) => {
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250';
            const headers = { 'Authorization': `Bearer ${t}` };

            const [ticketsRes, usersRes, chatRes] = await Promise.all([
                fetch(`${API}/api/tickets/board`, { headers }),
                fetch(`${API}/api/it/pending-users`, { headers }),
                fetch(`${API}/api/chat/it-unread-count`, { headers })
            ]);

            const tickets = await ticketsRes.json();
            const unreadTickets = Array.isArray(tickets) ? tickets.filter(t => !t.is_viewed_by_me && t.status !== 'closed').length : 0;

            const users = usersRes.ok ? await usersRes.json() : [];
            const pendingUsers = Array.isArray(users) ? users.length : 0;

            const chatData = chatRes.ok ? await chatRes.json() : { unreadCount: 0 };
            const unreadChats = chatData.unreadCount || 0;

            setCounts({ openTickets: unreadTickets, pendingUsers, unreadChats });
        } catch (err) { console.error('Error fetching counts:', err); }
    };

    const fetchStats = async (t) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/reports/stats`, { headers: { 'Authorization': `Bearer ${t}` } });
            const data = await res.json();
            setStats(data);
        } catch (err) { console.error(err); }
    };

    const exportExcel = async () => {
        try {
            let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/reports/export?format=xlsx&`;
            if (fromDate) url += `from=${fromDate}&`;
            if (toDate) url += `to=${toDate}&`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) {
                showAlert({ title: 'Export ไม่สำเร็จ', message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', type: 'error' });
                return;
            }

            const blob = await res.blob();
            if (blob.size === 0) {
                showAlert({ title: 'ไม่พบข้อมูล', message: 'ไม่มีข้อมูลในช่วงเวลานี้', type: 'warning' });
                return;
            }

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `IT_Report_${fromDate || 'all'}_to_${toDate || 'now'}.xlsx`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Export ไม่สำเร็จ', message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล', type: 'error' });
        }
    };

    const sc = stats?.statusCounts || {};
    const maxPerIT = stats?.perIT ? Math.max(...stats.perIT.map(i => i.total), 1) : 1;
    const maxCat = stats?.byCategory ? Math.max(...stats.byCategory.map(i => i.count), 1) : 1;
    const maxSite = stats?.bySite ? Math.max(...stats.bySite.map(i => i.count), 1) : 1;
    const maxSiteName = stats?.bySiteName ? Math.max(...stats.bySiteName.map(i => i.count), 1) : 1;

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('itDashboard')}</h2>

            {/* Quick Actions */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>{t('quickActions')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <a href="/it/board" className="btn btn-primary" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', height: 'auto', minHeight: '120px', borderRadius: '12px', textAlign: 'center' }}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                        {t('goToBoard')}
                        {counts.openTickets > 0 && (
                            <span style={{
                                position: 'absolute', top: '-8px', right: '-8px',
                                background: '#ef4444', color: '#fff', fontSize: '0.75rem',
                                padding: '2px 6px', borderRadius: '12px', fontWeight: 'bold'
                            }}>
                                {counts.openTickets}
                            </span>
                        )}
                    </a>
                    <a href="/it/approve" className="btn btn-outline" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', height: 'auto', minHeight: '120px', borderRadius: '12px', textAlign: 'center' }}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                        {t('userApproval')}
                        {counts.pendingUsers > 0 && (
                            <span style={{
                                position: 'absolute', top: '-8px', right: '-8px',
                                background: '#ef4444', color: '#fff', fontSize: '0.75rem',
                                padding: '2px 6px', borderRadius: '12px', fontWeight: 'bold'
                            }}>
                                {counts.pendingUsers}
                            </span>
                        )}
                    </a>
                    <a href="/it/chat" className="btn btn-outline" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', height: 'auto', minHeight: '120px', borderRadius: '12px', textAlign: 'center' }}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        {t('supportChat')}
                        {counts.unreadChats > 0 && (
                            <span style={{
                                position: 'absolute', top: '-8px', right: '-8px',
                                background: '#ef4444', color: '#fff', fontSize: '0.75rem',
                                padding: '2px 6px', borderRadius: '12px', fontWeight: 'bold'
                            }}>
                                {counts.unreadChats}
                            </span>
                        )}
                    </a>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {
                    [{ labelKey: 'openRequests', value: sc.open || 0, color: '#ef4444' },
                    { labelKey: 'inProgress', value: sc.in_progress || 0, color: '#f59e0b' },
                    { labelKey: 'closedJobs', value: sc.closed || 0, color: '#10b981' },
                    { labelKey: 'total', value: (sc.open || 0) + (sc.in_progress || 0) + (sc.closed || 0), color: '#6366f1' },
                    ].map(s => (
                        <div key={s.labelKey} className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: s.color }}>{s.value}</div>
                            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{t(s.labelKey)}</p>
                        </div>
                    ))}
            </div>

            {/* Charts Row */}
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Jobs per IT Staff */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{t('jobsPerIT')}</h3>
                    {stats?.perIT?.length > 0 ? stats.perIT.map((it, i) => (
                        <div key={it.id} style={{ marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <span>{it.name}</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>{it.active} active / {it.closed} closed</span>
                            </div>
                            <div style={{ background: 'var(--color-surface)', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(it.total / maxPerIT) * 100}%`, height: '100%',
                                    background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})`,
                                    borderRadius: '4px', transition: 'width 0.5s ease',
                                    display: 'flex', alignItems: 'center', paddingLeft: '0.5rem',
                                    color: '#fff', fontSize: '0.7rem', fontWeight: '600'
                                }}>{it.total}</div>
                            </div>
                        </div>
                    )) : <p style={{ color: 'var(--color-text-muted)' }}>No data</p>}
                </div>

                {/* Problems by Category */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{t('problemsByCategory')}</h3>
                    {stats?.byCategory?.length > 0 ? stats.byCategory.map((cat, i) => (
                        <div key={cat.name || i} style={{ marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <span>{cat.name || 'Uncategorized'}</span>
                                <span style={{ fontWeight: '600' }}>{cat.count}</span>
                            </div>
                            <div style={{ background: 'var(--color-surface)', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(cat.count / maxCat) * 100}%`, height: '100%',
                                    background: COLORS[i % COLORS.length], borderRadius: '4px', transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>
                    )) : <p style={{ color: 'var(--color-text-muted)' }}>No data</p>}
                </div>

                {/* Problems by Location/Site */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{t('problemsByLocation')}</h3>
                    {stats?.bySite?.length > 0 ? stats.bySite.map((site, i) => (
                        <div key={site.location_name || i} style={{ marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <span>{site.location_name || 'Unknown'}</span>
                                <span style={{ fontWeight: '600' }}>{site.count}</span>
                            </div>
                            <div style={{ background: 'var(--color-surface)', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(site.count / maxSite) * 100}%`, height: '100%',
                                    background: COLORS[(i + 3) % COLORS.length], borderRadius: '4px', transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>
                    )) : <p style={{ color: 'var(--color-text-muted)' }}>No data</p>}
                </div>

                {/* Tickets by Site */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{t('ticketsBySite')}</h3>
                    {stats?.bySiteName?.length > 0 ? stats.bySiteName.map((site, i) => (
                        <div key={site.site_name || i} style={{ marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <span>{site.site_name || 'Unknown'}</span>
                                <span style={{ fontWeight: '600' }}>{site.count}</span>
                            </div>
                            <div style={{ background: 'var(--color-surface)', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(site.count / maxSiteName) * 100}%`, height: '100%',
                                    background: COLORS[(i + 5) % COLORS.length], borderRadius: '4px', transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>
                    )) : <p style={{ color: 'var(--color-text-muted)' }}>No data</p>}
                </div>
            </div>

            {/* Export Section */}
            <div className="glass-card">
                <h3 style={{ marginBottom: '1rem' }}>Export Report to Excel (.xlsx)</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="label">{t('fromDate')}</label>
                        <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="label">{t('toDate')}</label>
                        <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={exportExcel} style={{ height: '46px', padding: '0 1.5rem' }}>
                        Export .xlsx
                    </button>
                </div>
            </div>
        </div>
    );
}
