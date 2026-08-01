import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore.ts';

export const BoliPanel: React.FC = () => {
  const { gameState, placeBid, passBid } = useGameStore();
  const { phase, turnPlayerId, bid, config, players } = gameState;

  const [selectedBid, setSelectedBid] = useState<number>(
    Math.max(config.minBid, bid.highestBid + 1)
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (phase !== 'BIDDING' || !turnPlayerId) return null;

  const activePlayer = players.find((p) => p.id === turnPlayerId);

  const handleBidSubmit = () => {
    setErrorMsg(null);
    const res = placeBid(turnPlayerId, selectedBid);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid bid.');
    } else {
      setSelectedBid(selectedBid + 1);
    }
  };

  const handlePassSubmit = () => {
    setErrorMsg(null);
    const res = passBid(turnPlayerId);
    if (!res.success) {
      setErrorMsg(res.error || 'Opening player cannot pass.');
    }
  };

  const isOpeningBid = bid.highestBid === 0;
  const minAllowedBid = isOpeningBid ? config.minBid : bid.highestBid + 1;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center gap-4 text-center">
        {/* Title & Phase */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Boli Phase (Bidding)</span>
          <h2 className="text-xl font-bold text-white mt-0.5">{activePlayer?.name}'s Turn to Bid</h2>
        </div>

        {/* Current Bid Status */}
        <div className="bg-slate-800/80 border border-slate-700 w-full p-3 rounded-xl flex flex-col items-center">
          <span className="text-xs text-slate-400">Current Highest Boli</span>
          {bid.highestBid > 0 ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-300">{bid.highestBid} tricks</span>
              <span className="text-xs text-slate-300">
                by {players.find((p) => p.id === bid.highestBidderId)?.name}
              </span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-emerald-400 mt-1">
              No bids placed yet (Min open: {config.minBid})
            </span>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-950/80 text-red-300 border border-red-800 text-xs p-2 rounded-lg w-full">
            {errorMsg}
          </div>
        )}

        {/* Bid Controls */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedBid(Math.max(minAllowedBid, selectedBid - 1))}
              disabled={selectedBid <= minAllowedBid}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full font-bold text-lg text-white disabled:opacity-40"
            >
              -
            </button>
            <div className="text-3xl font-extrabold text-white w-16 text-center font-mono">
              {selectedBid}
            </div>
            <button
              onClick={() => setSelectedBid(Math.min(config.totalTricks, selectedBid + 1))}
              disabled={selectedBid >= config.totalTricks}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full font-bold text-lg text-white disabled:opacity-40"
            >
              +
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <button
              onClick={handlePassSubmit}
              disabled={isOpeningBid}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-bold text-slate-200 disabled:opacity-40 transition-colors"
            >
              Pass
            </button>
            <button
              onClick={handleBidSubmit}
              className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Bid {selectedBid}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
