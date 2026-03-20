import axios from 'axios';
import toast from '../utils/toast';

/**
 * MPIS API Client - Production Grade
 * 
 * Features:
 * - Environment-aware base URL
 * - Proper token handling (standard Authorization header only)
 * - Comprehensive error handling
 * - WebSocket disconnect on 401
 * - Smart 401 handling: only logs out on primary requests, not background sub-requests
 */

// Use environment variable or default to proxy
const getBaseUrl = () => {
    if (import.meta.env?.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Vite proxy handles /api in development
    return '/api';
};

// Guard flag to prevent multiple simultaneous logout redirects
let _isRedirecting = false;

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout
});

/**
 * silentApi — use this for background/non-critical requests (e.g. photo fetches).
 * A 401 response will NOT trigger a logout redirect; the error is simply rejected.
 */
export const silentApi = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Shared request interceptor factory
const attachToken = (config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
};

// Request interceptor - add auth token (main api)
api.interceptors.request.use(attachToken, (error) => Promise.reject(error));

// Request interceptor - add auth token (silentApi)
silentApi.interceptors.request.use(attachToken, (error) => Promise.reject(error));

// Shared error handler for non-401 status codes
const handleCommonErrors = (status, message) => {
    switch (status) {
        case 400:
            toast.error(`Error: ${message}`);
            break;
        case 403:
            toast.error("Access denied. You do not have permission.");
            break;
        case 404:
            // 404s are usually handled inline — don't spam toasts
            break;
        case 408:
            toast.error("Request timed out. Please try again.");
            break;
        case 429:
            toast.warn("Too many requests. Please wait a moment.");
            break;
        case 500:
            toast.error("Server error. Please try again later.");
            break;
        case 502:
        case 503:
        case 504:
            toast.error("Service temporarily unavailable. Please try again.");
            break;
        default:
            toast.error(`Error: ${message}`);
    }
};

// Response interceptor for main api — handles 401 with logout redirect
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!error.response) {
            // Network error or timeout
            toast.error("Network error. Please check your connection.");
            return Promise.reject(error);
        }
        
        const { status, data } = error.response;
        const message = data?.message || "An unexpected error occurred.";

        if (status === 401) {
            // Prevent multiple simultaneous logout redirects
            if (_isRedirecting) {
                return Promise.reject(error);
            }
            _isRedirecting = true;

            toast.warn("Session expired. Please login again.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Disconnect WebSocket before redirect
            try {
                const { default: webSocketService } = await import('../services/WebSocketService');
                webSocketService.disconnect();
            } catch (e) {
                console.warn('Could not disconnect WebSocket:', e);
            }
            
            // Redirect to login
            window.location.href = '/login';
        } else {
            handleCommonErrors(status, message);
        }
        
        return Promise.reject(error);
    }
);

// Response interceptor for silentApi — NEVER triggers logout on 401
silentApi.interceptors.response.use(
    (response) => response,
    (error) => {
        // Silently reject — caller handles error locally
        return Promise.reject(error);
    }
);

export default api;
