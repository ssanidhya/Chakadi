import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useGameStore } from '../../store/gameStore.ts';
import { Card } from '../ui/Card.tsx';
import { evaluateTrickWinner } from '../../game/rules/trick.ts';
import { PlayerId } from '../../game/index.ts';

gsap.registerPlugin(useGSAP);

export const TrickArea: React.FC = () => {
  const { gameState } = useGameStore();
  const { currentTrick, completedTricks, players, turnPlayerId, trumpSuit, config } = gameState;
  const containerRef = useRef<HTMLDivElement>(null);

  // Active trick to display: current trick in progress, or last completed trick
  const activeTrick =
    currentTrick && currentTrick.plays.length > 0
      ? currentTrick
      : completedTricks.length > 0
      ? completedTricks[completedTricks.length - 1]
      : undefined;

  const isCompletedTrick = activeTrick ? activeTrick.plays.length === players.length : false;

  let winningPlayerId: PlayerId | undefined = undefined;
  if (activeTrick && activeTrick.plays.length > 0) {
    if (isCompletedTrick && activeTrick.winnerId) {
      winningPlayerId = activeTrick.winnerId;
    } else {
      try {
        winningPlayerId = evaluateTrickWinner(activeTrick.plays, activeTrick.ledSuit, trumpSuit);
      } catch (e) {
        winningPlayerId = undefined;
      }
    }
  }

  const winningPlayer = players.find((p) => p.id === winningPlayerId);

  useGSAP(
    () => {
      if (activeTrick && activeTrick.plays.length > 0) {
        const lastPlayIdx = activeTrick.plays.length - 1;
        const cardElem = containerRef.current?.querySelector(`[data-play-index="${lastPlayIdx}"]`);
        if (cardElem) {
          gsap.fromTo(
            cardElem,
            { scale: 0.3, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.4)' }
          );
        }
      }
    },
    { dependencies: [activeTrick?.plays.length], scope: containerRef }
  );

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Central Felt Circle */}
      <div className="w-[clamp(120px,16vw,190px)] h-[clamp(120px,16vw,190px)] rounded-full bg-emerald-950/45 border border-emerald-700/30 shadow-inner flex flex-col items-center justify-center p-1.5 text-center select-none">
        {isCompletedTrick && winningPlayer ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/40 whitespace-nowrap">
              👑 Haath Won!
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[120px]">{winningPlayer.name}</span>
            <span className="text-[9px] sm:text-[10px] text-emerald-400 font-mono">
              Trick {completedTricks.length} of {config.totalTricks}
            </span>
          </div>
        ) : activeTrick && activeTrick.plays.length > 0 ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] sm:text-[10px] text-emerald-300/80 uppercase tracking-widest font-semibold">
              Trick {completedTricks.length + 1}
            </span>
            <span className="text-xs sm:text-sm font-bold text-amber-200 truncate max-w-[120px]">
              {winningPlayer?.name}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-emerald-400/40 text-xs sm:text-sm font-serif font-bold tracking-widest">CHAKADI</span>
            <span className="text-emerald-200/60 text-[10px] sm:text-xs bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-700/30 animate-pulse">
              {turnPlayerId ? 'Waiting...' : 'Table'}
            </span>
          </div>
        )}
      </div>

      {/* Played Cards Placed in Middle Ring (25% radius) */}
      {activeTrick?.plays.map((play, index) => {
        const player = players.find((p) => p.id === play.playerId);
        const seat = player?.seat ?? 0;
        const totalSeats = players.length;

        // Position played card along radial vector (25% radius)
        const angle = (seat * 360) / totalSeats - 90;
        const angleRad = (angle * Math.PI) / 180;
        const left = 50 + 25 * Math.cos(angleRad);
        const top = 50 + 25 * Math.sin(angleRad);

        const isWinningCard = play.playerId === winningPlayerId;

        return (
          <div
            key={`${play.playerId}-${play.card.id}`}
            data-play-index={index}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute flex flex-col items-center pointer-events-auto transition-all ${
              isWinningCard ? 'z-30 scale-105' : 'z-10'
            }`}
          >
            {/* Crown icon on winning card */}
            {isWinningCard && (
              <span className="text-xs sm:text-sm -mb-1 z-40 animate-pulse">👑</span>
            )}

            <div className={`relative ${isWinningCard ? 'ring-2 sm:ring-4 ring-amber-400 rounded-lg shadow-xl' : ''}`}>
              <Card cardId={play.card.id} size="sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
