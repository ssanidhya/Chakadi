import { createCard, SUITS } from '../models/card.ts';
import type { Card, Suit, Rank } from '../models/card.ts';
import type { PlayerCount } from '../models/game-config.ts';
import type { Player, PlayerId } from '../models/player.ts';

export function createDeck(playerCount: PlayerCount): Card[] {
  const ranks6P: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'];
  const ranks4P: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  const ranks = playerCount === 6 ? ranks6P : ranks4P;

  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push(createCard(suit, rank));
    }
  }
  return deck;
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeck(deck: Card[], seed?: number): Card[] {
  const shuffled = [...deck];
  const random = seed !== undefined ? mulberry32(seed) : Math.random;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled;
}

export function dealCards(deck: Card[], players: Player[]): Record<PlayerId, Card[]> {
  const hands: Record<PlayerId, Card[]> = {};
  for (const player of players) {
    hands[player.id] = [];
  }

  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);
  let cardIdx = 0;

  while (cardIdx < deck.length) {
    for (const player of sortedPlayers) {
      if (cardIdx < deck.length) {
        hands[player.id]!.push(deck[cardIdx]!);
        cardIdx++;
      }
    }
  }

  return hands;
}
