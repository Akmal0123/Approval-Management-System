import { randomUUID } from 'crypto';

class NotificationService {
  constructor() {
    /**
     * Map of userId -> Set of WebSocket connections
     * @type {Map<string, Set<any>>}
     */
    this.userSockets = new Map();

    /**
     * In-memory buffer of recent notifications per user
     * @type {Map<string, Array<object>>}
     */
    this.notificationHistory = new Map();

    /**
     * Global metrics and stats
     */
    this.stats = {
      totalPushed: 0,
      totalBroadcast: 0,
      startedAt: new Date().toISOString(),
    };

    this.MAX_HISTORY_PER_USER = 25;
  }

  /**
   * Register a new WebSocket connection for a given userId
   * @param {string|number} userId
   * @param {any} socket WebSocket client instance
   */
  registerClient(userId, socket) {
    const uid = String(userId);

    if (!this.userSockets.has(uid)) {
      this.userSockets.set(uid, new Set());
    }

    const clientSet = this.userSockets.get(uid);
    clientSet.add(socket);

    console.log(`[WS] Client connected for user '${uid}'. Total sockets for user: ${clientSet.size}`);

    // Send greeting / connection ack
    try {
      socket.send(
        JSON.stringify({
          type: 'connection.ack',
          userId: uid,
          message: 'Connected to Fastify Real-Time Push Notification Service',
          timestamp: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.error(`[WS] Failed to send connection ACK to user ${uid}:`, e.message);
    }

    // Cleanup on disconnect
    socket.on('close', () => {
      this.unregisterClient(uid, socket);
    });

    socket.on('error', (err) => {
      console.warn(`[WS] Socket error for user ${uid}:`, err.message);
      this.unregisterClient(uid, socket);
    });
  }

  /**
   * Remove socket from user's connection pool
   * @param {string} uid
   * @param {any} socket
   */
  unregisterClient(uid, socket) {
    if (this.userSockets.has(uid)) {
      const clientSet = this.userSockets.get(uid);
      clientSet.delete(socket);
      console.log(`[WS] Client disconnected for user '${uid}'. Remaining sockets: ${clientSet.size}`);
      if (clientSet.size === 0) {
        this.userSockets.delete(uid);
      }
    }
  }

  /**
   * Send a real-time push notification to a specific user
   * @param {string|number} userId
   * @param {object} payload
   * @returns {object} status result
   */
  sendToUser(userId, payload) {
    const uid = String(userId);
    const notification = {
      id: payload.id || randomUUID(),
      title: payload.title || 'Notifikasi Dokumen',
      body: payload.body || '',
      url: payload.url || '/dokumen',
      type: payload.type || 'info', // 'info' | 'success' | 'warning' | 'error'
      data: payload.data || {},
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    // Save to user history
    this._saveHistory(uid, notification);

    let deliveredSockets = 0;
    if (this.userSockets.has(uid)) {
      const sockets = this.userSockets.get(uid);
      const message = JSON.stringify({
        event: 'browser.notification',
        ...notification,
      });

      for (const socket of sockets) {
        if (socket.readyState === 1) { // WebSocket.OPEN
          try {
            socket.send(message);
            deliveredSockets++;
          } catch (err) {
            console.error(`[WS] Error pushing to socket for user ${uid}:`, err.message);
          }
        }
      }
    }

    this.stats.totalPushed++;

    console.log(
      `[PUSH] Sent notification to user '${uid}' ("${notification.title}"). Delivered to ${deliveredSockets} active socket(s).`
    );

    return {
      success: true,
      userId: uid,
      notificationId: notification.id,
      deliveredSockets,
      isOnline: deliveredSockets > 0,
      timestamp: notification.timestamp,
    };
  }

  /**
   * Broadcast a notification to all connected clients
   * @param {object} payload
   * @returns {object} status result
   */
  broadcast(payload) {
    const notification = {
      id: payload.id || randomUUID(),
      title: payload.title || 'Pengumuman Sistem',
      body: payload.body || '',
      url: payload.url || '/',
      type: payload.type || 'info',
      data: payload.data || {},
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    let deliveredSockets = 0;
    const message = JSON.stringify({
      event: 'browser.notification',
      ...notification,
    });

    for (const [uid, sockets] of this.userSockets.entries()) {
      for (const socket of sockets) {
        if (socket.readyState === 1) {
          try {
            socket.send(message);
            deliveredSockets++;
          } catch (err) {
            console.error(`[WS] Error broadcasting to user ${uid}:`, err.message);
          }
        }
      }
      this._saveHistory(uid, notification);
    }

    this.stats.totalBroadcast++;

    console.log(
      `[BROADCAST] Sent broadcast ("${notification.title}") to ${deliveredSockets} socket(s).`
    );

    return {
      success: true,
      deliveredSockets,
      timestamp: notification.timestamp,
    };
  }

  /**
   * Save notification to user's history buffer
   * @private
   */
  _saveHistory(uid, notification) {
    if (!this.notificationHistory.has(uid)) {
      this.notificationHistory.set(uid, []);
    }
    const history = this.notificationHistory.get(uid);
    history.unshift(notification);
    if (history.length > this.MAX_HISTORY_PER_USER) {
      history.pop();
    }
  }

  /**
   * Get notification history for a user
   * @param {string|number} userId
   * @returns {Array<object>}
   */
  getUserHistory(userId) {
    const uid = String(userId);
    return this.notificationHistory.get(uid) || [];
  }

  /**
   * Get server stats and active connection counts
   * @returns {object}
   */
  getStats() {
    let totalSockets = 0;
    for (const sockets of this.userSockets.values()) {
      totalSockets += sockets.size;
    }

    return {
      status: 'active',
      service: 'Fastify Real-Time Push Notification',
      activeUsersCount: this.userSockets.size,
      activeSocketsCount: totalSockets,
      connectedUserIds: Array.from(this.userSockets.keys()),
      totalPushed: this.stats.totalPushed,
      totalBroadcast: this.stats.totalBroadcast,
      startedAt: this.stats.startedAt,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
