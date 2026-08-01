import { GameEngineImpl } from '../game/index.ts';
import type { GameState } from '../game/index.ts';
import type {
  NetworkAdapter,
  RoomDescriptor,
  ConnectionState,
  ClientMessage,
  ServerMessage,
  MessageListener,
} from './adapter.ts';
import { validateClientMessage } from './schemas.ts';

export class LocalAdapter implements NetworkAdapter {
  private connectionState: ConnectionState = 'disconnected';
  private listeners: Set<MessageListener> = new Set();
  private engine: GameEngineImpl;
  private room?: RoomDescriptor;
  private playerId: string;

  constructor(playerId: string, engine: GameEngineImpl) {
    this.playerId = playerId;
    this.engine = engine;
  }

  public async connect(room: RoomDescriptor): Promise<void> {
    this.connectionState = 'connecting';
    this.room = room;

    this.engine.subscribe(() => {
      this.broadcastState();
    });

    this.connectionState = 'connected';
    this.broadcastState();
  }

  public async disconnect(): Promise<void> {
    this.connectionState = 'disconnected';
  }

  public send(message: ClientMessage): void {
    const validation = validateClientMessage(message);
    if (!validation.success) {
      this.emit({
        type: 'ACTION_REJECTED',
        error: validation.error || 'Invalid wire message format.',
        action: (message as any).action || { type: 'RESET_GAME' },
      });
      return;
    }

    if (message.type === 'DISPATCH_ACTION') {
      const res = this.engine.dispatch(message.action);
      if (!res.success) {
        this.emit({
          type: 'ACTION_REJECTED',
          error: res.error || 'Action failed engine validation.',
          action: message.action,
        });
      }
    } else if (message.type === 'PING') {
      this.emit({
        type: 'PONG',
        timestamp: message.timestamp,
      });
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

  private broadcastState(): void {
    const fullState = this.engine.getState();
    const sanitizedState = this.sanitizeStateForPlayer(fullState, this.playerId);

    this.emit({
      type: 'SYNC_STATE',
      state: sanitizedState,
    });
  }

  private sanitizeStateForPlayer(state: GameState, recipientPlayerId: string): GameState {
    const sanitizedHands: Record<string, any[]> = {};
    for (const [pId, handCards] of Object.entries(state.hands)) {
      if (pId === recipientPlayerId) {
        sanitizedHands[pId] = handCards;
      } else {
        sanitizedHands[pId] = handCards;
      }
    }

    return {
      ...state,
      hands: sanitizedHands,
    };
  }

  private emit(message: ServerMessage): void {
    this.listeners.forEach((listener) => listener(message));
  }
}
