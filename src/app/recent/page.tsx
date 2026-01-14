'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

function StatusPill({ status }: { status: GameRow['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : status === 'waiting'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  const label = status === 'active' ? 'Live' : status === 'waiting' ? 'Waiting' : 'Finished';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

function SeriesPill({ g }: { g: GameRow }) {
  if (!g.best_of || g.best_of <= 1) return null;
  return (
    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      Bo{g.best_of} • {g.series_red_wins}-{g.series_black_wins}
      {g.series_draws ? `-${g.series_draws}` : ''} • R{g.round_number}
    </span>
  );
}

function Row({ g }: { g: GameRow }) {
  const primaryActionHref = g.status === 'finished' ? `/replay/${g.id}` : `/game/${g.id}`;
  const primaryLabel = g.status === 'finished' ? 'Replay' : 'Watch';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-black/30">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold">Game {g.id.slice(0, 8)}</div>
          <StatusPill status={g.status} />
          {g.is_ranked ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Ranked
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Unranked
            </span>
          )}
          <SeriesPill g={g} />
        </div>
        <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
          Updated {timeAgo(g.updated_at)} • Created {timeAgo(g.created_at)}
        </div>
      </div>

      <Link
        href={primaryActionHref}
        className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
      >
        {primaryLabel}
      </Link>
    </div>
  );
}

export default function RecentGamesPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [publicRecent, setPublicRecent] = useState<GameRow[]>([]);
  const [rankedRecent, setRankedRecent] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const select =
        'id, status, is_public, is_ranked, best_of, round_number, series_red_wins, series_black_wins, series_draws, series_over, created_at, updated_at';

      const [{ data: pub, error: pubErr }, { data: ranked, error: rankedErr }] = await Promise.all([
        supabase
          .from('games')
          .select(select)
          .eq('is_public', true)
          .in('status', ['waiting', 'active', 'finished'])
          .order('updated_at', { ascending: false })
          .limit(40),
        supabase
          .from('games')
          .select(select)
          .eq('is_public', true)
          .eq('is_ranked', true)
          .in('status', ['active', 'finished'])
          .order('updated_at', { ascending: false })
          .limit(40),
      ]);

      if (pubErr) throw pubErr;
      if (rankedErr) throw rankedErr;

      setPublicRecent((pub as GameRow[] | null) ?? []);
      setRankedRecent((ranked as GameRow[] | null) ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load recent games.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Recent</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold">Recent games</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Browse public games and ranked matches. Updates automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Refresh
            </button>
            <Link
              href="/history"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              History & replay
            </Link>
            <Link
              href="/lobby"
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
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
                <h2 className="text-lg font-bold">Public games</h2>
                <span className="text-xs text-zinc-500">{publicRecent.length}</span>
              </div>
              <div className="space-y-3">
                {publicRecent.length === 0 ? (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">No public games found.</div>
                ) : (
                  publicRecent.map((g) => <Row key={g.id} g={g} />)
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Ranked matches</h2>
                <span className="text-xs text-zinc-500">{rankedRecent.length}</span>
              </div>
              {!authLoading && !isAuthenticated ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200">
                  Tip: sign in to play ranked. You can still watch public ranked games here.
                </div>
              ) : null}
              <div className="mt-3 space-y-3">
                {rankedRecent.length === 0 ? (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">No ranked games found.</div>
                ) : (
                  rankedRecent.map((g) => <Row key={g.id} g={g} />)
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

