import type {
  NetworkAdapter,
  RoomDescriptor,
  ConnectionState,
  ClientMessage,
  ServerMessage,
  MessageListener,
} from './adapter.ts';

export class WebSocketAdapter implements NetworkAdapter {
  private socket?: WebSocket;
  private connectionState: ConnectionState = 'disconnected';
  private listeners: Set<MessageListener> = new Set();
  private serverUrl: string;
  private playerId: string;
  private room?: RoomDescriptor;

  constructor(serverUrl: string, playerId: string) {
    this.serverUrl = serverUrl;
    this.playerId = playerId;
  }

  public connect(room: RoomDescriptor): Promise<void> {
    this.room = room;
    this.connectionState = 'connecting';

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(`${this.serverUrl}?roomId=${room.roomId}&playerId=${this.playerId}`);

        this.socket.onopen = () => {
          this.connectionState = 'connected';
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.emit(message);
          } catch (err) {
            console.error('Failed to parse server message:', err);
          }
        };

        this.socket.onerror = (error) => {
          this.connectionState = 'error';
          reject(error);
        };

        this.socket.onclose = () => {
          this.connectionState = 'disconnected';
        };
      } catch (err) {
        this.connectionState = 'error';
        reject(err);
      }
    });
  }

  public async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
    this.connectionState = 'disconnected';
  }

  public send(message: ClientMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message dropped:', message);
    }
  }

  public subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getPlayerId(): string {
    return this.playerId;
  }

  private emit(message: ServerMessage): void {
    this.listeners.forEach((listener) => listener(message));
  }
}
