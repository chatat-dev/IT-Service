'use client';
import { ModalProvider } from './ModalProvider';

export function ModalProviderWrapper({ children }) {
    return <ModalProvider>{children}</ModalProvider>;
}
