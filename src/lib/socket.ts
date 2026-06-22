import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string): Socket {
    // If token changed, disconnect old socket and create a new one
    if (socket && currentToken !== token) {
        socket.disconnect();
        socket = null;
        currentToken = null;
    }

    if (!socket) {
        currentToken = token;
        socket = io(`${SOCKET_URL}/events`, {
            auth: { token },
            autoConnect: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket?.id);
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
        });

        socket.on('disconnect', (reason) => {
            console.warn('[Socket] Disconnected:', reason);
        });
    }

    return socket;
}

export function disconnectSocket(): void {
    socket?.disconnect();
    socket = null;
    currentToken = null;
}
