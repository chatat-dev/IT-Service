'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function NotificationToast() {
    const [toasts, setToasts] = useState([]);
    const pathname = usePathname();
    const router = useRouter();
    const idRef = useRef(0);

    const addToast = useCallback((msg) => {
        const id = ++idRef.current;
        setToasts(prev => [...prev, { id, ...msg }]);
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exit: true } : t));
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
        }, 5000);
    }, []);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exit: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, []);

    // Expose addToast globally so Navbar can call it
    useEffect(() => {
        window.__showChatToast = addToast;
        return () => { delete window.__showChatToast; };
    }, [addToast]);

    const handleClick = (toast) => {
        dismiss(toast.id);
        if (toast.link) router.push(toast.link);
    };

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`toast-item${toast.exit ? ' toast-exit' : ''}`}
                    onClick={() => handleClick(toast)}
                >
                    <div className="toast-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <div className="toast-body">
                        <div className="toast-title">{toast.title || 'New Message'}</div>
                        <div className="toast-message">{toast.message || ''}</div>
                    </div>
                    <button className="toast-close" onClick={(e) => { e.stopPropagation(); dismiss(toast.id); }}>
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
