import { describe, it, expect } from 'vitest';
import {
  createDeck,
  createDefaultGameConfig,
  GameEngineImpl,
  evaluateTrickWinner,
  calculateHandSettlement,
  serializeGameState,
  hydrateGameState,
  getLegalCards,
  sortCardIds,
  getAutoPlayAction,
} from '../index.ts';
import type { Player, Card, CardId } from '../index.ts';

const SAMPLE_PLAYERS_6P: Player[] = [
  { id: 'p1', name: 'Player 1', teamId: 'team_a', seat: 0 },
  { id: 'p2', name: 'Player 2', teamId: 'team_b', seat: 1 },
  { id: 'p3', name: 'Player 3', teamId: 'team_a', seat: 2 },
  { id: 'p4', name: 'Player 4', teamId: 'team_b', seat: 3 },
  { id: 'p5', name: 'Player 5', teamId: 'team_a', seat: 4 },
  { id: 'p6', name: 'Player 6', teamId: 'team_b', seat: 5 },
];

describe('Chakadi Card Sorting Rules', () => {
  it('sorts hand cards by suit (Hukum -> Lal -> Chidi -> Eet) and rank (highest on left)', () => {
    const unsorted: CardId[] = [
      'diamonds-10',
      'spades-7',
      'hearts-A',
      'spades-K',
      'clubs-Q',
      'hearts-9',
      'spades-A',
    ];

    const sorted = sortCardIds(unsorted);

    expect(sorted).toEqual([
      'spades-A',    // Hukum Ace
      'spades-K',    // Hukum King
      'spades-7',    // Hukum 7
      'hearts-A',    // Lal Ace
      'hearts-9',    // Lal 9
      'clubs-Q',     // Chidi Queen
      'diamonds-10', // Eet 10
    ]);
  });
});

describe('Chakadi Deck Rules', () => {
  it('creates a 48-card deck for 6 players with all 2s removed', () => {
    const deck = createDeck(6);
    expect(deck.length).toBe(48);
    const hasTwos = deck.some((card) => card.rank === '2');
    expect(hasTwos).toBe(false);
  });

  it('creates a 52-card deck for 4 players', () => {
    const deck = createDeck(4);
    expect(deck.length).toBe(52);
    const twosCount = deck.filter((card) => card.rank === '2').length;
    expect(twosCount).toBe(4);
  });
});

describe('Follow-Suit Legality Rules', () => {
  it('requires playing led suit if player holds cards of that suit', () => {
    const hand: Card[] = [
      { id: 'spades-A', suit: 'spades', rank: 'A' },
      { id: 'hearts-K', suit: 'hearts', rank: 'K' },
    ];
    const legalCards = getLegalCards(hand, 'spades');
    expect(legalCards.length).toBe(1);
    expect(legalCards[0]?.id).toBe('spades-A');
  });

  it('allows playing any card when void in led suit', () => {
    const hand: Card[] = [
      { id: 'hearts-K', suit: 'hearts', rank: 'K' },
      { id: 'diamonds-10', suit: 'diamonds', rank: '10' },
    ];
    const legalCards = getLegalCards(hand, 'spades');
    expect(legalCards.length).toBe(2);
  });
});

describe('Trick Winner Evaluation', () => {
  it('evaluates highest rank of led suit when no trumps are played', () => {
    const plays = [
      { playerId: 'p1', card: { id: 'spades-10' as const, suit: 'spades' as const, rank: '10' as const }, order: 0 },
      { playerId: 'p2', card: { id: 'spades-K' as const, suit: 'spades' as const, rank: 'K' as const }, order: 1 },
      { playerId: 'p3', card: { id: 'spades-7' as const, suit: 'spades' as const, rank: '7' as const }, order: 2 },
    ];
    const winnerId = evaluateTrickWinner(plays, 'spades');
    expect(winnerId).toBe('p2');
  });

  it('evaluates highest trump (Kaat) card as winner over higher led suit', () => {
    const plays = [
      { playerId: 'p1', card: { id: 'spades-A' as const, suit: 'spades' as const, rank: 'A' as const }, order: 0 },
      { playerId: 'p2', card: { id: 'hearts-5' as const, suit: 'hearts' as const, rank: '5' as const }, order: 1 }, // Trump!
      { playerId: 'p3', card: { id: 'spades-K' as const, suit: 'spades' as const, rank: 'K' as const }, order: 2 },
    ];
    const winnerId = evaluateTrickWinner(plays, 'spades', 'hearts');
    expect(winnerId).toBe('p2');
  });
});

