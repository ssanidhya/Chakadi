import React, { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useGameStore } from '../../store/gameStore.ts';
import { useSettingsStore } from '../../store/settingsStore.ts';
import { Card } from '../ui/Card.tsx';
import { sortCardIds, CardId } from '../../game/index.ts';

gsap.registerPlugin(useGSAP);

export const PlayerHand: React.FC = () => {
  const { gameState, activeViewPlayerId, playCard, getLegalCardsForActivePlayer } = useGameStore();
  const { showHints } = useSettingsStore();
  const { hands, phase, turnPlayerId, players } = gameState;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const rawHandCardIds = (hands[activeViewPlayerId] || []) as CardId[];
  const sortedHandCardIds = sortCardIds(rawHandCardIds);

  const legalCardIds = getLegalCardsForActivePlayer();
  const isMyTurnToPlay = phase === 'PLAYING_HAATH' && turnPlayerId === activeViewPlayerId;

  const viewPlayer = players.find((p) => p.id === activeViewPlayerId);
  const handRef = useRef<HTMLDivElement>(null);

  // Reset selection when turn or active player changes
  useEffect(() => {
    setSelectedCardId(null);
  }, [turnPlayerId, activeViewPlayerId]);

  // Push floating card back into hand when tapping anywhere outside the selected card
  useEffect(() => {
    if (!selectedCardId) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const selectedCardEl = document.querySelector(`[data-card-id="${selectedCardId}"]`);
      if (selectedCardEl && selectedCardEl.contains(e.target as Node)) {
        return;
      }
      setSelectedCardId(null);
    };

    const timer = setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
      window.addEventListener('touchstart', handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [selectedCardId]);

  useGSAP(
    () => {
      if (handRef.current) {
        gsap.fromTo(
          handRef.current.children,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.25, stagger: 0.03, ease: 'power2.out' }
        );
      }
    },
    { dependencies: [sortedHandCardIds.length, activeViewPlayerId], scope: handRef }
  );

  const handleCardClick = (cardId: string) => {
    if (!isMyTurnToPlay) return;
    if (!legalCardIds.includes(cardId as any)) return;

    if (selectedCardId !== cardId) {
      // 1st Tap: Highlight / Float card above others
      setSelectedCardId(cardId);
    } else {
      // 2nd Tap on same card: Confirm and Play card onto table
      playCard(activeViewPlayerId, cardId as any);
      setSelectedCardId(null);
    }
  };

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex flex-col items-center gap-1.5 z-20 max-w-full overflow-hidden">
      {/* Hand Status Bar */}
      <div className="flex items-center justify-between w-full max-w-md text-xs px-1">
        <div className="flex items-center gap-1 text-slate-300 font-semibold text-[11px] sm:text-xs">
          <span>{viewPlayer?.name}'s Hand</span>
          <span className="text-slate-500">({sortedHandCardIds.length} cards)</span>
        </div>

        {showHints && phase === 'BIDDING' && (
          <div className="text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 text-[10px] sm:text-[11px]">
            Inspect cards for Boli
          </div>
        )}

        {showHints && phase === 'DECLARING_KAAT' && (
          <div className="text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 text-[10px] sm:text-[11px]">
            Inspect cards to pick Kaat
          </div>
        )}

        {showHints && isMyTurnToPlay && (
          <div className="text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded animate-pulse border border-amber-500/40 text-[10px] sm:text-[11px]">
            {selectedCardId ? 'Tap again to play card!' : 'Tap card to select & float'}
          </div>
        )}

        {showHints && phase === 'PLAYING_HAATH' && !isMyTurnToPlay && (
          <div className="text-slate-400 text-[10px] sm:text-[11px]">Waiting for turn...</div>
        )}
      </div>

      {/* Cards Overlapping Rail with Dynamic Margin based on Card Count */}
      <div
        ref={handRef}
        className="flex items-center justify-center py-2 px-1 sm:px-3 max-w-full overflow-visible"
      >
        {sortedHandCardIds.length === 0 ? (
          <div className="text-slate-500 text-xs py-2">No cards in hand</div>
        ) : (
          (() => {
            const cardCount = sortedHandCardIds.length;
            const dynamicOverlapClass =
              cardCount >= 12
                ? '-ml-8 sm:-ml-10'
                : cardCount >= 9
                ? '-ml-6 sm:-ml-8'
                : cardCount >= 6
                ? '-ml-5 sm:-ml-7'
                : '-ml-3 sm:-ml-5';

            return sortedHandCardIds.map((cardId, index) => {
              const isPlayable = isMyTurnToPlay && legalCardIds.includes(cardId);
              const isUnplayable = isMyTurnToPlay && !legalCardIds.includes(cardId);
              const isSelected = selectedCardId === cardId;
              const isFirst = index === 0;

              return (
                <div
                  key={cardId}
                  data-card-id={cardId}
                  style={{ zIndex: isSelected ? 40 : index + 1 }}
                  className={`relative flex-shrink-0 transition-transform ${
                    isFirst ? '' : dynamicOverlapClass
                  }`}
                >
                  <Card
                    cardId={cardId}
                    size="md"
                    isPlayable={isPlayable}
                    isUnplayable={isUnplayable}
                    isSelected={isSelected}
                    onClick={() => handleCardClick(cardId)}
                  />
                </div>
              );
            });
          })()
        )}
      </div>
    </div>
  );
};
