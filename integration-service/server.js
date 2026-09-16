import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import integrationRoutes from './routes/integration.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Register WebSocket Plugin
await fastify.register(websocket, {
  options: {
    maxPayload: 1048576, // 1MB
  },
});

// Register Routes
await fastify.register(integrationRoutes);
await fastify.register(notificationRoutes);

// Global Error Handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(error.statusCode || 500).send({
    success: false,
    message: error.message || 'Internal Server Error',
  });
});

// Start Server
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`\n======================================================`);
    console.log(`🚀 Fastify Backend Service berjalan di http://localhost:${config.port}`);
    console.log(`⚡ Real-Time WebSocket Push Notification: ws://localhost:${config.port}/ws/notifications?userId=<id>`);
    console.log(`📡 External Inventory System URL: ${config.externalApiUrl}`);
    console.log(`🔐 Autentikasi JWT: Menggunakan kredensial '${config.auth.username}'`);
    console.log(`======================================================\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
