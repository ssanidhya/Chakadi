import React, { useState } from 'react';
import { useGameStore } from './store/gameStore.ts';
import { ScoreHeader } from './components/game/ScoreHeader.tsx';
import { TableLayout } from './components/game/TableLayout.tsx';
import { PlayerHand } from './components/game/PlayerHand.tsx';
import { BoliPanel } from './components/game/BoliPanel.tsx';
import { KaatPicker } from './components/game/KaatPicker.tsx';
import { SettlementModal } from './components/game/SettlementModal.tsx';
import { SettingsModal } from './components/game/SettingsModal.tsx';
import { Player, PlayerCount, createDefaultGameConfig } from './game/index.ts';

export const App: React.FC = () => {
  const { gameState, startGame } = useGameStore();
  const [playerCount, setPlayerCount] = useState<PlayerCount>(6);

  const [players6P, setPlayers6P] = useState<Player[]>([
    { id: 'p1', name: 'Player 1', teamId: 'team_a', seat: 0 },
    { id: 'p2', name: 'Player 2', teamId: 'team_b', seat: 1 },
    { id: 'p3', name: 'Player 3', teamId: 'team_a', seat: 2 },
    { id: 'p4', name: 'Player 4', teamId: 'team_b', seat: 3 },
    { id: 'p5', name: 'Player 5', teamId: 'team_a', seat: 4 },
    { id: 'p6', name: 'Player 6', teamId: 'team_b', seat: 5 },
  ]);

  const [players4P, setPlayers4P] = useState<Player[]>([
    { id: 'p1', name: 'Player 1', teamId: 'team_a', seat: 0 },
    { id: 'p2', name: 'Player 2', teamId: 'team_b', seat: 1 },
    { id: 'p3', name: 'Player 3', teamId: 'team_a', seat: 2 },
    { id: 'p4', name: 'Player 4', teamId: 'team_b', seat: 3 },
  ]);

  const handleStartGame = () => {
    const activePlayers = playerCount === 6 ? players6P : players4P;
    const config = createDefaultGameConfig(playerCount);
    startGame(activePlayers, config);
  };

  if (gameState.phase === 'LOBBY') {
    const currentPlayers = playerCount === 6 ? players6P : players4P;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl flex flex-col items-center gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg mb-2">
              🎴
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Chakadi</h1>
            <p className="text-xs text-slate-400 mt-1">Indian Card Game • 48-Card 3v3 / 52-Card 2v2</p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Game Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPlayerCount(6)}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                  playerCount === 6
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                6 Players (3v3)
              </button>
              <button
                onClick={() => setPlayerCount(4)}
                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                  playerCount === 4
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                4 Players (2v2)
              </button>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Players & Seating</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {currentPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 p-2 rounded-lg"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      player.teamId === 'team_a' ? 'bg-emerald-400' : 'bg-blue-400'
                    }`}
                  />
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      if (playerCount === 6) {
                        const updated = [...players6P];
                        updated[idx] = { ...updated[idx]!, name: newName };
                        setPlayers6P(updated);
                      } else {
                        const updated = [...players4P];
                        updated[idx] = { ...updated[idx]!, name: newName };
                        setPlayers4P(updated);
                      }
                    }}
                    className="bg-transparent text-white text-xs font-medium focus:outline-none w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition-transform active:scale-95 mt-2"
          >
            Start Match
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between overflow-hidden">
      <ScoreHeader />

      <main className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
        <TableLayout />
      </main>

      <PlayerHand />

      <BoliPanel />
      <KaatPicker />
      <SettlementModal />
      <SettingsModal />
    </div>
  );
};

export default App;
