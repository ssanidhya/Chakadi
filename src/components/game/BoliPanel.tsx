import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.ts';

export const BoliPanel: React.FC = () => {
  const { gameState, activeViewPlayerId, activeAdapter, placeBid, passBid } = useGameStore();
  const { phase, turnPlayerId, bid, config, players } = gameState;

  const isMyTurn = !activeAdapter || activeViewPlayerId === turnPlayerId;

  const [selectedBid, setSelectedBid] = useState<number>(
    Math.max(config.minBid, bid.highestBid + 1)
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedBid(Math.max(config.minBid, bid.highestBid + 1));
    setErrorMsg(null);
  }, [bid.highestBid, turnPlayerId, config.minBid]);

  if (phase !== 'BIDDING' || !turnPlayerId) return null;

  const activePlayer = players.find((p) => p.id === turnPlayerId);

  const handleBidSubmit = () => {
    if (!isMyTurn) return;
    setErrorMsg(null);
    const res = placeBid(activeViewPlayerId, selectedBid);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid bid.');
    }
  };

  const handlePassSubmit = () => {
    if (!isMyTurn) return;
    setErrorMsg(null);
    const res = passBid(activeViewPlayerId);
    if (!res.success) {
      setErrorMsg(res.error || 'Opening player cannot pass.');
    }
  };

  const isOpeningBid = bid.highestBid === 0;
  const minAllowedBid = isOpeningBid ? config.minBid : bid.highestBid + 1;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-slate-900/95 border border-amber-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col items-center gap-3 text-center">
        {/* Title & Active Bidder */}
        <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">Boli Phase</span>
          </div>
          <div className="text-xs text-white font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
            Bidder: {activePlayer?.name}
          </div>
        </div>

        {/* Current Highest Bid Info */}
        <div className="flex items-center justify-between w-full text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-slate-400">Current Highest Boli:</span>
          {bid.highestBid > 0 ? (
            <span className="font-extrabold text-amber-300 text-sm">
              {bid.highestBid} tricks <span className="text-[10px] font-normal text-slate-400">({players.find((p) => p.id === bid.highestBidderId)?.name})</span>
            </span>
          ) : (
            <span className="font-semibold text-emerald-400 text-xs">Min open: {config.minBid}</span>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-950/90 text-red-300 border border-red-800 text-[11px] px-2 py-1 rounded w-full">
            {errorMsg}
          </div>
        )}

        {/* Interactive Bid Selector & Buttons OR Waiting Banner */}
        {!isMyTurn ? (
          <div className="w-full py-2.5 px-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 animate-pulse select-none">
            <span>⏳</span>
            <span>Waiting for {activePlayer?.name} to bid...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 w-full pt-1">
            <button
              onClick={handlePassSubmit}
              disabled={isOpeningBid}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-bold text-xs text-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
            >
              Pass
            </button>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl">
              <button
                onClick={() => setSelectedBid(Math.max(minAllowedBid, selectedBid - 1))}
                disabled={selectedBid <= minAllowedBid}
                className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-sm disabled:opacity-30 cursor-pointer"
              >
                -
              </button>
              <span className="text-xl font-extrabold text-white font-mono w-8 text-center">
                {selectedBid}
              </span>
              <button
                onClick={() => setSelectedBid(Math.min(config.totalTricks, selectedBid + 1))}
                disabled={selectedBid >= config.totalTricks}
                className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-sm disabled:opacity-30 cursor-pointer"
              >
                +
              </button>
            </div>

            <button
              onClick={handleBidSubmit}
              className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              Bid {selectedBid}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
