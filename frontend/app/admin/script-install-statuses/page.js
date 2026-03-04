'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';

export default function AdminScriptInstallStatuses() {
    const { t } = useLanguage();
    const [items, setItems] = useState([]);
    const [formData, setFormData] = useState({ id: null, name: '', description: '' });
    const [token, setToken] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) fetchItems(user.token);
    }, []);

    const fetchItems = async (tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/script-install-statuses`, { headers: { 'Authorization': `Bearer ${tok}` } });
            setItems(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/script-install-statuses/${formData.id}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/script-install-statuses`;
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            setFormData({ id: null, name: '', description: '' });
            fetchItems();
        } catch (err) { console.error(err); }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/script-install-statuses/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            fetchItems();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('scriptInstallStatuses')}</h2>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="label">Name</label>
                        <input type="text" className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="label">Description</label>
                        <textarea className="textarea" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ minHeight: '60px' }}></textarea>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary">{formData.id ? t('save') : 'Add'}</button>
                        {formData.id && <button type="button" className="btn btn-outline" onClick={() => setFormData({ id: null, name: '', description: '' })}>{t('cancel')}</button>}
                    </div>
                </form>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th><th>Name</th><th>Description</th><th>{t('status')}</th><th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map(item => (
                            <tr key={item.id} className={formData.id === item.id ? 'editing-row' : ''}>
                                <td data-label="ID">{item.id}</td>
                                <td data-label="Name">{item.name}</td>
                                <td data-label={t('description')}>{item.description}</td>
                                <td data-label={t('status')}>
                                    <label className="switch">
                                        <input type="checkbox" checked={item.status === 1} onChange={() => toggleStatus(item.id, item.status)} />
                                        <span className="slider"></span>
                                    </label>
                                </td>
                                <td data-label="Actions">
                                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFormData(item)}>Edit</button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="5" style={{ textAlign: 'center' }}>No items found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
