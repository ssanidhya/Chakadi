# Chakadi Multiplayer Audit — Issues & Fix Plan

> **Written**: 2026-08-02  
> **Status**: `AUDIT COMPLETE — FIX PLAN READY`

---

## Part 1 — Findings (Issues Discovered)

### 🔴 CRITICAL — Multiplayer is Completely Non-Functional

#### Issue 1: `WebRTCAdapter` is a hollow stub — no real peer connections
**File**: `src/networking/webrtcAdapter.ts`

The `WebRTCAdapter` class does nothing real. Its `connect()` immediately sets state to `connecting → connected` without ever opening a WebRTC peer connection. Its `send()` doesn't transmit anything to any peer — it just emits a hardcoded fake `ROOM_STATE` message locally. There are zero WebRTC `RTCPeerConnection` or data channel instances anywhere in the codebase.

**Effect**: Clicking "Host Room" / "Join Room" works visually but no actual peer-to-peer connection is established between any two devices. Two phones cannot communicate at all.

---

#### Issue 2: `handleCreateRoom()` and `handleJoinRoomSubmit()` start the game immediately without waiting for peers
**File**: `src/App.tsx` (lines 102–122)

```
handleCreateRoom() → roomRegistry.generateUniqueRoomCode() → startGame(players, config)
handleJoinRoomSubmit() → startGame(updated, config)
```

Both handlers call `startGame()` right away, bypassing any lobby wait state. The game starts on the host's device alone — there is no "wait for all players" gate, no player roster, and no "Start Match" button for the host to click after all join.

---

#### Issue 3: `roomRegistry` is purely in-memory, browser-local — does not persist across devices
**File**: `src/networking/roomRegistry.ts`

`activeRooms: Set<string>` lives in JavaScript memory of whichever tab called it. Device A's registry has no knowledge of Device B's registry. So when phone B calls `roomRegistry.registerRoom(code)`, it never validates against phone A's state — the registry is effectively a no-op for cross-device multiplayer.

---

#### Issue 4: No signalling layer — no way for two devices to find each other
**Files**: All of `src/networking/`

WebRTC requires a signalling exchange (SDP offer/answer + ICE candidates) before data channels open. The codebase has:
- A `WebSocketAdapter` that connects to a WebSocket server — **but there is no server URL defined anywhere** and no server exists.
- A `WebRTCAdapter` that never creates `RTCPeerConnection`.
- A `LocalAdapter` that drives everything from a local `GameEngineImpl` — i.e. single-device only.

Only `LocalAdapter` is ever actually wired up. The Host Room and Join Room flows both call `startGame()` which creates a fresh local `GameEngineImpl`. Two phones each run their own fully isolated game — they are never connected.

---

### 🟠 HIGH — Player Names Not Showing / Wrong Names in Badges

#### Issue 5: Join Room does not propagate player name to the game engine
**File**: `src/App.tsx` lines 116–122

```ts
const activePlayers = playerCount === 6 ? players6P : players4P;
const updated = [...activePlayers];
updated[0] = { ...updated[0]!, name: joinPlayerName, teamId: joinTeam };
startGame(updated, config);
```

`updated[0]` only replaces "Player 1" with the joiner's name. All other 5 slots remain as `Player 2 … Player 6` — the placeholder names from the initial `useState`. So the name tag on-screen for the joining player's perspective does show their name in seat 0, but **all other seat labels on the table say "Player 2", "Player 3"**, etc. (stale defaults).

---

#### Issue 6: Name tag `max-w-[55px]` causes truncation ("Play…") on small screens
**File**: `src/components/game/TableLayout.tsx` line 60

```tsx
<span className="text-[clamp(10px,2.5vw,13px)] font-bold text-white truncate max-w-[55px] xs:max-w-none">
  {player.name}
```

`xs:max-w-none` only triggers on a custom `xs` breakpoint. Tailwind's default breakpoint set does not include `xs`, so it is **never applied** — every device sees `max-w-[55px]` with hard truncation. Names longer than ~5 characters will show "Play…" on all devices.

---

### 🟠 HIGH — Host Room Code is a Placeholder, Not a Real Room

#### Issue 7: Room code shown is a static fallback, not the actual generated code (until Create & Start is clicked)
**File**: `src/App.tsx` line 296

```tsx
{roomCode || '8492015'}
```

`roomCode` is `''` on initial render. The `'8492015'` fallback is always shown before the host clicks "Create & Start Room". Users might share `8492015` before the real code is generated. The code should be generated eagerly on `Host Room` tab selection.

---

#### Issue 8: `getShareUrl()` falls back to `'8492015'` if no code has been generated
**File**: `src/App.tsx` line 58

```ts
const targetCode = code || roomCode || '8492015';
```

If the host copies the link before creating the room, they share a fake `?joinRoom=8492015` link. Recipients who click that link will auto-fill `8492015` in Join Room and try to join a code that does not correspond to any real room.

---

### 🟡 MEDIUM — "Start Match" Flow Missing

#### Issue 9: No "Wait for Players" lobby state — host cannot hold the room open
Currently there is no lobby waiting state between "Host Room is created" and "Game starts". The host starts a game alone immediately. There is no:
- Player roster showing who has joined
- Count of players present vs. required
- Host-only "Start Match" button that fires only when all seats are filled

