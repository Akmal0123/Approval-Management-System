import axios from 'axios';
import { config } from '../config.js';
import * as authService from './auth.service.js';
import { transformPurchaseOrder, transformPurchaseRequest } from './transformer.service.js';

/**
 * Buat HTTP request ke External Inventory System dengan otomatisasi JWT & retry jika 401.
 */
async function externalRequest(method, endpoint, data = null, options = {}) {
  const url = `${config.externalApiUrl}${endpoint}`;
  const authHeader = await authService.getAuthHeader();

  const reqConfig = {
    method,
    url,
    timeout: config.timeout,
    headers: {
      Accept: 'application/json',
      ...authHeader,
      ...(options.headers || {}),
    },
    ...options,
  };

  if (data) {
    reqConfig.data = data;
  }

  try {
    return await axios(reqConfig);
  } catch (error) {
    // Jika token kedaluwarsa / 401, coba login ulang sekali
    if (error.response?.status === 401) {
      console.log('🔄 Token 401 Unauthorized, memperbarui JWT token dari External Inventory System...');
      authService.clearToken();
      const freshAuthHeader = await authService.getAuthHeader();
      reqConfig.headers.Authorization = freshAuthHeader.Authorization;
      return await axios(reqConfig);
    }
    throw error;
  }
}

/**
 * Lookup Purchase Orders dari External System
 */
export async function lookupPurchaseOrders(query = '') {
  try {
    const res = await externalRequest('GET', `/purchase-orders/lookup?q=${encodeURIComponent(query)}`);
    return res.data?.data || [];
  } catch (error) {
    console.error('Error lookup PO:', error.message);
    return [];
  }
}

/**
 * Lookup Purchase Requests dari External System
 */
export async function lookupPurchaseRequests(query = '') {
  try {
    const res = await externalRequest('GET', `/purchase-requests/lookup?q=${encodeURIComponent(query)}`);
    return res.data?.data || [];
  } catch (error) {
    console.error('Error lookup PR:', error.message);
    return [];
  }
}

/**
 * Multi-lookup: gabungan PO dan PR dalam format terpadu
 */
export async function lookupAll(query = '') {
  const [pos, prs] = await Promise.all([
    lookupPurchaseOrders(query),
    lookupPurchaseRequests(query),
  ]);

  const unified = [];

  pos.forEach((po) => {
    unified.push({
      id: po.id,
      code: po.po_number,
      number: po.po_number,
      type: 'PO',
      title: `Purchase Order ${po.po_number}`,
      subtitle: po.vendor || 'Vendor',
      status: po.status,
      source: 'external-inventory-system',
    });
  });

  prs.forEach((pr) => {
    unified.push({
      id: pr.id,
      code: pr.pr_number,
      number: pr.pr_number,
      type: 'PR',
      title: `Purchase Request ${pr.pr_number}`,
      subtitle: `${pr.requester_name || 'Requester'} (${pr.department || 'Dept'})`,
      status: pr.status,
      source: 'external-inventory-system',
    });
  });

  return unified;
}

/**
 * Ambil detail Purchase Order (berdasarkan ID atau po_number)
 */
export async function getPurchaseOrder(idOrNumber) {
  // Coba ambil langsung berdasarkan ID atau nomor
  try {
    const res = await externalRequest('GET', `/purchase-orders/${encodeURIComponent(idOrNumber)}`);
    if (res.data?.data) {
      return transformPurchaseOrder(res.data.data);
    }
  } catch (err) {
    // Jika 404 dan input berupa string kode seperti "PO-2026-0001", cari via index q=
    if (err.response?.status === 404) {
      const searchRes = await externalRequest('GET', `/purchase-orders?q=${encodeURIComponent(idOrNumber)}`);
      const list = searchRes.data?.data || [];
      const match = list.find((p) => p.po_number?.toLowerCase() === String(idOrNumber).toLowerCase());
      if (match) {
        return transformPurchaseOrder(match);
      }
    }
    throw err;
  }
  throw new Error(`Purchase Order '${idOrNumber}' tidak ditemukan di external inventory system`);
}

/**
 * Ambil detail Purchase Request (berdasarkan ID atau pr_number)
 */
export async function getPurchaseRequest(idOrNumber) {
  try {
    const res = await externalRequest('GET', `/purchase-requests/${encodeURIComponent(idOrNumber)}`);
    if (res.data?.data) {
      return transformPurchaseRequest(res.data.data);
    }
  } catch (err) {
    if (err.response?.status === 404) {
      const searchRes = await externalRequest('GET', `/purchase-requests?q=${encodeURIComponent(idOrNumber)}`);
      const list = searchRes.data?.data || [];
      const match = list.find((p) => p.pr_number?.toLowerCase() === String(idOrNumber).toLowerCase());
      if (match) {
        return transformPurchaseRequest(match);
      }
    }
    throw err;
  }
  throw new Error(`Purchase Request '${idOrNumber}' tidak ditemukan di external inventory system`);
}

/**
 * Lookup dokumen tunggal berdasarkan keyword umum (bisa nomor PO, PR, atau ID)
 */
export async function getDocumentByKeyword(keyword) {
  const clean = String(keyword).trim();
  const upper = clean.toUpperCase();

  // Deteksi jika diawali PR
  if (upper.startsWith('PR')) {
    try {
      return await getPurchaseRequest(clean);
    } catch (e) {
      // lanjut coba PO jika gagal
    }
  }

  // Deteksi jika diawali PO
  if (upper.startsWith('PO')) {
    try {
      return await getPurchaseOrder(clean);
    } catch (e) {
      // lanjut coba PR jika gagal
    }
  }

  // Coba PO dulu
  try {
    return await getPurchaseOrder(clean);
  } catch {
    // Coba PR
    return await getPurchaseRequest(clean);
  }
}

/**
 * Unduh file PDF asli dari Purchase Order di external system
 */
export async function getPurchaseOrderPdf(idOrNumber) {
  // Jika berupa nomor dokumen, dapatkan ID nya terlebih dahulu
  let targetId = idOrNumber;
  if (isNaN(Number(idOrNumber))) {
    const doc = await getPurchaseOrder(idOrNumber);
    targetId = doc.raw_id;
  }

  const res = await externalRequest('GET', `/purchase-orders/${encodeURIComponent(targetId)}/pdf`, null, {
    responseType: 'arraybuffer',
  });

  return {
    data: res.data,
    contentType: res.headers['content-type'] || 'application/pdf',
    filename: `Purchase_Order_${String(idOrNumber).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
  };
}