describe('Bidding & Game Engine Flow', () => {
  it('runs complete bidding phase to Kaat declaration', () => {
    const engine = new GameEngineImpl(SAMPLE_PLAYERS_6P);

    const dealRes = engine.dispatch({ type: 'DEAL_HAND', seed: 12345 });
    expect(dealRes.success).toBe(true);
    expect(engine.getState().phase).toBe('BIDDING');

    const invalidBidRes = engine.dispatch({ type: 'PLACE_BID', playerId: 'p2', tricks: 4 });
    expect(invalidBidRes.success).toBe(false);

    expect(engine.dispatch({ type: 'PLACE_BID', playerId: 'p2', tricks: 5 }).success).toBe(true);
    expect(engine.getState().bid.highestBid).toBe(5);

    expect(engine.dispatch({ type: 'PASS_BID', playerId: 'p3' }).success).toBe(true);
    expect(engine.dispatch({ type: 'PASS_BID', playerId: 'p4' }).success).toBe(true);
    expect(engine.dispatch({ type: 'PASS_BID', playerId: 'p5' }).success).toBe(true);
    expect(engine.dispatch({ type: 'PASS_BID', playerId: 'p6' }).success).toBe(true);
    expect(engine.dispatch({ type: 'PASS_BID', playerId: 'p1' }).success).toBe(true);

    const state = engine.getState();
    expect(state.phase).toBe('DECLARING_KAAT');
    expect(state.bid.declarerId).toBe('p2');

    expect(engine.dispatch({ type: 'DECLARE_KAAT', playerId: 'p2', suit: 'hearts' }).success).toBe(true);
    expect(engine.getState().phase).toBe('PLAYING_HAATH');
    expect(engine.getState().trumpSuit).toBe('hearts');
    expect(engine.getState().turnPlayerId).toBe('p2');
  });
});

describe('Scoring, Penalty Points & 48-Point Coat Mechanics', () => {
  it('calculates contract success penalty award', () => {
    const scores = {
      team_a: { teamId: 'team_a' as const, penaltyPoints: 0, coat: 0, tricksWon: 5 },
      team_b: { teamId: 'team_b' as const, penaltyPoints: 0, coat: 0, tricksWon: 3 },
    };
    const config = createDefaultGameConfig(6);

    const settlement = calculateHandSettlement(
      'team_a',
      5,
      5,
      scores,
      'p1',
      SAMPLE_PLAYERS_6P,
      config
    );

    expect(settlement.contractSucceeded).toBe(true);
    expect(settlement.penaltyAward).toBe(5);
    expect(settlement.awardedToTeamId).toBe('team_b');
  });

  it('triggers 48-point Coat wrap-around and same-team dealer rotation', () => {
    const scores = {
      team_a: { teamId: 'team_a' as const, penaltyPoints: 45, coat: 0, tricksWon: 3 },
      team_b: { teamId: 'team_b' as const, penaltyPoints: 0, coat: 0, tricksWon: 5 },
    };
    const config = createDefaultGameConfig(6);

    const settlement = calculateHandSettlement(
      'team_a',
      5,
      3,
      scores,
      'p1',
      SAMPLE_PLAYERS_6P,
      config
    );

    expect(settlement.updatedScores.team_a.coat).toBe(1);
    expect(settlement.updatedScores.team_a.penaltyPoints).toBe(7);
    expect(settlement.nextDealerId).toBe('p3');
  });

  it('correctly transfers carryOver to non-dealer team on zero-crossing when declarer fails contract', () => {
    // Declarer: Team A, Dealer: p2 (Team B)
    // Team A bid 5 tricks, won only 3 (failed contract: penalty = 10 pts to Team A)
    // Dealer Team B currently has 4 penalty points
    // Cancellation: 4 - 10 = -6 -> Team B penalty drops to 0, carryOver 6 transferred to Team A!
    const scores = {
      team_a: { teamId: 'team_a' as const, penaltyPoints: 0, coat: 0, tricksWon: 3 },
      team_b: { teamId: 'team_b' as const, penaltyPoints: 4, coat: 0, tricksWon: 5 },
    };
    const config = createDefaultGameConfig(6);

    const settlement = calculateHandSettlement(
      'team_a',
      5,
      3,
      scores,
      'p2', // dealer is p2 (Team B)
      SAMPLE_PLAYERS_6P,
      config
    );

    expect(settlement.contractSucceeded).toBe(false);
    expect(settlement.penaltyAward).toBe(10);
    expect(settlement.awardedToTeamId).toBe('team_a');
    expect(settlement.updatedScores.team_b.penaltyPoints).toBe(0);
    expect(settlement.updatedScores.team_a.penaltyPoints).toBe(6);
  });
});

