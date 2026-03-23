import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * ✅ FIXED WebSocket URL (IMPORTANT)
 * Always point to backend (Render), NOT frontend (Vercel)
 */
const WS_URL = "https://mpis-backend.onrender.com/ws-alerts";

class WebSocketService {
    constructor() {
        this.client = null;
        this.subscriptions = {};
        this.pendingSubscriptions = {};
        this._listeners = new Map();
        this._connected = false;
        this._connecting = false;
        this._listenerIdCounter = 0;
    }

    _notifyListeners(isConnected) {
        this._connected = isConnected;
        this._listeners.forEach(cb => {
            try { cb(isConnected); } catch (_) {}
        });
    }

    connect() {
        if (this.client && (this.client.active || this._connecting)) {
            console.log('[WS] Already connected or connecting');
            return;
        }

        this._connecting = true;
        console.log('[WS] Connecting →', WS_URL);

        this.client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),

            reconnectDelay: 3000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,

            onConnect: (frame) => {
                this._connecting = false;
                console.log('[WS] Connected ✓');

                Object.entries(this.pendingSubscriptions).forEach(([topic, cb]) => {
                    this._executeSubscription(topic, cb);
                });

                this._notifyListeners(true);
            },

            onStompError: (frame) => {
                console.error('[WS] STOMP error:', frame.headers?.message, frame.body);
            },

            onWebSocketClose: (event) => {
                console.warn('[WS] Closed:', event?.code, event?.reason);
                this.subscriptions = {};
                this._notifyListeners(false);
            },

            onWebSocketError: (error) => {
                console.error('[WS] Error:', error);
                this._notifyListeners(false);
            },

            onDisconnect: () => {
                console.log('[WS] Disconnected');
                this.subscriptions = {};
                this._notifyListeners(false);
            },
        });

        this.client.activate();
    }

    setConnectionListener(callback, id) {
        if (!callback) {
            if (id) this._listeners.delete(id);
            return;
        }

        const listenerId = id || `listener_${++this._listenerIdCounter}`;
        this._listeners.set(listenerId, callback);

        try { callback(this._connected); } catch (_) {}

        return () => this._listeners.delete(listenerId);
    }

    _executeSubscription(topic, callback) {
        if (!this.client?.connected) return null;
        if (this.subscriptions[topic]) return this.subscriptions[topic];

        console.log('[WS] Subscribing →', topic);

        const sub = this.client.subscribe(topic, (message) => {
            if (!message.body) return;

            try {
                callback(JSON.parse(message.body));
            } catch (e) {
                console.error('[WS] JSON error:', e);
            }
        });

        this.subscriptions[topic] = sub;
        return sub;
    }

    subscribe(topic, callback) {
        this.pendingSubscriptions[topic] = callback;
        return this._executeSubscription(topic, callback);
    }

    unsubscribe(topic) {
        delete this.pendingSubscriptions[topic];

        if (this.subscriptions[topic]) {
            try { this.subscriptions[topic].unsubscribe(); } catch (_) {}
            delete this.subscriptions[topic];
        }
    }

    disconnect() {
        Object.keys(this.pendingSubscriptions).forEach(t => this.unsubscribe(t));

        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }

        this._connecting = false;
        console.log('[WS] Fully disconnected');
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;