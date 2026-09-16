import { notificationService } from '../services/notification.service.js';

/**
 * Fastify Routes for Real-Time Push Notification
 * Handles WebSocket subscriptions and HTTP push endpoints
 */
export default async function notificationRoutes(fastify, options) {
  /**
   * WebSocket Endpoint: /ws/notifications
   * Clients connect with query param ?userId=123
   */
  fastify.get('/ws/notifications', { websocket: true }, (connection, req) => {
    // In @fastify/websocket v8: connection.socket is the ws instance
    const socket = connection.socket || connection;
    const userId = req.query.userId || req.query.user_id;

    if (!userId) {
      console.warn('[WS] Connection attempted without userId parameter');
      socket.send(
        JSON.stringify({
          type: 'error',
          message: 'userId query parameter is required (e.g. /ws/notifications?userId=1)',
        })
      );
      socket.close(1008, 'userId query parameter is required');
      return;
    }

    // Register user socket
    notificationService.registerClient(userId, socket);

    // Handle incoming client messages (e.g. ping, custom events)
    socket.on('message', (rawData) => {
      try {
        const text = rawData.toString();
        const data = JSON.parse(text);

        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (err) {
        // Ignored or plain text heartbeat
      }
    });
  });

  /**
   * POST /api/notifications/push
   * Push a notification to a specific user (called by Laravel or external service)
   */
  fastify.post('/api/notifications/push', async (request, reply) => {
    const { userId, user_id, title, body, url, type, data } = request.body || {};
    const targetUserId = userId || user_id;

    if (!targetUserId) {
      return reply.status(400).send({
        success: false,
        message: 'Field "userId" atau "user_id" wajib diisi',
      });
    }

    if (!title) {
      return reply.status(400).send({
        success: false,
        message: 'Field "title" wajib diisi',
      });
    }

    const result = notificationService.sendToUser(targetUserId, {
      title,
      body,
      url,
      type,
      data,
    });

    return reply.status(200).send(result);
  });

  /**
   * POST /api/notifications/broadcast
   * Broadcast a notification to all currently active WebSocket clients
   */
  fastify.post('/api/notifications/broadcast', async (request, reply) => {
    const { title, body, url, type, data } = request.body || {};

    if (!title) {
      return reply.status(400).send({
        success: false,
        message: 'Field "title" wajib diisi',
      });
    }

    const result = notificationService.broadcast({
      title,
      body,
      url,
      type,
      data,
    });

    return reply.status(200).send(result);
  });

  /**
   * GET /api/notifications/stats
   * Monitor active WebSocket connections and notification counters
   */
  fastify.get('/api/notifications/stats', async (request, reply) => {
    return reply.send(notificationService.getStats());
  });

  /**
   * GET /api/notifications/history/:userId
   * Retrieve in-memory notification history for a specific user
   */
  fastify.get('/api/notifications/history/:userId', async (request, reply) => {
    const { userId } = request.params;
    const history = notificationService.getUserHistory(userId);

    return reply.send({
      success: true,
      userId,
      count: history.length,
      history,
    });
  });
}
