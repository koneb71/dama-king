'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChatPanel } from '@/components/chat/ChatPanel';
import { Board } from '@/components/game/Board';
import { applyMove, createInitialState, moveKey, otherPlayer } from '@/game/engine';
import { getLegalMoves } from '@/game/rules';
import type { Board as BoardT, Color, GameState, Move, Position } from '@/game/types';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type GameRow = {
  id: string;
  red_player_id: string | null;
  black_player_id: string | null;
  current_turn: Color;
  board_state: unknown;
  status: 'waiting' | 'active' | 'finished';
  winner_id: string | null;
  room_code: string | null;
  is_public: boolean;
  is_ranked: boolean;
  best_of: 1 | 3 | 5;
  round_number: number;
  series_red_wins: number;
  series_black_wins: number;
  series_draws: number;
  series_over: boolean;
  created_at: string;
  updated_at: string;
};

type MoveRow = {
  id: string;
  game_id: string;
  player_id: string | null;
  move_number: number;
  round_number?: number;
  from_pos: Position;
  to_pos: Position;
  captures: Position[] | null;
  created_at: string;
};

function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function formatColor(c: Color): string {
  return c === 'black' ? 'Black' : 'Red';
}

function formatResultFromGame(game: GameRow | null): string | null {
  if (!game) return null;
  if (game.status !== 'finished') return null;
  if (!game.winner_id) return 'Game finished.';
  return 'Game finished.';
}

function safeBoardFromBoardState(boardState: unknown): BoardT {
  // Accept either:
  // - board_state = Board
  // - board_state = { board: Board }
  // and fallback to initial state.
  const initial = createInitialState();

  if (Array.isArray(boardState)) {
    return boardState as BoardT;
  }

  if (boardState && typeof boardState === 'object') {
    const maybe = boardState as { board?: unknown };
    if (Array.isArray(maybe.board)) return maybe.board as BoardT;
  }

  return initial.board;
}

function pickMoveFromTo(moves: ReadonlyArray<Move>, from: Position, to: Position): Move | null {
  const candidates = moves.filter((m) => samePos(m.from, from) && samePos(m.to, to));
  if (candidates.length === 0) return null;
  // Prefer more forcing lines (more captures), then promotion for stability.
  candidates.sort((a, b) => {
    if (b.captures.length !== a.captures.length) return b.captures.length - a.captures.length;
    if (b.promotes !== a.promotes) return Number(b.promotes) - Number(a.promotes);
    return moveKey(a).localeCompare(moveKey(b));
  });
  return candidates[0] ?? null;
}

