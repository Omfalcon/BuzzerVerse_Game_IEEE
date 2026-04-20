// src/shared/socket.js
const WS_URL = "ws://localhost:8000/ws";

class SocketManager {
    constructor() {
        this.socket = null;
        this.listeners = new Set();
        this.reconnectAttempts = 0;
        this.role = 'user';
        this.name = '';
    }

    connect(role = 'user', name = '') {
        this.role = role;
        this.name = name;
        const url = `${WS_URL}?role=${role}`;
        
        if (this.socket) {
            this.socket.close();
        }

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log(`[WS] Connected as ${role}`);
            this.reconnectAttempts = 0;
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.listeners.forEach(listener => listener(data));
        };

        this.socket.onclose = () => {
            console.log("[WS] Disconnected. Reconnecting...");
            if (this.reconnectAttempts < 5) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect(this.role, this.name);
                }, 2000);
            }
        };
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    buzz(name) {
        this.send({ type: 'buzz', name });
    }
}

export const socketManager = new SocketManager();
