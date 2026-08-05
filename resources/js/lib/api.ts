import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get CSRF token from meta tag or cookie
function getCsrfToken(): string | null {
    // Try to get from meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    
    // Try to get from cookie (XSRF-TOKEN)
    const matches = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (matches) {
        return decodeURIComponent(matches[1]);
    }
    
    return null;
}

// Get session token from cookie
function getSessionToken(): string | null {
    const matches = document.cookie.match(/laravel_session=([^;]+)/);
    if (matches) {
        return matches[1];
    }
    return null;
}

// Initialize CSRF protection
let csrfInitialized = false;
async function initializeCSRF(): Promise<void> {
    try {
        // Get CSRF cookie from Laravel (always refresh to ensure valid token)
        await axios.get('/sanctum/csrf-cookie', {
            withCredentials: true
        });
        csrfInitialized = true;
    } catch (error) {
        console.warn('Failed to initialize CSRF protection:', error);
    }
}

// Force refresh CSRF token (used after 419 error)
async function refreshCSRF(): Promise<void> {
    csrfInitialized = false;
    await initializeCSRF();
}

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add CSRF token and auth token to requests
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    // Ensure CSRF cookie is set first (on first request)
    if (!csrfInitialized) {
        await initializeCSRF();
    }
    
    // Get CSRF token from XSRF-TOKEN cookie (preferred by Laravel Sanctum)
    const xsrfMatches = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (xsrfMatches) {
        const xsrfToken = decodeURIComponent(xsrfMatches[1]);
        config.headers['X-XSRF-TOKEN'] = xsrfToken;
    } else {
        // Fallback to X-CSRF-TOKEN from meta tag
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            config.headers['X-CSRF-TOKEN'] = csrfToken;
        }
    }
    
    // Add Socket ID for broadcasting exclusion (toOthers)
    if (typeof window !== 'undefined' && window.Echo) {
        const socketId = window.Echo.socketId();
        if (socketId) {
            config.headers['X-Socket-ID'] = socketId;
        }
    }
    
    // Also support Bearer token for API token auth (backward compatibility)
    const token = localStorage.getItem('auth-token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
});

// Handle authentication errors with retry for 419
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // Handle 419 CSRF token mismatch - try refreshing token once
        if (error.response?.status === 419 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                // Refresh CSRF token
                await refreshCSRF();
                
                // Update the request with new token
                const xsrfMatches = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
                if (xsrfMatches) {
                    originalRequest.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatches[1]);
                }
                
                // Retry the original request
                return api(originalRequest);
            } catch (retryError) {
                // If retry fails, redirect to login
                window.location.href = '/login';
                return Promise.reject(retryError);
            }
        }
        
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            localStorage.removeItem('auth-token');
            window.location.href = '/login';
        }
        
        return Promise.reject(error);
    }
);

export default api;