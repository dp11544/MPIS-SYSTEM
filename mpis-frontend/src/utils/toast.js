const listeners = new Set();
const MAX_TOASTS = 5;

// Track active toast IDs
let activeToasts = [];

const emit = (event, data) => {
    try {
        listeners.forEach((listener) => {
            listener(event, data);
        });
    } catch (err) {
        console.error("Toast listener error:", err);
    }
};

const generateId = () => {
    // Safe ID generation
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now() + Math.random();
};

const createToast = (type, message) => {
    const id = generateId();

    // 🔥 LIMIT TOASTS (IMPORTANT)
    if (activeToasts.length >= MAX_TOASTS) {
        const oldest = activeToasts.shift();
        emit("remove", { id: oldest });
    }

    activeToasts.push(id);

    emit("add", { id, message, type });

    setTimeout(() => {
        activeToasts = activeToasts.filter((t) => t !== id);
        emit("remove", { id });
    }, 4000);
};

export const toast = {
    subscribe: (listener) => {
        if (typeof listener !== "function") {
            console.warn("Toast subscriber must be a function");
            return () => {};
        }

        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    },

    success: (message) => createToast("success", message),
    error: (message) => createToast("error", message),
    warn: (message) => createToast("warning", message),
    info: (message) => createToast("info", message),

    remove: (id) => {
        activeToasts = activeToasts.filter((t) => t !== id);
        emit("remove", { id });
    },
};

export default toast;