import React from 'react';
import { useGameStore } from '../../store/gameStore.ts';
import { SUITS } from '../../game/index.ts';

interface ScoreHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScoreHistoryModal: React.FC<ScoreHistoryModalProps> = ({ isOpen, onClose }) => {
  const { gameState } = useGameStore();
  const { handHistory, scores, players } = gameState;

  if (!isOpen) return null;

  const history = handHistory || [];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 text-left max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <h2 className="text-lg font-bold text-white">Match Score Ledger</h2>
              <span className="text-[11px] text-slate-400">Round-by-round Gunti & Kot breakdown</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Current Standing Summary Banner */}
        <div className="grid grid-cols-2 gap-2 w-full text-xs">
          <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl p-2.5 flex flex-col items-center">
            <span className="text-emerald-300 font-bold uppercase tracking-wider text-[10px]">Team A Standing</span>
            <span className="text-lg font-black text-white mt-0.5">
              {scores.team_a.penaltyPoints} <span className="text-xs font-normal text-slate-400">Pts</span>
            </span>
            {scores.team_a.coat > 0 && (
              <span className="mt-1 bg-red-600 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">
                {scores.team_a.coat} Kot
              </span>
            )}
          </div>

          <div className="bg-blue-950/60 border border-blue-700/50 rounded-xl p-2.5 flex flex-col items-center">
            <span className="text-blue-300 font-bold uppercase tracking-wider text-[10px]">Team B Standing</span>
            <span className="text-lg font-black text-white mt-0.5">
              {scores.team_b.penaltyPoints} <span className="text-xs font-normal text-slate-400">Pts</span>
            </span>
            {scores.team_b.coat > 0 && (
              <span className="mt-1 bg-red-600 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">
                {scores.team_b.coat} Kot
              </span>
            )}
          </div>
        </div>

        {/* History Table or Empty State */}
        <div className="flex-1 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <span className="text-3xl opacity-40">🎴</span>
              <span className="text-sm font-semibold text-slate-400">No completed rounds yet</span>
              <span className="text-xs text-slate-600 max-w-xs">
                Scores and penalties will appear here after the first hand is played and settled.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((h, idx) => {
                const declarerTeam = h.declarerTeamId === 'team_a' ? 'Team A' : 'Team B';
                const awardedTeam = h.awardedToTeamId === 'team_a' ? 'Team A' : 'Team B';

                return (
                  <div
                    key={`round-${idx}`}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-md text-[10px] font-mono">
                          Hand #{idx + 1}
                        </span>
                        <span className="font-semibold text-white">
                          {declarerTeam} bid <strong className="text-amber-300">{h.contractBid}</strong>
                        </span>
                      </div>
                      <span
                        className={`font-bold text-[11px] px-2 py-0.5 rounded-full ${
                          h.contractSucceeded
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                            : 'bg-red-950 text-red-400 border border-red-800/50'
                        }`}
                      >
                        {h.contractSucceeded ? 'Made ✓' : 'Failed ✗'} ({h.declarerTricksWon} tricks)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>
                        Penalty: <strong className="text-amber-400">+{h.penaltyAward} pts</strong> to {awardedTeam}
                      </span>
                      <span className="font-mono text-slate-300">
                        Score: A {h.updatedScores.team_a.penaltyPoints} pts / B {h.updatedScores.team_b.penaltyPoints} pts
                      </span>
                    </div>

                    {h.coatAwardedToTeamId && (
                      <div className="mt-0.5 bg-red-950/60 border border-red-800/60 text-red-300 text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                        <span>🚨</span>
                        <span>48 Pts reached! +1 Kot awarded to {h.coatAwardedToTeamId === 'team_a' ? 'Team A' : 'Team B'}.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Close Ledger
        </button>
      </div>
    </div>
  );
};
