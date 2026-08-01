# Chakadi: Serverless P2P WebRTC Room Architecture

## Purpose

This specification defines the serverless Peer-to-Peer (P2P) room system for Chakadi. It allows players on separate smartphones to create and join isolated private game rooms using 4-digit Room Codes (e.g. `4821`) without requiring a paid backend server.

The application remains 100% hostable on GitHub Pages while supporting multi-device online multiplayer.

---

## Key Principles

1. **Host-Authoritative Star Topology**
   - The player who creates the room acts as the **Host Authority**.
   - The Host runs the authoritative `GameEngineImpl` instance.
   - Connected peers (clients) send action intents to the Host.
   - The Host validates all actions and broadcasts sanitized state updates to all connected peers.

2. **Room Code Addressing & Signaling**
   - Room Codes are 4-digit numeric or 4-letter alphanumeric strings (e.g., `4821`).
   - PeerJS public signaling service (`0.peerjs.com`) maps the Room Code to a deterministic Host Peer ID: `chakadi-room-4821`.
   - STUN servers (`stun:stun.l.google.com:19302`) handle NAT traversal over Wi-Fi and mobile data networks.

3. **Isolated Multiplayer Rooms**
   - Every Room Code operates in strict isolation.
   - Players in `ROOM 4821` can never mix or receive state events from players in `ROOM 9102`.

4. **Card Hand Privacy**
   - The Host sanitizes state before broadcasting to each peer: each player receives only their own private cards in full. Opponents' hands are represented as card counts to prevent cheating or network inspection.

---

## Room Lifecycle & State Machine

```text
ROOM_LOBBY
  -> PEERS_CONNECTING (2 to 6 players join with Room Code)
  -> SEAT_SELECTION (Players pick open seats / Team A vs Team B)
  -> MATCH_STARTED (Host deals cards & starts engine)
  -> IN_GAME (Action dispatch & state synchronization)
  -> PLAYER_DISCONNECTED / RECONNECTING
  -> MATCH_ENDED
```

---

## Data Protocol & WebRTC Adapter Interface

`WebRTCAdapter` implements the standard `NetworkAdapter` interface:

```ts
export class WebRTCAdapter implements NetworkAdapter {
  createRoom(hostPlayer: Player, config: GameConfig): Promise<{ roomCode: string }>;
  joinRoom(roomCode: string, player: Player): Promise<void>;
  send(message: ClientMessage): void;
  subscribe(listener: MessageListener): () => void;
  getConnectionState(): ConnectionState;
}
```

### Wire Message Flow

1. **Join Request (`JOIN_ROOM`):**
   Client connects to `chakadi-room-4821` → sends `{ type: "JOIN_ROOM", roomCode: "4821", player: { id, name } }`.

2. **Room State Sync (`ROOM_STATE`):**
   Host confirms connection, assigns seat, and broadcasts current room seating to all connected peers.

3. **Action Dispatch (`DISPATCH_ACTION`):**
   Client sends move intent `{ type: "DISPATCH_ACTION", action: { type: "PLAY_CARD", playerId: "p2", cardId: "spades-A" } }`.

4. **Engine Validation & Broadcast (`SYNC_STATE`):**
   Host processes action via `GameEngineImpl.dispatch()`. If valid, Host sends updated sanitized `GameState` to all clients.

---

## Disconnection & Reconnection Policy

1. **Client Disconnect:**
   - If a client temporarily drops connection, the Host marks the player seat as `disconnected: true`.
   - The client can rejoin using the same Room Code `4821` and player ID. The Host sends an immediate `SYNC_STATE` recovery snapshot.

2. **Host Disconnect:**
   - If the Host leaves or drops off, Host migration or room termination occurs with a user-friendly *"Host disconnected"* modal.

---

## Testing Strategy for P2P Rooms

- **Unit Tests:** Test Peer ID construction, room code generation, and state sanitization functions.
- **Integration Tests:** Test mock PeerJS transport for 6 simultaneous WebRTC connections in local simulation.
