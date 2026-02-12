import { io, Socket } from 'socket.io-client';

export class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;

    private constructor() {}

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect(): Socket {
        if (!this.socket) {
            const url = import.meta.env.VITE_API_URL || (
                (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                    ? 'http://localhost:3000'
                    : `${window.location.protocol}//${window.location.hostname}:3000`
            );
            
            console.log('Connecting to Socket.io at:', url);
            this.socket = io(url, {
                transports: ['websocket'],
                autoConnect: true
            });

            this.socket.on('connect', () => {
                console.log('Connected to server:', this.socket?.id);
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
            });

            this.socket.on('connect_error', (err) => {
                console.error('Connection error:', err);
            });
        }
        return this.socket;
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
