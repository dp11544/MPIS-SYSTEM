import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * MPIS WebSocket Service — Robust Auto-Reconnect Edition
 *
 * Key fixes:
 * - webSocketFactory returns a NEW SockJS() every time so reconnects work
 * - Let @stomp/stompjs handle reconnect scheduling (reconnectDelay)
 * - No manual connection timeout that could permanently kill the client
 * - Subscriptions are re-established on every onConnect
 */

const getWebSocketUrl = () => {
    if (import.meta.env?.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
    if (import.meta.env?.DEV) return 'http://localhost:8080/ws-alerts';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.host}/ws-alerts`;
};

const WS_URL = getWebSocketUrl();

class WebSocketService {
    constructor() {
        this.client = null;
        this.subscriptions = {};       // Active subscription handles
        this.pendingSubscriptions = {}; // Persist across reconnects
        this._listeners = new Map();   // id → callback (supports multiple listeners)
        this._connected = false;
        this._connecting = false;
        this._listenerIdCounter = 0;
    }

    /** Notify all registered connection listeners */
    _notifyListeners(isConnected) {
        this._connected = isConnected;
        this._listeners.forEach(cb => {
            try { cb(isConnected); } catch (_) {}
        });
    }

    connect(onError) {
        // Prevent duplicate connections
        if (this.client && (this.client.active || this._connecting)) {
            console.log('[WS] Already connected or connecting, skipping');
            return;
        }

        this._connecting = true;
        console.log('[WS] Initialising STOMP client → ', WS_URL);

        this.client = new Client({
            // *** Critical fix: factory function creates a NEW SockJS each attempt ***
            webSocketFactory: () => new SockJS(WS_URL),

            // STOMP will retry on its own schedule
            reconnectDelay: 3000,   // 3 s between reconnect attempts
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,

            onConnect: (frame) => {
                this._connecting = false;
                console.log('[WS] Connected ✓', frame.headers.server || '');

                // Re-establish all subscriptions after each (re)connect
                Object.entries(this.pendingSubscriptions).forEach(([topic, cb]) => {
                    this._executeSubscription(topic, cb);
                });

                this._notifyListeners(true);
            },

            onStompError: (frame) => {
                console.error('[WS] STOMP error:', frame.headers?.message, frame.body);
            },

            onWebSocketClose: (event) => {
                console.warn('[WS] Socket closed — code:', event?.code, 'reason:', event?.reason || 'none');

                // Wipe active subscription handles (they're invalidated on close)
                this.subscriptions = {};

                this._notifyListeners(false);
                // @stomp/stompjs will call webSocketFactory() again after reconnectDelay
            },

            onWebSocketError: (error) => {
                console.error('[WS] WebSocket error:', error?.message || error);
                this._notifyListeners(false);
            },

            onDisconnect: () => {
                console.log('[WS] Gracefully disconnected');
                this.subscriptions = {};
                this._notifyListeners(false);
            },
        });

        this.client.activate();
    }

    /**
     * Register a connection-state listener.
     * Returns an unsubscribe function — call it in useEffect cleanup.
     * @param {function} callback  called with true/false
     * @param {string}   [id]      optional stable identifier (e.g. 'header', 'dashboard')
     */
    setConnectionListener(callback, id) {
        if (callback === null || callback === undefined) {
            // Legacy API: remove by id if provided, else clear all (DON'T DO THIS)
            if (id) this._listeners.delete(id);
            return;
        }
        const listenerId = id || `listener_${++this._listenerIdCounter}`;
        this._listeners.set(listenerId, callback);
        // Immediately report current state
        try { callback(this._connected); } catch (_) {}
        // Return unsubscribe function
        return () => this._listeners.delete(listenerId);
    }

    /** Internal: actually subscribe once connected. */
    _executeSubscription(topic, callback) {
        if (!this.client?.connected) return null;
        if (this.subscriptions[topic]) return this.subscriptions[topic]; // Already live

        console.log('[WS] Subscribing →', topic);
        const sub = this.client.subscribe(topic, (message) => {
            if (!message.body) return;
            try {
                callback(JSON.parse(message.body));
            } catch (e) {
                console.error('[WS] JSON parse error for topic', topic, e);
            }
        });

        this.subscriptions[topic] = sub;
        return sub;
    }

    /** Subscribe to a STOMP topic. Works before or after connection. */
    subscribe(topic, callback) {
        this.pendingSubscriptions[topic] = callback; // Persists across reconnects
        return this._executeSubscription(topic, callback);
    }

    /** Unsubscribe from a topic. */
    unsubscribe(topic) {
        delete this.pendingSubscriptions[topic];
        if (this.subscriptions[topic]) {
            try { this.subscriptions[topic].unsubscribe(); } catch (_) {}
            delete this.subscriptions[topic];
        }
    }

    /** Permanently disconnect (e.g. logout). */
    disconnect() {
        Object.keys(this.pendingSubscriptions).forEach(t => this.unsubscribe(t));
        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }
        this._connecting = false;
        console.log('[WS] Disconnected from MPIS WebSocket');
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;
