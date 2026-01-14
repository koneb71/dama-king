'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';

type SiteStats = {
  live_games: number;
  open_public_games: number;
  players_total: number;
  players_online_estimate: number;
};

// Reuse the global cache/poller from LandingHeroClient (keeps one interval).
import { __subscribeSiteStatsForCta as subscribeSiteStats } from './siteStatsShared';

function formatCompact(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(n);
  } catch {
    return String(n);
  }
}

export function LandingCtaBannerClient() {
  const { isLoading, isAuthenticated, isGuest, signInAsGuest } = useAuth();
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => subscribeSiteStats(setStats), []);

  return (
    <div className="relative">
      <h2 className="text-3xl font-bold sm:text-4xl">
        {isLoading ? 'Ready to Play?' : isAuthenticated ? 'Ready for another match?' : 'Ready to Play?'}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-lg opacity-90">
        {isLoading
          ? "It's free and takes seconds!"
          : isAuthenticated
            ? 'Jump back in and keep climbing.'
            : "Join thousands of players and start your journey to become the Dama King. It's free and takes seconds!"}
      </p>

      {stats ? (
        <div className="mx-auto mt-4 flex w-fit flex-wrap items-center justify-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white" />
            {formatCompact(stats.players_online_estimate)} online
          </span>
          <span className="opacity-70">•</span>
          <span>{formatCompact(stats.live_games)} live games</span>
          <span className="opacity-70">•</span>
          <span>{formatCompact(stats.open_public_games)} open rooms</span>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
        {isLoading ? (
          <>
            <div className="h-14 w-64 animate-pulse rounded-xl bg-white/20" />
            <div className="h-14 w-64 animate-pulse rounded-xl bg-white/10" />
          </>
        ) : isAuthenticated ? (
          <>
            <Link
              href="/lobby"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-red-600 shadow-lg transition-all hover:shadow-xl"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Continue to Lobby
            </Link>
            <Link
              href={isGuest ? '/signin' : '/play'}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white px-8 py-4 text-lg font-semibold transition-all hover:bg-white/10"
            >
              {isGuest ? 'Upgrade Account' : 'Practice vs AI'}
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/play"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-red-600 shadow-lg transition-all hover:shadow-xl"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Play
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white px-8 py-4 text-lg font-semibold transition-all hover:bg-white/10"
            >
              Create Account
            </Link>
            <button
              type="button"
              onClick={() => void signInAsGuest()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-black/20 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-black/30"
            >
              Play as Guest
            </button>
          </>
        )}
      </div>
    </div>
  );
}

