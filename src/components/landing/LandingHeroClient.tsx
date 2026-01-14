'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { __subscribeSiteStatsForCta as subscribeSiteStats } from './siteStatsShared';

type SiteStats = {
  live_games: number;
  open_public_games: number;
  players_total: number;
  players_online_estimate: number;
};

function formatCompact(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(n);
  } catch {
    return String(n);
  }
}

type Variant = 'badge' | 'cta' | 'floating';

export function LandingHeroClient({ variant }: { variant: Variant }) {
  const { isLoading, isAuthenticated, isGuest, player, user, signInAsGuest } = useAuth();
  const [stats, setStats] = useState<SiteStats | null>(null);

  const displayName = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    return (
      player?.username ||
      (typeof meta?.full_name === 'string' ? meta.full_name : null) ||
      (typeof meta?.name === 'string' ? meta.name : null) ||
      (user?.email ? user.email.split('@')[0] : null) ||
      'Player'
    );
  }, [player?.username, user?.email, user?.user_metadata]);

  useEffect(() => subscribeSiteStats(setStats), []);

  if (variant === 'badge') {
    return (
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500/10 to-orange-500/10 px-4 py-2 text-sm font-medium text-red-600 dark:from-red-500/20 dark:to-orange-500/20 dark:text-red-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        {stats ? (
          <>
            {formatCompact(stats.players_online_estimate)} online • {formatCompact(stats.live_games)} live games
          </>
        ) : (
          <>Live now</>
        )}
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <>
        <div className="absolute -right-8 top-8 rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur-sm dark:bg-zinc-800/90">
          <div className="text-xs text-zinc-500">Live Games</div>
          <div className="text-xl font-bold text-emerald-600">{stats ? stats.live_games : '—'}</div>
        </div>
        <div className="absolute -left-8 bottom-8 rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur-sm dark:bg-zinc-800/90">
          <div className="text-xs text-zinc-500">Players Online</div>
          <div className="text-xl font-bold text-blue-600">{stats ? formatCompact(stats.players_online_estimate) : '—'}</div>
        </div>
      </>
    );
  }

  // CTA
  return (
    <div className="mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
        {isLoading ? (
          <div className="h-12 w-56 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        ) : isAuthenticated ? (
          <>
            <Link
              href="/lobby"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-emerald-500/25 transition-all hover:shadow-2xl hover:shadow-emerald-500/30"
            >
              Continue to Lobby
            </Link>
            <Link
              href="/play"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-8 py-4 text-lg font-semibold transition-all hover:bg-zinc-50 hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              Play vs AI
            </Link>
            {isGuest ? (
              <Link
                href="/signin"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-8 py-4 text-lg font-semibold text-amber-800 transition-all hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30"
              >
                Upgrade account
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <Link
              href="/play"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-red-500/25 transition-all hover:shadow-2xl hover:shadow-red-500/30"
            >
              Play Now — Free
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-8 py-4 text-lg font-semibold transition-all hover:bg-zinc-50 hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => void signInAsGuest()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              Play as Guest
            </button>
          </>
        )}
      </div>

      {!isLoading && isAuthenticated && !isGuest ? (
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Welcome back, <span className="font-semibold text-zinc-900 dark:text-zinc-100">{String(displayName)}</span>.
        </div>
      ) : null}
    </div>
  );
}

