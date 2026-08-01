import type { GameConfig } from '../models/game-config.ts';
import type { PlayerId } from '../models/player.ts';

export interface BidState {
  highestBid: number;
  highestBidderId?: PlayerId;
  consecutivePasses: number;
  isClosed: boolean;
  declarerId?: PlayerId;
  history: Array<{ playerId: PlayerId; type: 'bid' | 'pass'; amount?: number }>;
}

export function createInitialBidState(): BidState {
  return {
    highestBid: 0,
    consecutivePasses: 0,
    isClosed: false,
    history: [],
  };
}

export function validateBid(
  bidState: BidState,
  tricks: number,
  config: GameConfig
): { valid: boolean; error?: string } {
  if (bidState.isClosed) {
    return { valid: false, error: 'Bidding is already closed.' };
  }

  if (tricks > config.totalTricks) {
    return { valid: false, error: `Bid cannot exceed maximum tricks (${config.totalTricks}).` };
  }

  if (bidState.highestBid === 0) {
    if (tricks < config.minBid) {
      return { valid: false, error: `Opening bid must be at least ${config.minBid}.` };
    }
  } else {
    if (tricks <= bidState.highestBid) {
      return { valid: false, error: `Bid must be strictly higher than current highest bid (${bidState.highestBid}).` };
    }
  }

  return { valid: true };
}

export function validatePass(
  bidState: BidState,
  config: GameConfig
): { valid: boolean; error?: string } {
  if (bidState.isClosed) {
    return { valid: false, error: 'Bidding is already closed.' };
  }

  if (bidState.highestBid === 0) {
    return { valid: false, error: `Opening player cannot pass; must open with at least ${config.minBid}.` };
  }

  return { valid: true };
}

export function applyBid(
  bidState: BidState,
  playerId: PlayerId,
  tricks: number
): BidState {
  return {
    ...bidState,
    highestBid: tricks,
    highestBidderId: playerId,
    consecutivePasses: 0,
    history: [...bidState.history, { playerId, type: 'bid', amount: tricks }],
  };
}

export function applyPass(
  bidState: BidState,
  playerId: PlayerId,
  totalPlayers: number
): BidState {
  const newPasses = bidState.consecutivePasses + 1;
  const isClosed = bidState.highestBidderId !== undefined && newPasses >= totalPlayers - 1;

  return {
    ...bidState,
    consecutivePasses: newPasses,
    isClosed,
    declarerId: isClosed ? bidState.highestBidderId : undefined,
    history: [...bidState.history, { playerId, type: 'pass' }],
  };
}
