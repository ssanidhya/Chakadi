import type { Card, CardId } from '../models/card.ts';
import type { GameAction } from './actions.ts';
import type { GameState } from './state.ts';
import { createDeck, shuffleDeck, dealCards } from '../rules/deck.ts';
import { applyBid, applyPass, validateBid, validatePass } from '../rules/bidding.ts';
import { evaluateTrickWinner, isLegalPlay } from '../rules/trick.ts';
import type { PlayedCard } from '../rules/trick.ts';
import { calculateHandSettlement } from '../rules/scoring.ts';

export interface DispatchResult {
  success: boolean;
  state: GameState;
  error?: string;
}

export function validateAction(state: GameState, action: GameAction): { valid: boolean; error?: string } {
  switch (action.type) {
    case 'START_GAME': {
      if (state.phase !== 'LOBBY') {
        return { valid: false, error: 'Game has already started.' };
      }
      return { valid: true };
    }

    case 'DEAL_HAND': {
      if (state.phase !== 'DEALING' && state.phase !== 'LOBBY') {
        return { valid: false, error: 'Cannot deal hand in current phase.' };
      }
      return { valid: true };
    }

    case 'PLACE_BID': {
      if (state.phase !== 'BIDDING') {
        return { valid: false, error: 'Game is not in BIDDING phase.' };
      }
      if (action.playerId !== state.turnPlayerId) {
        return { valid: false, error: `It is not player ${action.playerId}'s turn to bid.` };
      }
      return validateBid(state.bid, action.tricks, state.config);
    }

    case 'PASS_BID': {
      if (state.phase !== 'BIDDING') {
        return { valid: false, error: 'Game is not in BIDDING phase.' };
      }
      if (action.playerId !== state.turnPlayerId) {
        return { valid: false, error: `It is not player ${action.playerId}'s turn to pass.` };
      }
      return validatePass(state.bid, state.config);
    }

    case 'DECLARE_KAAT': {
      if (state.phase !== 'DECLARING_KAAT') {
        return { valid: false, error: 'Game is not in DECLARING_KAAT phase.' };
      }
      if (action.playerId !== state.bid.declarerId) {
        return { valid: false, error: 'Only the Declarer can declare Kaat.' };
      }
      return { valid: true };
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'PLAYING_HAATH') {
        return { valid: false, error: 'Game is not in PLAYING_HAATH phase.' };
      }
      if (action.playerId !== state.turnPlayerId) {
        return { valid: false, error: `It is not player ${action.playerId}'s turn to play.` };
      }

      const playerHandCardIds = state.hands[action.playerId] || [];
      if (!playerHandCardIds.includes(action.cardId)) {
        return { valid: false, error: `Player does not hold card ${action.cardId}.` };
      }

      const playerHand: Card[] = playerHandCardIds.map((id) => parseCardId(id));
      const playedCard = parseCardId(action.cardId);
      const ledSuit = state.currentTrick?.ledSuit;

      if (!isLegalPlay(playedCard, playerHand, ledSuit)) {
        return { valid: false, error: `Must follow suit (${ledSuit}) if holding cards of that suit.` };
      }

      return { valid: true };
    }

    case 'START_NEXT_HAND': {
      if (state.phase !== 'HAND_SETTLEMENT') {
        return { valid: false, error: 'Cannot start next hand unless current hand is settled.' };
      }
      return { valid: true };
    }

    case 'RESET_GAME': {
      return { valid: true };
    }

    default:
      return { valid: false, error: 'Unknown action type.' };
  }
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  const validation = validateAction(state, action);
  if (!validation.valid) {
    return state;
  }

  switch (action.type) {
    case 'START_GAME': {
      const updatedConfig = action.config || state.config;
      const updatedPlayers = action.players || state.players;
      return dealHandInternal({
        ...state,
        config: updatedConfig,
        players: updatedPlayers,
        phase: 'DEALING',
      });
    }

    case 'DEAL_HAND': {
      return dealHandInternal(state, action.seed);
    }

    case 'PLACE_BID': {
      const updatedBid = applyBid(state.bid, action.playerId, action.tricks);
      const nextTurnPlayerId = getNextPlayerClockwiseById(action.playerId, state.players);

      return {
        ...state,
        bid: updatedBid,
        turnPlayerId: nextTurnPlayerId,
        actionNumber: state.actionNumber + 1,
      };
    }

    case 'PASS_BID': {
      const updatedBid = applyPass(state.bid, action.playerId, state.players.length);

      if (updatedBid.isClosed) {
        return {
          ...state,
          bid: updatedBid,
          phase: 'DECLARING_KAAT',
          turnPlayerId: updatedBid.declarerId,
          actionNumber: state.actionNumber + 1,
        };
      }

      const nextTurnPlayerId = getNextPlayerClockwiseById(action.playerId, state.players);
      return {
        ...state,
        bid: updatedBid,
        turnPlayerId: nextTurnPlayerId,
        actionNumber: state.actionNumber + 1,
      };
    }

    case 'DECLARE_KAAT': {
      const declarerId = action.playerId;
      return {
        ...state,
        phase: 'PLAYING_HAATH',
        trumpSuit: action.suit,
        turnPlayerId: declarerId,
        currentTrick: undefined,
        completedTricks: [],
        actionNumber: state.actionNumber + 1,
      };
    }

    case 'PLAY_CARD': {
      const playerId = action.playerId;
      const cardId = action.cardId;
      const card = parseCardId(cardId);

      const newHand = state.hands[playerId]!.filter((id) => id !== cardId);
      const updatedHands = { ...state.hands, [playerId]: newHand };

      let currentTrick = state.currentTrick;
      if (!currentTrick) {
        currentTrick = {
          leaderId: playerId,
          ledSuit: card.suit,
          plays: [],
        };
      }

      const newPlay: PlayedCard = {
        playerId,
        card,
        order: currentTrick.plays.length,
      };

      const updatedPlays = [...currentTrick.plays, newPlay];
      const isTrickComplete = updatedPlays.length === state.players.length;

      if (!isTrickComplete) {
        const nextTurnPlayerId = getNextPlayerClockwiseById(playerId, state.players);
        return {
          ...state,
          hands: updatedHands,
          currentTrick: {
            ...currentTrick,
            plays: updatedPlays,
          },
          turnPlayerId: nextTurnPlayerId,
          actionNumber: state.actionNumber + 1,
        };
      }

      const completedTrick = {
        ...currentTrick,
        plays: updatedPlays,
      };
      const winnerId = evaluateTrickWinner(updatedPlays, completedTrick.ledSuit, state.trumpSuit);
      completedTrick.winnerId = winnerId;

      const winnerPlayer = state.players.find((p) => p.id === winnerId)!;
      const winnerTeamId = winnerPlayer.teamId;

      const updatedScores = {
        ...state.scores,
        [winnerTeamId]: {
          ...state.scores[winnerTeamId]!,
          tricksWon: state.scores[winnerTeamId]!.tricksWon + 1,
        },
      };

      const newCompletedTricks = [...state.completedTricks, completedTrick];

      if (newCompletedTricks.length === state.config.totalTricks) {
        const declarerPlayer = state.players.find((p) => p.id === state.bid.declarerId)!;
        const declarerTeamId = declarerPlayer.teamId;
        const declarerTricksWon = updatedScores[declarerTeamId]!.tricksWon;

        const settlement = calculateHandSettlement(
          declarerTeamId,
          state.bid.highestBid,
          declarerTricksWon,
          updatedScores,
          state.dealerId,
          state.players,
          state.config
        );

        return {
          ...state,
          hands: updatedHands,
          scores: settlement.updatedScores,
          dealerId: settlement.nextDealerId,
          completedTricks: newCompletedTricks,
          currentTrick: undefined,
          lastSettlement: settlement,
          phase: settlement.isGameOver ? 'GAME_OVER' : 'HAND_SETTLEMENT',
          winningTeamId: settlement.winnerTeamId,
          turnPlayerId: undefined,
          actionNumber: state.actionNumber + 1,
        };
      }

      return {
        ...state,
        hands: updatedHands,
        scores: updatedScores,
        completedTricks: newCompletedTricks,
        currentTrick: undefined,
        turnPlayerId: winnerId,
        actionNumber: state.actionNumber + 1,
      };
    }

    case 'START_NEXT_HAND': {
      return dealHandInternal(state, action.seed);
    }

    case 'RESET_GAME': {
      const resetScores = {
        team_a: { ...state.scores.team_a!, penaltyPoints: 0, coat: 0, tricksWon: 0 },
        team_b: { ...state.scores.team_b!, penaltyPoints: 0, coat: 0, tricksWon: 0 },
      };
      return dealHandInternal({
        ...state,
        scores: resetScores,
        phase: 'DEALING',
        lastSettlement: undefined,
        winningTeamId: undefined,
      });
    }

    default:
      return state;
  }
}

