'use client';
import { useState, useEffect } from 'react';
import { useModal } from '../../components/ModalProvider';
import { useLanguage } from '../../components/LanguageProvider';

export default function ITApprovePage() {
    const { showConfirm } = useModal();
    const { t } = useLanguage();
    const [pendingUsers, setPendingUsers] = useState([]);
    const [token, setToken] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) fetchPending(user.token);

        const handleSocketRefresh = () => {
            if (user.token) fetchPending(user.token);
        };

        window.addEventListener('refresh_users', handleSocketRefresh);

        return () => {
            window.removeEventListener('refresh_users', handleSocketRefresh);
        };
    }, []);

    const fetchPending = async (tk = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/it/pending-users`, { headers: { 'Authorization': `Bearer ${tk}` } });
            const data = await res.json();
            if (Array.isArray(data)) setPendingUsers(data);
        } catch (err) { console.error(err); }
    };

    const approveUser = (id) => {
        showConfirm({
            title: 'อนุมัติผู้ใช้',
            message: 'คุณต้องการอนุมัติผู้ใช้นี้ใช่หรือไม่?',
            type: 'success',
            confirmText: 'อนุมัติ',
            onConfirm: async () => {
                try {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/it/pending-users/${id}/approve`, {
                        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
                    });
                    fetchPending();
                } catch (err) { console.error(err); }
            }
        });
    };

    const rejectUser = (id) => {
        showConfirm({
            title: 'ปฏิเสธผู้ใช้',
            message: 'คุณต้องการปฏิเสธและลบผู้ใช้นี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
            type: 'danger',
            confirmText: 'ปฏิเสธ',
            onConfirm: async () => {
                try {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/it/pending-users/${id}/reject`, {
                        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                    });
                    fetchPending();
                } catch (err) { console.error(err); }
            }
        });
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>{t('userApproval')}</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                {t('pendingDesc')}
            </p>

            {pendingUsers.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                    {pendingUsers.map(u => (
                        <div key={u.id} style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-glass-border)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        }}
                            onMouseOver={e => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseOut={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {/* Accent Top Bar */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)'
                            }} />

                            {/* Header: Avatar + Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: '700', fontSize: '1.1rem',
                                    flexShrink: 0
                                }}>
                                    {(u.name || '?')[0].toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--color-text-main)' }}>
                                        {u.name} {u.lname || ''}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        @{u.username}
                                    </div>
                                </div>
                                <span style={{
                                    background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem',
                                    borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600',
                                    whiteSpace: 'nowrap'
                                }}>
                                    ⏳ Pending
                                </span>
                            </div>

                            {/* Info Grid */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
                                marginBottom: '1.25rem', fontSize: '0.82rem'
                            }}>
                                {[
                                    { icon: '📧', label: t('email'), value: u.email || '-' },
                                    { icon: '📞', label: t('phone'), value: u.phone || '-' },
                                    { icon: '📍', label: t('location'), value: u.location_name || '-' },
                                    { icon: '🏢', label: t('company'), value: u.company_name || '-' },
                                    { icon: '🏭', label: t('site'), value: u.site_name || '-' },
                                    { icon: '🏷️', label: t('department'), value: u.dept_name || '-' },
                                ].map((item, i) => (
                                    <div key={i} style={{
                                        padding: '0.4rem 0.6rem',
                                        background: 'var(--color-bg-main)',
                                        borderRadius: '8px',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        <span style={{ marginRight: '0.3rem' }}>{item.icon}</span>
                                        <span style={{ color: 'var(--color-text-muted)', marginRight: '0.3rem' }}>{item.label}:</span>
                                        <span style={{ color: 'var(--color-text-main)', fontWeight: '500' }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={() => approveUser(u.id)}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#fff', fontWeight: '600', fontSize: '0.9rem',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    ✅ {t('approve').replace('✅ ', '')}
                                </button>
                                <button onClick={() => rejectUser(u.id)}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: '10px',
                                        border: '2px solid #ef4444', background: 'transparent',
                                        color: '#ef4444', fontWeight: '600', fontSize: '0.9rem',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
                                >
                                    ❌ {t('reject').replace('❌ ', '')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card" style={{
                    textAlign: 'center', padding: '4rem 2rem',
                    color: 'var(--color-text-muted)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{t('noPendingUsers')}</p>
                </div>
            )}
        </div>
    );
}
