import type { GameAction, GameState } from '../game/index.ts';
import type { Player, PlayerId } from '../game/index.ts';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RoomDescriptor {
  roomId: string;
  hostId: PlayerId;
  players: Player[];
  maxPlayers: number;
}

export type ClientMessage =
  | { type: 'JOIN_ROOM'; roomId: string; player: Player }
  | { type: 'LEAVE_ROOM'; roomId: string; playerId: PlayerId }
  | { type: 'DISPATCH_ACTION'; roomId: string; action: GameAction }
  | { type: 'PING'; timestamp: number };

export type ServerMessage =
  | { type: 'ROOM_STATE'; room: RoomDescriptor }
  | { type: 'SYNC_STATE'; state: GameState }
  | { type: 'ACTION_REJECTED'; error: string; action: GameAction }
  | { type: 'PLAYER_CONNECTION_CHANGED'; playerId: PlayerId; connected: boolean }
  | { type: 'PONG'; timestamp: number };

export type MessageListener = (message: ServerMessage) => void;

export interface NetworkAdapter {
  connect(room: RoomDescriptor): Promise<void>;
  disconnect(): Promise<void>;
  send(message: ClientMessage): void;
  subscribe(listener: MessageListener): () => void;
  getConnectionState(): ConnectionState;
  getPlayerId(): PlayerId;
}
