import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngineImpl, createDefaultGameConfig } from '../../game/index.ts';
import type { Player } from '../../game/index.ts';
import { LocalAdapter } from '../localAdapter.ts';
import { validateClientMessage } from '../schemas.ts';

const TEST_PLAYERS: Player[] = [
  { id: 'p1', name: 'P1', teamId: 'team_a', seat: 0 },
  { id: 'p2', name: 'P2', teamId: 'team_b', seat: 1 },
  { id: 'p3', name: 'P3', teamId: 'team_a', seat: 2 },
  { id: 'p4', name: 'P4', teamId: 'team_b', seat: 3 },
  { id: 'p5', name: 'P5', teamId: 'team_a', seat: 4 },
  { id: 'p6', name: 'P6', teamId: 'team_b', seat: 5 },
];

describe('NetworkAdapter & LocalAdapter Tests', () => {
  it('connects LocalAdapter and broadcasts initial state', async () => {
    const engine = new GameEngineImpl(TEST_PLAYERS, createDefaultGameConfig(6));
    const adapter = new LocalAdapter('p1', engine);

    let receivedState: any = null;
    adapter.subscribe((msg) => {
      if (msg.type === 'SYNC_STATE') {
        receivedState = msg.state;
      }
    });

    await adapter.connect({
      roomId: 'room-101',
      hostId: 'p1',
      players: TEST_PLAYERS,
      maxPlayers: 6,
    });

    assert.equal(adapter.getConnectionState(), 'connected');
    assert.notEqual(receivedState, null);
    assert.equal(receivedState.dealerId, 'p1');
  });

  it('dispatches ClientMessage through LocalAdapter to update state', async () => {
    const engine = new GameEngineImpl(TEST_PLAYERS, createDefaultGameConfig(6));
    const adapter = new LocalAdapter('p1', engine);
    await adapter.connect({
      roomId: 'room-101',
      hostId: 'p1',
      players: TEST_PLAYERS,
      maxPlayers: 6,
    });

    adapter.send({
      type: 'DISPATCH_ACTION',
      roomId: 'room-101',
      action: { type: 'DEAL_HAND', seed: 999 },
    });

    assert.equal(engine.getState().phase, 'BIDDING');
  });

  it('validates wire messages using validateClientMessage', () => {
    const validMessage = {
      type: 'DISPATCH_ACTION',
      roomId: 'room-1',
      action: { type: 'PASS_BID', playerId: 'p2' },
    };

    const parseRes = validateClientMessage(validMessage);
    assert.equal(parseRes.success, true);
  });
});
