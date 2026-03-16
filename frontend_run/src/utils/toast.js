const listeners = [];

const emit = (event, data) => {
    listeners.forEach((listener) => listener(event, data));
};

export const toast = {
    subscribe: (listener) => {
        listeners.push(listener);
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    },
    success: (message) => emit('add', { message, type: 'success' }),
    error: (message) => emit('add', { message, type: 'error' }),
    warn: (message) => emit('add', { message, type: 'warning' }),
    info: (message) => emit('add', { message, type: 'info' }),
};

export default toast;
