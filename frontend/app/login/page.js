'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import './../globals.css';

import { Suspense } from 'react';
import { useLanguage } from '../components/LanguageProvider';

function LoginContent() {
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect');

    useEffect(() => {
        // Auto-redirect if already logged in
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user && user.token && user.role) {
            if (redirectPath) { window.location.href = redirectPath; return; }
            if (user.role === 'admin') window.location.href = '/admin';
            else if (user.role === 'it' || user.role === 'super_user') window.location.href = '/it';
            else window.location.href = '/user/report';
        }
    }, [redirectPath]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data));
                // Redirect to original page if came from QR scan, otherwise role-based
                if (redirectPath) { window.location.href = redirectPath; }
                else if (data.role === 'admin') window.location.href = '/admin';
                else if (data.role === 'it' || data.role === 'super_user') window.location.href = '/it';
                else window.location.href = '/user/report';
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Connection refused to backend.');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--color-primary)' }}>IT Service Portal</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>{t('signInToContinue')}</p>
                </div>

                {error && <div className="badge badge-error" style={{ width: '100%', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="label">{t('username')}</label>
                        <input
                            className="input"
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">{t('passwordLabel').replace(' *', '')}</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input"
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder=""
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px'
                                }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        {t('loginBtn')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                    <a href="/" style={{ color: 'var(--color-text-muted)' }}>&larr; {t('backToGuest')}</a>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
