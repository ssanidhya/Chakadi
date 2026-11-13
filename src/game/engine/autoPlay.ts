import type { GameState } from './state.ts';
import type { GameAction } from './actions.ts';
import { parseCardId, RANK_VALUES, SUITS } from '../models/card.ts';
import type { Card, Suit } from '../models/card.ts';
import { getLegalCards } from '../rules/trick.ts';

/**
 * Computes the safest legal fallback action for the current turn player.
 * Used when a player disconnects or their turn timer expires.
 */
export function getAutoPlayAction(state: GameState): GameAction | null {
  if (state.phase === 'BIDDING') {
    const turnPlayerId = state.turnPlayerId;
    if (!turnPlayerId) return null;

    if (state.bid.highestBid === 0) {
      return {
        type: 'PLACE_BID',
        playerId: turnPlayerId,
        tricks: state.config.minBid,
      };
    }

    return {
      type: 'PASS_BID',
      playerId: turnPlayerId,
    };
  }

  if (state.phase === 'DECLARING_KAAT') {
    const declarerId = state.bid.declarerId;
    if (!declarerId) return null;

    const handCardIds = state.hands[declarerId] || [];
    const handCards = handCardIds.map((id) => parseCardId(id));

    // Select the suit with the greatest card count in hand
    const suitCounts: Record<Suit, number> = {
      spades: 0,
      hearts: 0,
      diamonds: 0,
      clubs: 0,
    };
    for (const card of handCards) {
      suitCounts[card.suit]++;
    }

    let bestSuit: Suit = 'spades';
    let maxCount = -1;
    for (const suit of SUITS) {
      if (suitCounts[suit] > maxCount) {
        maxCount = suitCounts[suit];
        bestSuit = suit;
      }
    }

    return {
      type: 'DECLARE_KAAT',
      playerId: declarerId,
      suit: bestSuit,
    };
  }

  if (state.phase === 'PLAYING_HAATH') {
    const turnPlayerId = state.turnPlayerId;
    if (!turnPlayerId) return null;

    const handCardIds = state.hands[turnPlayerId] || [];
    if (handCardIds.length === 0) return null;

    const handCards: Card[] = handCardIds.map((id) => parseCardId(id));
    const ledSuit = state.currentTrick?.ledSuit;
    const legalCards = getLegalCards(handCards, ledSuit);

    // Pick the lowest ranked legal card to preserve high cards
    const sortedLegal = [...legalCards].sort(
      (a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]
    );
    const chosenCard = sortedLegal[0];
    if (!chosenCard) return null;

    return {
      type: 'PLAY_CARD',
      playerId: turnPlayerId,
      cardId: chosenCard.id,
    };
  }

  return null;
}
