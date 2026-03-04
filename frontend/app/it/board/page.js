'use client';
import { useState, useEffect } from 'react';
import { useModal } from '../../components/ModalProvider';
import { useLanguage } from '../../components/LanguageProvider';
import StyledSelect from '../../components/StyledSelect';
import { io } from 'socket.io-client';
import { FiTrash2 } from 'react-icons/fi';

export default function ITRequestBoard() {
    const { showConfirm, showAlert } = useModal();
    const { t } = useLanguage();
    const [tickets, setTickets] = useState([]);
    const [token, setToken] = useState('');
    const [userId, setUserId] = useState(null);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [locations, setLocations] = useState([]);

    // Modals
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [modalType, setModalType] = useState(null); // 'solution', 'transfer', 'detail', 'note'
    const [solutionText, setSolutionText] = useState('');
    const [closeCategoryId, setCloseCategoryId] = useState('');
    const [itUsers, setItUsers] = useState([]);
    const [transferUserId, setTransferUserId] = useState('');
    const [categories, setCategories] = useState([]);

    // Notes
    const [noteText, setNoteText] = useState('');
    const [notes, setNotes] = useState([]);

    // Link Asset
    const [linkSearchQuery, setLinkSearchQuery] = useState('');
    const [linkSearchResults, setLinkSearchResults] = useState([]);
    const [linkSelectedComputer, setLinkSelectedComputer] = useState(null);
    const [linkSearched, setLinkSearched] = useState(false);
    const [linkSearching, setLinkSearching] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        setUserId(user.id);
        if (user.token) {
            fetchTickets(user.token);
            fetchCategories();
            fetchItUsers(user.token);

            const socket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}`);
            socket.on('refresh_tickets', () => {
                fetchTickets(user.token);
            });

            return () => socket.disconnect();
        }
    }, []);

    const fetchTickets = async (t = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/board`, { headers: { 'Authorization': `Bearer ${t}` } });
            const data = await res.json();
            if (Array.isArray(data)) {
                const active = data.filter(tk => tk.status !== 'closed');
                setTickets(active);
                // Extract unique locations
                const locs = [...new Set(active.map(t => t.location_name).filter(Boolean))];
                setLocations(locs);
            }
        } catch (err) { console.error(err); }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/public/data`);
            const data = await res.json();
            setCategories(data.categories || []);
        } catch (err) { console.error(err); }
    };

    const fetchItUsers = async (t = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/it-staff/list`, { headers: { 'Authorization': `Bearer ${t}` } });
            const users = await res.json();
            if (Array.isArray(users)) {
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                setItUsers(users.filter(u => u.id !== currentUser.id));
            }
        } catch (err) { console.error(err); }
    };

    const assignJob = async (id) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${id}/assign`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 409) {
                const data = await res.json();
                showAlert({ title: 'ไม่สามารถรับงานได้', message: data.message || 'This ticket has already been accepted.', type: 'warning' });
            }
            fetchTickets();
        } catch (err) { console.error(err); }
    };

    const deleteTicket = (id) => {
        showConfirm({
            title: 'ยืนยันการลบ',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการลบ Ticket นี้?',
            type: 'danger',
            confirmText: 'ลบ',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        showAlert({ title: 'ไม่สามารถลบได้', message: data.message || 'Cannot delete this ticket.', type: 'error' });
                    }
                    fetchTickets();
                } catch (err) { console.error(err); }
            }
        });
    };

    const submitCloseJob = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${selectedTicket.id}/close`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ solution: solutionText, category_id: closeCategoryId || null })
            });
            setModalType(null);
            setSelectedTicket(null);
            fetchTickets();
        } catch (err) { console.error(err); }
    };

    const submitTransfer = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${selectedTicket.id}/transfer`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ new_assignee_id: transferUserId })
            });
            setModalType(null);
            setSelectedTicket(null);
            fetchTickets();
        } catch (err) { console.error(err); }
    };

    const openNoteModal = async (ticket) => {
        setSelectedTicket(ticket);
        setNoteText('');
        setModalType('note');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${ticket.id}/notes`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (Array.isArray(data)) setNotes(data);
        } catch (err) { console.error(err); }
    };

    const submitNote = async (e) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${selectedTicket.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ note: noteText })
            });
            setNoteText('');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${selectedTicket.id}/notes`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (Array.isArray(data)) setNotes(data);
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

    const submitLink = async (e) => {
        e.preventDefault();
        if (!linkSelectedComputer) return;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${selectedTicket.id}/link`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ computer_id: linkSelectedComputer.id })
            });
            setModalType(null);
            setSelectedTicket(null);
            setLinkSearchQuery('');
            setLinkSearchResults([]);
            setLinkSelectedComputer(null);
            setLinkSearched(false);
            fetchTickets();
        } catch (err) { console.error(err); }
    };

    const openDetailModal = async (tk) => {
        setSelectedTicket(tk);
        setModalType('detail');
        if (!tk.is_viewed_by_me) {
            try {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/${tk.id}/view`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                // Optimistically update the list
                setTickets(prev => prev.map(t => t.id === tk.id ? { ...t, is_viewed_by_me: 1 } : t));

                // Notify the layout to refresh the counts
                window.dispatchEvent(new Event('refresh_tickets'));
            } catch (err) {
                console.error(err);
            }
        }
    };

    // Filter tickets
    const filteredTickets = tickets.filter(t => {
        const rName = t.guest_name || `${t.user_name || ''} ${t.user_lname || ''}`;
        const matchSearch = !searchText ||
            t.ticket_no?.toLowerCase().includes(searchText.toLowerCase()) ||
            rName.toLowerCase().includes(searchText.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchText.toLowerCase());
        const matchLocation = !filterLocation || t.location_name === filterLocation;
        return matchSearch && matchLocation;
    });

    return (
        <div className="animate-fade-in" style={{ position: 'relative' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('itRequestBoard')}</h2>

            {/* Search & Filter Bar */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div className="filter-bar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch', flexDirection: 'column' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <input type="text" className="input" style={{ width: '100%' }} placeholder="🔍 Search ticket no, name, description..." value={searchText} onChange={e => setSearchText(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <StyledSelect
                            options={locations.map(l => ({ value: l, label: l }))}
                            value={filterLocation}
                            onChange={(val) => setFilterLocation(val || '')}
                            placeholder="All Locations"
                        />
                    </div>
                </div>
            </div>

            <div className="table-container glass-card desktop-only">
                <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>{t('ticketNo')}</th>
                            <th>{t('location')}</th>
                            <th>{t('requester')}</th>
                            <th>{t('date')}</th>
                            <th>{t('assignedTo')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTickets.length > 0 ? filteredTickets.map((tk) => {
                            const rName = tk.guest_name || `${tk.user_name || ''} ${tk.user_lname || ''}`;
                            const dt = new Date(tk.created_at);
                            return (
                                <tr key={tk.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <strong style={{ cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline' }}
                                                onClick={() => openDetailModal(tk)}>
                                                {tk.ticket_no}
                                            </strong>
                                            {!tk.is_viewed_by_me && (
                                                <span style={{ fontSize: '0.65rem', backgroundColor: '#ef4444', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '10px', fontWeight: 'bold' }}>
                                                    NEW
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{tk.location_name || '-'}</td>
                                    <td>
                                        <div title={tk.description}>{rName}</div>
                                        {tk.pc_asset_no && (
                                            <a href={tk.computer_id ? `/it/computers/${tk.computer_id}` : '#'}
                                                style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                                title="ดูรายละเอียด PC">
                                                💻 {tk.pc_asset_no}
                                            </a>
                                        )}
                                    </td>
                                    <td>{dt.toLocaleDateString()}<br /><span style={{ color: 'var(--color-text-muted)' }}>{dt.toLocaleTimeString()}</span></td>
                                    <td>
                                        {!tk.assigned_to ? (
                                            <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', color: 'var(--color-secondary)', borderColor: 'var(--color-secondary)' }} onClick={() => assignJob(tk.id)}>{t('getJob')}</button>
                                        ) : tk.assigned_to === userId ? (
                                            <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => { setSelectedTicket(tk); setModalType('transfer'); }}>{t('transfer')}</button>
                                        ) : (
                                            <span className="badge badge-info">{tk.assigned_name}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                            {tk.assigned_to === userId && (
                                                <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', borderColor: 'var(--color-success)', color: 'var(--color-success)' }} onClick={() => { setSelectedTicket(tk); setSolutionText(''); setCloseCategoryId(tk.category_id || ''); setModalType('solution'); }}>
                                                    {t('closeJob')}
                                                </button>
                                            )}
                                            {tk.assigned_to === userId && (
                                                <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }} onClick={() => openNoteModal(tk)} title="Internal IT Notes">
                                                    {t('note')}
                                                </button>
                                            )}
                                            {tk.assigned_to === userId && !tk.computer_id && (
                                                <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', borderColor: '#3b82f6', color: '#3b82f6' }} onClick={() => { setSelectedTicket(tk); setLinkSearchQuery(''); setLinkSearchResults([]); setLinkSelectedComputer(null); setLinkSearched(false); setModalType('link'); }} title="Link to PC">
                                                    🔗 Link Asset
                                                </button>
                                            )}
                                            {/* Chat Logic */}
                                            {(!tk.guest_name) && (
                                                tk.assigned_to === userId || (tk.participant_ids && tk.participant_ids.split(',').includes(String(userId))) ? (
                                                    <a href={`/it/chat?ticketId=${tk.id}`} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)', textDecoration: 'none' }}>
                                                        {t('chat')}
                                                    </a>
                                                ) : null
                                            )}
                                            {!tk.assigned_to && (
                                                <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', borderColor: '#ef4444', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => deleteTicket(tk.id)} title="Delete duplicate ticket">
                                                    <FiTrash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : <tr><td colSpan="6" style={{ textAlign: 'center' }}>{t('noActiveRequests')}</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredTickets.length > 0 ? filteredTickets.map((tk) => {
                    const rName = tk.guest_name || `${tk.user_name || ''} ${tk.user_lname || ''}`;
                    const dt = new Date(tk.created_at);
                    return (
                        <div key={tk.id} className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Card Header: Ticket no + NEW + date */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                    <strong
                                        style={{ cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline', fontSize: '1rem', whiteSpace: 'nowrap' }}
                                        onClick={() => openDetailModal(tk)}>
                                        {tk.ticket_no}
                                    </strong>
                                    {!tk.is_viewed_by_me && (
                                        <span style={{
                                            fontSize: '0.6rem', backgroundColor: '#ef4444', color: '#fff',
                                            padding: '0.12rem 0.35rem', borderRadius: '8px', fontWeight: 'bold',
                                            whiteSpace: 'nowrap', flexShrink: 0
                                        }}>NEW</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'right', lineHeight: '1.4', flexShrink: 0 }}>
                                    {dt.toLocaleDateString()}<br />{dt.toLocaleTimeString()}
                                </div>
                            </div>

                            {/* Requester info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>👤 {rName}</div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>📍 {tk.location_name || '-'}</div>
                                {tk.pc_asset_no && (
                                    <a href={tk.computer_id ? `/it/computers/${tk.computer_id}` : '#'}
                                        style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                        title="ดูรายละเอียด PC">
                                        💻 {tk.pc_asset_no}
                                    </a>
                                )}
                            </div>

                            {/* Assigned to */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--color-glass-border)' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{t('assignedTo')}:</span>
                                {!tk.assigned_to ? (
                                    <button className="btn btn-outline" style={{ padding: '0.15rem 0.5rem', color: 'var(--color-secondary)', borderColor: 'var(--color-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }} onClick={() => assignJob(tk.id)}>{t('getJob')}</button>
                                ) : tk.assigned_to === userId ? (
                                    <button className="btn btn-primary" style={{ padding: '0.15rem 0.5rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }} onClick={() => { setSelectedTicket(tk); setModalType('transfer'); }}>{t('transfer')}</button>
                                ) : (
                                    <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>{tk.assigned_name}</span>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                {tk.assigned_to === userId && (
                                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.3rem', borderColor: 'var(--color-success)', color: 'var(--color-success)', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={() => { setSelectedTicket(tk); setSolutionText(''); setCloseCategoryId(tk.category_id || ''); setModalType('solution'); }}>
                                        ✅ {t('closeJob')}
                                    </button>
                                )}
                                {tk.assigned_to === userId && (
                                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.3rem', borderColor: 'var(--color-warning)', color: 'var(--color-warning)', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={() => openNoteModal(tk)}>
                                        📝 {t('note')}
                                    </button>
                                )}
                                {tk.assigned_to === userId && !tk.computer_id && (
                                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.3rem', borderColor: '#3b82f6', color: '#3b82f6', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={() => { setSelectedTicket(tk); setLinkSearchQuery(''); setLinkSearchResults([]); setLinkSelectedComputer(null); setLinkSearched(false); setModalType('link'); }}>
                                        🔗 Link Asset
                                    </button>
                                )}
                                {(!tk.guest_name) && (
                                    tk.assigned_to === userId || (tk.participant_ids && tk.participant_ids.split(',').includes(String(userId))) ? (
                                        <a href={`/it/chat?ticketId=${tk.id}`} className="btn btn-outline" style={{ padding: '0.4rem 0.3rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)', textDecoration: 'none', textAlign: 'center', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            💬 {t('chat')}
                                        </a>
                                    ) : null
                                )}
                                {!tk.assigned_to && (
                                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.3rem', borderColor: '#ef4444', color: '#ef4444', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem', gridColumn: '1 / -1', fontSize: '0.8rem' }} onClick={() => deleteTicket(tk.id)}>
                                        <FiTrash2 size={14} /> Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <p style={{ color: 'var(--color-text-muted)' }}>{t('noActiveRequests')}</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {modalType === 'detail' && selectedTicket && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '1rem' }}>
                    <div className="glass-card animate-slide-up" style={{ width: '550px', maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Ticket Detail: {selectedTicket.ticket_no}</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {[
                                    ['Requester', selectedTicket.guest_name || `${selectedTicket.user_name || ''} ${selectedTicket.user_lname || ''}`],
                                    ['User Type', selectedTicket.guest_name ? '👤 Guest' : '🔑 Member'],
                                    ['Phone', selectedTicket.guest_phone || '-'],
                                    ['Company', selectedTicket.company_name || '-'],
                                    ['Site', selectedTicket.site_name || '-'],
                                    ['Location', selectedTicket.location_name || '-'],
                                    ['Department', selectedTicket.dept_name || '-'],
                                    ['IP Address', selectedTicket.ip_address || '-'],
                                    ['Status', selectedTicket.status],
                                    ['Assigned To', selectedTicket.assigned_name || 'Unassigned'],
                                    ['Created', new Date(selectedTicket.created_at).toLocaleString()],
                                ].map(([label, value]) => (
                                    <tr key={label} style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: '600', width: '35%' }}>{label}</td>
                                        <td style={{ padding: '0.5rem' }}>{value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ marginTop: '1rem' }}>
                            <label className="label" style={{ fontWeight: '600' }}>Issue Details</label>
                            <p style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap' }}>
                                {selectedTicket.description}
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setModalType(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Job Modal */}
            {modalType === 'solution' && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '1rem' }}>
                    <div className="glass-card animate-slide-up" style={{ width: '500px', maxWidth: '95vw' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--color-success)' }}>Close Job {selectedTicket?.ticket_no}</h3>
                        <form onSubmit={submitCloseJob}>
                            <div className="form-group">
                                <label className="label">Solution Details</label>
                                <textarea className="textarea" required value={solutionText || ''} onChange={e => setSolutionText(e.target.value)} placeholder="Describe the steps taken to resolve the issue..."></textarea>
                            </div>
                            <div className="form-group">
                                <label className="label">Problem Type (Category)</label>
                                <StyledSelect
                                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                                    value={closeCategoryId}
                                    onChange={(val) => setCloseCategoryId(val || '')}
                                    placeholder="-- Select Category --"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModalType(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--color-success)' }}>Finalize & Close Job</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {modalType === 'transfer' && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '1rem' }}>
                    <div className="glass-card animate-slide-up" style={{ width: '400px', maxWidth: '95vw' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--color-warning)' }}>Transfer Job {selectedTicket?.ticket_no}</h3>
                        <form onSubmit={submitTransfer}>
                            <div className="form-group">
                                <label className="label">Select IT Staff</label>
                                <StyledSelect
                                    options={itUsers.map(u => ({ value: u.id, label: `${u.name} ${u.lname}` }))}
                                    value={transferUserId}
                                    onChange={(val) => setTransferUserId(val || '')}
                                    placeholder="-- Choose Colleague --"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModalType(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Transfer Now</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Note Modal */}
            {modalType === 'note' && selectedTicket && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '1rem' }}>
                    <div className="glass-card animate-slide-up" style={{ width: '550px', maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--color-warning)' }}>📝 Internal Notes — {selectedTicket.ticket_no}</h3>
                        <form onSubmit={submitNote} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input type="text" className="input" placeholder="Write a note..." value={noteText} onChange={e => setNoteText(e.target.value)} style={{ flex: 1 }} />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>Add</button>
                        </form>
                        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                            {notes.length > 0 ? notes.map((n, i) => (
                                <div key={i} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--color-glass-border)', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ color: 'var(--color-primary)' }}>{n.user_name || 'System'}</strong>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{new Date(n.created_at).toLocaleString()}</span>
                                    </div>
                                    <p style={{ margin: '0.25rem 0 0' }}>{n.action}</p>
                                </div>
                            )) : <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No notes yet.</p>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setModalType(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link Asset Modal */}
            {modalType === 'link' && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '1rem' }}>
                    <div className="glass-card animate-slide-up" style={{ width: '480px', maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#3b82f6' }}>🔗 Link Asset — {selectedTicket?.ticket_no}</h3>
                        <form onSubmit={submitLink}>
                            <div className="form-group">
                                <label className="label">ค้นหาด้วยรหัสพนักงาน / ชื่อพนักงาน / Asset No.</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="text" className="input" placeholder="พิมพ์รหัสพนักงาน, ชื่อ หรือ Asset No..." value={linkSearchQuery} onChange={e => { setLinkSearchQuery(e.target.value); setLinkSelectedComputer(null); }} style={{ flex: 1 }} />
                                    <button type="button" className="btn btn-primary" style={{ padding: '0.4rem 1rem', whiteSpace: 'nowrap' }} onClick={() => searchComputers(linkSearchQuery)} disabled={linkSearching}>
                                        {linkSearching ? '...' : '🔍 ค้นหา'}
                                    </button>
                                </div>
                            </div>

                            {/* Search Results */}
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
                                                const tk = selectedTicket;
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

                            {/* Selected Computer Info */}
                            {linkSelectedComputer && (
                                <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.06)', borderRadius: '0.5rem', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '600', marginBottom: '0.25rem' }}>เครื่องที่เลือก:</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{linkSelectedComputer.pc_asset_no} — {linkSelectedComputer.device_name || 'N/A'}</div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModalType(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#3b82f6', opacity: linkSelectedComputer ? 1 : 0.5 }} disabled={!linkSelectedComputer}>
                                    💾 Save Link
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
