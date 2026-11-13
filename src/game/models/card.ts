export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank =
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | '10'
  | '9'
  | '8'
  | '7'
  | '6'
  | '5'
  | '4'
  | '3'
  | '2';

export type CardId = `${Suit}-${Rank}`;

export interface Card {
  id: CardId;
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const HINDI_SUIT_NAMES: Record<Suit, string> = {
  spades: 'Hukum',
  hearts: 'Paan / Lal',
  diamonds: 'Eet',
  clubs: 'Chidi',
};

export const RANK_VALUES: Record<Rank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  '10': 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
};

// Required Suit Order (Left to Right): Hukum (♠) -> Lal (♥) -> Chidi (♣) -> Eet (♦)
export const SUIT_SORT_ORDER: Record<Suit, number> = {
  spades: 1,   // Hukum
  hearts: 2,   // Lal / Paan
  clubs: 3,    // Chidi
  diamonds: 4, // Eet
};

export function createCard(suit: Suit, rank: Rank): Card {
  return {
    id: `${suit}-${rank}`,
    suit,
    rank,
  };
}

export function parseCardId(cardId: CardId): Card {
  const lastDash = cardId.lastIndexOf('-');
  const suit = cardId.substring(0, lastDash) as Suit;
  const rank = cardId.substring(lastDash + 1) as Rank;
  return { id: cardId, suit, rank };
}

export function sortCardIds(cardIds: CardId[]): CardId[] {
  return [...cardIds].sort((aId, bId) => {
    const a = parseCardId(aId);
    const b = parseCardId(bId);

    // Primary: Suit Order (Hukum -> Lal -> Chidi -> Eet)
    const suitDiff = SUIT_SORT_ORDER[a.suit] - SUIT_SORT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;

    // Secondary: Rank (Descending - Biggest rank first on left)
    return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
  });
}
