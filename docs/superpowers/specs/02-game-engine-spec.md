# Chakadi: Game Engine and State Machine

## Purpose and Boundaries

The game engine is a framework-independent, deterministic TypeScript module. It owns game state, legality checks, state transitions, and derived results. It must not import React, Zustand, browser APIs, animations, or networking code.

The engine accepts actions and produces serializable state. UI and transport code are adapters around it.

## Domain Model

```ts
type Suit = "spades" | "hearts" | "diamonds" | "clubs";
type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3";
type CardId = `${Suit}-${Rank}`;
type PlayerId = string;
type TeamId = string;

interface Card { id: CardId; suit: Suit; rank: Rank; }
interface Player { id: PlayerId; name: string; teamId: TeamId; seat: number; }
interface TeamScore { teamId: TeamId; penaltyPoints: number; coat: number; tricks: number; }
interface PlayedCard { playerId: PlayerId; card: Card; order: number; }
interface Trick { leaderId: PlayerId; ledSuit: Suit; plays: PlayedCard[]; winnerId?: PlayerId; }
```

`GameConfig` contains player count, seating, coatLimit (default 1), and target point threshold (default 48). It validates alternating teams, legal player counts (`4` or `6`), and the appropriate deck/minimum bid.

## State Machine

```text
LOBBY
  -> DEALING
  -> BIDDING
  -> DECLARING_KAAT
  -> PLAYING_HAATH
  -> HAND_SETTLEMENT
  -> DEALING | GAME_OVER
```

- `LOBBY`: configuration is editable; no active hand.
- `DEALING`: deterministic deck generation, shuffle source application, and card distribution.
- `BIDDING`: only the bidding player can pass or bid above the current bid.
- `DECLARING_KAAT`: only the Declarer selects a suit.
- `PLAYING_HAATH`: exactly one player owns the next Chaal; eight or thirteen Haath resolve according to variant.
- `HAND_SETTLEMENT`: calculate contract result, Penalty Points (Pts) cancellation/transfer, 48-point Coat wrap-around, same-team/clockwise dealer rotation, and match-end check atomically.
- `GAME_OVER`: reserved for an explicit future match-end policy.

## Serializable State

```ts
interface GameState {
  version: 1;
  phase: GamePhase;
  config: GameConfig;
  dealerId: PlayerId;
  hands: Record<PlayerId, CardId[]>;
  scores: Record<TeamId, TeamScore>;
  bid: BidState;
  trumpSuit?: Suit;
  currentTrick?: Trick;
  completedTricks: Trick[];
  turnPlayerId?: PlayerId;
  actionNumber: number;
  lastSettlement?: HandSettlement;
}
```

State contains data only: arrays, objects, primitives, and JSON-safe strings. It never stores callbacks, class instances, `Map`, `Set`, dates, or random generators.

## Actions

```ts
type GameAction =
  | { type: "START_HAND"; seed: number }
  | { type: "PLACE_BID"; playerId: PlayerId; tricks: number }
  | { type: "PASS_BID"; playerId: PlayerId }
  | { type: "DECLARE_KAAT"; playerId: PlayerId; suit: Suit }
  | { type: "PLAY_CARD"; playerId: PlayerId; cardId: CardId }
  | { type: "RESET_GAME" };
```

All state-changing actions include the responsible `playerId` except administrative actions. The `seed` is preserved in action history or hand metadata so deals can be replayed exactly.

## Engine Contract

```ts
interface GameEngine {
  getState(): Readonly<GameState>;
  dispatch(action: GameAction): DispatchResult;
  subscribe(listener: (event: EngineEvent) => void): () => void;
  reset(config?: GameConfig): void;
}

function reduceGame(state: GameState, action: GameAction): GameState;
function validateAction(state: GameState, action: GameAction): ValidationResult;
function getLegalCards(state: GameState, playerId: PlayerId): CardId[];
```

`dispatch` validates before reducing. Invalid actions leave state unchanged and return a typed failure; normal gameplay errors must not throw.

## Rule Functions

Pure functions implement deck construction, seeded shuffle, dealing, bid validation, legal-card selection, trick winner selection, contract settlement, and dealer transfer. Each function takes explicit values and returns values without side effects.

Boli closes when all other players pass in sequence following the highest bid. The engine then transitions to `DECLARING_KAAT`.

## Events

The engine emits immutable event objects after a successful transition, for example `HAND_DEALT`, `BID_PLACED`, `KAAT_DECLARED`, `CARD_PLAYED`, `HAATH_WON`, and `HAND_SETTLED`. Events are notifications only; the authoritative state is always `getState()`.

## Persistence and Replays

`serializeGameState(state)` and `hydrateGameState(json)` validate a schema version and reconstruct no hidden behaviour. A replay is an initial config plus deterministic `START_HAND` seed and action list, reduced in order.
