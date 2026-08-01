import type { CardId, Suit } from '../models/card.ts';
import type { GameConfig } from '../models/game-config.ts';
import type { Player, PlayerId } from '../models/player.ts';
import type { GameState } from './state.ts';

export type GameAction =
  | { type: 'START_GAME'; config?: GameConfig; players?: Player[] }
  | { type: 'DEAL_HAND'; seed?: number }
  | { type: 'PLACE_BID'; playerId: PlayerId; tricks: number }
  | { type: 'PASS_BID'; playerId: PlayerId }
  | { type: 'DECLARE_KAAT'; playerId: PlayerId; suit: Suit }
  | { type: 'PLAY_CARD'; playerId: PlayerId; cardId: CardId }
  | { type: 'START_NEXT_HAND'; seed?: number }
  | { type: 'RESET_GAME' };

export type EngineEventType =
  | 'GAME_STARTED'
  | 'HAND_DEALT'
  | 'BID_PLACED'
  | 'BID_PASSED'
  | 'BOLI_CLOSED'
  | 'KAAT_DECLARED'
  | 'CARD_PLAYED'
  | 'HAATH_WON'
  | 'HAND_SETTLED'
  | 'GAME_OVER';

export interface EngineEvent {
  type: EngineEventType;
  state: Readonly<GameState>;
  payload?: any;
}