function dealHandInternal(state: GameState, seed?: number): GameState {
  const rawDeck = createDeck(state.config.playerCount);
  const shuffled = shuffleDeck(rawDeck, seed);
  const handsData = dealCards(shuffled, state.players);

  const hands: Record<string, CardId[]> = {};
  for (const [playerId, cardList] of Object.entries(handsData)) {
    hands[playerId] = cardList.map((c) => c.id);
  }

  const dealerPlayer = state.players.find((p) => p.id === state.dealerId)!;
  const firstBidderId = getNextPlayerClockwiseById(dealerPlayer.id, state.players);

  const resetScores = {
    team_a: { ...state.scores.team_a!, tricksWon: 0 },
    team_b: { ...state.scores.team_b!, tricksWon: 0 },
  };

  return {
    ...state,
    phase: 'BIDDING',
    hands,
    scores: resetScores,
    bid: {
      highestBid: 0,
      consecutivePasses: 0,
      isClosed: false,
      history: [],
    },
    trumpSuit: undefined,
    currentTrick: undefined,
    completedTricks: [],
    turnPlayerId: firstBidderId,
    actionNumber: state.actionNumber + 1,
  };
}

function getNextPlayerClockwiseById(currentId: string, players: any[]): string {
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  const currentIndex = sorted.findIndex((p) => p.id === currentId);
  const nextIndex = (currentIndex + 1) % sorted.length;
  return sorted[nextIndex]!.id;
}

function parseCardId(cardId: CardId): Card {
  const lastDash = cardId.lastIndexOf('-');
  const suit = cardId.substring(0, lastDash) as any;
  const rank = cardId.substring(lastDash + 1) as any;
  return { id: cardId, suit, rank };
}
