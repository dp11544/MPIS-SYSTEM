const listeners = new Set();
const MAX_TOASTS = 5;

// Track active toast IDs
let activeToasts = new Map(); // 🔥 better than array

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
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random()}`;
};

const createToast = (type, message) => {
    const id = generateId();

    // 🔥 LIMIT TOASTS
    if (activeToasts.size >= MAX_TOASTS) {
        const oldestId = activeToasts.keys().next().value;
        clearTimeout(activeToasts.get(oldestId)); // 🔥 prevent double remove
        activeToasts.delete(oldestId);
        emit("remove", { id: oldestId });
    }

    emit("add", { id, message, type });

    const timeoutId = setTimeout(() => {
        if (!activeToasts.has(id)) return; // 🔥 prevent double remove

        activeToasts.delete(id);
        emit("remove", { id });
    }, 4000);

    activeToasts.set(id, timeoutId);
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
        const timeoutId = activeToasts.get(id);

        if (timeoutId) {
            clearTimeout(timeoutId); // 🔥 stop auto remove
            activeToasts.delete(id);
        }

        emit("remove", { id });
    },
};

export default toast;