describe('State Serialization & Hydration', () => {
  it('serializes and hydrates GameState without loss of information', () => {
    const engine = new GameEngineImpl(SAMPLE_PLAYERS_6P);
    engine.dispatch({ type: 'DEAL_HAND', seed: 42 });
    const originalState = engine.getState();

    const json = serializeGameState(originalState);
    const hydratedState = hydrateGameState(json);

    expect(hydratedState.version).toBe(1);
    expect(hydratedState.dealerId).toBe(originalState.dealerId);
    expect(hydratedState.phase).toBe(originalState.phase);
    expect(hydratedState.hands).toEqual(originalState.hands);
  });
});

describe('Auto-Play Disconnect Fallback & Turn Timeout Rules', () => {
  it('auto-bids minimum bid for opening player in BIDDING phase', () => {
    const engine = new GameEngineImpl(SAMPLE_PLAYERS_6P);
    engine.dispatch({ type: 'DEAL_HAND', seed: 100 });
    const state = engine.getState();

    const action = getAutoPlayAction(state);
    expect(action).toEqual({
      type: 'PLACE_BID',
      playerId: state.turnPlayerId,
      tricks: 5,
    });
  });

  it('auto-passes in BIDDING phase when opening bid already placed', () => {
    const engine = new GameEngineImpl(SAMPLE_PLAYERS_6P);
    engine.dispatch({ type: 'DEAL_HAND', seed: 100 });
    engine.dispatch({ type: 'PLACE_BID', playerId: 'p2', tricks: 5 });
    const state = engine.getState();

    const action = getAutoPlayAction(state);
    expect(action).toEqual({
      type: 'PASS_BID',
      playerId: 'p3',
    });
  });

  it('auto-declares Kaat for suit with max count in declarer hand', () => {
    const engine = new GameEngineImpl(SAMPLE_PLAYERS_6P);
    engine.dispatch({ type: 'DEAL_HAND', seed: 100 });
    // Force state into DECLARING_KAAT with specific hand
    const state = {
      ...engine.getState(),
      phase: 'DECLARING_KAAT' as const,
      bid: { ...engine.getState().bid, declarerId: 'p2' },
      hands: {
        ...engine.getState().hands,
        p2: ['hearts-A', 'hearts-K', 'hearts-10', 'spades-5', 'diamonds-3'],
      },
    };

    const action = getAutoPlayAction(state);
    expect(action).toEqual({
      type: 'DECLARE_KAAT',
      playerId: 'p2',
      suit: 'hearts',
    });
  });

  it('auto-plays lowest legal card following suit in PLAYING_HAATH phase', () => {
    const engine = new GameEngineImpl(SAMPLE_PLAYERS_6P);
    engine.dispatch({ type: 'DEAL_HAND', seed: 100 });
    const state = {
      ...engine.getState(),
      phase: 'PLAYING_HAATH' as const,
      turnPlayerId: 'p2',
      currentTrick: {
        leaderId: 'p1',
        ledSuit: 'spades' as const,
        plays: [
          { playerId: 'p1', card: { id: 'spades-A' as const, suit: 'spades' as const, rank: 'A' as const }, order: 0 },
        ],
      },
      hands: {
        ...engine.getState().hands,
        p2: ['spades-K', 'spades-3', 'hearts-A'],
      },
    };

    const action = getAutoPlayAction(state);
    expect(action).toEqual({
      type: 'PLAY_CARD',
      playerId: 'p2',
      cardId: 'spades-3', // lowest legal spade!
    });
  });
});
