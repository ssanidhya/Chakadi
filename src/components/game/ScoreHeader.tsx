import React from 'react';
import { useGameStore } from '../../store/gameStore.ts';
import { useSettingsStore } from '../../store/settingsStore.ts';
import { HINDI_SUIT_NAMES, Suit } from '../../game/index.ts';

const SUIT_ICONS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const ScoreHeader: React.FC = () => {
  const { gameState, activeViewPlayerId, setActiveViewPlayerId } = useGameStore();
  const { openSettings } = useSettingsStore();
  const { scores, phase, turnPlayerId, trumpSuit, dealerId, players, bid } = gameState;

  const activePlayer = players.find((p) => p.id === turnPlayerId);
  const dealerPlayer = players.find((p) => p.id === dealerId);

  return (
    <div className="w-full bg-slate-900 text-white px-4 py-2 shadow-lg flex flex-col gap-2 border-b border-slate-800">
      {/* Top Bar: Team Scores & Gunti/Coat */}
      <div className="flex items-center justify-between text-sm">
        {/* Team A */}
        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-700/50 px-3 py-1.5 rounded-lg">
          <div className="flex flex-col">
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Team A</span>
            <div className="flex items-center gap-2 text-base font-bold">
              <span>{scores.team_a.penaltyPoints} <span className="text-xs font-normal text-slate-400">Gunti</span></span>
              {scores.team_a.coat > 0 && (
                <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                  {scores.team_a.coat} Kot
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Phase / Trump / Bid Info */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
            {phase.replace('_', ' ')}
          </div>

          {trumpSuit && (
            <div className="flex items-center gap-1 text-sm font-bold text-red-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              <span>Kaat:</span>
              <span>{SUIT_ICONS[trumpSuit]} {HINDI_SUIT_NAMES[trumpSuit]}</span>
            </div>
          )}

          {bid.highestBid > 0 && (
            <div className="text-xs text-slate-300">
              Boli: <span className="font-bold text-amber-300">{bid.highestBid}</span> by{' '}
              {players.find((p) => p.id === bid.highestBidderId)?.name || 'None'}
            </div>
          )}
        </div>

        {/* Team B */}
        <div className="flex items-center gap-2 bg-blue-950/60 border border-blue-700/50 px-3 py-1.5 rounded-lg">
          <div className="flex flex-col items-end">
            <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Team B</span>
            <div className="flex items-center gap-2 text-base font-bold">
              {scores.team_b.coat > 0 && (
                <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                  {scores.team_b.coat} Kot
                </span>
              )}
              <span>{scores.team_b.penaltyPoints} <span className="text-xs font-normal text-slate-400">Gunti</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Turn & Local Perspective Selector & Settings Button */}
      <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
        <div>
          Dealer: <span className="font-semibold text-amber-300">{dealerPlayer?.name}</span>
        </div>

        {activePlayer && (
          <div className="flex items-center gap-1 animate-pulse bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold border border-amber-500/40">
            <span>Turn:</span>
            <span>{activePlayer.name}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Perspective Switcher for single-device simulation */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">View:</span>
            <select
              value={activeViewPlayerId}
              onChange={(e) => setActiveViewPlayerId(e.target.value)}
              className="bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded border border-slate-700 cursor-pointer focus:outline-none"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.teamId === 'team_a' ? 'A' : 'B'})
                </option>
              ))}
            </select>
          </div>

          {/* Settings gear button */}
          <button
            onClick={openSettings}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded border border-slate-700 transition-colors"
            title="Settings & Rules"
          >
            ⚙️
          </button>
        </div>
      </div>
    </div>
  );
};
