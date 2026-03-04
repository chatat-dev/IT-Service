'use client';
import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export function useModal() {
    return useContext(ModalContext);
}

export function ModalProvider({ children }) {
    const [modal, setModal] = useState(null);

    const showConfirm = useCallback(({ title, message, onConfirm, confirmText = 'ตกลง', cancelText = 'ยกเลิก', type = 'warning' }) => {
        setModal({ kind: 'confirm', title, message, onConfirm, confirmText, cancelText, type });
    }, []);

    const showAlert = useCallback(({ title, message, type = 'info', onClose }) => {
        setModal({ kind: 'alert', title, message, type, onClose });
    }, []);

    const close = useCallback(() => setModal(null), []);

    const typeColors = {
        warning: '#f59e0b',
        danger: '#ef4444',
        success: '#10b981',
        info: '#6366f1',
        error: '#ef4444',
    };

    const typeIcons = {
        warning: '⚠️',
        danger: '🗑️',
        success: '✅',
        info: 'ℹ️',
        error: '❌',
    };

    return (
        <ModalContext.Provider value={{ showConfirm, showAlert }}>
            {children}

            {modal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 9999, animation: 'modalFadeIn 0.2s ease'
                }}>
                    <div style={{
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px', padding: '2rem 2.5rem', width: '440px', maxWidth: '90vw',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        animation: 'modalSlideUp 0.3s ease',
                        textAlign: 'center'
                    }}>
                        {/* Icon */}
                        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                            {typeIcons[modal.type] || typeIcons.info}
                        </div>

                        {/* Title */}
                        {modal.title && (
                            <h3 style={{
                                margin: '0 0 0.75rem',
                                color: typeColors[modal.type] || typeColors.info,
                                fontSize: '1.25rem',
                                fontWeight: '700'
                            }}>
                                {modal.title}
                            </h3>
                        )}

                        {/* Message */}
                        <p style={{
                            color: '#374151',
                            margin: '0 0 1.75rem',
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                            fontWeight: '400'
                        }}>
                            {modal.message}
                        </p>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            {modal.kind === 'confirm' ? (
                                <>
                                    <button onClick={close}
                                        style={{
                                            flex: 1, padding: '0.7rem 1rem', borderRadius: '10px',
                                            border: '1px solid #d1d5db', background: '#f9fafb',
                                            color: '#374151', fontSize: '0.95rem', fontWeight: '600',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}>
                                        {modal.cancelText}
                                    </button>
                                    <button onClick={() => { modal.onConfirm(); close(); }}
                                        style={{
                                            flex: 1, padding: '0.7rem 1rem', borderRadius: '10px',
                                            border: 'none',
                                            background: typeColors[modal.type] || typeColors.info,
                                            color: '#ffffff', fontSize: '0.95rem', fontWeight: '600',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            boxShadow: `0 4px 12px ${typeColors[modal.type] || typeColors.info}40`
                                        }}>
                                        {modal.confirmText}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => {
                                    if (modal.onClose) modal.onClose();
                                    close();
                                }}
                                    style={{
                                        padding: '0.7rem 2.5rem', borderRadius: '10px',
                                        border: 'none', background: '#6366f1',
                                        color: '#ffffff', fontSize: '0.95rem', fontWeight: '600',
                                        cursor: 'pointer'
                                    }}>
                                    ตกลง
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </ModalContext.Provider>
    );
}
