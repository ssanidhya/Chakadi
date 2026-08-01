import React from 'react';
import { useGameStore } from '../../store/gameStore.ts';
import { Suit, HINDI_SUIT_NAMES } from '../../game/index.ts';

const SUITS_CONFIG: Array<{ suit: Suit; icon: string; color: string }> = [
  { suit: 'spades', icon: '♠', color: 'bg-slate-900 border-slate-700 text-slate-100' },
  { suit: 'hearts', icon: '♥', color: 'bg-red-950/80 border-red-800 text-red-400' },
  { suit: 'diamonds', icon: '♦', color: 'bg-red-950/80 border-red-800 text-red-400' },
  { suit: 'clubs', icon: '♣', color: 'bg-slate-900 border-slate-700 text-slate-100' },
];

export const KaatPicker: React.FC = () => {
  const { gameState, declareKaat } = useGameStore();
  const { phase, bid, players } = gameState;

  if (phase !== 'DECLARING_KAAT' || !bid.declarerId) return null;

  const declarer = players.find((p) => p.id === bid.declarerId);

  const handleSelectSuit = (suit: Suit) => {
    declareKaat(bid.declarerId!, suit);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center gap-4 text-center">
        {/* Header */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Declare Kaat (Trump)</span>
          <h2 className="text-xl font-bold text-white mt-0.5">{declarer?.name}'s Choice</h2>
          <p className="text-xs text-slate-400 mt-1">
            Won Boli contract at <span className="font-bold text-amber-300">{bid.highestBid} tricks</span>. Declare trump suit for this hand:
          </p>
        </div>

        {/* 4 Suit Picker Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          {SUITS_CONFIG.map(({ suit, icon, color }) => (
            <button
              key={suit}
              onClick={() => handleSelectSuit(suit)}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105 active:scale-95 cursor-pointer ${color}`}
            >
              <span className="text-3xl">{icon}</span>
              <span className="text-sm font-bold">{HINDI_SUIT_NAMES[suit]}</span>
              <span className="text-[10px] text-slate-400 capitalize">({suit})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
