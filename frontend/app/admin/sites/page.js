'use client';
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';
import StyledSelect from '../../components/StyledSelect';

export default function AdminSites() {
    const { t } = useLanguage();
    const { showAlert } = useModal();
    const [sites, setSites] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [formData, setFormData] = useState({ id: null, company_id: '', name: '', description: '' });
    const [token, setToken] = useState('');
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) {
            fetchSites(user.token);
            fetchCompanies(user.token);
        }
    }, []);

    const fetchSites = async (t_tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/sites`, { headers: { 'Authorization': `Bearer ${t_tok}` } });
            setSites(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchCompanies = async (t_tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/companies`, { headers: { 'Authorization': `Bearer ${t_tok}` } });
            const data = await res.json();
            setCompanies(data.filter(c => c.status === 1));
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = formData.name.trim();
        if (!trimmed) return;
        const duplicate = sites.find(s => s.name.toLowerCase() === trimmed.toLowerCase() && String(s.company_id) === String(formData.company_id) && s.id !== formData.id);
        if (duplicate) { showAlert({ title: t('duplicateData'), message: `${t('siteName')} "${trimmed}" ${t('alreadyExists')}`, type: 'warning' }); return; }
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/sites/${formData.id}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/sites`;
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...formData, name: trimmed })
            });
            setFormData({ id: null, company_id: '', name: '', description: '' });
            fetchSites();
        } catch (err) { console.error(err); }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/sites/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: currentStatus === 1 ? 0 : 1 })
            });
            fetchSites();
        } catch (err) { console.error(err); }
    };

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

    const filteredData = useMemo(() => {
        let data = [...sites];
        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter(s => s.name.toLowerCase().includes(q) || (s.company_name || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || String(s.id).includes(q));
        }
        data.sort((a, b) => {
            let va = a[sortKey], vb = b[sortKey];
            if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [sites, search, sortKey, sortDir]);

    const thStyle = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('manageSites')}</h2>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                    <div className="form-group">
                        <label className="label">Company</label>
                        <StyledSelect
                            options={companies.map(c => ({ value: c.id, label: `${c.name}${c.description ? ` — ${c.description}` : ''}` }))}
                            value={formData.company_id}
                            onChange={(val) => setFormData({ ...formData, company_id: val })}
                            placeholder="Select Company"
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Site Name</label>
                        <input type="text" className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Description</label>
                        <textarea className="textarea" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ minHeight: '60px' }}></textarea>
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary">{formData.id ? 'Update' : 'Add'} Site</button>
                        {formData.id && <button type="button" className="btn btn-outline" onClick={() => setFormData({ id: null, company_id: '', name: '', description: '' })}>Cancel</button>}
                    </div>
                </form>
            </div>

            <div className="glass-card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem' }}>
                <input type="text" className="input" placeholder="Search sites..." value={search} onChange={e => setSearch(e.target.value)} style={{ margin: 0 }} />
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={thStyle} onClick={() => toggleSort('id')}>{t('id')}{sortArrow('id')}</th>
                            <th style={thStyle} onClick={() => toggleSort('name')}>{t('siteName')}{sortArrow('name')}</th>
                            <th style={thStyle} onClick={() => toggleSort('company_name')}>{t('company')}{sortArrow('company_name')}</th>
                            <th style={thStyle} onClick={() => toggleSort('description')}>{t('description')}{sortArrow('description')}</th>
                            <th>{t('status')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map(site => (
                            <tr key={site.id} className={formData.id === site.id ? 'editing-row' : ''}>
                                <td data-label="ID">{site.id}</td>
                                <td data-label={t('siteName')}>{site.name}</td>
                                <td data-label={t('company')}>{site.company_name}</td>
                                <td data-label={t('description')}>{site.description}</td>
                                <td data-label={t('status')}>
                                    <label className="switch">
                                        <input type="checkbox" checked={site.status === 1} onChange={() => toggleStatus(site.id, site.status)} />
                                        <span className="slider"></span>
                                    </label>
                                </td>
                                <td data-label="Actions">
                                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFormData(site)}>Edit</button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="6" style={{ textAlign: 'center' }}>No sites found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
