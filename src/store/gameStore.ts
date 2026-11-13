import { create } from 'zustand';
import {
  GameEngineImpl,
  createDefaultGameConfig,
  GameState,
  GameConfig,
  Player,
  PlayerId,
  Suit,
  CardId,
  getLegalCards,
  parseCardId,
  Card,
} from '../game/index.ts';
import type { NetworkAdapter } from '../networking/adapter.ts';
import { useSettingsStore } from './settingsStore.ts';
import {
  playCardPlaySound,
  playDealSound,
  playTrickWinSound,
  playBidDingSound,
  triggerHapticVibration,
} from '../utils/sound.ts';
import { logInfo, logWarn } from '../utils/logger.ts';

const DEFAULT_6P_PLAYERS: Player[] = [
  { id: 'p1', name: 'Player 1', teamId: 'team_a', seat: 0 },
  { id: 'p2', name: 'Player 2', teamId: 'team_b', seat: 1 },
  { id: 'p3', name: 'Player 3', teamId: 'team_a', seat: 2 },
  { id: 'p4', name: 'Player 4', teamId: 'team_b', seat: 3 },
  { id: 'p5', name: 'Player 5', teamId: 'team_a', seat: 4 },
  { id: 'p6', name: 'Player 6', teamId: 'team_b', seat: 5 },
];

interface GameStore {
  engine: GameEngineImpl;
  gameState: GameState;
  activeViewPlayerId: PlayerId;
  activeAdapter: NetworkAdapter | null;

  // Actions
  startGame: (players?: Player[], config?: GameConfig) => void;
  dealHand: (seed?: number) => void;
  placeBid: (playerId: PlayerId, tricks: number) => { success: boolean; error?: string };
  passBid: (playerId: PlayerId) => { success: boolean; error?: string };
  declareKaat: (playerId: PlayerId, suit: Suit) => { success: boolean; error?: string };
  playCard: (playerId: PlayerId, cardId: CardId) => { success: boolean; error?: string };
  startNextHand: (seed?: number) => void;
  resetGame: () => void;
  setActiveViewPlayerId: (playerId: PlayerId) => void;
  setActiveAdapter: (adapter: NetworkAdapter | null) => void;
  syncFromNetwork: (state: GameState) => void;

  // Derived Helpers
  getLegalCardsForActivePlayer: () => CardId[];
}

