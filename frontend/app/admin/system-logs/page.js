'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';

export default function AdminSystemLogs() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        // Initially fetch without dates (fetches latest 500)
        if (user.token) fetchLogs(user.token);
    }, []);

    const fetchLogs = async (tok = token, sDate = startDate, eDate = endDate, keyword = search) => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (sDate) query.append('startDate', sDate);
            if (eDate) query.append('endDate', eDate);
            if (keyword) query.append('search', keyword);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/logs/admin?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${tok}` }
            });
            setLogs(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchLogs();
    };

    const resetFilters = () => {
        setSearch('');
        setStartDate('');
        setEndDate('');
        fetchLogs(token, '', '', '');
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('systemLogs')}</h2>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto auto', gap: '1rem', alignItems: 'end' }}>
                    <div style={{ marginBottom: 0 }}>
                        <label className="label" style={{ marginBottom: '0.35rem', display: 'block' }}>Start Date</label>
                        <input type="date" className="input" style={{ margin: 0 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 0 }}>
                        <label className="label" style={{ marginBottom: '0.35rem', display: 'block' }}>End Date</label>
                        <input type="date" className="input" style={{ margin: 0 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 0 }}>
                        <label className="label" style={{ marginBottom: '0.35rem', display: 'block' }}>Search (User/Action/Details)</label>
                        <input type="text" className="input" style={{ margin: 0, width: '100%' }} placeholder="Keyword..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap', height: 'fit-content' }} disabled={loading}>
                        {loading ? 'Searching...' : t('search')}
                    </button>
                    <button type="button" className="btn btn-outline" style={{ whiteSpace: 'nowrap', height: 'fit-content' }} onClick={resetFilters}>
                        Reset
                    </button>
                </form>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>DateTime</th>
                            <th>User Name</th>
                            <th>Action</th>
                            <th>Details</th>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? logs.map(log => (
                            <tr key={log.id}>
                                <td data-label="DateTime">{new Date(log.created_at).toLocaleString()}</td>
                                <td data-label="User">{log.user_name || 'System / Guest'}</td>
                                <td data-label="Action"><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{log.action}</span></td>
                                <td data-label="Details">{log.details}</td>
                                <td data-label="IP"><code style={{ background: 'var(--color-bg)', padding: '2px 6px', borderRadius: '4px' }}>{log.ip_address}</code></td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No system logs found for this criteria.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
