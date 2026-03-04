'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageProvider';

export function NewsModal() {
    const { t } = useLanguage();
    const [newsItems, setNewsItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [open, setOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const checkNews = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) return; // Only show to logged in users

            try {
                const user = JSON.parse(userStr);
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/news/active`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });

                if (res.ok) {
                    const data = await res.json();

                    // Filter out news that the user has chosen not to see again
                    const hiddenNews = JSON.parse(localStorage.getItem(`hidden_news_ids_${user.id}`) || '[]');
                    const visibleNews = data.filter(item => !hiddenNews.includes(item.id));

                    if (visibleNews.length > 0) {
                        setNewsItems(visibleNews);
                        setOpen(true);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch news', err);
            }
        };

        checkNews();
    }, []);

    const handleClose = () => {
        if (newsItems.length === 0) return;

        const currentNewsId = newsItems[currentIndex].id;

        if (dontShowAgain) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const hiddenNews = JSON.parse(localStorage.getItem(`hidden_news_ids_${user.id}`) || '[]');
                if (!hiddenNews.includes(currentNewsId)) {
                    hiddenNews.push(currentNewsId);
                    localStorage.setItem(`hidden_news_ids_${user.id}`, JSON.stringify(hiddenNews));
                }
            }
        }

        // Move to next news or close if last
        if (currentIndex < newsItems.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setDontShowAgain(false); // Reset checkbox for the next news
        } else {
            setOpen(false);
        }
    };

    // Helper function to render text with clickable links
    const renderContentWithLinks = (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                        {part}
                    </a>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    if (!open || newsItems.length === 0) return null;

    const currentNews = newsItems[currentIndex];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)', // slightly darker overlay
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: '1rem',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                width: '100%', maxWidth: '600px',
                background: 'var(--color-bg-card)', // Opaque background
                borderRadius: '16px', // Solid edges
                display: 'flex', flexDirection: 'column', gap: '1.5rem',
                transform: 'scale(1)', animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                padding: '2rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '1.4rem', lineHeight: '1.4' }}>
                        <span>📢</span>
                        <span style={{ flex: 1 }}>{currentNews.title}</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontWeight: 'normal', alignSelf: 'center' }}>({currentIndex + 1}/{newsItems.length})</span>
                    </h3>
                    <button onClick={() => setOpen(false)} style={{ background: 'var(--color-danger)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.2rem', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '1rem' }}>
                        &times;
                    </button>
                </div>

                <div style={{ padding: '0.5rem 0' }}>

                    <div style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {renderContentWithLinks(currentNews.content)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '1rem', textAlign: 'right' }}>
                        Date: {new Date(currentNews.created_at).toLocaleDateString()}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.95rem' }}>
                        <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }} />
                        {t('doNotShowAgain') || 'Do not show this news again'}
                    </label>

                    <button className="btn btn-primary" onClick={handleClose}>
                        {currentIndex < newsItems.length - 1 ? 'Next' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
