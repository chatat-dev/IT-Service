'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { NavAuth } from './NavAuth';
import { useLanguage } from './LanguageProvider';
import { io } from 'socket.io-client';

export function Navbar() {
    const { lang, toggleLang, t } = useLanguage();
    const pathname = usePathname();
    const [user, setUser] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [openMenu, setOpenMenu] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const timeoutRef = useRef(null);
    const navRef = useRef(null);
    const socketRef = useRef(null);

    const [counts, setCounts] = useState({
        pendingUsers: 0, openTickets: 0, unreadItChats: 0, unreadUserChats: 0
    });

    const section = pathname.startsWith('/admin') ? 'admin'
        : pathname.startsWith('/it') ? 'it'
            : pathname.startsWith('/user') ? 'user'
                : null;

    useEffect(() => {
        setMounted(true);
        try {
            const ud = JSON.parse(localStorage.getItem('user') || 'null');
            setUser(ud);
        } catch { setUser(null); }
        const onStorage = () => {
            try { setUser(JSON.parse(localStorage.getItem('user') || 'null')); }
            catch { setUser(null); }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Badge & socket logic
    useEffect(() => {
        if (!user?.token || !section) return;
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250';
        const headers = { 'Authorization': `Bearer ${user.token}` };

        const fetchItCounts = async () => {
            try {
                const [usersRes, ticketsRes, chatRes] = await Promise.all([
                    fetch(`${API}/api/it/pending-users`, { headers }),
                    fetch(`${API}/api/tickets/board`, { headers }),
                    fetch(`${API}/api/chat/it-unread-count`, { headers })
                ]);
                const users = await usersRes.json();
                const tickets = await ticketsRes.json();
                const unread = Array.isArray(tickets) ? tickets.filter(t => !t.is_viewed_by_me && t.status !== 'closed').length : 0;
                const chatData = chatRes.ok ? await chatRes.json() : { unreadCount: 0 };
                setCounts(prev => ({ ...prev, pendingUsers: Array.isArray(users) ? users.length : 0, openTickets: unread, unreadItChats: chatData.unreadCount || 0 }));
            } catch (err) { console.error(err); }
        };

        const fetchUserChatCount = async () => {
            try {
                const res = await fetch(`${API}/api/chat/unread-count`, { headers });
                const data = await res.json();
                setCounts(prev => ({ ...prev, unreadUserChats: data.unreadCount || 0 }));
            } catch (err) { console.error(err); }
        };

        if (section === 'it') fetchItCounts();
        if (section === 'user') fetchUserChatCount();

        socketRef.current = io(API, { query: { token: user.token, userId: user.id } });

        if (section === 'it') {
            socketRef.current.on('refresh_users', fetchItCounts);
            socketRef.current.on('refresh_tickets', fetchItCounts);
            socketRef.current.on('receive_message_global', (msgData) => {
                // If it's a message from someone else, increment IT unread badge
                if (msgData?.sender_id !== user.id) {
                    setCounts(prev => ({ ...prev, unreadItChats: prev.unreadItChats + 1 }));
                    fetchItCounts(); // Refresh exact badge count

                    // Show toast if not on IT chat page
                    if (!window.location.pathname.startsWith('/it/chat') && window.__showChatToast) {
                        const senderName = msgData?.sender_name || msgData?.user_name || 'User';
                        const preview = msgData?.message ? (msgData.message.length > 50 ? msgData.message.substring(0, 50) + '...' : msgData.message) : 'New message';
                        window.__showChatToast({
                            title: `💬 ${senderName}`,
                            message: preview,
                            link: '/it/chat'
                        });
                    }
                }
            });
        }
        if (section === 'user') {
            socketRef.current.on('refresh_chats', fetchUserChatCount);
            socketRef.current.on('receive_message_global', (msgData) => {
                // Only alert user if their own ticket got a message from IT
                if (msgData?.sender_id !== user.id && msgData?.ticket_owner_id === user.id) {
                    fetchUserChatCount();
                    // Show toast if not on User chat page
                    if (!window.location.pathname.startsWith('/user/chat') && window.__showChatToast) {
                        const senderName = msgData?.sender_name || msgData?.user_name || 'IT Support';
                        const preview = msgData?.message ? (msgData.message.length > 50 ? msgData.message.substring(0, 50) + '...' : msgData.message) : 'New message';
                        window.__showChatToast({
                            title: `💬 ${senderName}`,
                            message: preview,
                            link: '/user/chat'
                        });
                    }
                }
            });
        }

        const handleRefreshUsers = () => { if (section === 'it') fetchItCounts(); };
        const handleRefreshTickets = () => { if (section === 'it') fetchItCounts(); };
        const handleChatOpened = () => setCounts(prev => ({ ...prev, unreadItChats: 0 }));
        const handleChatRead = () => { if (section === 'user') fetchUserChatCount(); };

        window.addEventListener('refresh_users', handleRefreshUsers);
        window.addEventListener('refresh_tickets', handleRefreshTickets);
        window.addEventListener('chat_opened', handleChatOpened);
        window.addEventListener('chat_read', handleChatRead);

        return () => {
            socketRef.current?.disconnect();
            window.removeEventListener('refresh_users', handleRefreshUsers);
            window.removeEventListener('refresh_tickets', handleRefreshTickets);
            window.removeEventListener('chat_opened', handleChatOpened);
            window.removeEventListener('chat_read', handleChatRead);
        };
    }, [user?.token, section]);

    // Click outside to close dropdown and mobile menu
    useEffect(() => {
        const handler = (e) => {
            if (navRef.current && !navRef.current.contains(e.target)) {
                setOpenMenu(null);
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleMouseEnter = useCallback((key) => { clearTimeout(timeoutRef.current); setOpenMenu(key); }, []);
    const handleMouseLeave = useCallback(() => { timeoutRef.current = setTimeout(() => setOpenMenu(null), 200); }, []);

    const stripEmoji = (text) => text.replace(/^[^\p{L}\p{N}\s]+\s*/gu, '');
    const isChildActive = (items) => items?.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));
    const getCatBadge = (items) => items ? items.reduce((s, i) => s + (i.badge ? (counts[i.badge] || 0) : 0), 0) : 0;

    const getNavCategories = () => {
        if (section === 'admin') return [
            { key: 'dashboard', labelKey: 'dashboard', href: '/admin', type: 'link' },
            {
                key: 'organization', labelKey: 'organizationCategory', type: 'dropdown', items: [
                    { labelKey: 'locations', href: '/admin/locations' },
                    { labelKey: 'companies', href: '/admin/companies' },
                    { labelKey: 'sites', href: '/admin/sites' },
                    { labelKey: 'departments', href: '/admin/departments' },
                ]
            },
            {
                key: 'service', labelKey: 'serviceCategory', type: 'dropdown', items: [
                    { labelKey: 'categories', href: '/admin/categories' },
                    { labelKey: 'manageUsers', href: '/admin/users' },
                    { labelKey: 'manageTickets', href: '/admin/tickets' },
                ]
            },
            {
                key: 'computer', labelKey: 'computerSettingsCategory', type: 'dropdown', items: [
                    { labelKey: 'operatingSystems', href: '/admin/operating-systems' },
                    { labelKey: 'msOffices', href: '/admin/ms-offices' },
                    { labelKey: 'deviceTypes', href: '/admin/device-types' },
                    { labelKey: 'scriptInstallStatuses', href: '/admin/script-install-statuses' },
                ]
            },
            {
                key: 'system', labelKey: 'systemCategory', type: 'dropdown', items: [
                    { labelKey: 'systemLogs', href: '/admin/system-logs' },
                    { labelKey: 'emailSettings', href: '/admin/email-settings' },
                    { labelKey: 'manageNews', href: '/admin/news' },
                    { labelKey: 'autoReportSettings', href: '/admin/auto-report' },
                    { labelKey: 'attachmentSettings', href: '/admin/attachments' },
                ]
            },
        ];
        if (section === 'it') return [
            { key: 'dashboard', labelKey: 'dashboardStats', href: '/it', type: 'link' },
            {
                key: 'tickets', labelKey: 'ticketsCategory', type: 'dropdown', items: [
                    { labelKey: 'requestBoard', href: '/it/board', badge: 'openTickets' },
                    { labelKey: 'historyTickets', href: '/it/history' },
                ]
            },
            {
                key: 'support', labelKey: 'supportCategory', type: 'dropdown', items: [
                    { labelKey: 'userApproval', href: '/it/approve', badge: 'pendingUsers' },
                    { labelKey: 'itUsersChat', href: '/it/chat', badge: 'unreadItChats' },
                ]
            },
            { key: 'computers', labelKey: 'computerInventory', href: '/it/computers', type: 'link' },
        ];
        if (section === 'user') return [
            { key: 'report', labelKey: 'reportIssue', href: '/user/report', type: 'link' },
            { key: 'track', labelKey: 'myIssues', href: '/user/track', type: 'link' },
            { key: 'chat', labelKey: 'supportChat', href: '/user/chat', type: 'link', badge: 'unreadUserChats' },
        ];
        return [];
    };

    const navCategories = getNavCategories();

    const badgeStyle = {
        background: '#ef4444', color: '#fff', fontSize: '0.6rem', fontWeight: '700',
        padding: '0.1rem 0.35rem', borderRadius: '10px', minWidth: '15px',
        textAlign: 'center', lineHeight: 1.2,
    };

    return (
        <>
            <header className="glass header-nav" style={{
                position: 'fixed', top: 0, width: '100%', zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                {/* Left: Logo + Nav */}
                <div ref={navRef} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    {/* Hamburger Icon for Mobile */}
                    <button
                        className="mobile-only"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '1.5rem', color: 'var(--color-primary)', marginRight: '1rem',
                            display: 'none', // Controlled by CSS
                        }}
                    >
                        ☰
                    </button>

                    {/* Logo */}
                    <div style={{ fontWeight: '700', fontSize: '1.25rem', color: 'var(--color-text-main)', padding: '0.85rem 0', marginRight: '2rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <span style={{ color: 'var(--color-primary)' }}>IT</span> <span className="logo-text">Service</span>
                    </div>

                    {/* Desktop Navigation */}
                    {mounted && navCategories.length > 0 && (
                        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center' }}>
                            {navCategories.map(cat => {
                                const basePath = section === 'admin' ? '/admin' : section === 'it' ? '/it' : '/user';
                                const isCatActive = cat.type === 'link'
                                    ? pathname === cat.href || (cat.href !== basePath && pathname.startsWith(cat.href))
                                    : isChildActive(cat.items);
                                const catBadgeTotal = cat.type === 'dropdown' ? getCatBadge(cat.items) : 0;
                                const linkBadge = cat.badge ? (counts[cat.badge] || 0) : 0;

                                return (
                                    <div key={cat.key}
                                        onMouseEnter={() => cat.type === 'dropdown' && handleMouseEnter(cat.key)}
                                        onMouseLeave={cat.type === 'dropdown' ? handleMouseLeave : undefined}
                                        style={{ position: 'relative', flexShrink: 0 }}>
                                        {cat.type === 'link' ? (
                                            <Link href={cat.href} className={isCatActive ? '' : 'nav-hover-item'} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                padding: '0.85rem 0.75rem', fontSize: '0.875rem',
                                                fontWeight: isCatActive ? '600' : '500',
                                                color: isCatActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                                                textDecoration: 'none', whiteSpace: 'nowrap',
                                                borderBottom: isCatActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                                borderRadius: '0.5rem 0.5rem 0 0',
                                                transition: 'all 0.2s ease',
                                            }}>
                                                {stripEmoji(t(cat.labelKey))}
                                                {linkBadge > 0 && <span style={badgeStyle}>{linkBadge > 99 ? '99+' : linkBadge}</span>}
                                            </Link>
                                        ) : (
                                            <>
                                                <button
                                                    className={isCatActive ? '' : 'nav-hover-item'}
                                                    onClick={() => setOpenMenu(openMenu === cat.key ? null : cat.key)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                        padding: '0.85rem 0.75rem', fontSize: '0.875rem',
                                                        fontWeight: isCatActive ? '600' : '500',
                                                        color: isCatActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        borderBottom: isCatActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                                        borderRadius: '0.5rem 0.5rem 0 0',
                                                        transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                                                    }}>
                                                    {t(cat.labelKey)}
                                                    {catBadgeTotal > 0 && <span style={badgeStyle}>{catBadgeTotal > 99 ? '99+' : catBadgeTotal}</span>}
                                                    <span style={{ fontSize: '0.55rem', opacity: 0.5, transform: openMenu === cat.key ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                                                </button>
                                                {openMenu === cat.key && (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', left: '0',
                                                        background: 'var(--color-bg-card)', borderRadius: '0.75rem',
                                                        boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.08)',
                                                        border: '1px solid var(--color-glass-border)',
                                                        padding: '0.5rem', minWidth: '210px',
                                                        animation: 'fadeDropdown 0.15s ease-out',
                                                    }}>
                                                        {cat.items.map(item => {
                                                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                                            const itemBadge = item.badge ? (counts[item.badge] || 0) : 0;
                                                            return (
                                                                <Link key={item.href} href={item.href}
                                                                    onClick={() => setOpenMenu(null)}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                        padding: '0.55rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.85rem',
                                                                        fontWeight: isActive ? '600' : '400',
                                                                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                                                                        background: isActive ? 'rgba(79,70,229,0.06)' : 'transparent',
                                                                        textDecoration: 'none', transition: 'all 0.15s ease',
                                                                    }}
                                                                    className={isActive ? '' : 'nav-dropdown-hover-item'}
                                                                >
                                                                    <span>{stripEmoji(t(item.labelKey))}</span>
                                                                    {itemBadge > 0 && <span style={badgeStyle}>{itemBadge > 99 ? '99+' : itemBadge}</span>}
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Mobile Navigation Dropdown */}
                    {isMobileMenuOpen && mounted && (
                        <div className="mobile-only" style={{
                            position: 'absolute', top: '100%', left: 0, width: '100%',
                            background: 'var(--color-bg-card)',
                            borderBottom: '1px solid var(--color-glass-border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            display: 'flex', flexDirection: 'column',
                            padding: '1rem', maxHeight: '70vh', overflowY: 'auto'
                        }}>
                            {navCategories.map(cat => {
                                const basePath = section === 'admin' ? '/admin' : section === 'it' ? '/it' : '/user';
                                const isCatActive = cat.type === 'link'
                                    ? pathname === cat.href || (cat.href !== basePath && pathname.startsWith(cat.href))
                                    : isChildActive(cat.items);

                                return (
                                    <div key={cat.key} style={{ marginBottom: '0.5rem' }}>
                                        {cat.type === 'link' ? (
                                            <Link href={cat.href} onClick={() => setIsMobileMenuOpen(false)} style={{
                                                display: 'block', padding: '0.75rem 1rem',
                                                fontSize: '1rem', fontWeight: isCatActive ? '600' : '500',
                                                color: isCatActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                                                background: isCatActive ? 'rgba(79,70,229,0.06)' : 'transparent',
                                                borderRadius: '0.5rem', textDecoration: 'none'
                                            }}>
                                                {stripEmoji(t(cat.labelKey))}
                                            </Link>
                                        ) : (
                                            <>
                                                <div style={{ padding: '0.75rem 1rem', fontWeight: '700', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                                    {t(cat.labelKey)}
                                                </div>
                                                <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    {cat.items.map(item => {
                                                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                                        return (
                                                            <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} style={{
                                                                display: 'block', padding: '0.65rem 1rem', fontSize: '0.9rem',
                                                                color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                                                                background: isActive ? 'rgba(79,70,229,0.06)' : 'transparent',
                                                                fontWeight: isActive ? '600' : '400', borderRadius: '0.5rem', textDecoration: 'none'
                                                            }}>
                                                                {stripEmoji(t(item.labelKey))}
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            <div className="mobile-only" style={{ padding: '1rem', borderTop: '1px solid var(--color-glass-border)', display: 'flex', justifyContent: 'center' }}>
                                <ThemeToggle />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Controls */}
                <nav className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <button
                        onClick={toggleLang}
                        title={lang === 'en' ? 'เปลี่ยนเป็นภาษาไทย' : 'Switch to English'}
                        style={{
                            background: 'var(--color-glass)',
                            border: '1px solid var(--color-glass-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.35rem 0.6rem', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: '600',
                            color: 'var(--color-text-main)',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {lang === 'en' ? '🇹🇭 TH' : '🇬🇧 EN'}
                    </button>
                    <div className="desktop-only"><ThemeToggle /></div>
                    <NavAuth />
                </nav>
            </header>
            <style jsx global>{`
                @keyframes fadeDropdown {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
