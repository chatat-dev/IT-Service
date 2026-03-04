'use client';
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';
import StyledSelect from '../../components/StyledSelect';

export default function AdminDepartments() {
    const { t } = useLanguage();
    const { showAlert } = useModal();
    const [departments, setDepartments] = useState([]);
    const [sites, setSites] = useState([]);
    const [formData, setFormData] = useState({ id: null, site_id: '', dept_code: '', name: '', description: '' });
    const [token, setToken] = useState('');
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) {
            fetchDepartments(user.token);
            fetchSites(user.token);
        }
    }, []);

    const fetchDepartments = async (t_tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/departments`, { headers: { 'Authorization': `Bearer ${t_tok}` } });
            setDepartments(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchSites = async (t_tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/sites`, { headers: { 'Authorization': `Bearer ${t_tok}` } });
            const data = await res.json();
            setSites(data.filter(s => s.status === 1));
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = formData.name.trim();
        const trimmedCode = formData.dept_code.trim();
        if (!trimmedName || !trimmedCode) return;
        const dupName = departments.find(d => d.name.toLowerCase() === trimmedName.toLowerCase() && String(d.site_id) === String(formData.site_id) && d.id !== formData.id);
        if (dupName) { showAlert({ title: t('duplicateData'), message: `${t('deptName')} "${trimmedName}" ${t('alreadyExists')}`, type: 'warning' }); return; }
        const dupCode = departments.find(d => d.dept_code.toLowerCase() === trimmedCode.toLowerCase() && String(d.site_id) === String(formData.site_id) && d.id !== formData.id);
        if (dupCode) { showAlert({ title: t('duplicateData'), message: `${t('deptCode')} "${trimmedCode}" ${t('alreadyExists')}`, type: 'warning' }); return; }
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/departments/${formData.id}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/departments`;
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...formData, name: trimmedName, dept_code: trimmedCode })
            });
            setFormData({ id: null, site_id: '', dept_code: '', name: '', description: '' });
            fetchDepartments();
        } catch (err) { console.error(err); }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/departments/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: currentStatus === 1 ? 0 : 1 })
            });
            fetchDepartments();
        } catch (err) { console.error(err); }
    };

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

    const filteredData = useMemo(() => {
        let data = [...departments];
        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter(d => d.name.toLowerCase().includes(q) || (d.dept_code || '').toLowerCase().includes(q) || (d.site_name || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q) || String(d.id).includes(q));
        }
        data.sort((a, b) => {
            let va = a[sortKey], vb = b[sortKey];
            if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [departments, search, sortKey, sortDir]);

    const thStyle = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('manageDepartments')}</h2>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'start' }}>
                    <div className="form-group">
                        <label className="label">Site</label>
                        <StyledSelect
                            options={sites.map(s => ({ value: s.id, label: `${s.name}${s.description ? ` — ${s.description}` : ''}` }))}
                            value={formData.site_id}
                            onChange={(val) => setFormData({ ...formData, site_id: val })}
                            placeholder="Select Site"
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Dept Code</label>
                        <input type="text" className="input" required value={formData.dept_code} onChange={e => setFormData({ ...formData, dept_code: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="label">Department Name</label>
                        <input type="text" className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Description</label>
                        <textarea className="textarea" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ minHeight: '60px' }}></textarea>
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary">{formData.id ? 'Update' : 'Add'} Department</button>
                        {formData.id && <button type="button" className="btn btn-outline" onClick={() => setFormData({ id: null, site_id: '', dept_code: '', name: '', description: '' })}>Cancel</button>}
                    </div>
                </form>
            </div>

            <div className="glass-card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem' }}>
                <input type="text" className="input" placeholder="Search departments..." value={search} onChange={e => setSearch(e.target.value)} style={{ margin: 0 }} />
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={thStyle} onClick={() => toggleSort('id')}>{t('id')}{sortArrow('id')}</th>
                            <th style={thStyle} onClick={() => toggleSort('dept_code')}>{t('deptCode')}{sortArrow('dept_code')}</th>
                            <th style={thStyle} onClick={() => toggleSort('name')}>{t('deptName')}{sortArrow('name')}</th>
                            <th style={thStyle} onClick={() => toggleSort('site_name')}>{t('siteName')}{sortArrow('site_name')}</th>
                            <th style={thStyle} onClick={() => toggleSort('description')}>{t('description')}{sortArrow('description')}</th>
                            <th>{t('status')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map(dept => (
                            <tr key={dept.id} className={formData.id === dept.id ? 'editing-row' : ''}>
                                <td data-label="ID">{dept.id}</td>
                                <td data-label={t('deptCode')}>{dept.dept_code}</td>
                                <td data-label={t('deptName')}>{dept.name}</td>
                                <td data-label={t('siteName')}>{dept.site_name}</td>
                                <td data-label={t('description')}>{dept.description}</td>
                                <td data-label={t('status')}>
                                    <label className="switch">
                                        <input type="checkbox" checked={dept.status === 1} onChange={() => toggleStatus(dept.id, dept.status)} />
                                        <span className="slider"></span>
                                    </label>
                                </td>
                                <td data-label="Actions">
                                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFormData(dept)}>Edit</button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="7" style={{ textAlign: 'center' }}>No departments found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
