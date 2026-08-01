import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeck,
  createDefaultGameConfig,
  GameEngineImpl,
  evaluateTrickWinner,
  calculateHandSettlement,
  serializeGameState,
  hydrateGameState,
  getLegalCards,
} from '../index.ts';
import type { Player, Card } from '../index.ts';

const SAMPLE_PLAYERS_6P: Player[] = [
  { id: 'p1', name: 'Player 1', teamId: 'team_a', seat: 0 },
  { id: 'p2', name: 'Player 2', teamId: 'team_b', seat: 1 },
  { id: 'p3', name: 'Player 3', teamId: 'team_a', seat: 2 },
  { id: 'p4', name: 'Player 4', teamId: 'team_b', seat: 3 },
  { id: 'p5', name: 'Player 5', teamId: 'team_a', seat: 4 },
  { id: 'p6', name: 'Player 6', teamId: 'team_b', seat: 5 },
];

describe('Chakadi Deck Rules', () => {
  it('creates a 48-card deck for 6 players with all 2s removed', () => {
    const deck = createDeck(6);
    assert.equal(deck.length, 48);
    const hasTwos = deck.some((card) => card.rank === '2');
    assert.equal(hasTwos, false);
  });

  it('creates a 52-card deck for 4 players', () => {
    const deck = createDeck(4);
    assert.equal(deck.length, 52);
    const twosCount = deck.filter((card) => card.rank === '2').length;
    assert.equal(twosCount, 4);
  });
});

describe('Follow-Suit Legality Rules', () => {
  it('requires playing led suit if player holds cards of that suit', () => {
    const hand: Card[] = [
      { id: 'spades-A', suit: 'spades', rank: 'A' },
      { id: 'hearts-K', suit: 'hearts', rank: 'K' },
    ];
    const legalCards = getLegalCards(hand, 'spades');
    assert.equal(legalCards.length, 1);
    assert.equal(legalCards[0]?.id, 'spades-A');
  });

  it('allows playing any card when void in led suit', () => {
    const hand: Card[] = [
      { id: 'hearts-K', suit: 'hearts', rank: 'K' },
      { id: 'diamonds-10', suit: 'diamonds', rank: '10' },
    ];
    const legalCards = getLegalCards(hand, 'spades');
    assert.equal(legalCards.length, 2);
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
    assert.equal(winnerId, 'p2');
  });

  it('evaluates highest trump (Kaat) card as winner over higher led suit', () => {
    const plays = [
      { playerId: 'p1', card: { id: 'spades-A' as const, suit: 'spades' as const, rank: 'A' as const }, order: 0 },
      { playerId: 'p2', card: { id: 'hearts-5' as const, suit: 'hearts' as const, rank: '5' as const }, order: 1 }, // Trump!
      { playerId: 'p3', card: { id: 'spades-K' as const, suit: 'spades' as const, rank: 'K' as const }, order: 2 },
    ];
    const winnerId = evaluateTrickWinner(plays, 'spades', 'hearts');
    assert.equal(winnerId, 'p2');
  });
});

