import axios from 'axios';
import { config } from '../config.js';

let cachedToken = null;
let tokenExpiresAt = null;

/**
 * Autentikasi ke External Inventory System dan simpan JWT token.
 */
export async function login() {
  try {
    const url = `${config.externalApiUrl}/auth/login`;
    const response = await axios.post(
      url,
      {
        username: config.auth.username,
        password: config.auth.password,
      },
      {
        timeout: config.timeout,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      }
    );

    if (response.data && response.data.token) {
      cachedToken = response.data.token;
      // Default expiry 55 minutes if not specified
      tokenExpiresAt = Date.now() + 55 * 60 * 1000;
      return cachedToken;
    }

    throw new Error('Respons autentikasi tidak memuat token');
  } catch (error) {
    cachedToken = null;
    tokenExpiresAt = null;
    const msg = error.response?.data?.message || error.message;
    throw new Error(`Gagal login ke External Inventory System: ${msg}`);
  }
}

/**
 * Dapatkan token JWT yang aktif (login jika belum ada atau sudah kadaluarsa).
 */
export async function getToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  return await login();
}

/**
 * Bersihkan token dari cache (misal jika mendapat respons 401).
 */
export function clearToken() {
  cachedToken = null;
  tokenExpiresAt = null;
}

/**
 * Header Authorization Bearer token.
 */
export async function getAuthHeader() {
  const token = await getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}
