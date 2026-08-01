import type { CardId, Suit } from '../models/card.ts';
import type { GameConfig } from '../models/game-config.ts';
import { createDefaultGameConfig } from '../models/game-config.ts';
import type { Player, PlayerId, TeamId } from '../models/player.ts';
import type { TeamScore } from '../models/team.ts';
import { createInitialTeamScore } from '../models/team.ts';
import type { BidState } from '../rules/bidding.ts';
import { createInitialBidState } from '../rules/bidding.ts';
import type { HandSettlement } from '../rules/scoring.ts';
import type { Trick } from '../rules/trick.ts';

export type GamePhase =
  | 'LOBBY'
  | 'DEALING'
  | 'BIDDING'
  | 'DECLARING_KAAT'
  | 'PLAYING_HAATH'
  | 'HAND_SETTLEMENT'
  | 'GAME_OVER';

export interface GameState {
  version: 1;
  phase: GamePhase;
  config: GameConfig;
  players: Player[];
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
  winningTeamId?: TeamId;
}

export function createInitialGameState(
  players: Player[],
  config: GameConfig = createDefaultGameConfig(6),
  dealerId?: PlayerId
): GameState {
  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);
  const initialDealerId = dealerId ?? sortedPlayers[0]!.id;

  const hands: Record<PlayerId, CardId[]> = {};
  for (const player of sortedPlayers) {
    hands[player.id] = [];
  }

  return {
    version: 1,
    phase: 'LOBBY',
    config,
    players: sortedPlayers,
    dealerId: initialDealerId,
    hands,
    scores: {
      team_a: createInitialTeamScore('team_a'),
      team_b: createInitialTeamScore('team_b'),
    },
    bid: createInitialBidState(),
    completedTricks: [],
    actionNumber: 0,
  };
}