describe('Bidding & Game Engine Flow', () => {
  it('runs complete bidding phase to Kaat declaration', () => {
    const engine = new GameEngineImpl(SAMPLE_PLAYERS_6P);

    // Start game & deal
    const dealRes = engine.dispatch({ type: 'DEAL_HAND', seed: 12345 });
    assert.equal(dealRes.success, true);
    assert.equal(engine.getState().phase, 'BIDDING');

    // First player MUST bid at least 5 in 6P
    const invalidBidRes = engine.dispatch({ type: 'PLACE_BID', playerId: 'p2', tricks: 4 });
    assert.equal(invalidBidRes.success, false);

    // p2 opens with 5
    assert.equal(engine.dispatch({ type: 'PLACE_BID', playerId: 'p2', tricks: 5 }).success, true);
    assert.equal(engine.getState().bid.highestBid, 5);

    // p3, p4, p5, p6, p1 pass
    assert.equal(engine.dispatch({ type: 'PASS_BID', playerId: 'p3' }).success, true);
    assert.equal(engine.dispatch({ type: 'PASS_BID', playerId: 'p4' }).success, true);
    assert.equal(engine.dispatch({ type: 'PASS_BID', playerId: 'p5' }).success, true);
    assert.equal(engine.dispatch({ type: 'PASS_BID', playerId: 'p6' }).success, true);
    assert.equal(engine.dispatch({ type: 'PASS_BID', playerId: 'p1' }).success, true);

    // Boli closes! Phase transitions to DECLARING_KAAT
    const state = engine.getState();
    assert.equal(state.phase, 'DECLARING_KAAT');
    assert.equal(state.bid.declarerId, 'p2');

    // Declarer declares Kaat (Hearts)
    assert.equal(engine.dispatch({ type: 'DECLARE_KAAT', playerId: 'p2', suit: 'hearts' }).success, true);
    assert.equal(engine.getState().phase, 'PLAYING_HAATH');
    assert.equal(engine.getState().trumpSuit, 'hearts');
    assert.equal(engine.getState().turnPlayerId, 'p2'); // Declarer leads first Haath
  });
});

describe('Scoring, Gunti & 48-Point Coat Mechanics', () => {
  it('calculates contract success penalty award', () => {
    const scores = {
      team_a: { teamId: 'team_a' as const, penaltyPoints: 0, coat: 0, tricksWon: 5 },
      team_b: { teamId: 'team_b' as const, penaltyPoints: 0, coat: 0, tricksWon: 3 },
    };
    const config = createDefaultGameConfig(6);

    // Team A bids 5 and succeeds (won 5 tricks)
    const settlement = calculateHandSettlement(
      'team_a',
      5,
      5,
      scores,
      'p1', // Team A dealer
      SAMPLE_PLAYERS_6P,
      config
    );

    assert.equal(settlement.contractSucceeded, true);
    assert.equal(settlement.penaltyAward, 5);
    assert.equal(settlement.awardedToTeamId, 'team_b');
  });

  it('triggers 48-point Coat wrap-around and same-team dealer rotation', () => {
    const scores = {
      team_a: { teamId: 'team_a' as const, penaltyPoints: 45, coat: 0, tricksWon: 3 },
      team_b: { teamId: 'team_b' as const, penaltyPoints: 0, coat: 0, tricksWon: 5 },
    };
    const config = createDefaultGameConfig(6);

    // Team A (dealer team) bids 5 and fails (only won 3 tricks) -> +10 penalty to Team A
    const settlement = calculateHandSettlement(
      'team_a',
      5,
      3,
      scores,
      'p1', // Team A dealer (seat 0)
      SAMPLE_PLAYERS_6P,
      config
    );

    // 45 + 10 = 55 -> Coat awarded, penalty = 55 - 48 = 7
    assert.equal(settlement.updatedScores.team_a.coat, 1);
    assert.equal(settlement.updatedScores.team_a.penaltyPoints, 7);

    // Dealer stays on Team A, but rotates to next teammate (p3 at seat 2)
    assert.equal(settlement.nextDealerId, 'p3');
  });
});

describe('State Serialization & Hydration', () => {
  it('serializes and hydrates GameState without loss of information', () => {
    const engine = new GameEngineImpl(SAMPLE_PLAYERS_6P);
    engine.dispatch({ type: 'DEAL_HAND', seed: 42 });
    const originalState = engine.getState();

    const json = serializeGameState(originalState);
    const hydratedState = hydrateGameState(json);

    assert.equal(hydratedState.version, 1);
    assert.equal(hydratedState.dealerId, originalState.dealerId);
    assert.equal(hydratedState.phase, originalState.phase);
    assert.deepEqual(hydratedState.hands, originalState.hands);
  });
});
