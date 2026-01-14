'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type GameRow = {
  id: string;
  status: 'waiting' | 'active' | 'finished';
  is_public: boolean;
  is_ranked: boolean;
  best_of: 1 | 3 | 5;
  round_number: number;
  series_red_wins: number;
  series_black_wins: number;
  series_draws: number;
  series_over: boolean;
  red_player_id: string | null;
  black_player_id: string | null;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  if (sec < 60) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 48) return `${hr}h ago`;
  return d.toLocaleDateString();
}

export default function HistoryPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();

  const [publicGames, setPublicGames] = useState<GameRow[]>([]);
  const [myGames, setMyGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const { data: pub, error: pubErr } = await supabase
          .from('games')
          .select(
            'id, status, is_public, is_ranked, best_of, round_number, series_red_wins, series_black_wins, series_draws, series_over, red_player_id, black_player_id, winner_id, created_at, updated_at',
          )
          .eq('status', 'finished')
          .eq('is_public', true)
          .order('updated_at', { ascending: false })
          .limit(30);
        if (pubErr) throw pubErr;

        if (!cancelled) setPublicGames((pub as GameRow[] | null) ?? []);

        if (user?.id) {
          const { data: mine, error: mineErr } = await supabase
            .from('games')
            .select(
              'id, status, is_public, is_ranked, best_of, round_number, series_red_wins, series_black_wins, series_draws, series_over, red_player_id, black_player_id, winner_id, created_at, updated_at',
            )
            .eq('status', 'finished')
            .or(`red_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
            .order('updated_at', { ascending: false })
            .limit(50);
          if (mineErr) throw mineErr;
          if (!cancelled) setMyGames((mine as GameRow[] | null) ?? []);
        } else {
          if (!cancelled) setMyGames([]);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load history.';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                href="/"
              >
                ← Home
              </Link>
              <span className="text-xs text-zinc-400">/</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">History</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold">Game history</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Replay finished games step-by-step. Available for public games and your own matches.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/lobby"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Online lobby
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 text-center text-zinc-500 dark:text-zinc-400">Loading…</div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Public matches</h2>
                <span className="text-xs text-zinc-500">{publicGames.length}</span>
              </div>
              <div className="space-y-3">
                {publicGames.length === 0 ? (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">No finished public games yet.</div>
                ) : (
                  publicGames.map((g) => (
                    <div
                      key={g.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-black/30"
                    >
                      <div>
                        <div className="font-semibold">Game {g.id.slice(0, 8)}</div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {timeAgo(g.updated_at)} • {g.is_ranked ? 'Ranked' : 'Unranked'} • Best of {g.best_of}
                        </div>
                      </div>
                      <Link
                        href={`/replay/${g.id}`}
                        className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                      >
                        View replay
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Your matches</h2>
                <span className="text-xs text-zinc-500">{myGames.length}</span>
              </div>
              {!authLoading && !isAuthenticated ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Sign in to see private/personal match history.
                </div>
              ) : (
                <div className="space-y-3">
                  {myGames.length === 0 ? (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">No finished games yet.</div>
                  ) : (
                    myGames.map((g) => (
                      <div
                        key={g.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-black/30"
                      >
                        <div>
                          <div className="font-semibold">Game {g.id.slice(0, 8)}</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {timeAgo(g.updated_at)} • {g.is_public ? 'Public' : 'Private'} • Best of {g.best_of}
                          </div>
                        </div>
                        <Link
                          href={`/replay/${g.id}`}
                          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                        >
                          View replay
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

