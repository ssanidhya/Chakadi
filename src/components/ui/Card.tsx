import React from 'react';
import { CardId, Suit, Rank } from '../../game/index.ts';

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  spades: 'text-slate-900 dark:text-slate-100',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-slate-900 dark:text-slate-100',
};

export interface CardProps {
  cardId?: CardId;
  suit?: Suit;
  rank?: Rank;
  isFaceDown?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  cardId,
  suit: propSuit,
  rank: propRank,
  isFaceDown = false,
  isPlayable = false,
  isSelected = false,
  size = 'md',
  onClick,
  className = '',
  style,
}) => {
  let suit = propSuit;
  let rank = propRank;

  if (cardId && (!suit || !rank)) {
    const lastDash = cardId.lastIndexOf('-');
    suit = cardId.substring(0, lastDash) as Suit;
    rank = cardId.substring(lastDash + 1) as Rank;
  }

  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded-md',
    md: 'w-14 h-20 text-sm rounded-lg',
    lg: 'w-18 h-26 text-base rounded-xl',
  }[size];

  if (isFaceDown) {
    return (
      <div
        style={style}
        onClick={onClick}
        className={`relative flex items-center justify-center bg-gradient-to-br from-indigo-700 to-blue-900 border-2 border-indigo-300 shadow-md cursor-pointer select-none transition-transform hover:scale-105 ${sizeClasses} ${className}`}
      >
        <div className="w-4/5 h-4/5 border border-indigo-400/40 rounded flex items-center justify-center">
          <span className="text-indigo-200 text-xs font-bold opacity-60">♠♦</span>
        </div>
      </div>
    );
  }

  if (!suit || !rank) return null;

  const symbol = SUIT_SYMBOLS[suit];
  const colorClass = SUIT_COLORS[suit];

  return (
    <div
      style={style}
      onClick={isPlayable || onClick ? onClick : undefined}
      className={`relative flex flex-col justify-between p-1.5 bg-white border shadow-md select-none transition-all duration-150 ${
        isPlayable
          ? 'cursor-pointer border-amber-400 ring-2 ring-amber-400 shadow-amber-200 hover:-translate-y-2 hover:scale-105'
          : 'border-slate-300 opacity-95'
      } ${isSelected ? '-translate-y-3 ring-4 ring-emerald-500' : ''} ${sizeClasses} ${className}`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`flex flex-col items-start leading-none font-bold ${colorClass}`}>
        <span>{rank}</span>
        <span className="text-[10px]">{symbol}</span>
      </div>

      {/* Center Large Symbol */}
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-lg ${colorClass} opacity-85`}>
        {symbol}
      </div>

      {/* Bottom Right Rank & Suit (Inverted) */}
      <div className={`flex flex-col items-end leading-none font-bold rotate-180 ${colorClass}`}>
        <span>{rank}</span>
        <span className="text-[10px]">{symbol}</span>
      </div>
    </div>
  );
};
