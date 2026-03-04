'use client';
import { ThemeProvider } from './ThemeProvider';
import { ModalProvider } from './ModalProvider';
import { LanguageProvider } from './LanguageProvider';
import { Navbar } from './Navbar';
import { NewsModal } from './NewsModal';
import NotificationToast from './NotificationToast';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { useModal } from './ModalProvider';

function GlobalSocket() {
    const { showAlert } = useModal();

    useEffect(() => {
        // Global socket connection for app-wide events
        const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250');

        socket.on('force_logout', (data) => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user && user.id == data.userId) {
                // Clear storage
                localStorage.removeItem('user');

                // Show modal instead of browser alert
                showAlert({
                    title: 'Account Disabled',
                    message: 'Your account has been disabled by the administrator. You have been logged out.',
                    type: 'error',
                    onClose: () => {
                        window.location.href = '/login';
                    }
                });
            }
        });

        return () => {
            socket.off('force_logout');
            socket.disconnect();
        };
    }, [showAlert]);

    return null; // does not render anything
}

export function AppProviders({ children }) {

    return (
        <ThemeProvider>
            <LanguageProvider>
                <ModalProvider>
                    <GlobalSocket />
                    <Navbar />
                    <NewsModal />
                    <NotificationToast />
                    <main className="page-wrapper">
                        {children}
                    </main>
                    <footer style={{
                        textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.875rem',
                        borderTop: '1px solid var(--color-glass-border)', marginTop: '4rem'
                    }}>
                        &copy; {new Date().getFullYear()} IT Service Portal. All rights reserved.
                    </footer>
                </ModalProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}
