import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface BrowserNotificationData {
    id?: string;
    title: string;
    body: string;
    url?: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp?: string;
}

/**
 * Global component that listens for browser notification events via Laravel Reverb / Echo
 *
 * Should be mounted once in the app layout to handle all notification broadcasts
 */
export function NotificationListener() {
    const { auth } = usePage().props as { auth?: { user?: { id: number } } };
    const userId = auth?.user?.id;

    const { requestPermission, showNotification, isSupported, isPermitted } = useBrowserNotification();
    const [permissionRequested, setPermissionRequested] = useState(false);
    const channelRef = useRef<ReturnType<typeof window.Echo.channel> | null>(null);

    // Set to avoid duplicate notifications
    const processedNotificationsRef = useRef<Set<string>>(new Set());

    // Central notification handler
    const handleNotification = useCallback(
        (data: BrowserNotificationData) => {
            // Deduplication key based on title, body, and timestamp/id
            const dedupKey = data.id || `${data.title}|${data.body}|${data.timestamp?.slice(0, 19) || ''}`;

            if (processedNotificationsRef.current.has(dedupKey)) {
                return;
            }

            processedNotificationsRef.current.add(dedupKey);

            // Keep set size manageable
            if (processedNotificationsRef.current.size > 100) {
                const firstItem = processedNotificationsRef.current.values().next().value;
                if (firstItem) {
                    processedNotificationsRef.current.delete(firstItem);
                }
            }

            console.log('🔔 Received real-time notification:', data);

            // 1. Show interactive Toast Notification
            const toastOptions = {
                duration: 5000,
                style: {
                    maxWidth: '420px',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                },
            };

            switch (data.type) {
                case 'success':
                    toast.success(data.body, { ...toastOptions, icon: '✅' });
                    break;
                case 'warning':
                    toast(data.body, { ...toastOptions, icon: '⚠️' });
                    break;
                case 'error':
                    toast.error(data.body, { ...toastOptions, icon: '❌' });
                    break;
                default:
                    toast(data.body, { ...toastOptions, icon: '🔔' });
            }

            // 2. Show native Browser Desktop Notification (if permitted)
            if (isPermitted()) {
                showNotification(
                    data.title,
                    {
                        body: data.body,
                        tag: `notification-${data.id || data.timestamp || Date.now()}`,
                        requireInteraction: data.type === 'error' || data.type === 'warning',
                    },
                    () => {
                        // Navigate to URL when notification is clicked
                        if (data.url) {
                            window.location.href = data.url;
                        }
                    },
                );
            }
        },
        [isPermitted, showNotification],
    );

    // Request notification permission on mount (only once per session)
    useEffect(() => {
        if (!isSupported()) {
            console.warn('🔔 Browser notifications not supported');
            return;
        }

        const currentPermission = Notification.permission;
        if (currentPermission === 'denied' || currentPermission === 'granted') {
            return;
        }

        // Only request if permission is 'default' (not yet asked)
        if (currentPermission === 'default' && !permissionRequested) {
            const timer = setTimeout(async () => {
                try {
                    const granted = await requestPermission();
                    setPermissionRequested(true);

                    if (granted) {
                        toast.success('Notifikasi push real-time aktif!', {
                            duration: 3000,
                            icon: '🔔',
                        });
                    }
                } catch (error) {
                    console.error('🔔 Error requesting notification permission:', error);
                }
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isSupported, permissionRequested, requestPermission]);

    // Listener: Laravel Echo channel
    useEffect(() => {
        if (!userId || !window.Echo) {
            return;
        }

        const channelName = `user.${userId}.notifications`;

        try {
            channelRef.current = window.Echo.channel(channelName);
            channelRef.current.listen('.browser.notification', (data: BrowserNotificationData) => {
                handleNotification(data);
            });
        } catch (e) {
            console.warn('🔔 Echo subscription skipped/failed:', e);
        }

        return () => {
            if (channelRef.current) {
                window.Echo?.leave(channelName);
                channelRef.current = null;
            }
        };
    }, [userId, handleNotification]);

    return null;
}

export default NotificationListener;