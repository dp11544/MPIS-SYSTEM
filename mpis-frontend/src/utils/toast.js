const listeners = new Set();
const MAX_TOASTS = 5;

const emit = (event, data) => {
    listeners.forEach((listener) => {
        try {
            listener(event, data);
        } catch (err) {
            console.error("Toast listener error:", err);
        }
    });
};

const createToast = (type, message) => {
    const id = crypto.randomUUID();

    emit("add", { id, message, type });

    setTimeout(() => {
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

    remove: (id) => emit("remove", { id }),
};

export default toast;