export type PlayerCount = 4 | 6;

export interface GameConfig {
  playerCount: PlayerCount;
  minBid: number;                  // 5 for 6P, 7 for 4P
  targetPointThreshold: number;   // 48 by default
  coatLimit: number;              // 1 by default
  cardsPerPlayer: number;         // 8 for 6P, 13 for 4P
  totalTricks: number;            // 8 for 6P, 13 for 4P
}

export function createDefaultGameConfig(playerCount: PlayerCount = 6): GameConfig {
  if (playerCount === 6) {
    return {
      playerCount: 6,
      minBid: 5,
      targetPointThreshold: 48,
      coatLimit: 1,
      cardsPerPlayer: 8,
      totalTricks: 8,
    };
  } else {
    return {
      playerCount: 4,
      minBid: 7,
      targetPointThreshold: 48,
      coatLimit: 1,
      cardsPerPlayer: 13,
      totalTricks: 13,
    };
  }
}
