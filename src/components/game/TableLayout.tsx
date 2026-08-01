import React from 'react';
import { useGameStore } from '../../store/gameStore.ts';
import { TrickArea } from './TrickArea.tsx';

export const TableLayout: React.FC = () => {
  const { gameState } = useGameStore();
  const { players, turnPlayerId, dealerId, hands } = gameState;

  return (
    <div className="relative w-full max-w-lg aspect-square flex items-center justify-center p-4">
      {/* Central Trick Playing Area */}
      <TrickArea />

      {/* Players Positioned Around Table */}
      {players.map((player) => {
        const isTurn = turnPlayerId === player.id;
        const isDealer = dealerId === player.id;
        const cardCount = hands[player.id]?.length || 0;
        const seat = player.seat;
        const totalSeats = players.length;

        // Circular positioning
        const angle = (seat * 360) / totalSeats - 90;
        const radius = 42; // percentage offset from center
        const left = 50 + radius * Math.cos((angle * Math.PI) / 180);
        const top = 50 + radius * Math.sin((angle * Math.PI) / 180);

        return (
          <div
            key={player.id}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute flex flex-col items-center p-2 rounded-xl border transition-all duration-200 z-20 ${
              isTurn
                ? 'bg-amber-500/20 border-amber-400 ring-4 ring-amber-400/50 shadow-lg scale-105'
                : 'bg-slate-900/80 border-slate-700'
            }`}
          >
            {/* Player Avatar / Name Badge */}
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  player.teamId === 'team_a' ? 'bg-emerald-400' : 'bg-blue-400'
                }`}
              />
              <span className="text-xs font-bold text-white whitespace-nowrap">{player.name}</span>
              {isDealer && (
                <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1 rounded">D</span>
              )}
            </div>

            {/* Hand count indicator */}
            <div className="text-[10px] text-slate-300 font-mono mt-0.5">
              {cardCount} {cardCount === 1 ? 'card' : 'cards'}
            </div>
          </div>
        );
      })}
    </div>
  );
};
