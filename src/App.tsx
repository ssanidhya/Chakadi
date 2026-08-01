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
import { generateRoomCode } from './networking/webrtcAdapter.ts';

export const App: React.FC = () => {
  const { gameState, startGame } = useGameStore();
  const [playMode, setPlayMode] = useState<'single' | 'create_room' | 'join_room'>('single');

  // Room Code state
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinPlayerName, setJoinPlayerName] = useState<string>('');
  const [joinTeam, setJoinTeam] = useState<'team_a' | 'team_b'>('team_a');

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

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    const activePlayers = playerCount === 6 ? players6P : players4P;
    const config = createDefaultGameConfig(playerCount);
    startGame(activePlayers, config);
  };

  const handleJoinRoomSubmit = () => {
    if (!joinCodeInput || !joinPlayerName) return;
    const activePlayers = playerCount === 6 ? players6P : players4P;
    const updated = [...activePlayers];
    updated[0] = { ...updated[0]!, name: joinPlayerName, teamId: joinTeam };
    const config = createDefaultGameConfig(playerCount);
    setRoomCode(joinCodeInput);
    startGame(updated, config);
  };

  if (gameState.phase === 'LOBBY') {
    const currentPlayers = playerCount === 6 ? players6P : players4P;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl flex flex-col items-center gap-6">
          {/* Logo & Title */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg mb-2">
              🎴
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Chakadi</h1>
            <p className="text-xs text-slate-400 mt-1">Indian Card Game • 48-Card 3v3 / 52-Card 2v2</p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="w-full grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setPlayMode('single')}
              className={`py-2 px-2 rounded-lg transition-colors ${
                playMode === 'single' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Single Phone
            </button>
            <button
              onClick={() => setPlayMode('create_room')}
              className={`py-2 px-2 rounded-lg transition-colors ${
                playMode === 'create_room' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Host Room
            </button>
            <button
              onClick={() => setPlayMode('join_room')}
              className={`py-2 px-2 rounded-lg transition-colors ${
                playMode === 'join_room' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Join Room
            </button>
          </div>

          {/* 6P vs 4P Mode Toggle */}
          <div className="w-full flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Game Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPlayerCount(6)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  playerCount === 6
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                6 Players (3v3)
              </button>
              <button
                onClick={() => setPlayerCount(4)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  playerCount === 4
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                4 Players (2v2)
              </button>
            </div>
          </div>

          {/* Tab 1: Single Phone Pass-and-Play */}
          {playMode === 'single' && (
            <>
              <div className="w-full flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Players & Seating</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
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
                Start Local Match
              </button>
            </>
          )}

          {/* Tab 2: Create Host Room */}
          {playMode === 'create_room' && (
            <div className="w-full flex flex-col items-center gap-4 text-center">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl w-full flex flex-col items-center gap-1">
                <span className="text-xs text-slate-400">Share this Room Code with friends</span>
                <span className="text-3xl font-mono font-extrabold text-amber-300 tracking-wider">
                  {roomCode || 'CHAK-4821'}
                </span>
                <span className="text-[10px] text-emerald-400 mt-1">Friends join by typing this code</span>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition-transform active:scale-95"
              >
                Create & Start Room
              </button>
            </div>
          )}

          {/* Tab 3: Join Private Room */}
          {playMode === 'join_room' && (
            <div className="w-full flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">4-Digit Room Code</label>
                <input
                  type="text"
                  placeholder="e.g. 4821"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="bg-slate-950 border border-slate-700 text-white font-mono font-bold text-center text-lg p-3 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Player Name</label>
                <input
                  type="text"
                  placeholder="Enter your name..."
                  value={joinPlayerName}
                  onChange={(e) => setJoinPlayerName(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-white text-sm p-3 rounded-xl focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Team</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setJoinTeam('team_a')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      joinTeam === 'team_a'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Team A
                  </button>
                  <button
                    onClick={() => setJoinTeam('team_b')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                      joinTeam === 'team_b'
                        ? 'bg-blue-950 border-blue-500 text-blue-300'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Team B
                  </button>
                </div>
              </div>

              <button
                onClick={handleJoinRoomSubmit}
                disabled={!joinCodeInput || !joinPlayerName}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition-transform active:scale-95 disabled:opacity-40 mt-2"
              >
                Join Room {joinCodeInput ? `#${joinCodeInput}` : ''}
              </button>
            </div>
          )}
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
