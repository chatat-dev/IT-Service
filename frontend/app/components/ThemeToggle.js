"use client";

import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <button className="theme-switch-btn skeleton-switch" aria-label="Loading Theme Toggle">
                <div className="theme-switch-track" />
            </button>
        );
    }

    const isDark = theme === "dark";

    return (
        <button
            onClick={toggleTheme}
            className={`theme-switch-btn ${isDark ? 'is-dark' : 'is-light'}`}
            aria-label="Toggle Theme"
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
        >
            <div className="theme-switch-track">
                {/* Background Layer */}
                <div className="theme-switch-bg">
                    {/* Day / Clouds Icon (Left side when light) */}
                    <div className="theme-switch-icon theme-switch-clouds">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.5 19C19.985 19 22 16.985 22 14.5C22 12.133 20.176 10.207 17.854 10.017C17.388 6.644 14.498 4 11 4C7.134 4 4 7.134 4 11C4 11.083 4.001 11.165 4.004 11.247C1.725 11.751 0 13.755 0 16.154C0 18.831 2.239 21 5 21H17.5C17.5 21 17.5 19 17.5 19Z" fill="currentColor" />
                        </svg>
                    </div>
                    {/* Night / Stars Icon (Right side when dark) */}
                    <div className="theme-switch-icon theme-switch-stars">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 2L11 8L17 9L11 10L10 16L9 10L3 9L9 8L10 2Z" fill="currentColor" />
                            <circle cx="5" cy="18" r="1.5" fill="currentColor" />
                            <circle cx="19" cy="5" r="1.5" fill="currentColor" />
                            <path d="M18 16L18.5 18.5L21 19L18.5 19.5L18 22L17.5 19.5L15 19L17.5 18.5L18 16Z" fill="currentColor" />
                        </svg>
                    </div>
                </div>

                {/* Thumb Layer */}
                <div className="theme-switch-thumb">
                    {/* Sun inside Thumb */}
                    <div className="theme-switch-thumb-icon theme-switch-sun">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="5" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    {/* Moon inside Thumb */}
                    <div className="theme-switch-thumb-icon theme-switch-moon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    </div>
                </div>
            </div>
        </button>
    );
}
