'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';

export default function AdminCategories() {
    const { t } = useLanguage();
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({ id: null, name: '', description: '' });
    const [token, setToken] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) fetchCategories(user.token);
    }, []);

    const fetchCategories = async (t_tok = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/categories`, { headers: { 'Authorization': `Bearer ${t_tok}` } });
            setCategories(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/categories/${formData.id}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/categories`;
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            setFormData({ id: null, name: '', description: '' });
            fetchCategories();
        } catch (err) { console.error(err); }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/categories/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: currentStatus === 1 ? 0 : 1 })
            });
            fetchCategories();
        } catch (err) { console.error(err); }
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('manageCategories')}</h2>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="label">Category Name</label>
                        <input type="text" className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="label">Description</label>
                        <textarea className="textarea" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ minHeight: '60px' }}></textarea>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn btn-primary">{formData.id ? 'Update' : 'Add'} Category</button>
                        {formData.id && <button type="button" className="btn btn-outline" onClick={() => setFormData({ id: null, name: '', description: '' })}>Cancel</button>}
                    </div>
                </form>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>{t('id')}</th><th>{t('categoryName')}</th><th>{t('description')}</th><th>{t('status')}</th><th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length > 0 ? categories.map(cat => (
                            <tr key={cat.id} className={formData.id === cat.id ? 'editing-row' : ''}>
                                <td data-label="ID">{cat.id}</td>
                                <td data-label={t('categoryName')}>{cat.name}</td>
                                <td data-label={t('description')}>{cat.description}</td>
                                <td data-label={t('status')}>
                                    <label className="switch">
                                        <input type="checkbox" checked={cat.status === 1} onChange={() => toggleStatus(cat.id, cat.status)} />
                                        <span className="slider"></span>
                                    </label>
                                </td>
                                <td data-label="Actions">
                                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFormData(cat)}>Edit</button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="5" style={{ textAlign: 'center' }}>No categories found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
