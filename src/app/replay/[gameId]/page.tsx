'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, useCallback, use } from 'react';

import { Board } from '@/components/game/Board';
import { applyMove, createInitialState, moveKey } from '@/game/engine';
import { getLegalMoves } from '@/game/rules';
import type { Board as BoardT, Color, GameState, Move, Position } from '@/game/types';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type GameRow = {
  id: string;
  red_player_id: string | null;
  black_player_id: string | null;
  status: 'waiting' | 'active' | 'finished';
  winner_id: string | null;
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
  move_number: number;
  round_number: number;
  player_id: string | null;
  from_pos: Position;
  to_pos: Position;
  captures: Position[] | null;
  created_at: string;
};

function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function sameCaptures(a: Position[] | null, b: Position[] | null): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i += 1) {
    if (!samePos(aa[i], bb[i])) return false;
  }
  return true;
}

function pickMoveForRow(legal: ReadonlyArray<Move>, row: MoveRow): Move | null {
  const exact = legal.filter(
    (m) => samePos(m.from, row.from_pos) && samePos(m.to, row.to_pos) && sameCaptures(m.captures, row.captures),
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    exact.sort((a, b) => moveKey(a).localeCompare(moveKey(b)));
    return exact[0] ?? null;
  }

  // Fallback: match by from/to (captures may not serialize in same order)
  const candidates = legal.filter((m) => samePos(m.from, row.from_pos) && samePos(m.to, row.to_pos));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (b.captures.length !== a.captures.length) return b.captures.length - a.captures.length;
    if (b.promotes !== a.promotes) return Number(b.promotes) - Number(a.promotes);
    return moveKey(a).localeCompare(moveKey(b));
  });
  return candidates[0] ?? null;
}

function formatColor(c: Color): string {
  return c === 'black' ? 'Black' : 'Red';
}

export default function ReplayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useAuth();

  const [game, setGame] = useState<GameRow | null>(null);
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(0); // 0 = initial position
  const [boards, setBoards] = useState<BoardT[]>(() => [createInitialState().board]);
  const [turns, setTurns] = useState<Color[]>(['black']);

  const canAccess = useMemo(() => {
    if (!game) return false;
    if (game.is_public) return true;
    if (!user) return false;
    return game.red_player_id === user.id || game.black_player_id === user.id;
  }, [game, user]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: g, error: gErr } = await supabase
        .from('games')
        .select(
          'id, red_player_id, black_player_id, status, winner_id, is_public, is_ranked, best_of, round_number, series_red_wins, series_black_wins, series_draws, series_over, created_at, updated_at',
        )
        .eq('id', gameId)
        .maybeSingle();
      if (gErr) throw gErr;
      if (!g) {
        setGame(null);
        setMoves([]);
        return;
      }
      const row = g as GameRow;
      setGame(row);

      const { data: ms, error: mErr } = await supabase
        .from('moves')
        .select('id, move_number, round_number, player_id, from_pos, to_pos, captures, created_at')
        .eq('game_id', gameId)
        .order('move_number', { ascending: true });
      if (mErr) throw mErr;
      setMoves((ms as MoveRow[] | null) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load replay.');
    } finally {
      setLoading(false);
    }
  }, [gameId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  // Build board timeline
  useEffect(() => {
    const initial = createInitialState();
    const nextBoards: BoardT[] = [initial.board];
    const nextTurns: Color[] = ['black'];
    let curBoard = initial.board;
    let curTurn: Color = 'black';

    // Group by round for display, but play continuously from start each time.
    for (const row of moves) {
      const legal = getLegalMoves(curBoard, curTurn);
      const move = pickMoveForRow(legal, row);
      if (!move) {
        // Can't reconstruct further.
        break;
      }
      const curState: GameState = { board: curBoard, turn: curTurn, result: { status: 'active' } };
      const nextState = applyMove(curState, move);
      curBoard = nextState.board;
      curTurn = nextState.turn;
      nextBoards.push(curBoard);
      nextTurns.push(curTurn);
    }

    setBoards(nextBoards);
    setTurns(nextTurns);
    setStep((s) => Math.min(s, Math.max(0, nextBoards.length - 1)));
  }, [moves]);

  const maxStep = Math.max(0, boards.length - 1);
  const board = boards[Math.min(step, maxStep)] ?? createInitialState().board;
  const nextTurn = turns[Math.min(step, turns.length - 1)] ?? 'black';

  const currentMove = step === 0 ? null : moves[step - 1] ?? null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                href="/history"
              >
                ← History
              </Link>
              <span className="text-xs text-zinc-400">/</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Replay</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold">Replay</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Step through moves one by one. Available for public games and your own matches.
            </p>
          </div>
          {game ? (
            <div className="rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-sm shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <div className="font-semibold">Game {game.id.slice(0, 8)}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {game.is_public ? 'Public' : 'Private'} • {game.is_ranked ? 'Ranked' : 'Unranked'} • Best of {game.best_of}
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 text-center text-zinc-500 dark:text-zinc-400">Loading…</div>
        ) : !game ? (
          <div className="mt-10 text-center text-zinc-500 dark:text-zinc-400">Game not found.</div>
        ) : !canAccess ? (
          <div className="mt-10 rounded-2xl border border-zinc-200/80 bg-white/80 p-6 text-center shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
            <div className="text-lg font-bold">Replay unavailable</div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              You can only replay public games or games you participated in.
            </div>
            <div className="mt-4">
              <Link
                href="/lobby"
                className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
              >
                Go to lobby
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,380px]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Step {step} / {maxStep}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {currentMove ? (
                        <>
                          Move #{currentMove.move_number} • Round {currentMove.round_number} • Next turn: {formatColor(nextTurn)}
                        </>
                      ) : (
                        <>Initial position • Next turn: {formatColor(nextTurn)}</>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      disabled={step === 0}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
                    >
                      ⏮
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep((s) => Math.max(0, s - 1))}
                      disabled={step === 0}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
                      disabled={step === maxStep}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
                    >
                      ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(maxStep)}
                      disabled={step === maxStep}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
                    >
                      ⏭
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <input
                    type="range"
                    min={0}
                    max={maxStep}
                    value={step}
                    onChange={(e) => setStep(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <Board
                  board={board}
                  perspective="red"
                  selected={null}
                  legalMoves={[]}
                  onSquareClick={() => {}}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Moves
                  </h3>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {moves.length}
                  </span>
                </div>
                <div className="max-h-[420px] space-y-2 overflow-auto">
                  {moves.length === 0 ? (
                    <div className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No moves recorded.</div>
                  ) : (
                    moves.map((m, idx) => {
                      const active = step === idx + 1;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setStep(idx + 1)}
                          className={[
                            'w-full text-left rounded-lg p-3 transition-colors',
                            active
                              ? 'bg-emerald-100/70 dark:bg-emerald-900/20'
                              : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-black/30 dark:hover:bg-white/5',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">#{m.move_number}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Round {m.round_number}</div>
                          </div>
                          <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                            ({m.from_pos.row},{m.from_pos.col}) → ({m.to_pos.row},{m.to_pos.col})
                          </div>
                          {m.captures && m.captures.length > 0 ? (
                            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                              ⚔️ {m.captures.length} captured
                            </div>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 text-sm shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
                <div className="font-semibold">Availability</div>
                <div className="mt-1 text-zinc-600 dark:text-zinc-400">
                  Replays are shown for public games and games you participated in (private spectators are excluded).
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

