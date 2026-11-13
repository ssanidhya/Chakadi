import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore.ts';
import { useSettingsStore } from '../../store/settingsStore.ts';
import { HINDI_SUIT_NAMES, Suit } from '../../game/index.ts';
import { Card } from '../ui/Card.tsx';
import { ScoreHistoryModal } from './ScoreHistoryModal.tsx';

const SUIT_ICONS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  spades: 'text-slate-100',
  clubs: 'text-slate-100',
  hearts: 'text-red-400',
  diamonds: 'text-red-400',
};

export const ScoreHeader: React.FC = () => {
  const { gameState, activeViewPlayerId, setActiveViewPlayerId } = useGameStore();
  const { openSettings, devModeEnabled } = useSettingsStore();
  const { scores, turnPlayerId, trumpSuit, players, bid } = gameState;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const isDev = import.meta.env.DEV;
  const showViewSwitcher = isDev && devModeEnabled;

  const activePlayer = players.find((p) => p.id === turnPlayerId);
  const declarerPlayer = players.find((p) => p.id === bid.declarerId);
  const declarerTeamId = declarerPlayer?.teamId;

  const isDeclarerTeamA = declarerTeamId === 'team_a';
  const isDeclarerTeamB = declarerTeamId === 'team_b';

  return (
    <header className="w-full bg-slate-900/95 text-white px-2 sm:px-4 pb-1.5 pt-[max(0.5rem,env(safe-area-inset-top,0px))] shadow-lg flex flex-col gap-1.5 border-b border-slate-800 z-30 select-none">
      {/* Row 1: Team A Score Pill (50% Width) & Team B Score Pill (50% Width) */}
      <div className="grid grid-cols-2 gap-2 w-full text-xs">
        {/* Team A Pill */}
        <div className="flex flex-col gap-1 bg-emerald-950/80 border border-emerald-700/60 p-1.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1 font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Team A</span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-slate-200">
              <span>{scores.team_a.penaltyPoints} Pts</span>
              {scores.team_a.coat > 0 && (
                <span className="bg-red-600 text-white text-[9px] px-1 rounded font-mono font-bold">
                  {scores.team_a.coat} Kot
                </span>
              )}
            </div>
            <span className="text-emerald-400 font-black">
              {scores.team_a.tricksWon}{isDeclarerTeamA && bid.highestBid > 0 ? `/${bid.highestBid}` : ''}
            </span>
          </div>

          {/* Underline divider line & fixed-height face-down card container for UI height stability */}
          <div className="flex flex-row items-center pt-0.5 border-t border-emerald-800/50 h-10 overflow-hidden">
            {scores.team_a.tricksWon > 0 &&
              Array.from({ length: scores.team_a.tricksWon }).map((_, idx) => (
                <div key={idx} className={idx === 0 ? '' : '-ml-3.5'} style={{ zIndex: idx + 1 }}>
                  <Card isFaceDown faceDownTheme="green" size="xxs" />
                </div>
              ))}
          </div>
        </div>

        {/* Team B Pill */}
        <div className="flex flex-col gap-1 bg-blue-950/80 border border-blue-700/60 p-1.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs">
            <span className="text-blue-400 font-black">
              {scores.team_b.tricksWon}{isDeclarerTeamB && bid.highestBid > 0 ? `/${bid.highestBid}` : ''}
            </span>
            <div className="flex items-center gap-1 font-semibold text-slate-200">
              {scores.team_b.coat > 0 && (
                <span className="bg-red-600 text-white text-[9px] px-1 rounded font-mono font-bold">
                  {scores.team_b.coat} Kot
                </span>
              )}
              <span>{scores.team_b.penaltyPoints} Pts</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-blue-300">
              <span>Team B</span>
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            </div>
          </div>

          {/* Underline divider line & fixed-height face-down card container for UI height stability */}
          <div className="flex flex-row items-center justify-end pt-0.5 border-t border-blue-800/50 h-10 overflow-hidden">
            {scores.team_b.tricksWon > 0 &&
              Array.from({ length: scores.team_b.tricksWon }).map((_, idx) => (
                <div key={idx} className={idx === 0 ? '' : '-ml-3.5'} style={{ zIndex: idx + 1 }}>
                  <Card isFaceDown faceDownTheme="blue" size="xxs" />
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Row 2: Responsive Nav Bar / Info Pills */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs pt-1 border-t border-slate-800 overflow-x-auto no-scrollbar w-full">
        {/* Left: Active Turn Indicator */}
        {activePlayer ? (
          <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-1.5 sm:px-2 py-0.5 rounded-full font-bold border border-amber-500/40 whitespace-nowrap animate-pulse shrink-0">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 shrink-0"></span>
            <span>Turn: {activePlayer.name}</span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">Chakadi Match</div>
        )}

        {/* Center: Trump Kaat & Boli Contract Info */}
        <div className="flex items-center gap-1 sm:gap-1.5 font-semibold whitespace-nowrap shrink-0">
          {trumpSuit && (
            <div className={`flex items-center gap-1 ${SUIT_COLORS[trumpSuit]} bg-slate-800 px-1.5 sm:px-2 py-0.5 rounded-full border border-slate-700 font-bold`}>
              <span className="text-slate-400">Kaat:</span>
              <span>{SUIT_ICONS[trumpSuit]} {HINDI_SUIT_NAMES[trumpSuit]}</span>
            </div>
          )}

          {bid.highestBid > 0 && (
            <div className="text-slate-300 bg-slate-800 px-1.5 sm:px-2 py-0.5 rounded-full border border-slate-700">
              Boli: <span className="font-bold text-amber-300">{bid.highestBid}</span> by{' '}
              <span className="font-semibold text-white">{declarerPlayer?.name || 'None'}</span>
            </div>
          )}
        </div>

        {/* Right: Perspective View Switcher (Local Dev Only), Score Ledger & Settings */}
        <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0">
          {showViewSwitcher && (
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px]">View:</span>
              <select
                value={activeViewPlayerId}
                onChange={(e) => setActiveViewPlayerId(e.target.value)}
                className="bg-slate-800 text-white text-[11px] sm:text-xs px-1 py-0.5 rounded-lg border border-slate-700 cursor-pointer focus:outline-none"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name} ({p.teamId === 'team_a' ? 'A' : 'B'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-1 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer text-xs"
            title="Score Ledger"
          >
            📜
          </button>

          <button
            onClick={openSettings}
            className="p-1 text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer text-xs"
            title="Settings & Rules"
          >
            ⚙️
          </button>
        </div>
      </div>

      <ScoreHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </header>
  );
};
