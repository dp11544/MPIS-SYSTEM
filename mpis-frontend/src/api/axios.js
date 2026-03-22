import axios from 'axios';
import toast from '../utils/toast';

const BASE_URL = "https://mpis-backend.onrender.com/api";

let _isRedirecting = false;

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000,
});

export const silentApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000,
});

// 🔐 SAFE TOKEN ATTACH
const attachToken = (config) => {
    const token = localStorage.getItem('token');

    if (!config.headers) {
        config.headers = {};
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
};

api.interceptors.request.use(attachToken);
silentApi.interceptors.request.use(attachToken);

// 🔥 Common error handler
const handleCommonErrors = (status, message) => {
    switch (status) {
        case 400:
            toast.error(message);
            break;
        case 403:
            toast.error("Access denied");
            break;
        case 408:
            toast.error("Request timeout");
            break;
        case 429:
            toast.warn("Too many requests");
            break;
        case 500:
            toast.error("Server error");
            break;
        default:
            toast.error(message || "Something went wrong");
    }
};

// 🔥 Response interceptor (FIXED)
api.interceptors.response.use(
    (response) => {
        const data = response.data;

        // 🔥 HANDLE BUSINESS STATUS (VERY IMPORTANT)
        if (data?.status === "INVALID") {
            toast.error("Invalid ID or Password");
            return Promise.reject(response);
        }

        if (data?.status === "LOCKED") {
            toast.error("Account locked");
            return Promise.reject(response);
        }

        if (data?.status === "ERROR") {
            toast.error("Server error");
            return Promise.reject(response);
        }

        return response;
    },

    async (error) => {
        if (!error.response) {
            toast.error("Network error / server sleeping");
            return Promise.reject(error);
        }

        const { status, data } = error.response;
        const message = data?.message || "Error";

        // 🔥 FIX: DON'T REDIRECT for auth endpoints
        const url = error.config?.url || "";

        if (status === 401 && !url.includes("/auth")) {

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

silentApi.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export default api;