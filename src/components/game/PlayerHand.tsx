import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useGameStore } from '../../store/gameStore.ts';
import { Card } from '../ui/Card.tsx';

gsap.registerPlugin(useGSAP);

export const PlayerHand: React.FC = () => {
  const { gameState, activeViewPlayerId, playCard, getLegalCardsForActivePlayer } = useGameStore();
  const { hands, phase, turnPlayerId, players } = gameState;

  const handCardIds = hands[activeViewPlayerId] || [];
  const legalCardIds = getLegalCardsForActivePlayer();
  const isMyTurn = phase === 'PLAYING_HAATH' && turnPlayerId === activeViewPlayerId;

  const viewPlayer = players.find((p) => p.id === activeViewPlayerId);
  const handRef = useRef<HTMLDivElement>(null);

  // GSAP animation when hand cards render/update
  useGSAP(
    () => {
      if (handRef.current) {
        gsap.fromTo(
          handRef.current.children,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out' }
        );
      }
    },
    { dependencies: [handCardIds.length, activeViewPlayerId], scope: handRef }
  );

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    if (!legalCardIds.includes(cardId as any)) return;

    playCard(activeViewPlayerId, cardId as any);
  };

  return (
    <div className="w-full bg-slate-900/90 border-t border-slate-800 p-3 flex flex-col items-center gap-2">
      {/* Hand Status Bar */}
      <div className="flex items-center justify-between w-full max-w-md text-xs px-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <span>{viewPlayer?.name}'s Hand</span>
          <span className="text-slate-500">({handCardIds.length} cards)</span>
        </div>

        {isMyTurn ? (
          <div className="text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded animate-pulse border border-amber-500/40">
            Your turn to play! Select a highlighted card.
          </div>
        ) : (
          <div className="text-slate-400">
            {phase === 'PLAYING_HAATH' ? 'Waiting for turn...' : `Phase: ${phase}`}
          </div>
        )}
      </div>

      {/* Cards Horizontal Scroll Rail */}
      <div
        ref={handRef}
        className="flex items-center justify-center gap-1.5 overflow-x-auto w-full max-w-xl py-2 px-4 scrollbar-none"
      >
        {handCardIds.length === 0 ? (
          <div className="text-slate-500 text-xs py-4">No cards in hand</div>
        ) : (
          handCardIds.map((cardId) => {
            const isPlayable = isMyTurn && legalCardIds.includes(cardId);

            return (
              <div key={cardId} className="flex-shrink-0">
                <Card
                  cardId={cardId}
                  size="md"
                  isPlayable={isPlayable}
                  onClick={() => handleCardClick(cardId)}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
