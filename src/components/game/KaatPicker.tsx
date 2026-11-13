import React from 'react';
import { useGameStore } from '../../store/gameStore.ts';
import { Suit, HINDI_SUIT_NAMES } from '../../game/index.ts';

const SUITS_CONFIG: Array<{ suit: Suit; icon: string; color: string }> = [
  { suit: 'spades', icon: '♠', color: 'bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800' },
  { suit: 'hearts', icon: '♥', color: 'bg-red-950/80 border-red-800 text-red-400 hover:bg-red-900/80' },
  { suit: 'diamonds', icon: '♦', color: 'bg-red-950/80 border-red-800 text-red-400 hover:bg-red-900/80' },
  { suit: 'clubs', icon: '♣', color: 'bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800' },
];

export const KaatPicker: React.FC = () => {
  const { gameState, activeViewPlayerId, activeAdapter, declareKaat } = useGameStore();
  const { phase, bid, players } = gameState;

  if (phase !== 'DECLARING_KAAT' || !bid.declarerId) return null;

  const declarer = players.find((p) => p.id === bid.declarerId);
  const isDeclarer = !activeAdapter || activeViewPlayerId === bid.declarerId;

  const handleSelectSuit = (suit: Suit) => {
    if (!isDeclarer) return;
    declareKaat(bid.declarerId!, suit);
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-slate-900/95 border border-amber-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col items-center gap-3 text-center">
        {/* Header */}
        <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Declare Kaat (Trump)</span>
          <span className="text-xs font-bold text-white bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
            Declarer: {declarer?.name}
          </span>
        </div>

        <p className="text-xs text-slate-300">
          Won Boli at <span className="font-extrabold text-amber-300">{bid.highestBid} tricks</span>.
          {isDeclarer ? ' Choose Kaat suit based on your hand below:' : ` Waiting for ${declarer?.name} to choose Kaat.`}
        </p>

        {/* 4 Suit Picker Grid OR Waiting Banner */}
        {!isDeclarer ? (
          <div className="w-full py-3 px-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 animate-pulse select-none">
            <span>⏳</span>
            <span>Waiting for {declarer?.name} to declare Kaat...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            {SUITS_CONFIG.map(({ suit, icon, color }) => (
              <button
                key={suit}
                onClick={() => handleSelectSuit(suit)}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer ${color}`}
              >
                <span className="text-2xl">{icon}</span>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-bold">{HINDI_SUIT_NAMES[suit]}</span>
                  <span className="text-[9px] opacity-75 capitalize">({suit})</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
