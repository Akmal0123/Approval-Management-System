import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface BrowserNotificationData {
    title: string;
    body: string;
    url: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
}

/**
 * Global component that listens for browser notification events via Laravel Echo
 * Should be mounted once in the app layout to handle all notification broadcasts
 */
export function NotificationListener() {
    const { auth } = usePage().props as { auth?: { user?: { id: number } } };
    const userId = auth?.user?.id;

    const { requestPermission, showNotification, isSupported, isPermitted } = useBrowserNotification();
    const [permissionRequested, setPermissionRequested] = useState(false);
    const channelRef = useRef<ReturnType<typeof window.Echo.channel> | null>(null);

    // Request notification permission on mount (only once per session)
    useEffect(() => {
        console.log('🔔 NotificationListener mounted', {
            isSupported: isSupported(),
            isPermitted: isPermitted(),
            permissionRequested,
            currentPermission: 'Notification' in window ? Notification.permission : 'unsupported',
        });

        if (!isSupported()) {
            console.warn('🔔 Browser notifications not supported');
            return;
        }

        // Check current permission state
        const currentPermission = Notification.permission;
        console.log('🔔 Current notification permission:', currentPermission);

        if (currentPermission === 'denied') {
            console.warn('🔔 Notification permission was previously denied. User must manually enable from browser settings.');
            return;
        }

        if (currentPermission === 'granted') {
            console.log('🔔 Notification permission already granted');
            return;
        }

        // Only request if permission is 'default' (not yet asked)
        if (currentPermission === 'default' && !permissionRequested) {
            // Delay permission request to avoid blocking page load
            const timer = setTimeout(async () => {
                console.log('🔔 Requesting notification permission...');
                try {
                    const granted = await requestPermission();
                    setPermissionRequested(true);
                    console.log('🔔 Permission request result:', granted);

                    if (granted) {
                        toast.success('Notifikasi browser diaktifkan!', {
                            duration: 3000,
                            icon: '🔔',
                        });
                    } else {
                        console.warn('🔔 User did not grant notification permission');
                    }
                } catch (error) {
                    console.error('🔔 Error requesting notification permission:', error);
                }
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isSupported, isPermitted, permissionRequested, requestPermission]);

    // Subscribe to user-specific notification channel
    useEffect(() => {
        if (!userId) {
            console.log('🔔 No userId provided, skipping notification subscription');
            return;
        }

        if (!window.Echo) {
            console.warn('🔔 Laravel Echo not initialized');
            return;
        }

        const channelName = `user.${userId}.notifications`;
        console.log('🔔 Subscribing to notification channel:', channelName);

        // Subscribe to the channel
        channelRef.current = window.Echo.channel(channelName);

        // Listen for browser notification events
        channelRef.current.listen('.browser.notification', (data: BrowserNotificationData) => {
            console.log('🔔 Received browser notification:', data);

            // Show toast notification (always shown, regardless of browser notification permission)
            const toastOptions = {
                duration: 5000,
                style: {
                    maxWidth: '400px',
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
                    toast(data.body, { ...toastOptions, icon: '📄' });
            }

            // Show browser notification (if permission granted)
            if (isPermitted()) {
                showNotification(
                    data.title,
                    {
                        body: data.body,
                        tag: `notification-${data.timestamp}`,
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
        });

        // Cleanup subscription on unmount
        return () => {
            if (channelRef.current) {
                console.log('🔔 Leaving notification channel:', channelName);
                window.Echo.leave(channelName);
                channelRef.current = null;
            }
        };
    }, [userId, isPermitted, showNotification]);

    // This component doesn't render anything visible
    return null;
}

export default NotificationListener;