export default function GameRoomPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isAuthenticated, user, player, signInAsGuest } = useAuth();

  const [game, setGame] = useState<GameRow | null>(null);
  const [gameLoading, setGameLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [board, setBoard] = useState<BoardT>(() => createInitialState().board);
  const [selected, setSelected] = useState<Position | null>(null);

  const [moves, setMoves] = useState<MoveRow[]>([]);

  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [playersOnlineCount, setPlayersOnlineCount] = useState<number>(0);
  const [spectatorsOnlineCount, setSpectatorsOnlineCount] = useState<number>(0);
  const [roomCode, setRoomCode] = useState<string>('');
  const [busyJoin, setBusyJoin] = useState(false);
  const [busySpectate, setBusySpectate] = useState(false);
  const [busyMove, setBusyMove] = useState(false);

  const gameUpdatedAtRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastAutoSpectateAttemptRef = useRef<string | null>(null);

  const chat = useChat({ supabase, gameId, userId: user?.id ?? null });

  const myColor: Color | null = useMemo(() => {
    if (!user || !game) return null;
    if (game.red_player_id === user.id) return 'red';
    if (game.black_player_id === user.id) return 'black';
    return null;
  }, [game, user]);

  const isSpectator = !!user && !!game && myColor === null;
  const perspective: Color = myColor ?? 'red';

  const canPlay = !!game && game.status === 'active' && myColor !== null;
  const isMyTurn = canPlay && game.current_turn === myColor;

  const presenceRole = useMemo(() => {
    if (myColor) return `player:${myColor}` as const;
    if (user) return 'spectator' as const;
    return 'anon' as const;
  }, [myColor, user]);

  const legalMoves = useMemo(() => {
    if (!game) return [];
    if (!isMyTurn) return [];
    return getLegalMoves(board, myColor ?? game.current_turn);
  }, [board, game, isMyTurn, myColor]);

  const resultText = useMemo(() => formatResultFromGame(game), [game]);

  // Pre-fill room code via URL: /game/:id?code=XXXXXX
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) return;
    const trimmed = code.trim();
    if (!trimmed) return;
    setRoomCode(trimmed);
  }, [searchParams]);

  const loadInitial = useCallback(async () => {
    setGameLoading(true);
    setError(null);

    try {
      const { data: g, error: gErr } = await supabase
        .from('games')
        .select(
          'id, red_player_id, black_player_id, current_turn, board_state, status, winner_id, room_code, is_public, is_ranked, best_of, round_number, series_red_wins, series_black_wins, series_draws, series_over, created_at, updated_at',
        )
        .eq('id', gameId)
        .maybeSingle();

      if (gErr) throw gErr;
      if (!g) {
        setGame(null);
        setBoard(createInitialState().board);
        setMoves([]);
        return;
      }

      const row = g as GameRow;
      setGame(row);
      gameUpdatedAtRef.current = row.updated_at;
      setBoard(safeBoardFromBoardState(row.board_state));

      // Moves history is best-effort; room may still be waiting/private.
      const [{ data: moveRows }] = await Promise.all([
        supabase
          .from('moves')
          .select('id, game_id, player_id, move_number, round_number, from_pos, to_pos, captures, created_at')
          .eq('game_id', gameId)
          .order('move_number', { ascending: true }),
      ]);

      setMoves((moveRows as MoveRow[] | null) ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load game.';
      setError(msg);
    } finally {
      setGameLoading(false);
    }
  }, [gameId, supabase]);

  // Load room state
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Reload game when user signs in (e.g. guest sign-in while viewing game).
  // This ensures RLS-protected games become visible after authentication.
  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    // Only reload if user actually changed (signed in or switched accounts)
    if (currentUserId !== prevUserId.current && currentUserId !== null) {
      void loadInitial();
    }
    prevUserId.current = currentUserId;
  }, [user?.id, loadInitial]);

  function recomputePresenceCounts(channel: { presenceState: () => Record<string, unknown> }) {
    const state = channel.presenceState() as Record<string, unknown>;
    let online = 0;
    let players = 0;
    let spectators = 0;

    for (const metas of Object.values(state)) {
      if (!Array.isArray(metas) || metas.length === 0) continue;
      online += 1;
      const meta = (metas[0] ?? null) as { role?: unknown } | null;
      const role = typeof meta?.role === 'string' ? meta.role : 'unknown';
      if (role.startsWith('player:')) players += 1;
      else spectators += 1;
    }

    setOnlineCount(Math.max(1, online));
    setPlayersOnlineCount(players);
    setSpectatorsOnlineCount(spectators);
  }

  // Subscribe to realtime updates (game row + new moves + new chat + presence)
  useEffect(() => {
    const presenceKey =
      user?.id ??
      (typeof window !== 'undefined'
        ? `anon:${crypto.randomUUID?.() ?? Math.random().toString(16).slice(2)}`
        : 'anon');

    const channel = supabase
      .channel(`game:${gameId}`, {
        config: {
          presence: { key: presenceKey },
        },
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const next = payload.new as GameRow;
          setGame(next);
          gameUpdatedAtRef.current = next.updated_at;
          setBoard(safeBoardFromBoardState(next.board_state));
          setSelected(null);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'moves', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const next = payload.new as MoveRow;
          setMoves((cur) => {
            if (cur.some((m) => m.id === next.id)) return cur;
            return [...cur, next].sort((a, b) => a.move_number - b.move_number);
          });
        },
      )
      .on('presence', { event: 'sync' }, () => {
        recomputePresenceCounts(channel);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ onlineAt: new Date().toISOString(), role: presenceRole });
        }
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, supabase, user?.id]);

  const startNextRound = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('start_next_round', { p_game_id: gameId });
      if (rpcErr) throw rpcErr;
      const next = data as GameRow | null;
      if (!next) throw new Error('Failed to start next round.');
      setGame(next);
      gameUpdatedAtRef.current = next.updated_at;
      setBoard(safeBoardFromBoardState(next.board_state));
      setMoves([]);
      setSelected(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to start next round.';
      setError(msg);
    }
  }, [gameId, supabase, user]);

  // Update presence role if user becomes player/spectator after subscribing.
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;
    void ch.track({ onlineAt: new Date().toISOString(), role: presenceRole });
  }, [presenceRole]);

  // Poll for updates as fallback when realtime isn't working
  useEffect(() => {
    // Don't poll if game is finished or not loaded
    if (!game || game.status === 'finished') return;
    
    // Poll faster when waiting, slower when active
    const pollMs = game.status === 'waiting' ? 2000 : 1500;
    
    const pollInterval = setInterval(async () => {
      try {
        // Fetch latest game state
        const { data: g } = await supabase
          .from('games')
          .select(
            'id, red_player_id, black_player_id, current_turn, board_state, status, winner_id, room_code, is_public, is_ranked, best_of, round_number, series_red_wins, series_black_wins, series_draws, series_over, created_at, updated_at',
          )
          .eq('id', gameId)
          .maybeSingle();
        
        if (g) {
          const row = g as GameRow;
          // Only update if data actually changed
          if (row.updated_at !== gameUpdatedAtRef.current) {
            setGame(row);
            gameUpdatedAtRef.current = row.updated_at;
            setBoard(safeBoardFromBoardState(row.board_state));
          }
        }
        
        // Also fetch latest moves
        const { data: moveRows } = await supabase
          .from('moves')
          .select('id, game_id, player_id, move_number, round_number, from_pos, to_pos, captures, created_at')
          .eq('game_id', gameId)
          .order('move_number', { ascending: true });
        
        if (moveRows) {
          setMoves((current) => {
            // Only update if moves changed
            if (moveRows.length !== current.length) {
              return moveRows as MoveRow[];
            }
            return current;
          });
        }
      } catch {
        // Silently ignore polling errors
      }
    }, pollMs);
    
    return () => clearInterval(pollInterval);
  }, [game?.status, gameId, supabase]);

  const unlockSpectate = useCallback(
    async (opts?: { code?: string | null }) => {
      if (!user) return;
      if (busySpectate) return;
      setBusySpectate(true);
      setError(null);
      try {
        const code = (opts?.code ?? roomCode).trim();
        const { error: rpcErr } = await supabase.rpc('spectate_game', {
          p_game_id: gameId,
          p_room_code: code.length ? code : null,
        });
        if (rpcErr) throw rpcErr;
        await loadInitial();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to spectate game.';
        setError(msg);
      } finally {
        setBusySpectate(false);
      }
    },
    [busySpectate, gameId, loadInitial, roomCode, supabase, user],
  );

  // If the game isn't visible, try to self-register as spectator (best-effort).
  useEffect(() => {
    if (!user) return;
    if (gameLoading) return;
    if (game) return;
    const key = `${user.id}:${gameId}`;
    if (lastAutoSpectateAttemptRef.current === key) return;
    lastAutoSpectateAttemptRef.current = key;
    void unlockSpectate({ code: null });
  }, [game, gameId, gameLoading, unlockSpectate, user]);

  // If authenticated and not a participant, upsert into spectators (best-effort).
  useEffect(() => {
    if (!user) return;
    if (!game) return;
    if (myColor !== null) return;

    let cancelled = false;
    (async () => {
      try {
        await supabase.from('game_spectators').upsert(
          { game_id: gameId, player_id: user.id },
          { onConflict: 'game_id,player_id' },
        );
      } catch {
        // ignore
      }
      if (!cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [game, gameId, myColor, supabase, user]);

  const tryJoinAsBlack = useCallback(async () => {
    if (!user) return;
    if (!game) return;
    if (busyJoin) return;

    setError(null);
    setBusyJoin(true);
    try {
      const { data, error: joinErr } = await supabase.rpc('join_game', {
        p_game_id: gameId,
        p_room_code: roomCode.trim().length ? roomCode.trim() : null,
      });
      if (joinErr) throw joinErr;
      if (data) {
        const joined = data as GameRow;
        setGame(joined);
        gameUpdatedAtRef.current = joined.updated_at;
        setBoard(safeBoardFromBoardState(joined.board_state));
        setSelected(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join game.';
      setError(msg);
    } finally {
      setBusyJoin(false);
    }
  }, [busyJoin, game, gameId, roomCode, supabase, user]);

  const submitMove = useCallback(
    async (move: Move) => {
      if (!user) return;
      if (!game) return;
      if (!canPlay) return;
      if (!isMyTurn) return;
      if (busyMove) return;

      setError(null);
      setBusyMove(true);
      try {
        // Recompute from latest local board for safety.
        const curState: GameState = { board, turn: game.current_turn, result: { status: 'active' } };
        const nextState = applyMove(curState, move);
        if (nextState === curState) {
          setBusyMove(false);
          return;
        }

        const previousUpdatedAt = gameUpdatedAtRef.current ?? game.updated_at;

        // Fetch last move_number to avoid clashes with the unique constraint.
        const { data: lastMoveRow, error: lastMoveErr } = await supabase
          .from('moves')
          .select('move_number')
          .eq('game_id', gameId)
          .order('move_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastMoveErr) throw lastMoveErr;
        const nextMoveNumber = ((lastMoveRow as { move_number?: number } | null)?.move_number ?? 0) + 1;

        const winnerId =
          nextState.result.status === 'finished'
            ? nextState.result.winner === 'red'
              ? game.red_player_id
              : game.black_player_id
            : null;

        // Optimistic concurrency: only update if updated_at matches what we last saw.
        const { data: updatedGame, error: updErr } = await supabase
          .from('games')
          .update({
            board_state: nextState.board,
            current_turn: nextState.turn,
            status: nextState.result.status === 'finished' ? 'finished' : 'active',
            winner_id: winnerId,
          })
          .eq('id', gameId)
          .eq('updated_at', previousUpdatedAt)
          .select(
            'id, red_player_id, black_player_id, current_turn, board_state, status, winner_id, room_code, is_public, is_ranked, best_of, round_number, series_red_wins, series_black_wins, series_draws, series_over, created_at, updated_at',
          )
          .maybeSingle();
        if (updErr) throw updErr;
        if (!updatedGame) {
          // Someone else moved first; refresh and let realtime reconcile.
          await loadInitial();
          return;
        }

        // Record history (best-effort).
        const { error: insErr } = await supabase.from('moves').insert({
          game_id: gameId,
          player_id: user.id,
          move_number: nextMoveNumber,
          round_number: game.round_number,
          from_pos: move.from,
          to_pos: move.to,
          captures: move.captures,
        });
        if (insErr) {
          // If move_number collides, just refresh; realtime will still show board.
          await loadInitial();
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to submit move.';
        setError(msg);
      } finally {
        setBusyMove(false);
      }
    },
    [board, busyMove, canPlay, game, gameId, isMyTurn, loadInitial, supabase, user],
  );

  function onSquareClick(pos: Position) {
    if (!game) return;
    if (!isMyTurn) return;

    if (!selected) {
      const hasMove = legalMoves.some((m) => samePos(m.from, pos));
      if (hasMove) setSelected(pos);
      return;
    }

    if (samePos(selected, pos)) {
      setSelected(null);
      return;
    }

    const canReselect = legalMoves.some((m) => samePos(m.from, pos));
    if (canReselect) {
      setSelected(pos);
      return;
    }

    const move = pickMoveFromTo(legalMoves, selected, pos);
    if (!move) return;

    // Immediate local feel; realtime will reconcile if conflict.
    const curState: GameState = { board, turn: game.current_turn, result: { status: 'active' } };
    const nextState = applyMove(curState, move);
    if (nextState !== curState) {
      setBoard(nextState.board);
      setSelected(null);
      void submitMove(move);
    }
  }

  const title = useMemo(() => {
    if (!game) return `Game ${gameId}`;
    if (myColor) return `Game ${game.id} — You are ${formatColor(myColor)}`;
    if (user) return `Game ${game.id} — Spectating`;
    return `Game ${game.id}`;
  }, [game, gameId, myColor, user]);

  const joinable =
    !!user &&
    !!game &&
    game.status === 'waiting' &&
    game.red_player_id !== null &&
    game.black_player_id === null &&
    myColor === null;

  // Determine winner info for display
  const winnerColor = useMemo(() => {
    if (!game || game.status !== 'finished' || !game.winner_id) return null;
    if (game.winner_id === game.red_player_id) return 'red';
    if (game.winner_id === game.black_player_id) return 'black';
    return null;
  }, [game]);

  const didIWin = winnerColor === myColor;
  const didILose = winnerColor !== null && myColor !== null && winnerColor !== myColor;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <main className="mx-auto h-full max-w-7xl px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
        {/* Error Banner */}
        {error && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Game Not Found - wait for auth to load before showing this */}
        {!gameLoading && !authLoading && !game ? (
          <div className="flex h-[calc(100vh-5.5rem)] items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-zinc-900">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Game not found</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                This game doesn't exist or you don't have access to view it.
              </p>
              {user && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-medium">Have a room code?</p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800"
                      placeholder="Enter room code"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                    />
                    <button
                      onClick={() => void unlockSpectate()}
                      disabled={busySpectate}
                      className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {busySpectate ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                </div>
              )}
              <Link
                href="/lobby"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                ← Back to lobby
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:h-[calc(100vh-5.5rem)] lg:flex-row lg:gap-4">
            {/* Left Column - Board & Game Info */}
            <div className="flex min-h-0 flex-col lg:flex-1">
              {/* Compact Game Header */}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 shadow-md dark:border-white/10 dark:bg-zinc-900 lg:mb-3 lg:px-4 lg:py-2.5">
                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Game Status Badge */}
                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                      game?.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : game?.status === 'waiting'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : game?.status === 'finished'
                            ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
                    ].join(' ')}
                  >
                    {game?.status === 'active' && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                    )}
                    {game?.status === 'active' ? 'Live' : game?.status === 'waiting' ? 'Waiting' : game?.status === 'finished' ? 'Finished' : '...'}
                  </span>

                  {/* Ranked Badge */}
                  {game?.is_ranked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Ranked
                    </span>
                  )}

                  {/* Online Count */}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {onlineCount}
                  </span>
                </div>

                {/* Auth Section */}
                {!authLoading && !isAuthenticated && (
                  <button
                    onClick={() => void signInAsGuest()}
                    className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:shadow-lg"
                  >
                    Sign in to play
                  </button>
                )}
              </div>

              {/* Winner Banner - Compact */}
              {game?.status === 'finished' && winnerColor && (
                <div
                  className={[
                    'mb-2 flex items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-md',
                    didIWin
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                      : didILose
                        ? 'bg-gradient-to-r from-zinc-600 to-zinc-700 text-white'
                        : winnerColor === 'red'
                          ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                          : 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{didIWin ? '🎉' : didILose ? '😔' : '🏆'}</span>
                    <div>
                      <h2 className="font-bold">
                        {didIWin ? 'You Won!' : didILose ? 'You Lost' : `${formatColor(winnerColor)} Wins!`}
                      </h2>
                      {game.best_of > 1 && (
                        <p className="text-xs opacity-90">
                          Best of {game.best_of} • Red {game.series_red_wins} – {game.series_black_wins} Black
                        </p>
                      )}
                    </div>
                  </div>
                  {game.best_of > 1 && !game.series_over && (
                    <button
                      type="button"
                      onClick={() => void startNextRound()}
                      className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
                    >
                      Next round
                    </button>
                  )}
                </div>
              )}

              {/* Join Banner - Compact */}
              {joinable && (
                <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white shadow-md">
                  <div>
                    <h3 className="font-bold">Join this game!</h3>
                    <p className="text-xs opacity-90">Play as Black</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!game.is_public && (
                      <input
                        className="w-24 rounded-lg bg-white/20 px-2 py-1.5 text-sm placeholder-white/60 outline-none backdrop-blur-sm"
                        placeholder="Code"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                      />
                    )}
                    <button
                      onClick={() => void tryJoinAsBlack()}
                      disabled={busyJoin}
                      className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-amber-600 transition-all hover:bg-amber-50 disabled:opacity-50"
                    >
                      {busyJoin ? '...' : 'Join'}
                    </button>
                  </div>
                </div>
              )}

              {/* Board - Centered and fills available space */}
              <div className="mb-4 flex flex-1 items-center justify-center lg:mb-0">
                <Board
                  board={board}
                  perspective={perspective}
                  selected={selected}
                  legalMoves={legalMoves}
                  onSquareClick={onSquareClick}
                  compact
                />
              </div>

              {/* Turn Indicator */}
              {game?.status === 'active' && (
                <div className="mt-3 flex items-center justify-center">
                  <div
                    className={[
                      "flex items-center gap-3 rounded-full px-5 py-2.5 shadow-md transition-all",
                      isMyTurn
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                        : "border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "h-6 w-6 rounded-full shadow-inner",
                        game.current_turn === "red"
                          ? "bg-gradient-to-br from-red-400 to-red-600"
                          : "bg-gradient-to-br from-zinc-600 to-zinc-800 dark:from-zinc-300 dark:to-zinc-500",
                      ].join(" ")}
                    />
                    <span className="font-semibold">
                      {isMyTurn ? "Your Turn" : canPlay ? `${formatColor(game.current_turn)}'s Turn` : "Spectating"}
                    </span>
                    {isMyTurn && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                      </span>
                    )}
                    {busyMove && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Players & Info (Scrollable) */}
            <div className="flex min-h-0 flex-col gap-2 overflow-y-auto lg:w-[340px] lg:shrink-0 lg:gap-3">
              {/* Players Card - Compact on mobile */}
              <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-md dark:border-white/10 dark:bg-zinc-900 lg:rounded-2xl lg:shadow-lg">
                <div className="flex items-stretch">
                  {/* Red Player */}
                  <div
                    className={[
                      'flex flex-1 flex-col items-center justify-center gap-1 p-2 transition-all lg:gap-2 lg:p-4',
                      game?.current_turn === 'red' && game?.status === 'active' ? 'bg-red-50 dark:bg-red-900/20' : '',
                    ].join(' ')}
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg ring-2 ring-red-300/50 lg:h-12 lg:w-12" />
                      {game?.current_turn === 'red' && game?.status === 'active' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-zinc-900 lg:-bottom-1 lg:-right-1 lg:h-4 lg:w-4" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold lg:text-sm">
                        {myColor === 'red' ? 'You' : 'Red'}
                      </div>
                      <div className="hidden text-xs text-zinc-500 dark:text-zinc-400 lg:block">
                        {game?.red_player_id ? `${game.red_player_id.slice(0, 6)}...` : 'Waiting'}
                      </div>
                    </div>
                    {winnerColor === 'red' && <span className="text-sm lg:text-lg">👑</span>}
                  </div>

                  {/* VS Divider */}
                  <div className="flex flex-col items-center justify-center bg-zinc-100 px-2 dark:bg-zinc-800 lg:px-3">
                    <div className="rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-900/30 lg:px-3 lg:py-1">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 lg:text-xs">VS</span>
                    </div>
                  </div>

                  {/* Black Player */}
                  <div
                    className={[
                      'flex flex-1 flex-col items-center justify-center gap-1 p-2 transition-all lg:gap-2 lg:p-4',
                      game?.current_turn === 'black' && game?.status === 'active' ? 'bg-zinc-100 dark:bg-zinc-700/30' : '',
                    ].join(' ')}
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 shadow-lg ring-2 ring-zinc-400/50 dark:from-zinc-300 dark:to-zinc-500 lg:h-12 lg:w-12" />
                      {game?.current_turn === 'black' && game?.status === 'active' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-zinc-900 lg:-bottom-1 lg:-right-1 lg:h-4 lg:w-4" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold lg:text-sm">
                        {myColor === 'black' ? 'You' : 'Black'}
                      </div>
                      <div className="hidden text-xs text-zinc-500 dark:text-zinc-400 lg:block">
                        {game?.black_player_id ? `${game.black_player_id.slice(0, 6)}...` : 'Waiting'}
                      </div>
                    </div>
                    {winnerColor === 'black' && <span className="text-sm lg:text-lg">👑</span>}
                  </div>
                </div>

                {/* Spectator Badge */}
                {isSpectator && (
                  <div className="border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800/50 lg:px-4 lg:py-2">
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 lg:gap-2 lg:text-xs">
                      <svg className="h-3 w-3 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Spectating
                    </div>
                  </div>
                )}
              </div>

              {/* Move History - Constrained height on mobile */}
              <div className="flex max-h-[200px] min-h-0 flex-col rounded-xl border border-zinc-200/80 bg-white p-3 shadow-md dark:border-white/10 dark:bg-zinc-900 lg:max-h-none lg:flex-1 lg:rounded-2xl lg:p-4">
                <div className="mb-2 flex items-center justify-between lg:mb-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold lg:gap-2 lg:text-sm">
                    <svg className="h-3.5 w-3.5 text-amber-500 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Move History
                  </h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 lg:px-2.5 lg:text-xs">
                    {moves.length}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto lg:space-y-2">
                  {moves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-zinc-400 lg:py-8">
                      <svg className="mb-1.5 h-6 w-6 opacity-50 lg:mb-2 lg:h-8 lg:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-[10px] lg:text-xs">No moves yet</span>
                    </div>
                  ) : (
                    moves.map((m, idx) => {
                      const isRedMove = idx % 2 === 0;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 dark:bg-zinc-800/50 lg:gap-3 lg:rounded-xl lg:px-3 lg:py-2"
                        >
                          <div
                            className={[
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold lg:h-6 lg:w-6 lg:text-xs',
                              isRedMove
                                ? 'bg-gradient-to-br from-red-400 to-red-600 text-white'
                                : 'bg-gradient-to-br from-zinc-600 to-zinc-800 text-white dark:from-zinc-300 dark:to-zinc-500 dark:text-zinc-800',
                            ].join(' ')}
                          >
                            {m.move_number}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium lg:text-sm">
                              {String.fromCharCode(97 + m.from_pos.col)}{8 - m.from_pos.row} → {String.fromCharCode(97 + m.to_pos.col)}{8 - m.to_pos.row}
                            </div>
                          </div>
                          {m.captures && m.captures.length > 0 && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 lg:px-2 lg:text-xs">
                              ×{m.captures.length}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat - Compact */}
              <ChatPanel
                messages={chat.messages}
                loading={chat.loading}
                error={chat.error}
                draft={chat.draft}
                setDraft={chat.setDraft}
                canChat={chat.canChat}
                sending={chat.sending}
                onSend={() => void chat.send()}
                myUserId={user?.id ?? null}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

