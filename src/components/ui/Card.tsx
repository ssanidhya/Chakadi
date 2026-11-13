import React from 'react';
import { CardId, Suit, Rank } from '../../game/index.ts';

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  spades: 'text-slate-950',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-slate-950',
};

export interface CardProps {
  cardId?: CardId;
  suit?: Suit;
  rank?: Rank;
  isFaceDown?: boolean;
  faceDownTheme?: 'blue' | 'green';
  isPlayable?: boolean;
  isUnplayable?: boolean;
  isSelected?: boolean;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  cardId,
  suit: propSuit,
  rank: propRank,
  isFaceDown = false,
  faceDownTheme = 'blue',
  isPlayable = false,
  isUnplayable = false,
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
    xxs: 'w-6 h-9 sm:w-8 sm:h-12 text-[8px] sm:text-[10px] rounded',
    xs: 'w-[clamp(36px,5vw,48px)] h-[clamp(54px,7.5vw,72px)] text-xs rounded-md',
    sm: 'w-[clamp(48px,6.5vw,72px)] h-[clamp(72px,9.75vw,108px)] text-xs sm:text-sm rounded-lg',
    md: 'w-[clamp(56px,8vw,90px)] h-[clamp(84px,12vw,135px)] text-xs sm:text-base rounded-lg sm:rounded-xl',
    lg: 'w-[clamp(72px,10vw,108px)] h-[clamp(108px,15vw,162px)] text-sm sm:text-lg rounded-xl',
  }[size];

  if (isFaceDown) {
    const bgGradient =
      faceDownTheme === 'green'
        ? 'from-emerald-800 to-teal-950 border-emerald-400/80'
        : 'from-indigo-700 to-blue-900 border-indigo-300/80';
    const innerBorder =
      faceDownTheme === 'green'
        ? 'border-emerald-400/40 text-emerald-200'
        : 'border-indigo-400/40 text-indigo-200';

    return (
      <div
        style={style}
        onClick={onClick}
        className={`relative flex items-center justify-center bg-gradient-to-br ${bgGradient} border shadow select-none transition-transform hover:scale-105 ${sizeClasses} ${className}`}
      >
        <div className={`w-3/4 h-3/4 border ${innerBorder} rounded flex items-center justify-center`}>
          <span className="text-[8px] sm:text-[10px] font-bold opacity-60">♠♦</span>
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
      onClick={isPlayable && onClick ? onClick : undefined}
      className={`relative flex flex-col justify-between p-1 sm:p-1.5 select-none transition-all duration-150 ${
        isUnplayable
          ? 'bg-slate-200/90 border border-slate-400 opacity-55 grayscale-[60%] cursor-not-allowed shadow-none'
          : isPlayable
          ? 'bg-white border border-slate-300 opacity-100 shadow-md cursor-pointer hover:-translate-y-3 hover:shadow-xl hover:z-30'
          : 'bg-white border border-slate-300 opacity-90 shadow-md'
      } ${
        isSelected
          ? '-translate-y-4 ring-4 ring-emerald-500 shadow-2xl z-40'
          : ''
      } ${sizeClasses} ${className}`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`flex flex-col items-start leading-none font-black ${colorClass}`}>
        <span>{rank}</span>
        <span className="text-[10px] sm:text-xs mt-0.5">{symbol}</span>
      </div>

      {/* Center Large Suit Symbol */}
      <div className={`absolute inset-0 flex items-center justify-center font-black text-xl sm:text-3xl ${colorClass} opacity-90 pointer-events-none`}>
        {symbol}
      </div>

      {/* Bottom Right Rank & Suit (Straight, Upright - Diagonal Alignment) */}
      <div className={`flex flex-col items-end leading-none font-black ${colorClass}`}>
        <span className="text-[10px] sm:text-xs mb-0.5">{symbol}</span>
        <span>{rank}</span>
      </div>
    </div>
  );
};
