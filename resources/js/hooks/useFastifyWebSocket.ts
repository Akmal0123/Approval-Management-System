import { useEffect, useRef, useState, useCallback } from 'react';

export interface FastifyNotificationPayload {
    id?: string;
    event?: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    body: string;
    url?: string;
    data?: Record<string, any>;
    timestamp?: string;
}

interface UseFastifyWebSocketOptions {
    userId?: number | string | null;
    onNotification?: (notification: FastifyNotificationPayload) => void;
    url?: string;
    enabled?: boolean;
}

/**
 * Hook to manage real-time WebSocket connection to the Fastify Backend
 */
export function useFastifyWebSocket({
    userId,
    onNotification,
    url,
    enabled = true,
}: UseFastifyWebSocketOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const onNotificationRef = useRef(onNotification);
    onNotificationRef.current = onNotification;

    const wsBaseUrl =
        url ||
        (import.meta.env.VITE_FASTIFY_WS_URL as string) ||
        'ws://localhost:5000/ws/notifications';

    const connect = useCallback(() => {
        if (!enabled || !userId) {
            return;
        }

        // Close any existing socket
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        try {
            const fullUrl = `${wsBaseUrl}?userId=${encodeURIComponent(String(userId))}`;
            console.log(`⚡ [Fastify WS] Connecting to ${fullUrl}...`);

            const ws = new WebSocket(fullUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log(`⚡ [Fastify WS] Connected successfully for user '${userId}'`);
                setIsConnected(true);

                // Start heartbeat ping
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                }
                heartbeatIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Ignore heartbeat pong and connection ack
                    if (data.type === 'pong' || data.type === 'connection.ack') {
                        return;
                    }

                    // Received real-time push notification
                    if (data.event === 'browser.notification' || data.title) {
                        console.log('⚡ [Fastify WS] Received real-time push notification:', data);
                        if (onNotificationRef.current) {
                            onNotificationRef.current(data);
                        }
                    }
                } catch (err) {
                    console.warn('⚡ [Fastify WS] Could not parse message:', event.data);
                }
            };

            ws.onerror = (err) => {
                console.warn('⚡ [Fastify WS] Connection error:', err);
            };

            ws.onclose = (event) => {
                console.log(`⚡ [Fastify WS] Disconnected (code: ${event.code}). Retrying in 5s...`);
                setIsConnected(false);

                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }

                // Auto reconnect after 5 seconds if enabled and user is present
                if (enabled && userId) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, 5000);
                }
            };
        } catch (error) {
            console.error('⚡ [Fastify WS] Failed to establish connection:', error);
            setIsConnected(false);
        }
    }, [enabled, userId, wsBaseUrl]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
            setIsConnected(false);
        };
    }, [connect]);

    return {
        isConnected,
        reconnect: connect,
    };
}

export default useFastifyWebSocket;