---

### 🟡 MEDIUM — Game Engine Only Lives on One Device

#### Issue 10: `useGameStore` / `GameEngineImpl` always runs locally
**File**: `src/store/gameStore.ts`

The Zustand store holds a `GameEngineImpl` that is created locally and dispatches actions locally. Even if real networking was wired up, there is no mechanism to:
- Receive remote action dispatches and apply them to a local engine
- Sync state from a host engine to all joining clients
- Elect a host as the authority for game state (host-authority model)

---

### 🟡 MEDIUM — No Networking Logs in the Debug Overlay

#### Issue 11: P2P log calls exist in App.tsx but no adapter logs connection lifecycle
The logger `logInfo('P2P', ...)` is called from the Lobby but adapters (`WebRTCAdapter`, `WebSocketAdapter`) have no logging for connection open/close/error events, making it impossible to debug why multiplayer is not working from the in-app debug overlay.

---

## Part 2 — Answers to User Questions

### Q: Is the link working?
**Answer**: The link _structure_ works (URL is copied, `?joinRoom=XXXXXXX` is detected on open, Join Room tab is pre-filled). But the actual room behind the code does not exist as a real network room — there is no server or peer process holding it open. So the join link works in the UI, but clicking Join on another device produces no real connection.

### Q: Why does name show incorrectly / truncated?
1. The `max-w-[55px]` cap on the name span in `TableLayout.tsx` always truncates — `xs:max-w-none` is never applied as `xs` is not a standard Tailwind breakpoint.
2. Player names entered in Join Room replace only seat 0's name — the rest remain default "Player N" names.

### Q: Why does multiplayer not work correctly?
There is **no real networking implementation**. `WebRTCAdapter.connect()` is a stub (sets `'connected'` without opening any peer connection). The Host Room and Join Room flows each independently call `startGame()` which starts a fresh local game engine on each device — the two engines never communicate.

---

## Part 3 — Fix Plan

### Fix 1 — Eager Room Code Generation on Host Tab Open
**What**: Generate the real room code when `playMode` switches to `'create_room'`, not on button click.  
**Why**: So the code shown is always real and shareable immediately.

### Fix 2 — Fix Name Truncation in TableLayout
**What**: Remove `max-w-[55px]` and `xs:max-w-none`, replace with a proper `max-w-[70px] sm:max-w-none` using standard Tailwind breakpoints.  
**Why**: `xs` is not a standard Tailwind breakpoint; the cap fires on every device.

### Fix 3 — Add Lobby Waiting Room State
**What**: Introduce a `'waiting'` phase between room creation and game start. Host sees a "Waiting for players…" panel with a player roster and an enabled "Start Match" button once all expected players have joined.  
**Why**: Required for coordinated multiplayer start.

### Fix 4 — Add Networking Logs to All Adapters
**What**: Add `logInfo('P2P', ...)` calls to `LocalAdapter`, `WebSocketAdapter`, and `WebRTCAdapter` for connect, disconnect, send, receive, and error events.  
**Why**: Visibility into what is happening during connection lifecycle.

### Fix 5 — Implement Real PeerJS WebRTC Signalling
**What**: Replace the `WebRTCAdapter` stub with a real PeerJS-based implementation that:
- Host creates a PeerJS `Peer` with the 7-digit room code as the peer ID
- Joining client calls `peer.connect(roomCode)` to open a `DataConnection`
- Both sides exchange `GameAction` messages over the data channel
- Host acts as authority — runs the game engine and broadcasts `SYNC_STATE` to all clients after every action

> **Note**: This requires PeerJS library (`peerjs` npm package) to be added. The free PeerJS cloud (`0.peerjs.com`) acts as the signalling server — no backend hosting needed.

### Fix 6 — Wire Player Names Across All Seats
**What**: In `handleJoinRoomSubmit`, the joining player's name and team should be passed to the host via the networking layer so the host can assign it to the correct seat. Until real networking is wired, at minimum: the joining player's name replaces the correct seat slot based on team assignment (not always seat 0).

---

## Status Tracker

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | WebRTCAdapter is a stub | 🔴 Critical | `DONE` |
| 2 | Game starts immediately without peer join wait | 🔴 Critical | `DONE` |
| 3 | RoomRegistry is browser-local only | 🔴 Critical | `DONE` |
| 4 | No signalling layer | 🔴 Critical | `DONE` |
| 5 | Joiner name not propagated | 🟠 High | `DONE` |
| 6 | Name badge `max-w-[55px]` truncation (`xs` not a Tailwind breakpoint) | 🟠 High | `DONE` |
| 7 | Room code shown is `'8492015'` placeholder before creation | 🟠 High | `DONE` |
| 8 | Share link copies placeholder code | 🟠 High | `DONE` |
| 9 | No Lobby wait / Start Match button for host | 🟡 Medium | `DONE` |
| 10 | Game engine is always local, no remote dispatch | 🟡 Medium | `DONE` |
| 11 | No networking lifecycle logs in adapters | 🟡 Medium | `DONE` |
