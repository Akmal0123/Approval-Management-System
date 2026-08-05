import { useCallback, useEffect, useRef } from 'react';

interface NotificationOptions {
    body: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
}

/**
 * Custom hook for handling browser notifications
 * Provides methods to request permission and show notifications
 */
export function useBrowserNotification() {
    const permissionRef = useRef<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            permissionRef.current = Notification.permission;
        }
    }, []);

    /**
     * Request notification permission from the user
     * @returns Promise<boolean> - true if permission granted, false otherwise
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) {
            console.warn('🔔 This browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            permissionRef.current = 'granted';
            return true;
        }

        if (Notification.permission === 'denied') {
            console.warn('🔔 Notification permission was denied');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            permissionRef.current = permission;
            console.log('🔔 Notification permission:', permission);
            return permission === 'granted';
        } catch (error) {
            console.error('🔔 Error requesting notification permission:', error);
            return false;
        }
    }, []);

    /**
     * Show a browser notification
     * @param title - The notification title
     * @param options - Notification options (body, icon, tag, etc.)
     * @param onClick - Optional callback when notification is clicked
     */
    const showNotification = useCallback(
        (
            title: string,
            options: NotificationOptions,
            onClick?: (url?: string) => void,
        ): Notification | null => {
            if (!('Notification' in window)) {
                console.warn('🔔 This browser does not support notifications');
                return null;
            }

            if (Notification.permission !== 'granted') {
                console.warn('🔔 Notification permission not granted');
                return null;
            }

            try {
                const notification = new Notification(title, {
                    body: options.body,
                    icon: options.icon || '/favicon.ico',
                    tag: options.tag || 'default',
                    requireInteraction: options.requireInteraction || false,
                });

                notification.onclick = (event) => {
                    event.preventDefault();
                    window.focus();
                    notification.close();
                    if (onClick) {
                        onClick();
                    }
                };

                console.log('🔔 Notification shown:', title);
                return notification;
            } catch (error) {
                console.error('🔔 Error showing notification:', error);
                return null;
            }
        },
        [],
    );

    /**
     * Check if notifications are supported and permitted
     */
    const isSupported = useCallback((): boolean => {
        return 'Notification' in window;
    }, []);

    /**
     * Check if notifications are currently permitted
     */
    const isPermitted = useCallback((): boolean => {
        if (!('Notification' in window)) return false;
        return Notification.permission === 'granted';
    }, []);

    /**
     * Get current permission status
     */
    const getPermissionStatus = useCallback((): NotificationPermission | 'unsupported' => {
        if (!('Notification' in window)) return 'unsupported';
        return Notification.permission;
    }, []);

    return {
        requestPermission,
        showNotification,
        isSupported,
        isPermitted,
        getPermissionStatus,
    };
}

export default useBrowserNotification;
