# Chakadi: Network Adapter Architecture

## Status

Networking is out of scope for the first milestone. This document defines seams only, so the engine does not need rewriting when multiplayer is introduced.

## Principles

- The engine does not import or know about adapters.
- Actions and state snapshots are JSON-serializable and schema-validated.
- A single authority reduces cheating and conflicting moves. Version one uses a local authority.
- Private hands must never be broadcast to an unauthorised player.

## Adapter Contract

```ts
interface NetworkAdapter {
  connect(room: RoomDescriptor): Promise<void>;
  disconnect(): Promise<void>;
  send(message: ClientMessage): void;
  subscribe(listener: (message: ServerMessage) => void): () => void;
  getConnectionState(): ConnectionState;
}
```

The UI sends an intent/action through the adapter. The authoritative host validates it with the engine, then broadcasts the resulting public state and the acting player's relevant private state.

## Messages

All wire messages carry `protocolVersion`, `roomId`, `messageId`, and payload. Zod schemas are the source of runtime validation.

| Direction | Message | Purpose |
| --- | --- | --- |
| Client → authority | `JOIN_ROOM` | Request a seat or spectator role. |
| Client → authority | `DISPATCH_ACTION` | Submit a `GameAction` intent. |
| Authority → client | `ACTION_REJECTED` | Return a typed validation error. |
| Authority → client | `SYNC_STATE` | Send an initial/recovery player-scoped snapshot. |
| Authority → client | `GAME_EVENT` | Broadcast a public transition plus scoped private changes. |
| Either | `PING` / `PONG` | Liveness and latency. |
| Authority → client | `PLAYER_CONNECTION_CHANGED` | Inform clients of reconnect/disconnect state. |

## Implementations

- `LocalAdapter`: in-process loopback adapter for a shared-device game and automated tests. It is the only adapter required in the initial product.
- `WebSocketAdapter`: future server-authoritative rooms; suitable for public matchmaking and reconnection.
- `WebRTCAdapter`: future peer-to-peer transport. It still needs a signalling service and a clear authority-election policy.

## Security and Recovery

Server/host authority validates player identity, seat ownership, phase, turn, card ownership, and follow-suit rules; clients never self-certify a move. Reconnection uses `SYNC_STATE` and action/event sequence numbers. Persisted room data must keep player-specific hands separated from public state.

