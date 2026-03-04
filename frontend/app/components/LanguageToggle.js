'use client';
import { useLanguage } from './LanguageProvider';

export function LanguageToggle() {
    const { lang, toggleLang } = useLanguage();

    return (
        <button
            onClick={toggleLang}
            title={lang === 'en' ? 'เปลี่ยนเป็นภาษาไทย' : 'Switch to English'}
            style={{
                background: 'var(--color-glass)',
                border: '1px solid var(--color-glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.35rem 0.6rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.2s ease',
            }}
        >
            {lang === 'en' ? '🇹🇭 TH' : '🇬🇧 EN'}
        </button>
    );
}
