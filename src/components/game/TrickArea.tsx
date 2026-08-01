import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useGameStore } from '../../store/gameStore.ts';
import { Card } from '../ui/Card.tsx';

gsap.registerPlugin(useGSAP);

export const TrickArea: React.FC = () => {
  const { gameState } = useGameStore();
  const { currentTrick, players, turnPlayerId } = gameState;
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP animation when a new card is played onto the table
  useGSAP(
    () => {
      if (currentTrick && currentTrick.plays.length > 0) {
        const lastPlayIdx = currentTrick.plays.length - 1;
        const cardElem = containerRef.current?.querySelector(`[data-play-index="${lastPlayIdx}"]`);
        if (cardElem) {
          gsap.fromTo(
            cardElem,
            { scale: 0.3, opacity: 0, y: 50 },
            { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' }
          );
        }
      }
    },
    { dependencies: [currentTrick?.plays.length], scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="relative w-64 h-64 md:w-80 md:h-80 rounded-full bg-emerald-900/40 border-4 border-amber-600/40 shadow-inner flex items-center justify-center"
    >
      {/* Center Table Felt Background */}
      <div className="absolute inset-4 rounded-full border border-emerald-500/20 bg-radial from-emerald-800/60 to-emerald-950/80 pointer-events-none flex flex-col items-center justify-center text-emerald-300/40 text-xs font-serif font-bold select-none">
        <span>CHAKADI</span>
      </div>

      {/* Played Cards in Current Trick */}
      {currentTrick?.plays.map((play, index) => {
        const player = players.find((p) => p.id === play.playerId);
        const seat = player?.seat ?? 0;
        const totalSeats = players.length;

        // Position played cards around table center corresponding to seat angle
        const angle = (seat * 360) / totalSeats - 90;
        const radius = 65; // Distance from center in pixels
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <div
            key={`${play.playerId}-${play.card.id}`}
            data-play-index={index}
            style={{
              transform: `translate(${x}px, ${y}px)`,
            }}
            className="absolute flex flex-col items-center z-10"
          >
            <Card cardId={play.card.id} size="sm" />
            <span className="text-[10px] text-amber-200 font-medium bg-slate-950/80 px-1 rounded mt-0.5 whitespace-nowrap">
              {player?.name}
            </span>
          </div>
        );
      })}

      {/* Waiting Indicator when table is empty */}
      {(!currentTrick || currentTrick.plays.length === 0) && (
        <div className="text-emerald-200/60 text-xs font-medium bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-700/40 animate-pulse">
          {turnPlayerId ? 'Waiting for Chaal...' : 'Chakadi Table'}
        </div>
      )}
    </div>
  );
};
