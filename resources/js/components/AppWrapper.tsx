import { NotificationListener } from '@/components/NotificationListener';
import { type ReactNode } from 'react';

interface AppWrapperProps {
    children: ReactNode;
}

/**
 * AppWrapper component that wraps the entire application
 * and provides global functionality like notification listening.
 * NotificationListener is rendered AFTER children to ensure Inertia context is available.
 */
export function AppWrapper({ children }: AppWrapperProps) {
    return (
        <>
            {children}
            <NotificationListener />
        </>
    );
}

export default AppWrapper;
