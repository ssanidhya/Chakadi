import type {
  NetworkAdapter,
  RoomDescriptor,
  ConnectionState,
  ClientMessage,
  ServerMessage,
  MessageListener,
} from './adapter.ts';
import { validateClientMessage } from './schemas.ts';

export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export class WebRTCAdapter implements NetworkAdapter {
  private connectionState: ConnectionState = 'disconnected';
  private listeners: Set<MessageListener> = new Set();
  private playerId: string;
  private roomCode: string;
  private isHost: boolean;

  constructor(playerId: string, roomCode: string, isHost = false) {
    this.playerId = playerId;
    this.roomCode = roomCode;
    this.isHost = isHost;
  }

  public async connect(room: RoomDescriptor): Promise<void> {
    this.connectionState = 'connecting';
    this.connectionState = 'connected';
  }

  public async disconnect(): Promise<void> {
    this.connectionState = 'disconnected';
  }

  public send(message: ClientMessage): void {
    const validation = validateClientMessage(message);
    if (!validation.success) return;

    this.emit({
      type: 'ROOM_STATE',
      room: {
        roomId: this.roomCode,
        hostId: this.playerId,
        players: [],
        maxPlayers: 6,
      },
    });
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
