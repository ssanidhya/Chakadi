import type { GameAction, GameState } from '../game/index.ts';
import type { Player, PlayerId, TeamId } from '../game/index.ts';

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
  | { type: 'SELECT_TEAM'; roomId: string; playerId: PlayerId; teamId: 'team_a' | 'team_b' }
  | { type: 'HOST_MOVE_PLAYER'; roomId: string; targetPlayerId: PlayerId; newTeamId: TeamId }
  | { type: 'DISPATCH_ACTION'; roomId: string; action: GameAction }
  | { type: 'PING'; timestamp: number };

export type ServerMessage =
  | { type: 'ROOM_STATE'; room: RoomDescriptor; assignedPlayerId?: string }
  | { type: 'SYNC_STATE'; state: GameState }
  | { type: 'ACTION_REJECTED'; error: string; action: GameAction }
  | { type: 'PLAYER_CONNECTION_CHANGED'; playerId: PlayerId; connected: boolean }
  | { type: 'PONG'; timestamp: number }
  | { type: 'MATCH_STARTED'; room: RoomDescriptor };

export type MessageListener = (message: ServerMessage) => void;

export interface NetworkAdapter {
  connect(room: RoomDescriptor): Promise<void>;
  disconnect(): Promise<void>;
  send(message: ClientMessage): void;
  subscribe(listener: MessageListener): () => void;
  getConnectionState(): ConnectionState;
  getPlayerId(): PlayerId;
}
