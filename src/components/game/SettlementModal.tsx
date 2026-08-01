import React from 'react';
import { useGameStore } from '../../store/gameStore.ts';

export const SettlementModal: React.FC = () => {
  const { gameState, startNextHand, resetGame } = useGameStore();
  const { phase, lastSettlement, scores, winningTeamId, players } = gameState;

  if (phase !== 'HAND_SETTLEMENT' && phase !== 'GAME_OVER') return null;
  if (!lastSettlement) return null;

  const declarerTeamName = lastSettlement.declarerTeamId === 'team_a' ? 'Team A' : 'Team B';
  const awardedTeamName = lastSettlement.awardedToTeamId === 'team_a' ? 'Team A' : 'Team B';
  const isGameOver = phase === 'GAME_OVER';

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center gap-5 text-center">
        {/* Header */}
        <div className="flex flex-col items-center">
          {isGameOver ? (
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">MATCH OVER</span>
              <h2 className="text-2xl font-black text-amber-300 mt-1">
                🏆 {winningTeamId === 'team_a' ? 'Team A' : 'Team B'} Wins the Match!
              </h2>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Hand Completed</span>
              <h2 className="text-xl font-bold text-white mt-0.5">Hand Settlement</h2>
            </div>
          )}
        </div>

        {/* Contract Result Badge */}
        <div
          className={`w-full p-4 rounded-xl border flex flex-col items-center ${
            lastSettlement.contractSucceeded
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
              : 'bg-red-950/80 border-red-800 text-red-300'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider">
            {lastSettlement.contractSucceeded ? 'Contract Succeeded' : 'Contract Failed'}
          </span>
          <div className="text-lg font-bold mt-1">
            {declarerTeamName} bid {lastSettlement.contractBid} & won {lastSettlement.declarerTricksWon} tricks
          </div>
          <p className="text-xs mt-1 opacity-90">
            {lastSettlement.contractSucceeded
              ? `Awarded +${lastSettlement.penaltyAward} Gunti penalty to opposing ${awardedTeamName}.`
              : `Penalty +${lastSettlement.penaltyAward} Gunti awarded to ${declarerTeamName}.`}
          </p>
        </div>

        {/* 48-Point Coat Wrap-Around Notice */}
        {lastSettlement.coatAwardedToTeamId && (
          <div className="bg-amber-950/80 border border-amber-600 text-amber-200 text-xs p-3 rounded-xl w-full flex items-center justify-center gap-2">
            <span className="text-base">🚨</span>
            <span>
              <strong>48 Gunti Threshold Hit!</strong>{' '}
              {lastSettlement.coatAwardedToTeamId === 'team_a' ? 'Team A' : 'Team B'} receives +1 Kot and points wrapped around.
            </span>
          </div>
        )}

        {/* Updated Team Scores Table */}
        <div className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col items-center p-2 rounded bg-emerald-950/40 border border-emerald-800/40">
            <span className="font-bold text-emerald-400">Team A</span>
            <span className="text-base font-extrabold text-white mt-1">
              {scores.team_a.penaltyPoints} <span className="text-xs font-normal text-slate-400">Gunti</span>
            </span>
            {scores.team_a.coat > 0 && (
              <span className="mt-1 bg-red-600 text-white font-mono px-1.5 py-0.5 rounded text-[10px]">
                {scores.team_a.coat} Kot
              </span>
            )}
          </div>

          <div className="flex flex-col items-center p-2 rounded bg-blue-950/40 border border-blue-800/40">
            <span className="font-bold text-blue-400">Team B</span>
            <span className="text-base font-extrabold text-white mt-1">
              {scores.team_b.penaltyPoints} <span className="text-xs font-normal text-slate-400">Gunti</span>
            </span>
            {scores.team_b.coat > 0 && (
              <span className="mt-1 bg-red-600 text-white font-mono px-1.5 py-0.5 rounded text-[10px]">
                {scores.team_b.coat} Kot
              </span>
            )}
          </div>
        </div>

        {/* Next Dealer info */}
        <div className="text-xs text-slate-400">
          Next Dealer:{' '}
          <span className="font-bold text-amber-300">
            {players.find((p) => p.id === lastSettlement.nextDealerId)?.name}
          </span>
        </div>

        {/* Action Controls */}
        <div className="w-full mt-2">
          {isGameOver ? (
            <button
              onClick={resetGame}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Start New Game
            </button>
          ) : (
            <button
              onClick={() => startNextHand()}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Deal Next Hand
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
