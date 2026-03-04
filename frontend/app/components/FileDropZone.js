'use client';
import { useState, useRef, useCallback } from 'react';
import { useLanguage } from './LanguageProvider';

const FILE_ICONS = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', xlsm: '📊',
    xltx: '📊', ppt: '📽️', pptx: '📽️', potx: '📽️',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', tiff: '🖼️', heic: '🖼️',
    dotx: '📝', default: '📎'
};

const getIcon = (name) => {
    const ext = name?.split('.').pop()?.toLowerCase();
    return FILE_ICONS[ext] || FILE_ICONS.default;
};

const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
};

export default function FileDropZone({ files, onChange, maxSizeMB, allowedExtensions, isActive, disabled }) {
    const { t } = useLanguage();
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);
    const dragCounter = useRef(0);

    const handleFiles = useCallback((newFiles) => {
        const merged = [...files, ...Array.from(newFiles)];
        onChange(merged);
    }, [files, onChange]);

    const handleDragEnter = (e) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current++;
        setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    };

    const removeFile = (idx) => {
        onChange(files.filter((_, i) => i !== idx));
    };

    if (disabled || !isActive) return null;

    return (
        <div style={{ marginBottom: '0.5rem' }}>
            <label className="label" style={{ marginBottom: '0.5rem', display: 'block' }}>{t('attachFiles')}</label>

            {/* Drop Zone */}
            <div
                onClick={() => inputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                    position: 'relative',
                    border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                    borderRadius: '12px',
                    padding: files.length > 0 ? '1rem' : '2rem 1rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: isDragging
                        ? 'rgba(99,102,241,0.06)'
                        : 'var(--color-bg-base)',
                    transition: 'all 0.25s ease',
                    minHeight: files.length > 0 ? 'auto' : '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={allowedExtensions}
                    onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                    style={{ display: 'none' }}
                />

                {files.length === 0 ? (
                    <>
                        {/* Upload Icon */}
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '50%',
                            background: isDragging ? 'rgba(99,102,241,0.15)' : 'var(--color-glass)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s ease',
                            transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                                stroke={isDragging ? 'var(--color-primary)' : 'var(--color-text-muted)'}
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transition: 'stroke 0.2s' }}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '500', color: isDragging ? 'var(--color-primary)' : 'var(--color-text-main)' }}>
                            {isDragging
                                ? (t('dropHere') || 'วางไฟล์ที่นี่')
                                : (t('dragOrClick') || 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก')}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            {t('maxFileSizeNote')} {maxSizeMB}MB &nbsp;·&nbsp; {t('allowedExtNote')} {allowedExtensions}
                        </div>
                    </>
                ) : (
                    <>
                        {/* File List */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                            {files.map((f, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    padding: '0.5rem 0.75rem',
                                    background: 'var(--color-glass)',
                                    border: '1px solid var(--color-glass-border)',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.15s ease',
                                }}>
                                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{getIcon(f.name)}</span>
                                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text-main)' }}>{f.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{formatSize(f.size)}</div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: '#ef4444', padding: '0.25rem', borderRadius: '4px',
                                            display: 'flex', alignItems: 'center', flexShrink: 0,
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                                        title="Remove"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        {/* Add More */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: '500',
                            marginTop: '0.25rem', cursor: 'pointer',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            {t('addMoreFiles') || 'เพิ่มไฟล์'}
                        </div>
                    </>
                )}
            </div>

            {/* Retention Warning */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                marginTop: '0.6rem', padding: '0.5rem 0.75rem',
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '8px', fontSize: '0.78rem', color: '#dc2626',
            }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {t('fileRetentionNote')}
            </div>
        </div>
    );
}
