'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';

export default function ITHistoryPage() {
    const { t } = useLanguage();
    const [tickets, setTickets] = useState([]);
    const [token, setToken] = useState('');
    const [userId, setUserId] = useState(null);

    const [searchText, setSearchText] = useState('');
    const [editingTicket, setEditingTicket] = useState(null);
    const [editSolutionText, setEditSolutionText] = useState('');
    const [detailTicket, setDetailTicket] = useState(null);

    // Link Asset
    const [linkTicket, setLinkTicket] = useState(null);
    const [linkSearchQuery, setLinkSearchQuery] = useState('');
    const [linkSearchResults, setLinkSearchResults] = useState([]);
    const [linkSelectedComputer, setLinkSelectedComputer] = useState(null);
    const [linkSearched, setLinkSearched] = useState(false);
    const [linkSearching, setLinkSearching] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        setUserId(user.id);
        if (user.token) fetchClosedTickets(user.token);
    }, []);

    const fetchClosedTickets = async (t_tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/board`, { headers: { 'Authorization': `Bearer ${t_tok}` } });
            const data = await res.json();
            if (Array.isArray(data)) {
                setTickets(data.filter(tk => tk.status === 'closed'));
            }
        } catch (err) { console.error(err); }
    };

    const submitEditSolution = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${editingTicket.id}/solution`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ solution: editSolutionText })
            });
            setEditingTicket(null);
            fetchClosedTickets();
        } catch (err) { console.error(err); }
    };

    const searchComputers = async (query) => {
        if (!query || query.trim().length < 1) {
            setLinkSearchResults([]);
            setLinkSearched(false);
            return;
        }
        setLinkSearching(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers/search-by-employee?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setLinkSearchResults(Array.isArray(data) ? data : []);
            setLinkSearched(true);
        } catch (err) { console.error(err); setLinkSearchResults([]); setLinkSearched(true); }
        setLinkSearching(false);
    };

    const submitLinkAsset = async (e) => {
        e.preventDefault();
        if (!linkSelectedComputer || !linkTicket) return;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${linkTicket.id}/link`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ computer_id: linkSelectedComputer.id })
            });
            setLinkTicket(null);
            setLinkSearchQuery('');
            setLinkSearchResults([]);
            setLinkSelectedComputer(null);
            setLinkSearched(false);
            fetchClosedTickets();
        } catch (err) { console.error(err); }
    };

    const filteredTickets = tickets.filter(tk => {
        if (!searchText) return true;
        const q = searchText.toLowerCase();
        const rName = tk.guest_name || `${tk.user_name || ''} ${tk.user_lname || ''}`;
        return tk.ticket_no?.toLowerCase().includes(q) ||
            rName.toLowerCase().includes(q) ||
            tk.solution?.toLowerCase().includes(q) ||
            tk.category_name?.toLowerCase().includes(q) ||
            tk.assigned_name?.toLowerCase().includes(q);
    });

    return (
        <div className="animate-fade-in" style={{ position: 'relative' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('closedJobHistory')}</h2>

            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <input type="text" className="input" placeholder="🔍 Search ticket no, requester, solution, category..." value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>

            <div className="table-container glass-card desktop-only">
                <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>{t('ticketNo')}</th>
                            <th>{t('closedDate')}</th>
                            <th>{t('problemCategory')}</th>
                            <th>{t('assignedIt')}</th>
                            <th>{t('solutionNote')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTickets.length > 0 ? filteredTickets.map(tk => {
                            const dt = new Date(tk.closed_at);
                            return (
                                <tr key={tk.id}>
                                    <td>
                                        <strong
                                            style={{ cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline' }}
                                            onClick={() => setDetailTicket(tk)}
                                        >
                                            {tk.ticket_no}
                                        </strong>
                                    </td>
                                    <td>{tk.closed_at ? dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString() : '-'}</td>
                                    <td>{tk.category_name || '-'}</td>
                                    <td>{tk.assigned_name}</td>
                                    <td>{tk.solution?.substring(0, 50)}...</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                            {tk.assigned_to === userId && (
                                                <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => { setEditingTicket(tk); setEditSolutionText(tk.solution || ''); }}>
                                                    Edit Note
                                                </button>
                                            )}
                                            {!tk.computer_id && (
                                                <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', borderColor: '#3b82f6', color: '#3b82f6' }} onClick={() => { setLinkTicket(tk); setLinkSearchQuery(''); setLinkSearchResults([]); setLinkSelectedComputer(null); setLinkSearched(false); }}>
                                                    🔗 Link Asset
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : <tr><td colSpan="6" style={{ textAlign: 'center' }}>No closed jobs found</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredTickets.length > 0 ? filteredTickets.map(tk => {
                    const dt = new Date(tk.closed_at);
                    return (
                        <div key={tk.id} className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline', fontSize: '1.1rem' }} onClick={() => setDetailTicket(tk)}>
                                    {tk.ticket_no}
                                </strong>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                                    {tk.closed_at ? dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString() : '-'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ fontSize: '0.9rem' }}>🏷️ {tk.category_name || '-'}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>👤 assigned: {tk.assigned_name}</div>
                            </div>

                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', background: 'var(--color-bg-surface)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                                {tk.solution?.substring(0, 100)}{tk.solution?.length > 100 ? '...' : ''}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {tk.assigned_to === userId && (
                                    <button className="btn btn-outline" style={{ padding: '0.4rem', flex: 1 }} onClick={() => { setEditingTicket(tk); setEditSolutionText(tk.solution || ''); }}>
                                        ✏️ Edit Note
                                    </button>
                                )}
                                {!tk.computer_id && (
                                    <button className="btn btn-outline" style={{ padding: '0.4rem', borderColor: '#3b82f6', color: '#3b82f6', flex: 1 }} onClick={() => { setLinkTicket(tk); setLinkSearchQuery(''); setLinkSearchResults([]); setLinkSelectedComputer(null); setLinkSearched(false); }}>
                                        🔗 Link Asset
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <p style={{ color: 'var(--color-text-muted)' }}>No closed jobs found</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {detailTicket && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem'
                }} onClick={() => setDetailTicket(null)}>
                    <div style={{
                        background: '#ffffff', borderRadius: '16px', padding: '2rem', width: '560px', maxWidth: '92vw',
                        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        animation: 'modalSlideUp 0.3s ease'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: '#6366f1', fontSize: '1.2rem' }}>📋 {detailTicket.ticket_no}</h3>
                            <button onClick={() => setDetailTicket(null)} style={{
                                background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af'
                            }}>✕</button>
                        </div>

                        {/* Status Badge */}
                        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                            <span style={{
                                background: '#10b981', color: '#fff', padding: '0.3rem 1rem',
                                borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
                            }}>✅ Closed</span>
                            <span style={{
                                background: detailTicket.guest_name ? '#f59e0b' : '#6366f1',
                                color: '#fff', padding: '0.3rem 1rem',
                                borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
                            }}>
                                {detailTicket.guest_name ? '👤 Guest' : '🔑 Member'}
                            </span>
                        </div>

                        {/* Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {[
                                { label: '👤 Requester', value: detailTicket.guest_name || `${detailTicket.user_name || ''} ${detailTicket.user_lname || ''}` },
                                { label: '📞 Phone', value: detailTicket.guest_phone || detailTicket.phone || '-' },
                                { label: '📅 Created', value: new Date(detailTicket.created_at).toLocaleString() },
                                { label: '📅 Closed', value: detailTicket.closed_at ? new Date(detailTicket.closed_at).toLocaleString() : '-' },
                                { label: '📍 Location', value: detailTicket.location_name || '-' },
                                { label: '🏢 Company', value: detailTicket.company_name || '-' },
                                { label: '🔧 Assigned To', value: detailTicket.assigned_name || '-' },
                                { label: '🏷️ Category', value: detailTicket.category_name || '-' },
                            ].map((item, i) => (
                                <div key={i} style={{ padding: '0.6rem', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '600', marginBottom: '0.2rem' }}>{item.label}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#374151', fontWeight: '500' }}>{item.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', marginBottom: '0.4rem' }}>📝 Issue Description</div>
                            <div style={{
                                padding: '1rem', background: '#f9fafb', borderRadius: '8px',
                                color: '#374151', fontSize: '0.9rem', lineHeight: '1.6',
                                whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto'
                            }}>
                                {detailTicket.description || '-'}
                            </div>
                        </div>

                        {/* Solution */}
                        {detailTicket.solution && (
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', marginBottom: '0.4rem' }}>💡 Solution</div>
                                <div style={{
                                    padding: '1rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0',
                                    color: '#065f46', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap'
                                }}>
                                    {detailTicket.solution}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Solution Modal */}
            {editingTicket && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '1rem' }}>
                    <div className="glass-card animate-slide-up" style={{ width: '500px', maxWidth: '95vw' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--color-secondary)' }}>Edit Solution - {editingTicket.ticket_no}</h3>
                        <form onSubmit={submitEditSolution}>
                            <div className="form-group">
                                <label className="label">Solution Details</label>
                                <textarea className="textarea" required value={editSolutionText || ''} onChange={e => setEditSolutionText(e.target.value)}></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setEditingTicket(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Link Asset Modal */}
            {linkTicket && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '1rem' }}>
                    <div className="glass-card animate-slide-up" style={{ width: '480px', maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#3b82f6' }}>🔗 Link Asset — {linkTicket.ticket_no}</h3>
                        <form onSubmit={submitLinkAsset}>
                            <div className="form-group">
                                <label className="label">ค้นหาด้วยรหัสพนักงาน / ชื่อพนักงาน / Asset No.</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="text" className="input" placeholder="พิมพ์รหัสพนักงาน, ชื่อ หรือ Asset No..." value={linkSearchQuery} onChange={e => { setLinkSearchQuery(e.target.value); setLinkSelectedComputer(null); }} style={{ flex: 1 }} />
                                    <button type="button" className="btn btn-primary" style={{ padding: '0.4rem 1rem', whiteSpace: 'nowrap' }} onClick={() => searchComputers(linkSearchQuery)} disabled={linkSearching}>
                                        {linkSearching ? '...' : '🔍 ค้นหา'}
                                    </button>
                                </div>
                            </div>

                            {linkSearched && (
                                <div style={{ marginBottom: '1rem' }}>
                                    {linkSearchResults.length > 0 ? (
                                        <div style={{ border: '1px solid var(--color-glass-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                                            {linkSearchResults.map(comp => (
                                                <div key={comp.id}
                                                    onClick={() => setLinkSelectedComputer(comp)}
                                                    style={{
                                                        padding: '0.6rem 0.85rem', cursor: 'pointer',
                                                        background: linkSelectedComputer?.id === comp.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                                                        borderBottom: '1px solid var(--color-glass-border)',
                                                        borderLeft: linkSelectedComputer?.id === comp.id ? '3px solid #3b82f6' : '3px solid transparent',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    onMouseEnter={e => { if (linkSelectedComputer?.id !== comp.id) e.currentTarget.style.background = 'var(--color-glass)'; }}
                                                    onMouseLeave={e => { if (linkSelectedComputer?.id !== comp.id) e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <strong style={{ fontSize: '0.9rem' }}>{comp.pc_asset_no || 'N/A'}</strong>
                                                            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{comp.device_name || ''}</span>
                                                        </div>
                                                        {linkSelectedComputer?.id === comp.id && <span style={{ color: '#3b82f6', fontWeight: '700' }}>✓</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                                        👤 {comp.user_name || ''} {comp.user_lname || ''} {comp.emp_id ? `(${comp.emp_id})` : ''} • 📍 {comp.location_name || '-'} • 🏢 {comp.company_name || '-'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: '0.5rem' }}>
                                            <p style={{ color: '#ef4444', fontWeight: '600', marginBottom: '0.75rem' }}>❌ ไม่พบข้อมูล Computer ที่ตรงกัน</p>
                                            <a href={(() => {
                                                const tk = linkTicket;
                                                const params = new URLSearchParams();
                                                if (tk.user_emp_id) params.set('emp_id', tk.user_emp_id);
                                                const name = tk.guest_name || `${tk.user_name || ''} ${tk.user_lname || ''}`.trim();
                                                if (name) params.set('emp_name', name);
                                                const phone = tk.guest_phone || tk.user_phone || '';
                                                if (phone) params.set('extension_no', phone);
                                                if (tk.location_id) params.set('location_id', tk.location_id);
                                                if (tk.company_id) params.set('company_id', tk.company_id);
                                                if (tk.site_id) params.set('site_id', tk.site_id);
                                                if (tk.department_id) params.set('department_id', tk.department_id);
                                                params.set('from_ticket', tk.ticket_no);
                                                return `/it/computers/add?${params.toString()}`;
                                            })()} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                                                ➕ สร้าง Computer ใหม่
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {linkSelectedComputer && (
                                <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.06)', borderRadius: '0.5rem', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '600', marginBottom: '0.25rem' }}>เครื่องที่เลือก:</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{linkSelectedComputer.pc_asset_no} — {linkSelectedComputer.device_name || 'N/A'}</div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setLinkTicket(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#3b82f6', opacity: linkSelectedComputer ? 1 : 0.5 }} disabled={!linkSelectedComputer}>
                                    💾 Save Link
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
}
