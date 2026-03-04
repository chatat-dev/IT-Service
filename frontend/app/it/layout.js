'use client';
import { useEffect, useState } from 'react';

export default function ITLayout({ children }) {
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?.role !== 'it' && user?.role !== 'super_user') {
            window.location.href = '/login';
        } else {
            setAuthorized(true);
        }
    }, []);

    if (!authorized) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    return (
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
            {children}
        </section>
    );
}
