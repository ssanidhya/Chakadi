import React from 'react';
import { useGameStore } from '../../store/gameStore.ts';
import { TrickArea } from './TrickArea.tsx';

export const TableLayout: React.FC = () => {
  const { gameState } = useGameStore();
  const { players, turnPlayerId, dealerId, hands } = gameState;

  return (
    <div className="relative w-[min(92vw,calc(100dvh-220px))] h-[min(92vw,calc(100dvh-220px))] max-w-[580px] max-h-[580px] aspect-square flex items-center justify-center p-1 sm:p-2 select-none">
      {/* Central Felt Table & Played Cards */}
      <TrickArea />

      {/* Outer Player Badges Positioned Along Perimeter */}
      {players.map((player) => {
        const isTurn = turnPlayerId === player.id;
        const isDealer = dealerId === player.id;
        const cardCount = hands[player.id]?.length || 0;
        const seat = player.seat;
        const totalSeats = players.length;

        // Radial perimeter positioning (41% for 6P, 43% for 4P inside 1:1 aspect-square container)
        const angle = (seat * 360) / totalSeats - 90;
        const angleRad = (angle * Math.PI) / 180;
        const radialOffset = totalSeats === 6 ? 41 : 43;
        let left = 50 + radialOffset * Math.cos(angleRad);
        let top = 50 + radialOffset * Math.sin(angleRad);

        // Vertical shifts for side seats to ensure name tags never overlap played cards
        if (totalSeats === 6) {
          if (seat === 1 || seat === 5) {
            top -= 5.5; // Shift UP above top-left/top-right cards
          } else if (seat === 2 || seat === 4) {
            top += 5.5; // Shift DOWN below bottom-left/bottom-right cards
          }
        } else if (totalSeats === 4) {
          if (seat === 1) left += 3;
          if (seat === 3) left -= 3;
        }

        return (
          <div
            key={player.id}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute flex items-center gap-1 sm:gap-1.5 px-[clamp(6px,1.6vw,12px)] py-[clamp(3px,0.8vw,6px)] rounded-full border transition-all duration-200 z-20 shadow-md backdrop-blur-sm max-w-[105px] xs:max-w-none truncate ${
              isTurn
                ? 'bg-amber-500/30 border-amber-400 ring-2 sm:ring-4 ring-amber-400/50 shadow-amber-500/30 scale-105'
                : 'bg-slate-900/90 border-slate-700/80'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                player.teamId === 'team_a' ? 'bg-emerald-400' : 'bg-blue-400'
              }`}
            />
            <span className="text-[clamp(10px,2.5vw,13px)] font-bold text-white truncate max-w-[60px] sm:max-w-[80px]">
              {player.name}
            </span>
            {isDealer && (
              <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1 rounded-sm flex-shrink-0">
                D
              </span>
            )}
            <span className="text-[clamp(9px,2.2vw,11px)] text-slate-400 font-mono font-medium ml-0.5 flex-shrink-0">
              ({cardCount})
            </span>
          </div>
        );
      })}
    </div>
  );
};
