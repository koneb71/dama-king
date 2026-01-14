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
      <div className="mx-auto flex w-full max-w-xl flex-row items-stretch gap-3 lg:mx-0">
        {isLoading ? (
          <div className="h-14 w-full animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
        ) : isAuthenticated ? (
          <>
            <Link
              href="/lobby"
              className={[
                'inline-flex flex-[2] items-center justify-center gap-2 rounded-2xl',
                'h-14 px-5 text-base font-semibold sm:px-7 sm:text-lg',
                'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
                'shadow-lg shadow-emerald-500/25 transition-all',
                'hover:shadow-xl hover:shadow-emerald-500/30 active:translate-y-px motion-reduce:transform-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
              ].join(' ')}
            >
              Continue to Lobby
            </Link>
            <Link
              href="/play"
              className={[
                'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl',
                'h-14 px-4 text-base font-semibold sm:px-6 sm:text-lg',
                'border border-zinc-200 bg-white text-zinc-900',
                'shadow-sm transition-all',
                'hover:bg-zinc-50 hover:shadow-md active:translate-y-px motion-reduce:transform-none',
                'dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
              ].join(' ')}
            >
              <span className="hidden sm:inline">Play vs AI</span>
              <span className="sm:hidden">AI</span>
            </Link>
            {isGuest ? (
              <Link
                href="/signin"
                className={[
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl',
                  'h-14 px-4 text-base font-semibold sm:px-6 sm:text-lg',
                  'border border-amber-200 bg-amber-50 text-amber-900',
                  'shadow-sm transition-all',
                  'hover:bg-amber-100 hover:shadow-md active:translate-y-px motion-reduce:transform-none',
                  'dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-100 dark:hover:bg-amber-900/30',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
                ].join(' ')}
              >
                <span className="hidden sm:inline">Upgrade</span>
                <span className="sm:hidden">Upgrade</span>
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <Link
              href="/play"
              className={[
                'inline-flex flex-[2] items-center justify-center gap-2 rounded-2xl',
                'h-14 px-5 text-base font-semibold sm:px-7 sm:text-lg',
                'bg-gradient-to-r from-red-500 to-orange-500 text-white',
                'shadow-lg shadow-red-500/25 transition-all',
                'hover:shadow-xl hover:shadow-red-500/30 active:translate-y-px motion-reduce:transform-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
              ].join(' ')}
            >
              <span className="hidden sm:inline">Play Now — Free</span>
              <span className="sm:hidden">Play Free</span>
            </Link>
            <Link
              href="/signin"
              className={[
                'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl',
                'h-14 px-4 text-base font-semibold sm:px-6 sm:text-lg',
                'border border-zinc-200 bg-white text-zinc-900',
                'shadow-sm transition-all',
                'hover:bg-zinc-50 hover:shadow-md active:translate-y-px motion-reduce:transform-none',
                'dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
              ].join(' ')}
            >
              Sign In
            </Link>
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

