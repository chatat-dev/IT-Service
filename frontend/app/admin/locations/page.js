'use client';
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';

export default function AdminLocations() {
    const { t } = useLanguage();
    const { showAlert } = useModal();
    const [locations, setLocations] = useState([]);
    const [formData, setFormData] = useState({ id: null, name: '' });
    const [token, setToken] = useState('');
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) fetchLocations(user.token);
    }, []);

    const fetchLocations = async (t_tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/locations`, {
                headers: { 'Authorization': `Bearer ${t_tok}` }
            });
            const data = await res.json();
            setLocations(data);
        } catch (err) { console.error('Error fetching locations', err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = formData.name.trim();
        if (!trimmed) return;
        const duplicate = locations.find(l => l.name.toLowerCase() === trimmed.toLowerCase() && l.id !== formData.id);
        if (duplicate) { showAlert({ title: t('duplicateData'), message: `${t('locationName')} "${trimmed}" ${t('alreadyExists')}`, type: 'warning' }); return; }
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/locations/${formData.id}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/locations`;
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: trimmed })
            });
            setFormData({ id: null, name: '' });
            fetchLocations();
        } catch (err) { console.error(err); }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/locations/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: currentStatus === 1 ? 0 : 1 })
            });
            fetchLocations();
        } catch (err) { console.error(err); }
    };

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

    const filteredData = useMemo(() => {
        let data = [...locations];
        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter(l => l.name.toLowerCase().includes(q) || String(l.id).includes(q));
        }
        data.sort((a, b) => {
            let va = a[sortKey], vb = b[sortKey];
            if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [locations, search, sortKey, sortDir]);

    const thStyle = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('manageLocations')}</h2>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label className="label">Location Name</label>
                        <input type="text" className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn-primary">{formData.id ? 'Update' : 'Add'} Location</button>
                    {formData.id && <button type="button" className="btn btn-outline" onClick={() => setFormData({ id: null, name: '' })}>Cancel</button>}
                </form>
            </div>

            <div className="glass-card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem' }}>
                <input type="text" className="input" placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} style={{ margin: 0 }} />
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={thStyle} onClick={() => toggleSort('id')}>{t('id')}{sortArrow('id')}</th>
                            <th style={thStyle} onClick={() => toggleSort('name')}>{t('locationName')}{sortArrow('name')}</th>
                            <th>{t('status')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map(loc => (
                            <tr key={loc.id} className={formData.id === loc.id ? 'editing-row' : ''}>
                                <td data-label="ID">{loc.id}</td>
                                <td data-label={t('locationName')}>{loc.name}</td>
                                <td data-label={t('status')}>
                                    <label className="switch">
                                        <input type="checkbox" checked={loc.status === 1} onChange={() => toggleStatus(loc.id, loc.status)} />
                                        <span className="slider"></span>
                                    </label>
                                </td>
                                <td data-label="Actions">
                                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFormData(loc)}>Edit</button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="4" style={{ textAlign: 'center' }}>No locations found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
