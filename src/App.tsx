import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from './store/gameStore.ts';
import { useSettingsStore } from './store/settingsStore.ts';
import { ScoreHeader } from './components/game/ScoreHeader.tsx';
import { TableLayout } from './components/game/TableLayout.tsx';
import { PlayerHand } from './components/game/PlayerHand.tsx';
import { BoliPanel } from './components/game/BoliPanel.tsx';
import { KaatPicker } from './components/game/KaatPicker.tsx';
import { SettlementModal } from './components/game/SettlementModal.tsx';
import { SettingsModal } from './components/game/SettingsModal.tsx';
import { DebugLogOverlay } from './components/game/DebugLogOverlay.tsx';
import { Player, PlayerCount, TeamId, createDefaultGameConfig } from './game/index.ts';
import {
  generateRoomCode,
  roomRegistry,
  PeerJSHostAdapter,
  PeerJSClientAdapter,
  NetworkAdapter,
} from './networking/index.ts';
import { logInfo, logError } from './utils/logger.ts';

export const App: React.FC = () => {
  const { gameState, startGame } = useGameStore();
  const isDev = import.meta.env.DEV;
  const adapterRef = useRef<NetworkAdapter | null>(null);

  const [playMode, setPlayMode] = useState<'create_room' | 'join_room' | 'single'>('create_room');
  const [copied, setCopied] = useState<boolean>(false);

  const [roomCode, setRoomCode] = useState<string>(() => roomRegistry.generateUniqueRoomCode());
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinPlayerName, setJoinPlayerName] = useState<string>('');

  const [playerCount, setPlayerCount] = useState<PlayerCount>(6);

  // Lobby waiting room state
  const [hostPlayerName, setHostPlayerName] = useState<string>('');
  const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([]);
  const [roomReady, setRoomReady] = useState<boolean>(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'connecting' | 'joined'>('idle');
  const [joinedRoomCode, setJoinedRoomCode] = useState<string>('');

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

  // Auto-detect joinRoom URL query parameter & load cached session on launch
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chakadi_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.playerName) {
          setHostPlayerName(parsed.playerName);
          setJoinPlayerName(parsed.playerName);
        }
      }
    } catch (e) {
      // ignore
    }

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('joinRoom') || params.get('room');
    if (codeParam && /^\d{7}$/.test(codeParam.trim())) {
      setPlayMode('join_room');
      setJoinCodeInput(codeParam.trim());
      logInfo('P2P', `Auto-detected room code #${codeParam.trim()} from URL`);
    }
  }, []);

  const getShareUrl = (code: string) => {
    const targetCode = code || roomCode;
    const url = new URL(window.location.href);
    url.searchParams.set('joinRoom', targetCode);
    return url.toString();
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl(roomCode);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      logInfo('UI', 'Copied join URL to clipboard', { shareUrl });
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleShareRoom = async () => {
    const targetCode = roomCode;
    const shareUrl = getShareUrl(targetCode);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Chakadi Card Game',
          text: `Join my Chakadi card game room #${targetCode}!`,
          url: shareUrl,
        });
        logInfo('UI', 'Shared room via Web Share API', { targetCode, shareUrl });
      } catch (err) {
        // User cancelled share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const handleStartGame = () => {
    const activePlayers = playerCount === 6 ? players6P : players4P;
    const config = createDefaultGameConfig(playerCount);
    logInfo('UI', 'Starting local game (Dev Mode)', { playerCount, players: activePlayers });
    useGameStore.getState().setActiveAdapter(null);
    startGame(activePlayers, config);
  };

  const handleCreateRoom = async () => {
    if (!hostPlayerName.trim()) return;
    const activePlayers = playerCount === 6 ? players6P : players4P;
    const hostPlayer: Player = { ...activePlayers[0]!, name: hostPlayerName.trim(), teamId: 'team_a' };
    const newLobby = [hostPlayer];
    setLobbyPlayers(newLobby);
    setRoomReady(false);
    logInfo('P2P', `Host "${hostPlayerName}" opening room #${roomCode}`, { roomCode });

    try {
      localStorage.setItem(
        'chakadi_session',
        JSON.stringify({
          roomCode,
          playerName: hostPlayerName.trim(),
          playerId: hostPlayer.id,
          isHost: true,
        })
      );
    } catch (e) {
      // ignore storage error
    }

    if (adapterRef.current) {
      await adapterRef.current.disconnect();
    }

    const hostAdapter = new PeerJSHostAdapter(roomCode, playerCount);
    hostAdapter.setHostPlayer(hostPlayer);
    adapterRef.current = hostAdapter;

    useGameStore.getState().setActiveAdapter(hostAdapter);
    useGameStore.getState().setActiveViewPlayerId(hostPlayer.id);

    hostAdapter.subscribe((msg) => {
      if (msg.type === 'ROOM_STATE') {
        setLobbyPlayers([...msg.room.players]);
      }
    });

    try {
      await hostAdapter.connect();
      logInfo('P2P', `Host adapter active for room #${roomCode}`);
    } catch (err) {
      logError('P2P', `Failed to initialize host adapter for room #${roomCode}`, { error: err });
    }
  };

  const handleJoinRoomSubmit = async () => {
    if (joinStatus !== 'idle') return;
    if (!joinCodeInput || !joinPlayerName) return;
    const cleanCode = joinCodeInput.trim();
    if (!roomRegistry.isValidRoomCodeFormat(cleanCode)) return;

    setJoinStatus('connecting');
    setJoinedRoomCode(cleanCode);

    let priorPlayerId = 'pending';
    try {
      const saved = localStorage.getItem('chakadi_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.roomCode === cleanCode &&
          parsed.playerName?.trim().toLowerCase() === joinPlayerName.trim().toLowerCase() &&
          parsed.playerId
        ) {
          priorPlayerId = parsed.playerId;
        }
      }
    } catch (e) {
      // ignore
    }

    const newPlayer: Player = {
      id: priorPlayerId, // previously assigned ID or 'pending'
      name: joinPlayerName.trim(),
      teamId: 'unassigned',
      seat: -1,
    };

    setRoomCode(cleanCode);
    logInfo('P2P', `Joining room #${cleanCode} as "${joinPlayerName}" (prior ID: ${priorPlayerId})`);

    if (adapterRef.current) {
      await adapterRef.current.disconnect();
    }

    const clientAdapter = new PeerJSClientAdapter(newPlayer, cleanCode);
    adapterRef.current = clientAdapter;

    useGameStore.getState().setActiveAdapter(clientAdapter);
    useGameStore.getState().setActiveViewPlayerId(newPlayer.id);

    clientAdapter.subscribe((msg) => {
      if (msg.type === 'ROOM_STATE') {
        setLobbyPlayers([...msg.room.players]);
        setJoinStatus('joined');
        if (msg.assignedPlayerId) {
          useGameStore.getState().setActiveViewPlayerId(msg.assignedPlayerId);
          try {
            localStorage.setItem(
              'chakadi_session',
              JSON.stringify({
                roomCode: cleanCode,
                playerName: joinPlayerName.trim(),
                playerId: msg.assignedPlayerId,
                isHost: false,
              })
            );
          } catch (e) {
            // ignore
          }
        }
      } else if (msg.type === 'MATCH_STARTED') {
        logInfo('P2P', 'Received MATCH_STARTED from host! Initializing client match state.');
        const playersToUse = msg.room?.players?.length ? msg.room.players : lobbyPlayers;
        const config = createDefaultGameConfig(playersToUse.length as 4 | 6);
        useGameStore.getState().startGame(playersToUse, config);
        useGameStore.getState().setActiveAdapter(clientAdapter);
        useGameStore.getState().setActiveViewPlayerId(clientAdapter.getPlayerId());
      } else if (msg.type === 'SYNC_STATE') {
        useGameStore.getState().syncFromNetwork(msg.state);
      }
    });

    try {
      await clientAdapter.connect();
      logInfo('P2P', `Client adapter connected to host room #${cleanCode}`);
    } catch (err) {
      logError('P2P', `Failed to join room #${cleanCode}`, { error: err });
      setJoinStatus('idle');
    }
  };

  const handleSelectTeam = (teamId: 'team_a' | 'team_b') => {
    if (!adapterRef.current) return;
    const activeId = useGameStore.getState().activeViewPlayerId;
    logInfo('P2P', `Requesting team selection: ${teamId} for player ${activeId}`);
    adapterRef.current.send({
      type: 'SELECT_TEAM',
      roomId: roomCode,
      playerId: activeId,
      teamId,
    });
  };

  const handleHostMovePlayer = (targetPlayerId: string, newTeamId: TeamId) => {
    if (!adapterRef.current) return;
    logInfo('P2P', `Host moving player ${targetPlayerId} to ${newTeamId}`);
    adapterRef.current.send({
      type: 'HOST_MOVE_PLAYER',
      roomId: roomCode,
      targetPlayerId,
      newTeamId,
    });
  };

  const handleStartMatch = () => {
    const requiredPlayers = playerCount;
    const maxPerTeam = playerCount / 2;
    const teamA = lobbyPlayers.filter((p) => p.teamId === 'team_a');
    const teamB = lobbyPlayers.filter((p) => p.teamId === 'team_b');
    if (lobbyPlayers.length < requiredPlayers || teamA.length !== maxPerTeam || teamB.length !== maxPerTeam) return;
    const config = createDefaultGameConfig(playerCount);
    logInfo('P2P', `Host starting match with ${lobbyPlayers.length} players`, { roomCode });

    if (adapterRef.current && adapterRef.current instanceof PeerJSHostAdapter) {
      adapterRef.current.broadcastMatchStarted(lobbyPlayers);
    }

    // Start game engine locally on host
    startGame(lobbyPlayers, config);

    // Bind host engine to host adapter for automated state sync broadcasting
    if (adapterRef.current && adapterRef.current instanceof PeerJSHostAdapter) {
      adapterRef.current.bindEngine(useGameStore.getState().engine);
    }
  };

  const renderLobbyRosters = (isHost: boolean) => {
    const maxPerTeam = playerCount / 2;
    const activePlayerId = useGameStore.getState().activeViewPlayerId;
    const unassigned = lobbyPlayers.filter((p) => p.teamId === 'unassigned');
    const teamA = lobbyPlayers.filter((p) => p.teamId === 'team_a');
    const teamB = lobbyPlayers.filter((p) => p.teamId === 'team_b');

    return (
      <div className="w-full flex flex-col gap-3 text-left">
        {/* Unassigned Players Section */}
        <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Unassigned Players ({unassigned.length})
            </span>
            <span className="text-xs font-mono text-slate-500">
              Total: {lobbyPlayers.length}/{playerCount}
            </span>
          </div>
          {unassigned.length === 0 ? (
            <span className="text-xs text-slate-600 italic py-1">No unassigned players</span>
          ) : (
            unassigned.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-700/50">
                <span className="text-sm text-white font-medium truncate flex-1">{p.name}</span>
                {p.id === activePlayerId && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleSelectTeam('team_a')}
                      disabled={teamA.length >= maxPerTeam}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-950 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900 transition-colors disabled:opacity-30 cursor-pointer"
                    >
                      + Team A
                    </button>
                    <button
                      onClick={() => handleSelectTeam('team_b')}
                      disabled={teamB.length >= maxPerTeam}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-950 border border-blue-500/60 text-blue-300 hover:bg-blue-900 transition-colors disabled:opacity-30 cursor-pointer"
                    >
                      + Team B
                    </button>
                  </div>
                )}
                {isHost && p.id !== activePlayerId && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleHostMovePlayer(p.id, 'team_a')}
                      disabled={teamA.length >= maxPerTeam}
                      className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900 disabled:opacity-30 cursor-pointer"
                    >
                      → Team A
                    </button>
                    <button
                      onClick={() => handleHostMovePlayer(p.id, 'team_b')}
                      disabled={teamB.length >= maxPerTeam}
                      className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-blue-950/80 text-blue-300 border border-blue-500/40 hover:bg-blue-900 disabled:opacity-30 cursor-pointer"
                    >
                      → Team B
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Team Rosters */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {/* Team A Roster */}
          <div className="bg-slate-950 border border-emerald-900/40 rounded-2xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-emerald-900/30 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Team A</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {teamA.length}/{maxPerTeam}
              </span>
            </div>
            {teamA.map((p) => (
              <div key={p.id} className="flex flex-col bg-slate-900/80 rounded-lg p-2 gap-1 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-semibold truncate">{p.name}</span>
                  {p.id === 'p1' && (
                    <span className="text-[9px] text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded font-bold">HOST</span>
                  )}
                </div>
                {isHost && p.id !== 'p1' && (
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => handleHostMovePlayer(p.id, 'team_b')}
                      disabled={teamB.length >= maxPerTeam}
                      className="text-[9px] px-1.5 py-0.5 bg-blue-950 border border-blue-500/40 text-blue-300 rounded hover:bg-blue-900 disabled:opacity-30 cursor-pointer"
                    >
                      → Team B
                    </button>
                    <button
                      onClick={() => handleHostMovePlayer(p.id, 'unassigned')}
                      className="text-[9px] px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 rounded hover:bg-slate-700 cursor-pointer"
                    >
                      Unassign
                    </button>
                  </div>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, maxPerTeam - teamA.length) }).map((_, i) => (
              <div key={`empty-a-${i}`} className="p-2 rounded-lg border border-dashed border-slate-800 text-[11px] text-slate-600 italic text-center">
                Open Slot
              </div>
            ))}
          </div>

          {/* Team B Roster */}
          <div className="bg-slate-950 border border-blue-900/40 rounded-2xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-blue-900/30 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Team B</span>
              </div>
              <span className="text-xs font-mono text-blue-400">
                {teamB.length}/{maxPerTeam}
              </span>
            </div>
            {teamB.map((p) => (
              <div key={p.id} className="flex flex-col bg-slate-900/80 rounded-lg p-2 gap-1 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-semibold truncate">{p.name}</span>
                  {p.id === 'p1' && (
                    <span className="text-[9px] text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded font-bold">HOST</span>
                  )}
                </div>
                {isHost && p.id !== 'p1' && (
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => handleHostMovePlayer(p.id, 'team_a')}
                      disabled={teamA.length >= maxPerTeam}
                      className="text-[9px] px-1.5 py-0.5 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded hover:bg-emerald-900 disabled:opacity-30 cursor-pointer"
                    >
                      → Team A
                    </button>
                    <button
                      onClick={() => handleHostMovePlayer(p.id, 'unassigned')}
                      className="text-[9px] px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 rounded hover:bg-slate-700 cursor-pointer"
                    >
                      Unassign
                    </button>
                  </div>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, maxPerTeam - teamB.length) }).map((_, i) => (
              <div key={`empty-b-${i}`} className="p-2 rounded-lg border border-dashed border-slate-800 text-[11px] text-slate-600 italic text-center">
                Open Slot
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (gameState.phase === 'LOBBY') {
    const currentPlayers = playerCount === 6 ? players6P : players4P;
    const activePlayMode = !isDev && playMode === 'single' ? 'create_room' : playMode;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 md:p-8 w-full max-w-md shadow-2xl flex flex-col items-center gap-5 sm:gap-6">
          <div className="flex flex-col items-center text-center select-none">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg mb-2">
              🎴
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Chakadi
              {isDev && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-normal">
                  DEV
                </span>
              )}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">Indian Card Game • 3v3 (6 Players) & 2v2 (4 Players)</p>
          </div>

          <div
            className={`w-full grid ${
              isDev ? 'grid-cols-3' : 'grid-cols-2'
            } gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] sm:text-xs font-bold`}
          >
            <button
              onClick={() => setPlayMode('create_room')}
              className={`py-2 px-1 sm:px-2 rounded-lg transition-colors truncate ${
                activePlayMode === 'create_room' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Host Room
            </button>
            <button
              onClick={() => setPlayMode('join_room')}
              className={`py-2 px-1 sm:px-2 rounded-lg transition-colors truncate ${
                activePlayMode === 'join_room' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Join Room
            </button>
            {isDev && (
              <button
                onClick={() => setPlayMode('single')}
                className={`py-2 px-1 sm:px-2 rounded-lg transition-colors truncate ${
                  activePlayMode === 'single' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Local Match (Dev)
              </button>
            )}
          </div>

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

          {isDev && activePlayMode === 'single' && (
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

          {activePlayMode === 'create_room' && (
            <div className="w-full flex flex-col items-center gap-4 text-center">
              {/* Host Name Input */}
              {lobbyPlayers.length === 0 && (
                <div className="w-full flex flex-col gap-1 text-left">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Name (Host)</label>
                  <input
                    type="text"
                    placeholder="Enter your name..."
                    value={hostPlayerName}
                    onChange={(e) => setHostPlayerName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white text-sm p-3 rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Room Code Card */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl w-full flex flex-col items-center gap-2 shadow-inner">
                <div className="flex items-center justify-between w-full border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-medium text-slate-400 text-left">Share Room Code</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleCopyLink}
                      className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
                        copied
                          ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-400'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                      title={copied ? 'Link Copied!' : 'Copy Shareable Join Link'}
                    >
                      {copied ? (
                        <svg className="w-4 h-4 fill-current text-emerald-400" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={handleShareRoom}
                      className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-all flex items-center justify-center cursor-pointer active:scale-90"
                      title="Share Room via Mobile Share Sheet"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="py-2 flex flex-col items-center">
                  <span className="text-3xl font-mono font-extrabold text-amber-300 tracking-wider">{roomCode}</span>
                  <span className="text-[10px] text-emerald-400 mt-1">Friends join via link or 7-digit code</span>
                </div>
              </div>

              {/* Lobby Player Roster */}
              {lobbyPlayers.length > 0 && renderLobbyRosters(true)}

              {/* Action Button: Open Room OR Start Match */}
              {lobbyPlayers.length === 0 ? (
                <button
                  onClick={handleCreateRoom}
                  disabled={!hostPlayerName.trim()}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  Open Room
                </button>
              ) : (
                <button
                  onClick={handleStartMatch}
                  disabled={
                    !(
                      lobbyPlayers.length === playerCount &&
                      lobbyPlayers.filter((p) => p.teamId === 'team_a').length === playerCount / 2 &&
                      lobbyPlayers.filter((p) => p.teamId === 'team_b').length === playerCount / 2
                    )
                  }
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {lobbyPlayers.length === playerCount &&
                  lobbyPlayers.filter((p) => p.teamId === 'team_a').length === playerCount / 2 &&
                  lobbyPlayers.filter((p) => p.teamId === 'team_b').length === playerCount / 2
                    ? `Start Match ✓`
                    : `Waiting for Teams (${lobbyPlayers.filter((p) => p.teamId === 'team_a').length}/${
                        playerCount / 2
                      } vs ${lobbyPlayers.filter((p) => p.teamId === 'team_b').length}/${playerCount / 2})`}
                </button>
              )}
            </div>
          )}

          {activePlayMode === 'join_room' && (
            joinStatus === 'joined' ? (
              <div className="w-full flex flex-col items-center gap-4 text-center">
                {/* Room Code & Connected Card */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl w-full flex flex-col items-center gap-2 shadow-inner">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <span>Connected!</span>
                    <span>✓</span>
                  </div>
                  <div className="py-1 flex flex-col items-center">
                    <span className="text-3xl font-mono font-extrabold text-amber-300 tracking-wider">#{joinedRoomCode}</span>
                  </div>
                </div>

                {/* Lobby Player Roster */}
                {renderLobbyRosters(false)}

                {/* Non-clickable status pill */}
                <div className="w-full py-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 animate-pulse select-none">
                  <span>⏳</span>
                  <span>Select your team above & wait for host to start…</span>
                </div>
              </div>
            ) : joinStatus === 'connecting' ? (
              <div className="w-full bg-slate-950 border border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-slate-300">Connecting to room #{joinedRoomCode}…</span>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">7-Digit Room Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 8492015"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, '').slice(0, 7))}
                    maxLength={7}
                    className="bg-slate-950 border border-slate-700 text-white font-mono font-bold text-center text-lg p-3 rounded-xl focus:outline-none focus:border-amber-400 tracking-wider"
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

                <button
                  onClick={handleJoinRoomSubmit}
                  disabled={joinStatus !== 'idle' || joinCodeInput.length !== 7 || !joinPlayerName}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl transition-transform active:scale-95 disabled:opacity-40 mt-2"
                >
                  Join Room {joinCodeInput.length === 7 ? `#${joinCodeInput}` : ''}
                </button>
              </div>
            )
          )}

          <DebugLogOverlay />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col justify-between overflow-hidden">
      <ScoreHeader />

      <main className="flex-1 w-full relative flex items-center justify-center overflow-hidden p-2">
        <TableLayout />
      </main>

      <PlayerHand />

      <BoliPanel />
      <KaatPicker />
      <SettlementModal />
      <SettingsModal />
      <DebugLogOverlay />
    </div>
  );
};

export default App;
