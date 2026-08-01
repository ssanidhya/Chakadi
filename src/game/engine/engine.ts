import type { GameAction, EngineEvent } from './actions.ts';
import { reduceGame, validateAction } from './reducer.ts';
import type { DispatchResult } from './reducer.ts';
import { createInitialGameState } from './state.ts';
import type { GameState } from './state.ts';
import type { Player } from '../models/player.ts';
import type { GameConfig } from '../models/game-config.ts';

export type Listener = (event: EngineEvent) => void;

export interface GameEngine {
  getState(): Readonly<GameState>;
  dispatch(action: GameAction): DispatchResult;
  subscribe(listener: Listener): () => void;
  reset(config?: GameConfig, players?: Player[]): void;
}

export class GameEngineImpl implements GameEngine {
  private state: GameState;
  private listeners: Set<Listener> = new Set();

  constructor(players: Player[], config?: GameConfig, dealerId?: string) {
    this.state = createInitialGameState(players, config, dealerId);
  }

  public getState(): Readonly<GameState> {
    return this.state;
  }

  public dispatch(action: GameAction): DispatchResult {
    const validation = validateAction(this.state, action);
    if (!validation.valid) {
      return {
        success: false,
        state: this.state,
        error: validation.error,
      };
    }

    const previousState = this.state;
    const newState = reduceGame(this.state, action);
    this.state = newState;

    this.notifyListeners(previousState, newState, action);

    return {
      success: true,
      state: this.state,
    };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public reset(config?: GameConfig, players?: Player[]): void {
    const activePlayers = players || this.state.players;
    const activeConfig = config || this.state.config;
    this.state = createInitialGameState(activePlayers, activeConfig);

    const event: EngineEvent = {
      type: 'GAME_STARTED',
      state: this.state,
    };
    this.listeners.forEach((listener) => listener(event));
  }

  private notifyListeners(previousState: GameState, newState: GameState, action: GameAction): void {
    let eventType: EngineEvent['type'] | undefined;

    if (action.type === 'START_GAME' || action.type === 'DEAL_HAND' || action.type === 'START_NEXT_HAND') {
      eventType = 'HAND_DEALT';
    } else if (action.type === 'PLACE_BID') {
      eventType = 'BID_PLACED';
    } else if (action.type === 'PASS_BID') {
      eventType = newState.phase === 'DECLARING_KAAT' ? 'BOLI_CLOSED' : 'BID_PASSED';
    } else if (action.type === 'DECLARE_KAAT') {
      eventType = 'KAAT_DECLARED';
    } else if (action.type === 'PLAY_CARD') {
      if (previousState.completedTricks.length < newState.completedTricks.length) {
        eventType = 'HAATH_WON';
      } else {
        eventType = 'CARD_PLAYED';
      }

      if (newState.phase === 'HAND_SETTLEMENT') {
        eventType = 'HAND_SETTLED';
      } else if (newState.phase === 'GAME_OVER') {
        eventType = 'GAME_OVER';
      }
    }

    if (eventType) {
      const event: EngineEvent = {
        type: eventType,
        state: newState,
        payload: { action },
      };
      this.listeners.forEach((listener) => listener(event));
    }
  }
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function hydrateGameState(json: string): GameState {
  const parsed = JSON.parse(json);
  if (!parsed || parsed.version !== 1) {
    throw new Error('Invalid or unsupported GameState serialization format.');
  }
  return parsed as GameState;
}
