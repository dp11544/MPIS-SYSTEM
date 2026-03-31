import axios from 'axios';
import toast from '../utils/toast';

const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

if (!BASE_URL) {
    throw new Error("VITE_API_URL is not defined.");
}

// ✅ FIXED: removed global Content-Type
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 60000,
});

// ✅ FIXED: removed global Content-Type
export const silentApi = axios.create({
    baseURL: BASE_URL,
    timeout: 60000,
});

let _isRedirecting = false;

const attachToken = (config) => {
    const token = localStorage.getItem('token');

    if (!config.headers) config.headers = {};

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
};

api.interceptors.request.use(attachToken);
silentApi.interceptors.request.use(attachToken);

const handleCommonErrors = (status, message) => {
    switch (status) {
        case 400: toast.error(message || "Bad request"); break;
        case 403: toast.error("Access denied"); break;
        case 408: toast.error("Request timeout"); break;
        case 429: toast.warn("Too many requests"); break;
        case 500: toast.error("Server error"); break;
        default: toast.error(message || "Something went wrong");
    }
};

api.interceptors.response.use(
    (response) => {
        const data = response.data;

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
            toast.error("Server not reachable (Render cold start)");
            return Promise.reject(error);
        }

        const { status, data } = error.response;
        const message = data?.message || "Error";
        const url = error.config?.url || "";

        if (status === 401 && !url.includes("/auth")) {

            if (_isRedirecting) return Promise.reject(error);
            _isRedirecting = true;

            toast.warn("Session expired");

            localStorage.removeItem('token');
            localStorage.removeItem('user');

            try {
                const { default: webSocketService } = await import('../services/WebSocketService');
                webSocketService?.disconnect?.();
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

export const buildImageUrl = (path) => {
    if (!path) return null;

    if (path.startsWith("http")) return path;

    return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export default api;