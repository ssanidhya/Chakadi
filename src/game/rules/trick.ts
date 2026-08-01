import { RANK_VALUES } from '../models/card.ts';
import type { Card, Suit } from '../models/card.ts';
import type { PlayerId } from '../models/player.ts';

export interface PlayedCard {
  playerId: PlayerId;
  card: Card;
  order: number;
}

export interface Trick {
  leaderId: PlayerId;
  ledSuit: Suit;
  plays: PlayedCard[];
  winnerId?: PlayerId;
}

export function getLegalCards(hand: Card[], ledSuit?: Suit): Card[] {
  if (!ledSuit) {
    return [...hand];
  }

  const suitCards = hand.filter((card) => card.suit === ledSuit);
  if (suitCards.length > 0) {
    return suitCards;
  }

  return [...hand];
}

export function isLegalPlay(card: Card, hand: Card[], ledSuit?: Suit): boolean {
  const legalCards = getLegalCards(hand, ledSuit);
  return legalCards.some((c) => c.id === card.id);
}

export function evaluateTrickWinner(
  plays: PlayedCard[],
  ledSuit: Suit,
  trumpSuit?: Suit
): PlayerId {
  if (plays.length === 0) {
    throw new Error('Cannot evaluate winner of empty trick.');
  }

  const trumpPlays = trumpSuit
    ? plays.filter((p) => p.card.suit === trumpSuit)
    : [];

  if (trumpPlays.length > 0) {
    let winner = trumpPlays[0]!;
    for (let i = 1; i < trumpPlays.length; i++) {
      const candidate = trumpPlays[i]!;
      if (RANK_VALUES[candidate.card.rank] > RANK_VALUES[winner.card.rank]) {
        winner = candidate;
      }
    }
    return winner.playerId;
  }

  const ledSuitPlays = plays.filter((p) => p.card.suit === ledSuit);
  let winner = ledSuitPlays[0]!;
  for (let i = 1; i < ledSuitPlays.length; i++) {
    const candidate = ledSuitPlays[i]!;
    if (RANK_VALUES[candidate.card.rank] > RANK_VALUES[winner.card.rank]) {
      winner = candidate;
    }
  }

  return winner.playerId;
}
