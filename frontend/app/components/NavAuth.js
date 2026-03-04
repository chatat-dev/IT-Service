"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "./LanguageProvider";
import { usePathname } from "next/navigation";
import Link from 'next/link';

export function NavAuth() {
    const [user, setUser] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileRef = useRef(null);
    const pathname = usePathname();
    const { t } = useLanguage();

    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        setMounted(true);
        try {
            const userData = JSON.parse(localStorage.getItem("user") || "null");
            setUser(userData);
        } catch {
            setUser(null);
        }

        const handleStorage = () => {
            try {
                const userData = JSON.parse(localStorage.getItem("user") || "null");
                setUser(userData);
            } catch {
                setUser(null);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const handleLogout = () => {
        // Only remove session-specific keys, preserve user preferences like hidden_news_ids
        localStorage.removeItem('user');
        localStorage.removeItem('language');
        window.location.href = "/login";
    };

    if (pathname === '/login' || pathname === '/register') return null;

    if (!mounted) {
        return (
            <div style={{ width: "120px", height: "36px" }} />
        );
    }

    if (user) {
        const roleLabel =
            user.role === "admin" ? "Admin" :
                user.role === "it" ? "IT Staff" : "User";

        let profileLink = "/user";
        if (user.role === "admin") profileLink = "/admin"; // Admins don't have a specific profile page right now
        if (user.role === "it" || user.role === "super_user") profileLink = "/it/profile";

        return (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }} ref={profileRef}>
                <div className="nav-user-info" style={{ textAlign: "right", lineHeight: 1.2, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                    <div className="nav-user-name" style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-main)", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.name}
                    </div>
                    <div style={{
                        fontSize: "0.6rem", fontWeight: 600, color: "#fff",
                        background: user.role === "admin" ? "#ef4444" : (user.role === "it" || user.role === "super_user") ? "var(--color-primary)" : "#6b7280",
                        padding: "1px 6px", borderRadius: "8px", lineHeight: "1.4", whiteSpace: "nowrap"
                    }}>
                        {roleLabel}
                    </div>
                </div>

                <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    style={{
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white', border: 'none',
                        borderRadius: '50%', width: '38px', height: '38px',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        cursor: 'pointer', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 15px rgba(79, 70, 229, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1) translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(79, 70, 229, 0.3)';
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </button>

                {isProfileMenuOpen && (
                    <div style={{
                        position: 'absolute', top: '120%', right: '0',
                        background: 'var(--color-bg-card)', borderRadius: '0.75rem',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.08)',
                        border: '1px solid var(--color-glass-border)',
                        padding: '0.5rem', minWidth: '180px',
                        animation: 'fadeDropdown 0.15s ease-out', zIndex: 1000
                    }}>
                        {(user.role !== "admin") && (
                            <Link
                                href={profileLink}
                                onClick={() => setIsProfileMenuOpen(false)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    padding: '0.55rem 0.85rem', borderRadius: '0.5rem',
                                    fontSize: '0.85rem', color: 'var(--color-text-main)',
                                    textDecoration: 'none', transition: 'all 0.15s ease',
                                    marginBottom: '0.25rem'
                                }}
                                className="nav-dropdown-hover-item"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M5.5 21a8.38 8.38 0 0 1 13 0" /></svg>
                                {user.role === 'user' ? t('myProfile') : t('profileSettings')}
                            </Link>
                        )}
                        <button
                            onClick={handleLogout}
                            className="nav-dropdown-hover-item"
                            style={{
                                width: '100%', textAlign: 'left', padding: '0.55rem 0.85rem',
                                borderRadius: '0.5rem', fontSize: '0.85rem',
                                color: 'var(--color-error)', background: 'transparent',
                                border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                                display: 'flex', alignItems: 'center', gap: '0.6rem'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                            {t('logout')}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <a
            href="/login"
            className="btn btn-outline"
            style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
        >
            {t('login')}
        </a>
    );
}
