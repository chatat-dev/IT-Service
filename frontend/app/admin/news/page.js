'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';

export default function ManageNews() {
    const { t } = useLanguage();
    const { showAlert, showConfirm } = useModal();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState('');
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState({ id: null, title: '', content: '', status: 1 });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) {
            fetchNews(user.token);
        }
    }, []);

    const fetchNews = async (tok) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/news`, {
                headers: { 'Authorization': `Bearer ${tok}` }
            });
            const data = await res.json();
            setNews(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (item = null) => {
        if (item) {
            setFormData(item);
        } else {
            setFormData({ id: null, title: '', content: '', status: 1 });
        }
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            return showAlert({ title: 'Error', message: 'Title and content are required', type: 'error' });
        }

        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/news/${formData.id}`
            : `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/news`;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                showAlert({ title: 'Success', message: 'News saved successfully', type: 'success' });
                setShowForm(false);
                fetchNews(token);
            } else {
                showAlert({ title: 'Error', message: 'Error saving news', type: 'error' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = (id) => {
        showConfirm({
            title: 'Delete News',
            message: 'Are you sure you want to delete this news item?',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/news/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        showAlert({ title: 'Deleted', message: 'News deleted', type: 'success' });
                        fetchNews(token);
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        });
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--color-primary)' }}>{t('manageNews') || 'Manage News'}</h2>
                <button className="btn btn-primary" onClick={() => handleOpenForm()}>+ Add News</button>
            </div>

            {showForm && (
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="label">Title / Topic *</label>
                            <input className="input" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="label">Content / Announcement *</label>
                            <textarea className="input" rows="5" required value={formData.content || ''} onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Enter the announcement text. Links starting with http or www will be clickable for users." />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label className="label" style={{ marginBottom: 0 }}>Active / Shows globally:</label>
                            <label className="switch">
                                <input type="checkbox" checked={formData.status === 1} onChange={e => setFormData({ ...formData, status: e.target.checked ? 1 : 0 })} />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary">Save</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>TITLE</th>
                            <th>AUTHOR</th>
                            <th>DATE</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {news.map(item => (
                            <tr key={item.id}>
                                <td data-label="ID">{item.id}</td>
                                <td data-label="Title">{item.title}</td>
                                <td data-label="Author">{item.author_name}</td>
                                <td data-label="Date">{new Date(item.created_at).toLocaleDateString()}</td>
                                <td data-label="Status">
                                    <span className={`status-badge ${item.status === 1 ? 'status-open' : 'status-closed'}`}>
                                        {item.status === 1 ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td data-label="Actions">
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleOpenForm(item)}>
                                            Edit
                                        </button>
                                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => handleDelete(item.id)}>
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {news.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No news available...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
