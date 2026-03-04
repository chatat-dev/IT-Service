'use client';
import { useState, useEffect, useRef } from 'react';
import { useModal } from '../../components/ModalProvider';
import StyledSelect from '../../components/StyledSelect';

export default function AdminTicketsPage() {
    const { showConfirm, showAlert } = useModal();
    const [tickets, setTickets] = useState([]);
    const [token, setToken] = useState('');
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // For ticket detail modal
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) fetchTickets(user.token);
    }, []);

    const fetchTickets = async (t = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/tickets`, { headers: { 'Authorization': `Bearer ${t}` } });
            const data = await res.json();
            if (Array.isArray(data)) setTickets(data);
        } catch (err) { console.error(err); }
    };

    const deleteTicket = (id, ticketNo) => {
        showConfirm({
            title: 'ยืนยันการลบถาวร',
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบ Ticket ${ticketNo}? ข้อความแชทและ Log ที่เกี่ยวข้องจะถูกลบด้วย`,
            type: 'danger',
            confirmText: 'ลบถาวร',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/tickets/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (res.ok) {
                        fetchTickets();
                    } else {
                        showAlert({ title: 'ลบไม่สำเร็จ', message: data.message || 'Failed to delete', type: 'error' });
                    }
                } catch (err) { console.error(err); }
            }
        });
    };

    const viewTicket = async (ticket) => {
        setSelectedTicket(ticket);
        setIsLoadingChat(true);
        setChatHistory([]);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/chat/${ticket.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setChatHistory(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingChat(false);
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const filteredTickets = tickets.filter(t => {
        const rName = t.guest_name || `${t.user_name || ''} ${t.user_lname || ''}`;
        const matchSearch = !searchText ||
            t.ticket_no?.toLowerCase().includes(searchText.toLowerCase()) ||
            rName.toLowerCase().includes(searchText.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchText.toLowerCase()) ||
            t.assigned_name?.toLowerCase().includes(searchText.toLowerCase());
        const matchStatus = !filterStatus || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>Manage Tickets</h2>

            <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                    <input type="text" className="input" placeholder="🔍 Search ticket no, name, description..." value={searchText} onChange={e => setSearchText(e.target.value)} />
                </div>
                <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
                    <StyledSelect
                        options={[
                            { value: 'open', label: 'Open' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'closed', label: 'Closed' }
                        ]}
                        value={filterStatus}
                        onChange={(val) => setFilterStatus(val || '')}
                        placeholder="All Status"
                    />
                </div>
            </div>

            <div className="table-container glass-card">
                <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>Ticket No</th>
                            <th>Requester</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTickets.length > 0 ? filteredTickets.map(t => {
                            const rName = t.guest_name || `${t.user_name || ''} ${t.user_lname || ''}`;
                            return (
                                <tr key={t.id}>
                                    <td data-label="Ticket No">
                                        <strong>
                                            <button
                                                onClick={() => viewTicket(t)}
                                                style={{ color: 'var(--color-primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                                            >
                                                {t.ticket_no}
                                            </button>
                                        </strong>
                                    </td>
                                    <td data-label="Requester">{rName}</td>
                                    <td data-label="Date">{new Date(t.created_at).toLocaleDateString()}</td>
                                    <td data-label="Status">
                                        <span className={`badge badge-${t.status === 'closed' ? 'success' : t.status === 'in_progress' ? 'warning' : 'info'}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td data-label="Assigned">{t.assigned_name || 'Unassigned'}</td>
                                    <td data-label="Actions">
                                        <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', borderColor: '#ef4444', color: '#ef4444' }}
                                            onClick={() => deleteTicket(t.id, t.ticket_no)}>
                                            🗑️ Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) : <tr><td colSpan="6" style={{ textAlign: 'center' }}>No tickets found</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem'
                }} onClick={() => setSelectedTicket(null)}>
                    <div className="glass-card animate-scale-up" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'var(--color-bg-card, #fff)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-glass-border)' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Ticket Details: {selectedTicket.ticket_no}</h3>
                            <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}>&times;</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            <div><strong>Requester:</strong> {selectedTicket.guest_name || `${selectedTicket.user_name || ''} ${selectedTicket.user_lname || ''}`}</div>
                            <div><strong>Status:</strong> <span className={`badge badge-${selectedTicket.status === 'closed' ? 'success' : selectedTicket.status === 'in_progress' ? 'warning' : 'info'}`}>{selectedTicket.status}</span></div>
                            <div><strong>Category:</strong> {selectedTicket.category_name || '-'}</div>
                            <div><strong>Assigned To:</strong> {selectedTicket.assigned_name || '-'}</div>
                            <div style={{ gridColumn: '1 / -1' }}><strong>Description:</strong> {selectedTicket.description}</div>
                            {selectedTicket.solution && (
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid #10b981', borderRadius: '4px' }}>
                                    <strong style={{ color: '#059669', display: 'block', marginBottom: '0.3rem' }}>Solution:</strong>
                                    {selectedTicket.solution}
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--color-glass-border)', borderRadius: '12px', background: 'var(--color-bg, #f8fafc)', overflow: 'hidden' }}>
                            <div style={{ padding: '0.8rem 1rem', background: 'rgba(var(--color-primary-rgb), 0.05)', borderBottom: '1px solid var(--color-glass-border)', fontWeight: '600' }}>
                                Chat History
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {isLoadingChat ? (
                                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>Loading chat history...</div>
                                ) : chatHistory.length > 0 ? (
                                    chatHistory.map(msg => {
                                        const alignRight = msg.sender_id === selectedTicket.assigned_to;
                                        return (
                                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: alignRight ? 'flex-end' : 'flex-start' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                                                    {msg.sender_name} • {new Date(msg.created_at).toLocaleTimeString()}
                                                </div>
                                                <div style={{
                                                    maxWidth: '80%', padding: '0.6rem 1rem', borderRadius: '12px', fontSize: '0.9rem',
                                                    background: alignRight ? 'var(--color-primary)' : 'var(--color-glass)',
                                                    color: alignRight ? '#fff' : 'var(--color-text-main)',
                                                    border: alignRight ? 'none' : '1px solid var(--color-glass-border)',
                                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                                                }}>
                                                    {msg.message}
                                                    {msg.image_path && (
                                                        <div style={{ marginTop: '0.5rem' }}>
                                                            <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}${msg.image_path}`} target="_blank" rel="noopener noreferrer" style={{ color: alignRight ? '#fff' : 'var(--color-primary)', textDecoration: 'underline' }}>
                                                                📎 Attached Image
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>No chat history found.</div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
