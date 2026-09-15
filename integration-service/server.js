import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import integrationRoutes from './routes/integration.routes.js';

const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Register Integration Routes
await fastify.register(integrationRoutes);

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
    console.log(`🚀 Fastify Integration Service berjalan di http://localhost:${config.port}`);
    console.log(`📡 Terhubung ke External Inventory System: ${config.externalApiUrl}`);
    console.log(`🔐 Autentikasi JWT: Menggunakan kredensial '${config.auth.username}'`);
    console.log(`======================================================\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
