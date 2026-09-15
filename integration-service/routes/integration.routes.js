import * as inventoryService from '../services/inventory.service.js';

export default async function integrationRoutes(fastify, options) {
  // Health check
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      service: 'Fastify Integration Service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  });

  // Unified lookup endpoint (untuk autocomplete pencarian di AMS)
  // GET /api/integration/lookup?q=PO-2026
  fastify.get('/api/integration/lookup', async (request, reply) => {
    const q = request.query.q || '';
    try {
      const results = await inventoryService.lookupAll(q);
      return {
        success: true,
        count: results.length,
        data: results,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        message: `Gagal melakukan lookup: ${error.message}`,
      });
    }
  });

  // Ambil dokumen transaksi tunggal (berdasarkan no dokumen / PO / PR / ID)
  // GET /api/integration/document/:keyword
  fastify.get('/api/integration/document/:keyword', async (request, reply) => {
    const { keyword } = request.params;
    try {
      const transformed = await inventoryService.getDocumentByKeyword(keyword);
      return {
        success: true,
        message: 'Dokumen berhasil diambil dan ditransformasikan untuk AMS',
        data: transformed,
      };
    } catch (error) {
      const statusCode = error.response?.status === 404 || error.message.includes('tidak ditemukan') ? 404 : 500;
      return reply.code(statusCode).send({
        success: false,
        message: error.message || 'Dokumen tidak ditemukan di external inventory system',
      });
    }
  });

  // Lookup khusus Purchase Orders
  // GET /api/integration/purchase-orders/lookup?q=...
  fastify.get('/api/integration/purchase-orders/lookup', async (request, reply) => {
    const q = request.query.q || '';
    try {
      const data = await inventoryService.lookupPurchaseOrders(q);
      return { success: true, data };
    } catch (error) {
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  // Ambil detail Purchase Order yang sudah ditransformasikan untuk AMS
  // GET /api/integration/purchase-orders/:id
  fastify.get('/api/integration/purchase-orders/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const transformed = await inventoryService.getPurchaseOrder(id);
      return {
        success: true,
        data: transformed,
      };
    } catch (error) {
      const statusCode = error.response?.status === 404 ? 404 : 500;
      return reply.code(statusCode).send({
        success: false,
        message: error.message,
      });
    }
  });

  // Ambil file PDF dari Purchase Order (Section 6 & 10 fastify.md)
  // GET /api/integration/purchase-orders/:id/pdf
  fastify.get('/api/integration/purchase-orders/:id/pdf', async (request, reply) => {
    const { id } = request.params;
    try {
      const { data, contentType, filename } = await inventoryService.getPurchaseOrderPdf(id);
      reply.header('Content-Type', contentType);
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      return reply.send(Buffer.from(data));
    } catch (error) {
      const statusCode = error.response?.status === 404 ? 404 : 500;
      return reply.code(statusCode).send({
        success: false,
        message: `Gagal mengambil PDF PO: ${error.message}`,
      });
    }
  });

  // Lookup khusus Purchase Requests
  // GET /api/integration/purchase-requests/lookup?q=...
  fastify.get('/api/integration/purchase-requests/lookup', async (request, reply) => {
    const q = request.query.q || '';
    try {
      const data = await inventoryService.lookupPurchaseRequests(q);
      return { success: true, data };
    } catch (error) {
      return reply.code(500).send({ success: false, message: error.message });
    }
  });

  // Ambil detail Purchase Request yang sudah ditransformasikan untuk AMS
  // GET /api/integration/purchase-requests/:id
  fastify.get('/api/integration/purchase-requests/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      const transformed = await inventoryService.getPurchaseRequest(id);
      return {
        success: true,
        data: transformed,
      };
    } catch (error) {
      const statusCode = error.response?.status === 404 ? 404 : 500;
      return reply.code(statusCode).send({
        success: false,
        message: error.message,
      });
    }
  });
}
