'use client';
import { useState, useEffect } from 'react';

const PROVIDERS = {
    gmail: { host: 'smtp.gmail.com', port: 587 },
    outlook: { host: 'smtp.office365.com', port: 587 },
    custom: { host: '', port: 465 }
};

export default function AdminEmailSettings() {
    const [token, setToken] = useState('');
    const [provider, setProvider] = useState('custom');
    const [form, setForm] = useState({
        smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '',
        sender_name: 'IT Service', sender_email: ''
    });
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) fetchSettings(user.token);
    }, []);

    const fetchSettings = async (t) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/email-settings`, { headers: { 'Authorization': `Bearer ${t}` } });
            const data = await res.json();
            if (data) {
                setProvider(data.provider || 'custom');
                setForm({
                    smtp_host: data.smtp_host || '',
                    smtp_port: data.smtp_port || 587,
                    smtp_user: data.smtp_user || '',
                    smtp_pass: data.smtp_pass || '',
                    sender_name: data.sender_name || 'IT Service',
                    sender_email: data.sender_email || ''
                });
            }
        } catch (err) { console.error(err); }
    };

    const selectProvider = (p) => {
        setProvider(p);
        if (p !== 'custom') {
            setForm(f => ({ ...f, smtp_host: PROVIDERS[p].host, smtp_port: PROVIDERS[p].port }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/email-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ provider, ...form })
            });
            const data = await res.json();
            setMessage({ type: res.ok ? 'success' : 'error', text: data.message });
        } catch (err) {
            setMessage({ type: 'error', text: 'Server connection error' });
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                ✉️ ตั้งค่า SMTP สำหรับส่งอีเมล
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                กำหนด Server สำหรับส่งอีเมลรายงานอัตโนมัติ
            </p>

            <div className="glass-card">
                {/* Provider Selection */}
                <fieldset style={{ border: '1px solid var(--color-glass-border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
                    <legend style={{ padding: '0 0.5rem', fontWeight: '600' }}>เลือก Provider</legend>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {[
                            { key: 'gmail', label: 'Gmail', desc: 'ใช้ App Password จาก Google' },
                            { key: 'outlook', label: 'Outlook', desc: 'ใช้รหัสผ่านของ Microsoft 365' },
                            { key: 'custom', label: 'Custom SMTP', desc: 'กรอก SMTP Server ของคุณเอง' }
                        ].map(p => (
                            <div key={p.key}
                                onClick={() => selectProvider(p.key)}
                                style={{
                                    flex: 1, minWidth: '150px', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                                    border: provider === p.key ? '2px solid var(--color-primary)' : '1px solid var(--color-glass-border)',
                                    cursor: 'pointer', textAlign: 'center',
                                    background: provider === p.key ? 'rgba(79,70,229,0.08)' : 'transparent'
                                }}>
                                <strong>{p.label}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{p.desc}</div>
                            </div>
                        ))}
                    </div>
                </fieldset>

                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="label" style={{ fontWeight: '600' }}>SMTP Host</label>
                            <input className="input" required value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })}
                                disabled={provider !== 'custom'} placeholder="mail.example.com" />
                        </div>
                        <div className="form-group">
                            <label className="label" style={{ fontWeight: '600' }}>Port</label>
                            <input className="input" type="number" required value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: parseInt(e.target.value) })}
                                disabled={provider !== 'custom'} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="label" style={{ fontWeight: '600' }}>Email (Username)</label>
                            <input className="input" required value={form.smtp_user} onChange={e => setForm({ ...form, smtp_user: e.target.value })}
                                placeholder="user@example.com" />
                        </div>
                        <div className="form-group">
                            <label className="label" style={{ fontWeight: '600' }}>Password (App Password)</label>
                            <input className="input" type="password" required value={form.smtp_pass} onChange={e => setForm({ ...form, smtp_pass: e.target.value })}
                                placeholder="********" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="label" style={{ fontWeight: '600' }}>ชื่อผู้ส่ง (Sender Name)</label>
                            <input className="input" value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value })}
                                placeholder="IT Service" />
                        </div>
                        <div className="form-group">
                            <label className="label" style={{ fontWeight: '600' }}>อีเมลผู้ส่ง (Optional)</label>
                            <input className="input" value={form.sender_email} onChange={e => setForm({ ...form, sender_email: e.target.value })}
                                placeholder="noreply@example.com" />
                        </div>
                    </div>

                    {message && (
                        <div className={`badge badge-${message.type}`} style={{ padding: '0.75rem', width: '100%', display: 'block', marginBottom: '1rem' }}>
                            {message.text}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
                        {loading ? '⏳ Saving...' : '💾 บันทึกการตั้งค่า'}
                    </button>
                </form>

                {/* Gmail Instructions */}
                {provider === 'gmail' && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: 'var(--radius-md)', border: '1px solid #f59e0b' }}>
                        <strong style={{ color: '#92400e' }}>⚠️ วิธีสร้าง App Password สำหรับ Gmail</strong>
                        <ol style={{ margin: '0.5rem 0 0 1rem', fontSize: '0.85rem', color: '#92400e' }}>
                            <li>เปิดใช้งาน 2-Step Verification ที่ Google Account</li>
                            <li>ไปที่ Google Account &gt; Security &gt; App passwords</li>
                            <li>สร้าง App password ใหม่ และนำมาใช้แทนรหัสผ่านปกติ</li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}
