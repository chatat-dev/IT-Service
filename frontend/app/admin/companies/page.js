'use client';
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';
import StyledSelect from '../../components/StyledSelect';

export default function AdminCompanies() {
    const { t } = useLanguage();
    const { showAlert } = useModal();
    const [companies, setCompanies] = useState([]);
    const [locations, setLocations] = useState([]);
    const [formData, setFormData] = useState({ id: null, location_id: '', name: '', description: '' });
    const [token, setToken] = useState('');
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) {
            fetchCompanies(user.token);
            fetchLocations(user.token);
        }
    }, []);

    const fetchCompanies = async (t_tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/companies`, { headers: { 'Authorization': `Bearer ${t_tok}` } });
            setCompanies(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchLocations = async (t_tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/locations`, { headers: { 'Authorization': `Bearer ${t_tok}` } });
            setLocations(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = formData.name.trim();
        if (!trimmed) return;
        const duplicate = companies.find(c => c.name.toLowerCase() === trimmed.toLowerCase() && String(c.location_id) === String(formData.location_id) && c.id !== formData.id);
        if (duplicate) { showAlert({ title: t('duplicateData'), message: `${t('companyName')} "${trimmed}" ${t('alreadyExists')}`, type: 'warning' }); return; }
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/companies/${formData.id}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/companies`;
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...formData, name: trimmed })
            });
            setFormData({ id: null, location_id: '', name: '', description: '' });
            fetchCompanies();
        } catch (err) { console.error(err); }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/companies/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: currentStatus === 1 ? 0 : 1 })
            });
            fetchCompanies();
        } catch (err) { console.error(err); }
    };

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

    const filteredData = useMemo(() => {
        let data = [...companies];
        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter(c => c.name.toLowerCase().includes(q) || (c.location_name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q) || String(c.id).includes(q));
        }
        data.sort((a, b) => {
            let va = a[sortKey], vb = b[sortKey];
            if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [companies, search, sortKey, sortDir]);

    const thStyle = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('manageCompanies')}</h2>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                    <div className="form-group">
                        <label className="label">Location</label>
                        <StyledSelect
                            options={locations.map(l => ({ value: l.id, label: l.name }))}
                            value={formData.location_id}
                            onChange={(val) => setFormData({ ...formData, location_id: val })}
                            placeholder="Select Location"
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Company Name</label>
                        <input type="text" className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Description</label>
                        <textarea className="textarea" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ minHeight: '60px' }}></textarea>
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary">{formData.id ? 'Update' : 'Add'} Company</button>
                        {formData.id && <button type="button" className="btn btn-outline" onClick={() => setFormData({ id: null, location_id: '', name: '', description: '' })}>Cancel</button>}
                    </div>
                </form>
            </div>

            <div className="glass-card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem' }}>
                <input type="text" className="input" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} style={{ margin: 0 }} />
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={thStyle} onClick={() => toggleSort('id')}>{t('id')}{sortArrow('id')}</th>
                            <th style={thStyle} onClick={() => toggleSort('name')}>{t('companyName')}{sortArrow('name')}</th>
                            <th style={thStyle} onClick={() => toggleSort('location_name')}>{t('locationName')}{sortArrow('location_name')}</th>
                            <th style={thStyle} onClick={() => toggleSort('description')}>{t('description')}{sortArrow('description')}</th>
                            <th>{t('status')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map(comp => (
                            <tr key={comp.id} className={formData.id === comp.id ? 'editing-row' : ''}>
                                <td data-label="ID">{comp.id}</td>
                                <td data-label={t('companyName')}>{comp.name}</td>
                                <td data-label={t('locationName')}>{comp.location_name}</td>
                                <td data-label={t('description')}>{comp.description}</td>
                                <td data-label={t('status')}>
                                    <label className="switch">
                                        <input type="checkbox" checked={comp.status === 1} onChange={() => toggleStatus(comp.id, comp.status)} />
                                        <span className="slider"></span>
                                    </label>
                                </td>
                                <td data-label="Actions">
                                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFormData(comp)}>Edit</button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="6" style={{ textAlign: 'center' }}>No companies found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
