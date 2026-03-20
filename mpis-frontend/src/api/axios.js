import axios from 'axios';
import toast from '../utils/toast';

// 🔥 FIXED: Always use backend URL (no /api fallback)
const BASE_URL = "https://mpis-backend.onrender.com";

// Guard flag to prevent multiple redirects
let _isRedirecting = false;

// ✅ Main API
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// ✅ Silent API (for background requests)
export const silentApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// 🔐 Attach token
const attachToken = (config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
};

api.interceptors.request.use(attachToken, (error) => Promise.reject(error));
silentApi.interceptors.request.use(attachToken, (error) => Promise.reject(error));

// 🔥 Common error handler
const handleCommonErrors = (status, message) => {
    switch (status) {
        case 400:
            toast.error(`Error: ${message}`);
            break;
        case 403:
            toast.error("Access denied.");
            break;
        case 408:
            toast.error("Request timeout.");
            break;
        case 429:
            toast.warn("Too many requests.");
            break;
        case 500:
            toast.error("Server error.");
            break;
        default:
            toast.error(message || "Something went wrong.");
    }
};

// 🔥 Response interceptor (main API)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!error.response) {
            toast.error("Network error.");
            return Promise.reject(error);
        }

        const { status, data } = error.response;
        const message = data?.message || "Error occurred";

        if (status === 401) {
            if (_isRedirecting) return Promise.reject(error);
            _isRedirecting = true;

            toast.warn("Session expired");

            localStorage.removeItem('token');
            localStorage.removeItem('user');

            try {
                const { default: webSocketService } = await import('../services/WebSocketService');
                webSocketService.disconnect();
            } catch {}

            window.location.href = '/login';
        } else {
            handleCommonErrors(status, message);
        }

        return Promise.reject(error);
    }
);

// 🔕 Silent API (no logout)
silentApi.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export default api;