export const useGameStore = create<GameStore>((set, get) => {
  const initialEngine = new GameEngineImpl(DEFAULT_6P_PLAYERS, createDefaultGameConfig(6));

  const syncState = () => {
    const activeEngine = get().engine;
    const currentState = activeEngine.getState();
    set({ gameState: currentState });
  };

  initialEngine.subscribe((event) => {
    syncState();
    handleAudioAndHaptics(event.type);
  });

  return {
    engine: initialEngine,
    gameState: initialEngine.getState(),
    activeViewPlayerId: 'p1',
    activeAdapter: null,

    startGame: (players = DEFAULT_6P_PLAYERS, config = createDefaultGameConfig(players.length as 4 | 6)) => {
      logInfo('STORE', 'Starting new game match', { playerCount: players.length });
      const newEngine = new GameEngineImpl(players, config);

      newEngine.subscribe((event) => {
        const currentState = newEngine.getState();
        set({ gameState: currentState });

        // Auto-switch view to current turn player during bidding/playing only if no activeAdapter (i.e. single device / dev match)
        if (currentState.turnPlayerId && !get().activeAdapter) {
          set({ activeViewPlayerId: currentState.turnPlayerId });
        }

        handleAudioAndHaptics(event.type);
      });

      newEngine.dispatch({ type: 'START_GAME', players, config });

      const firstState = newEngine.getState();
      set({
        engine: newEngine,
        gameState: firstState,
      });
      if (!get().activeAdapter) {
        set({ activeViewPlayerId: firstState.turnPlayerId || players[0]!.id });
      }
    },

    dealHand: (seed) => {
      const { engine, activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.send({
          type: 'DISPATCH_ACTION',
          roomId: '',
          action: { type: 'DEAL_HAND', seed },
        });
        return;
      }
      engine.dispatch({ type: 'DEAL_HAND', seed });
      syncState();
    },

    placeBid: (playerId, tricks) => {
      const { engine, activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.send({
          type: 'DISPATCH_ACTION',
          roomId: '',
          action: { type: 'PLACE_BID', playerId, tricks },
        });
        return { success: true };
      }
      const res = engine.dispatch({ type: 'PLACE_BID', playerId, tricks });
      syncState();
      return { success: res.success, error: res.error };
    },

    passBid: (playerId) => {
      const { engine, activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.send({
          type: 'DISPATCH_ACTION',
          roomId: '',
          action: { type: 'PASS_BID', playerId },
        });
        return { success: true };
      }
      const res = engine.dispatch({ type: 'PASS_BID', playerId });
      syncState();
      return { success: res.success, error: res.error };
    },

    declareKaat: (playerId, suit) => {
      const { engine, activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.send({
          type: 'DISPATCH_ACTION',
          roomId: '',
          action: { type: 'DECLARE_KAAT', playerId, suit },
        });
        return { success: true };
      }
      const res = engine.dispatch({ type: 'DECLARE_KAAT', playerId, suit });
      syncState();
      return { success: res.success, error: res.error };
    },

    playCard: (playerId, cardId) => {
      const { engine, activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.send({
          type: 'DISPATCH_ACTION',
          roomId: '',
          action: { type: 'PLAY_CARD', playerId, cardId },
        });
        return { success: true };
      }
      const res = engine.dispatch({ type: 'PLAY_CARD', playerId, cardId });
      syncState();
      return { success: res.success, error: res.error };
    },

    startNextHand: (seed) => {
      const { engine, activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.send({
          type: 'DISPATCH_ACTION',
          roomId: '',
          action: { type: 'START_NEXT_HAND', seed },
        });
        return;
      }
      engine.dispatch({ type: 'START_NEXT_HAND', seed });
      syncState();
    },

    resetGame: () => {
      const { engine, activeAdapter } = get();
      if (activeAdapter) {
        activeAdapter.send({
          type: 'DISPATCH_ACTION',
          roomId: '',
          action: { type: 'RESET_GAME' },
        });
        return;
      }
      engine.reset();
      syncState();
    },

    setActiveViewPlayerId: (playerId) => {
      set({ activeViewPlayerId: playerId });
    },

    setActiveAdapter: (adapter) => {
      set({ activeAdapter: adapter });
    },

    syncFromNetwork: (state) => {
      set({ gameState: state });
    },

    getLegalCardsForActivePlayer: () => {
      const { gameState, activeViewPlayerId } = get();
      const playerHandCardIds = gameState.hands[activeViewPlayerId] || [];
      if (gameState.phase !== 'PLAYING_HAATH' || gameState.turnPlayerId !== activeViewPlayerId) {
        return [];
      }

      const playerHand: Card[] = playerHandCardIds.map((id) => parseCardId(id));
      const ledSuit = gameState.currentTrick?.ledSuit;
      const legalCards = getLegalCards(playerHand, ledSuit);
      return legalCards.map((c) => c.id);
    },
  };
});

function handleAudioAndHaptics(eventType: string) {
  const settings = useSettingsStore.getState();

  if (eventType === 'HAND_DEALT') {
    if (settings.soundEnabled) playDealSound();
  } else if (eventType === 'BID_PLACED') {
    if (settings.soundEnabled) playBidDingSound();
    if (settings.hapticsEnabled) triggerHapticVibration(25);
  } else if (eventType === 'CARD_PLAYED') {
    if (settings.soundEnabled) playCardPlaySound();
    if (settings.hapticsEnabled) triggerHapticVibration(30);
  } else if (eventType === 'HAATH_WON') {
    if (settings.soundEnabled) playTrickWinSound();
    if (settings.hapticsEnabled) triggerHapticVibration([40, 50, 40]);
  }
}

function parseCardId(cardId: CardId): Card {
  const lastDash = cardId.lastIndexOf('-');
  const suit = cardId.substring(0, lastDash) as Suit;
  const rank = cardId.substring(lastDash + 1) as any;
  return { id: cardId, suit, rank };
}
