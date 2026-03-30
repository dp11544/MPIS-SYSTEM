import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = import.meta.env.VITE_WS_URL;

if (!WS_URL) {
    throw new Error("VITE_WS_URL is not defined");
}

class WebSocketService {
    constructor() {
        this.client = null;
        this.subscriptions = {};
        this.pendingSubscriptions = {};
        this._connected = false;
        this._connecting = false;

        // 🔥 for listeners
        this._listeners = new Map();
        this._listenerId = 0;
    }

    // =========================================================
    // 🔥 CONNECT
    // =========================================================
    connect() {
        if (this.client?.active || this._connecting) return;

        this._connecting = true;
        console.log('[WS] Connecting →', WS_URL);

        this.client = new Client({
            brokerURL: import.meta.env.VITE_WS_URL,

            reconnectDelay: 3000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,

            onConnect: () => {
                console.log('[WS] Connected ✓');
                this._connecting = false;
                this._connected = true;

                this._notifyListeners(true);

                Object.entries(this.pendingSubscriptions).forEach(([topic, cb]) => {
                    this._subscribeNow(topic, cb);
                });
            },

            onStompError: (frame) => {
                console.error('[WS] STOMP error:', frame.body);
            },

            onWebSocketClose: () => {
                console.warn('[WS] Disconnected');
                this._connected = false;
                this.subscriptions = {};
                this._notifyListeners(false);
            },

            onWebSocketError: () => {
                this._connected = false;
                this._notifyListeners(false);
            }
        });

        this.client.activate();
    }

    // =========================================================
    // 🔥 LISTENER SYSTEM (FIX FOR YOUR ERROR)
    // =========================================================
    setConnectionListener(callback) {
        if (!callback) return;

        const id = `listener_${++this._listenerId}`;
        this._listeners.set(id, callback);

        // send current state immediately
        try {
            callback(this._connected);
        } catch {}

        return () => this._listeners.delete(id);
    }

    _notifyListeners(state) {
        this._listeners.forEach(cb => {
            try { cb(state); } catch {}
        });
    }

    // =========================================================
    // 🔥 SUBSCRIBE
    // =========================================================
    _subscribeNow(topic, callback) {
        if (!this.client?.connected) return;

        if (this.subscriptions[topic]) return;

        console.log('[WS] Subscribing →', topic);

        const sub = this.client.subscribe(topic, (message) => {
            if (!message.body) return;

            try {
                callback(JSON.parse(message.body));
            } catch (e) {
                console.error('[WS] JSON parse error', e);
            }
        });

        this.subscriptions[topic] = sub;
    }

    subscribe(topic, callback) {
        this.pendingSubscriptions[topic] = callback;

        if (!this.client) {
            this.connect();
        }

        this._subscribeNow(topic, callback);
    }

    // =========================================================
    // 🔥 UNSUBSCRIBE
    // =========================================================
    unsubscribe(topic) {
        delete this.pendingSubscriptions[topic];

        if (this.subscriptions[topic]) {
            try {
                this.subscriptions[topic].unsubscribe();
            } catch {}
            delete this.subscriptions[topic];
        }
    }

    // =========================================================
    // 🔥 DISCONNECT
    // =========================================================
    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }

        this.subscriptions = {};
        this.pendingSubscriptions = {};
        this._connected = false;
        this._connecting = false;

        this._notifyListeners(false);
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;