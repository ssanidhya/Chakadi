import Peer, { DataConnection } from 'peerjs';
import type { GameEngineImpl } from '../game/index.ts';
import { getAutoPlayAction } from '../game/index.ts';
import type { Player, PlayerId } from '../game/index.ts';
import type {
  NetworkAdapter,
  RoomDescriptor,
  ConnectionState,
  ClientMessage,
  ServerMessage,
  MessageListener,
} from './adapter.ts';
import { validateClientMessage } from './schemas.ts';
import { logInfo, logWarn, logError } from '../utils/logger.ts';

export const PEER_ROOM_PREFIX = 'chakadi-v1-';

export function toPeerRoomId(roomCode: string): string {
  const clean = roomCode.trim();
  return clean.startsWith(PEER_ROOM_PREFIX) ? clean : `${PEER_ROOM_PREFIX}${clean}`;
}

export function generateRoomCode(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

/**
 * PeerJSHostAdapter — Used by the room host (PeerJS ID = 7-digit room code).
 * Host owns the GameEngineImpl, accepts peer connections from clients,
 * processes dispatches, and broadcasts state updates (ROOM_STATE & SYNC_STATE).
 */
export class PeerJSHostAdapter implements NetworkAdapter {
  private connectionState: ConnectionState = 'disconnected';
  private listeners: Set<MessageListener> = new Set();
  private peer: Peer | null = null;
  private connectedClients: Map<PlayerId, DataConnection> = new Map();
  private roomCode: string;
  private playerCount: number;
  private room: RoomDescriptor;
  private engine: GameEngineImpl | null = null;
  private engineUnsub: (() => void) | null = null;
  private hostPlayerId: string = 'p1';
  private nextSeatIndex: number = 2; // host is always p1, clients start at p2
  private turnTimer: any = null;
  private readonly TURN_TIMEOUT_MS = 30000; // 30 seconds default turn countdown

  constructor(roomCode: string, playerCount: number) {
    this.roomCode = roomCode;
    this.playerCount = playerCount;
    this.room = {
      roomId: roomCode,
      hostId: 'p1',
      players: [],
      maxPlayers: playerCount,
    };
  }

  public async connect(room?: RoomDescriptor): Promise<void> {
    if (room) {
      this.room = room;
      if (room.hostId) this.hostPlayerId = room.hostId;
    }

    this.connectionState = 'connecting';
    logInfo('P2P', `PeerJS host initializing peer connection with room code #${this.roomCode}`);

    return new Promise<void>((resolve, reject) => {
      try {
        const namespacedId = toPeerRoomId(this.roomCode);
        this.peer = new Peer(namespacedId);

        this.peer.on('open', (id) => {
          this.connectionState = 'connected';
          logInfo('P2P', `PeerJS host peer opened successfully, ID: ${id}`);
          resolve();
        });

        this.peer.on('connection', (conn) => {
          logInfo('P2P', `Host received incoming DataConnection from peer ${conn.peer}`);

          conn.on('open', () => {
            logInfo('P2P', `DataConnection open with client peer ${conn.peer}`);
          });

          conn.on('data', (raw: unknown) => {
            this.handleClientData(conn, raw);
          });

          conn.on('close', () => {
            this.handleClientDisconnect(conn);
          });

          conn.on('error', (err) => {
            logWarn('P2P', `DataConnection error with peer ${conn.peer}`, { error: err.message || err });
            this.handleClientDisconnect(conn);
          });
        });

        this.peer.on('error', (err) => {
          this.connectionState = 'error';
          logError('P2P', `PeerJS host peer error`, { error: err.message || err });
          reject(err);
        });

        this.peer.on('disconnected', () => {
          logWarn('P2P', 'PeerJS host disconnected from signalling server');
        });

        this.peer.on('close', () => {
          this.connectionState = 'disconnected';
          logInfo('P2P', 'PeerJS host peer destroyed');
        });
      } catch (err) {
        this.connectionState = 'error';
        logError('P2P', 'Failed to instantiate PeerJS host', { error: err });
        reject(err);
      }
    });
  }

  public bindEngine(engine: GameEngineImpl): void {
    this.engine = engine;
    if (this.engineUnsub) {
      this.engineUnsub();
    }
    this.engineUnsub = engine.subscribe(() => {
      this.broadcastSyncState();
      this.scheduleTurnTimeout();
    });
    logInfo('P2P', 'Host bound GameEngineImpl for automated state sync broadcasting');
    this.broadcastSyncState();
    this.scheduleTurnTimeout();
  }

  public setHostPlayer(hostPlayer: Player): void {
    this.hostPlayerId = hostPlayer.id;
    this.room.hostId = hostPlayer.id;
    if (!this.room.players.some((p) => p.id === hostPlayer.id)) {
      this.room = { ...this.room, players: [...this.room.players, hostPlayer] };
    }
  }

  public broadcastMatchStarted(players: Player[]): void {
    const teamAPlayers = players.filter((p) => p.teamId === 'team_a');
    const teamBPlayers = players.filter((p) => p.teamId === 'team_b');
    const balancedPlayers: Player[] = [];
    const totalCount = players.length;
    for (let i = 0; i < totalCount; i++) {
      if (i % 2 === 0) {
        const p = teamAPlayers.shift();
        if (p) balancedPlayers.push({ ...p, seat: i });
      } else {
        const p = teamBPlayers.shift();
        if (p) balancedPlayers.push({ ...p, seat: i });
      }
    }
    this.room = { ...this.room, players: balancedPlayers };
    logInfo('P2P', `Host broadcasting MATCH_STARTED to ${this.connectedClients.size} peers`, {
      totalPlayers: balancedPlayers.length,
    });
    this.broadcast({
      type: 'MATCH_STARTED',
      room: this.room,
    });
  }

  public async disconnect(): Promise<void> {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    if (this.engineUnsub) {
      this.engineUnsub();
      this.engineUnsub = null;
    }
    for (const [pId, conn] of this.connectedClients.entries()) {
      try {
        conn.close();
      } catch (e) {
        // ignore close errors
      }
    }
    this.connectedClients.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connectionState = 'disconnected';
    logInfo('P2P', `PeerJSHostAdapter disconnected room #${this.roomCode}`);
  }

  public send(message: ClientMessage): void {
    const validation = validateClientMessage(message);
    if (!validation.success) {
      logWarn('P2P', 'Host received invalid local ClientMessage', { error: validation.error });
      return;
    }

    if (message.type === 'SELECT_TEAM' || message.type === 'HOST_MOVE_PLAYER') {
      this.handleClientData(null as any, message);
      return;
    }

    if (message.type === 'DISPATCH_ACTION') {
      if (this.engine) {
        logInfo('P2P', `Host processing local action dispatch`, { actionType: message.action.type });
        const res = this.engine.dispatch(message.action);
        if (!res.success) {
          logWarn('P2P', `Host engine rejected action`, { error: res.error, action: message.action });
          this.emit({
            type: 'ACTION_REJECTED',
            error: res.error || 'Engine rejected action',
            action: message.action,
          });
        }
      } else {
        logWarn('P2P', 'Host received DISPATCH_ACTION but engine is not bound yet');
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
    return this.hostPlayerId;
  }

  public getRoomDescriptor(): RoomDescriptor {
    return this.room;
  }

  private handleClientData(conn: DataConnection, raw: unknown): void {
    let msg: ClientMessage;
    try {
      msg = typeof raw === 'string' ? JSON.parse(raw) : (raw as ClientMessage);
    } catch (err) {
      logWarn('P2P', 'Host received invalid JSON message from peer', { raw });
      return;
    }

    const validation = validateClientMessage(msg);
    if (!validation.success) {
      logWarn('P2P', 'Host received invalid wire message', { error: validation.error, msg });
      return;
    }

    if (msg.type === 'JOIN_ROOM') {
      let assignedId: PlayerId | null = null;
      for (const [pId, c] of this.connectedClients.entries()) {
        if (c && c.peer === conn?.peer) {
          assignedId = pId;
          break;
        }
      }

      // Check for reconnection by previously assigned playerId or name
      if (!assignedId && msg.player?.id && msg.player.id !== 'pending') {
        const existing = this.room.players.find((p) => p.id === msg.player.id);
        if (existing) {
          assignedId = existing.id;
        }
      }

      if (!assignedId && msg.player?.name) {
        const trimmedName = msg.player.name.trim().toLowerCase();
        const existingByName = this.room.players.find(
          (p) => p.name.trim().toLowerCase() === trimmedName && !this.connectedClients.has(p.id)
        );
        if (existingByName) {
          assignedId = existingByName.id;
        }
      }

      const joiningPlayer: Player = { ...msg.player };

      if (assignedId) {
        // Reconnect: update existing player record and re-bind DataConnection
        joiningPlayer.id = assignedId;
        const existingIndex = this.room.players.findIndex((p) => p.id === assignedId);
        if (existingIndex >= 0) {
          joiningPlayer.teamId = this.room.players[existingIndex]!.teamId;
          joiningPlayer.seat = this.room.players[existingIndex]!.seat;
          const updatedPlayers = [...this.room.players];
          updatedPlayers[existingIndex] = joiningPlayer;
          this.room = { ...this.room, players: updatedPlayers };
        }
        if (conn) {
          this.connectedClients.set(assignedId, conn);
        }
        logInfo('P2P', `Player "${joiningPlayer.name}" reconnected successfully as ${assignedId}`);
      } else {
        // New player: assign next seat ID & default teamId to unassigned if not host
        joiningPlayer.id = `p${this.nextSeatIndex++}`;
        if (joiningPlayer.id !== this.hostPlayerId) {
          joiningPlayer.teamId = 'unassigned';
        }
        joiningPlayer.seat = this.room.players.length;
        if (conn) {
          this.connectedClients.set(joiningPlayer.id, conn);
        }
        this.room = { ...this.room, players: [...this.room.players, joiningPlayer] };
      }

      logInfo('P2P', `Player "${joiningPlayer.name}" (${joiningPlayer.id}) requested to join room #${this.roomCode}`);
      logInfo('P2P', `Updated room roster: ${this.room.players.length}/${this.room.maxPlayers} players`, {
        players: this.room.players.map((p) => p.name),
      });

      // Send targeted ROOM_STATE with assignedPlayerId to the joining client
      if (conn && conn.open) {
        try {
          conn.send(
            JSON.stringify({
              type: 'ROOM_STATE',
              room: this.room,
              assignedPlayerId: joiningPlayer.id,
            })
          );
          if (this.engine) {
            conn.send(
              JSON.stringify({
                type: 'MATCH_STARTED',
                room: this.room,
              })
            );
            conn.send(
              JSON.stringify({
                type: 'SYNC_STATE',
                state: this.engine.getState(),
              })
            );
            logInfo('P2P', `Dispatched live match recovery states to reconnected player ${joiningPlayer.id}`);
          }
        } catch (err) {
          logWarn('P2P', `Failed to send assigned ROOM_STATE to player ${joiningPlayer.id}`, { error: err });
        }
      }

      // Broadcast general ROOM_STATE to all other connected clients & host
      this.broadcast(
        {
          type: 'ROOM_STATE',
          room: this.room,
        },
        joiningPlayer.id
      );
    } else if (msg.type === 'SELECT_TEAM') {
      const playerIndex = this.room.players.findIndex((p) => p.id === msg.playerId);
      if (playerIndex >= 0) {
        const player = this.room.players[playerIndex]!;
        // Regular player can only select team if currently unassigned
        if (player.teamId === 'unassigned') {
          const maxPerTeam = this.room.maxPlayers / 2;
          const currentCount = this.room.players.filter((p) => p.teamId === msg.teamId).length;
          if (currentCount < maxPerTeam) {
            const updatedPlayers = [...this.room.players];
            updatedPlayers[playerIndex] = { ...player, teamId: msg.teamId };
            this.room = { ...this.room, players: updatedPlayers };
            logInfo('P2P', `Player "${player.name}" (${player.id}) selected team ${msg.teamId}`);
            this.broadcast({ type: 'ROOM_STATE', room: this.room });
          } else {
            logWarn('P2P', `Player "${player.name}" tried to join ${msg.teamId} but team is full`);
          }
        }
      }
    } else if (msg.type === 'HOST_MOVE_PLAYER') {
      const playerIndex = this.room.players.findIndex((p) => p.id === msg.targetPlayerId);
      if (playerIndex >= 0) {
        const player = this.room.players[playerIndex]!;
        const maxPerTeam = this.room.maxPlayers / 2;
        const currentCount = this.room.players.filter((p) => p.teamId === msg.newTeamId).length;
        if (msg.newTeamId === 'unassigned' || currentCount < maxPerTeam) {
          const updatedPlayers = [...this.room.players];
          updatedPlayers[playerIndex] = { ...player, teamId: msg.newTeamId };
          this.room = { ...this.room, players: updatedPlayers };
          logInfo('P2P', `Host moved player "${player.name}" (${player.id}) to ${msg.newTeamId}`);
          this.broadcast({ type: 'ROOM_STATE', room: this.room });
        } else {
          logWarn('P2P', `Host tried to move player "${player.name}" to ${msg.newTeamId} but team is full`);
        }
      }
    } else if (msg.type === 'LEAVE_ROOM') {
      this.handlePlayerLeave(msg.playerId);
    } else if (msg.type === 'DISPATCH_ACTION') {
      if (this.engine) {
        // Validate sender authorization at network boundary
        let senderPlayerId: PlayerId | null = null;
        if (conn) {
          for (const [pId, c] of this.connectedClients.entries()) {
            if (c === conn || c.peer === conn.peer) {
              senderPlayerId = pId;
              break;
            }
          }
        }

        const action = msg.action as any;
        if (senderPlayerId && action.playerId && action.playerId !== senderPlayerId) {
          logWarn('P2P', `Host rejected unauthorized action spoofing from peer`, {
            senderPlayerId,
            actionPlayerId: action.playerId,
            actionType: action.type,
          });
          if (conn && conn.open) {
            conn.send(
              JSON.stringify({
                type: 'ACTION_REJECTED',
                error: 'Unauthorized action: playerId does not match peer session.',
                action: msg.action,
              })
            );
          }
          return;
        }

        logInfo('P2P', `Host received DISPATCH_ACTION from peer`, { actionType: msg.action.type });
        const res = this.engine.dispatch(msg.action);
        if (!res.success) {
          logWarn('P2P', `Remote action rejected by host engine`, { error: res.error, action: msg.action });
          if (conn && conn.open) {
            conn.send(
              JSON.stringify({
                type: 'ACTION_REJECTED',
                error: res.error || 'Action failed validation.',
                action: msg.action,
              })
            );
          }
        }
      }
    } else if (msg.type === 'PING') {
      if (conn.open) {
        conn.send(
          JSON.stringify({
            type: 'PONG',
            timestamp: msg.timestamp,
          })
        );
      }
    }
  }

  private handleClientDisconnect(conn: DataConnection): void {
    let disconnectedPlayerId: PlayerId | null = null;
    for (const [pId, c] of this.connectedClients.entries()) {
      if (c === conn || c.peer === conn.peer) {
        disconnectedPlayerId = pId;
        break;
      }
    }

    if (disconnectedPlayerId) {
      logWarn('P2P', `Client ${disconnectedPlayerId} disconnected from room #${this.roomCode}`);
      this.connectedClients.delete(disconnectedPlayerId);
      this.broadcast({
        type: 'PLAYER_CONNECTION_CHANGED',
        playerId: disconnectedPlayerId,
        connected: false,
      });
      this.scheduleTurnTimeout();
    }
  }

  private handlePlayerLeave(playerId: PlayerId): void {
    this.connectedClients.delete(playerId);
    this.room = { ...this.room, players: this.room.players.filter((p) => p.id !== playerId) };
    logInfo('P2P', `Player ${playerId} left room #${this.roomCode}`);
    this.broadcast({
      type: 'ROOM_STATE',
      room: this.room,
    });
  }

  private broadcastSyncState(): void {
    if (!this.engine) return;
    const fullState = this.engine.getState();
    this.broadcast({
      type: 'SYNC_STATE',
      state: fullState,
    });
  }

  private scheduleTurnTimeout(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    if (!this.engine) return;
    const state = this.engine.getState();

    if (state.phase !== 'BIDDING' && state.phase !== 'DECLARING_KAAT' && state.phase !== 'PLAYING_HAATH') {
      return;
    }

    const currentTurnId = state.phase === 'DECLARING_KAAT' ? state.bid.declarerId : state.turnPlayerId;
    if (!currentTurnId) return;

    const isHostTurn = currentTurnId === this.hostPlayerId;
    const isClientConnected = this.connectedClients.has(currentTurnId);

    // If client is disconnected, trigger quick 1.5s fallback; otherwise wait 30s timeout
    const timeoutDuration = !isHostTurn && !isClientConnected ? 1500 : this.TURN_TIMEOUT_MS;

    this.turnTimer = setTimeout(() => {
      this.triggerAutoPlay();
    }, timeoutDuration);
  }

  private triggerAutoPlay(): void {
    if (!this.engine) return;
    const state = this.engine.getState();
    const action = getAutoPlayAction(state);
    if (action) {
      logInfo('P2P', `Host auto-play executed action on behalf of turn player`, {
        actionType: action.type,
        phase: state.phase,
      });
      this.engine.dispatch(action);
    }
  }

  private broadcast(message: ServerMessage, excludePlayerId?: PlayerId): void {
    // Emit locally for host listeners
    this.emit(message);

    // Send to connected clients (optionally excluding specific player)
    const serialized = JSON.stringify(message);
    for (const [pId, conn] of this.connectedClients.entries()) {
      if (pId !== excludePlayerId && conn.open) {
        try {
          conn.send(serialized);
        } catch (err) {
          logWarn('P2P', `Failed to send broadcast to player ${pId}`, { error: err });
        }
      }
    }
  }

  private emit(message: ServerMessage): void {
    this.listeners.forEach((listener) => listener(message));
  }
}

/**
 * PeerJSClientAdapter — Used by joining players.
 * Opens a PeerJS Peer (random ID), connects to host room code via DataConnection,
 * sends JOIN_ROOM on open, forwards user actions (DISPATCH_ACTION),
 * and receives state updates (ROOM_STATE & SYNC_STATE) from host.
 */
export class PeerJSClientAdapter implements NetworkAdapter {
  private connectionState: ConnectionState = 'disconnected';
  private listeners: Set<MessageListener> = new Set();
  private peer: Peer | null = null;
  private hostConn: DataConnection | null = null;
  private playerInfo: Player;
  private roomCode: string;

  constructor(playerInfo: Player, roomCode: string) {
    this.playerInfo = playerInfo;
    this.roomCode = roomCode;
  }

  public async connect(room?: RoomDescriptor): Promise<void> {
    this.connectionState = 'connecting';
    logInfo(
      'P2P',
      `PeerJS client "${this.playerInfo.name}" (${this.playerInfo.id}) connecting to host room #${this.roomCode}`
    );

    return new Promise<void>((resolve, reject) => {
      try {
        this.peer = new Peer();

        this.peer.on('open', (id) => {
          logInfo('P2P', `PeerJS client peer opened, ID: ${id}. Opening DataConnection to host #${this.roomCode}`);

          const namespacedHostId = toPeerRoomId(this.roomCode);
          const conn = this.peer!.connect(namespacedHostId, { serialization: 'json' });
          this.hostConn = conn;

          conn.on('open', () => {
            this.connectionState = 'connected';
            logInfo('P2P', `PeerJS client connected to host #${this.roomCode} successfully!`);

            const joinMsg: ClientMessage = {
              type: 'JOIN_ROOM',
              roomId: this.roomCode,
              player: this.playerInfo,
            };
            this.send(joinMsg);
            resolve();
          });

          conn.on('data', (raw: unknown) => {
            let msg: ServerMessage;
            try {
              msg = typeof raw === 'string' ? JSON.parse(raw) : (raw as ServerMessage);
            } catch (err) {
              logWarn('P2P', 'Client received unparseable message from host', { raw });
              return;
            }
            if (msg.type === 'ROOM_STATE' && msg.assignedPlayerId) {
              this.playerInfo.id = msg.assignedPlayerId;
            }
            this.emit(msg);
          });

          conn.on('close', () => {
            this.connectionState = 'disconnected';
            logWarn('P2P', `DataConnection to host #${this.roomCode} closed`);
          });

          conn.on('error', (err) => {
            this.connectionState = 'error';
            logError('P2P', `DataConnection error with host #${this.roomCode}`, { error: err.message || err });
          });
        });

        this.peer.on('error', (err) => {
          this.connectionState = 'error';
          logError('P2P', `PeerJS client peer error`, { error: err.message || err });
          reject(err);
        });

        this.peer.on('disconnected', () => {
          logWarn('P2P', 'PeerJS client disconnected from signalling server');
        });

        this.peer.on('close', () => {
          this.connectionState = 'disconnected';
          logInfo('P2P', 'PeerJS client peer closed');
        });
      } catch (err) {
        this.connectionState = 'error';
        logError('P2P', 'Failed to instantiate PeerJS client peer', { error: err });
        reject(err);
      }
    });
  }

  public async disconnect(): Promise<void> {
    if (this.hostConn) {
      try {
        this.send({
          type: 'LEAVE_ROOM',
          roomId: this.roomCode,
          playerId: this.playerInfo.id,
        });
        this.hostConn.close();
      } catch (e) {
        // ignore close error
      }
      this.hostConn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connectionState = 'disconnected';
    logInfo('P2P', `PeerJSClientAdapter disconnected from room #${this.roomCode}`);
  }

  public send(message: ClientMessage): void {
    const validation = validateClientMessage(message);
    if (!validation.success) {
      logWarn('P2P', 'Client invalid message format', { error: validation.error });
      return;
    }

    if (this.hostConn && this.hostConn.open) {
      try {
        this.hostConn.send(JSON.stringify(message));
        logInfo('P2P', `Client sent ${message.type} to host #${this.roomCode}`);
      } catch (err) {
        logError('P2P', `Failed to send ${message.type} to host`, { error: err });
      }
    } else {
      logWarn('P2P', `Client tried to send ${message.type} but host connection is not open`);
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
    return this.playerInfo.id;
  }

  private emit(message: ServerMessage): void {
    this.listeners.forEach((listener) => listener(message));
  }
}
