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
        this.pendingSubscriptions = {}; // e.g., { '/topic/alerts': { 'header': cb, 'dashboard': cb } }
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

                Object.keys(this.pendingSubscriptions).forEach((topic) => {
                    this._subscribeNow(topic);
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
    // 🔥 LISTENER SYSTEM
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
    _subscribeNow(topic) {
        if (!this.client?.connected) return;

        if (this.subscriptions[topic]) return;

        console.log('[WS] Subscribing →', topic);

        const sub = this.client.subscribe(topic, (message) => {
            if (!message.body) return;

            try {
                const parsedBody = JSON.parse(message.body);
                // Dispatch to all registered listeners for this topic
                if (this.pendingSubscriptions[topic]) {
                    Object.values(this.pendingSubscriptions[topic]).forEach((cb) => {
                        try {
                            cb(parsedBody);
                        } catch (err) {
                            console.error('[WS] Component callback error', err);
                        }
                    });
                }
            } catch (e) {
                console.error('[WS] JSON parse error', e);
            }
        });

        this.subscriptions[topic] = sub;
    }

    subscribe(topic, id, callback) {
        if (!this.pendingSubscriptions[topic]) {
            this.pendingSubscriptions[topic] = {};
        }
        
        // Guarantee this component gets its callback stored securely
        this.pendingSubscriptions[topic][id] = callback;

        if (!this.client) {
            this.connect();
        }

        this._subscribeNow(topic);
    }

    // =========================================================
    // 🔥 UNSUBSCRIBE
    // =========================================================
    unsubscribe(topic, id) {
        if (this.pendingSubscriptions[topic]) {
            delete this.pendingSubscriptions[topic][id];
            
            // If no more components are listening to this topic, sever the STOMP connection
            if (Object.keys(this.pendingSubscriptions[topic]).length === 0) {
                delete this.pendingSubscriptions[topic];
                
                if (this.subscriptions[topic]) {
                    try {
                        this.subscriptions[topic].unsubscribe();
                    } catch {}
                    delete this.subscriptions[topic];
                }
            }
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