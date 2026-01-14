'use client';

import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useMatchmaking } from '@/hooks/useMatchmaking';

export function MatchmakingQueue() {
  const { isGuest } = useAuth();
  const [isRanked, setIsRanked] = useState(false);
  const [ratingWindow, setRatingWindow] = useState(200);

  // Guests cannot play ranked matches
  const effectiveIsRanked = isGuest ? false : isRanked;

  const { status, error, queue, rating, isAuthenticated, start, cancel } = useMatchmaking({
    isRanked: effectiveIsRanked,
    ratingWindow,
    pollMs: 2500,
  });

  const searching = status === 'searching';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
      {/* Background decoration */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/25">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold">Instant Matchmaking</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Find an opponent automatically</p>
            </div>
          </div>
          
          {/* Rating Badge */}
          <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
            <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Your Rating</div>
              <div className="font-bold tabular-nums">{rating ?? 1000}</div>
            </div>
          </div>
        </div>

        {/* Searching Animation */}
        {searching && (
          <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10 p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <div className="font-semibold text-orange-700 dark:text-orange-300">Searching for opponent...</div>
                <div className="text-sm text-orange-600/80 dark:text-orange-400/80">
                  {queue ? (
                    <>Rating {queue.rating} • Searching since {new Date(queue.joined_at).toLocaleTimeString()}</>
                  ) : (
                    <>Looking for players within ±{ratingWindow} rating</>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-orange-200/50">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-orange-400 to-amber-500" style={{ animation: 'pulse 1.5s ease-in-out infinite, slideRight 2s linear infinite' }} />
            </div>
          </div>
        )}

        {/* Options Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Ranked Toggle */}
          <div className={`relative overflow-hidden rounded-xl border-2 transition-all ${effectiveIsRanked ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50'} ${isGuest ? 'opacity-50' : ''}`}>
            <label className="flex cursor-pointer items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${effectiveIsRanked ? 'bg-purple-500 text-white' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700'}`}>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold">Ranked Match</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isGuest ? 'Sign in required' : 'Affects your ELO'}
                  </div>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={effectiveIsRanked}
                  disabled={searching || isGuest}
                  onChange={(e) => setIsRanked(e.target.checked)}
                  className="peer sr-only"
                />
                <div className={`h-7 w-12 rounded-full transition-colors ${effectiveIsRanked ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                <div className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${effectiveIsRanked ? 'translate-x-5' : ''}`} />
              </div>
            </label>
          </div>

          {/* Rating Window */}
          <div className="rounded-xl border-2 border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold">Rating Range</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">± {ratingWindow} points</div>
              </div>
              <input
                type="number"
                min={0}
                max={2000}
                step={50}
                value={ratingWindow}
                disabled={searching}
                onChange={(e) => setRatingWindow(Number(e.target.value || 0))}
                className="w-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center sm:col-span-2 lg:col-span-1">
            {searching ? (
              <button
                type="button"
                className="w-full rounded-xl border-2 border-zinc-300 bg-white px-6 py-4 font-semibold text-zinc-700 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                onClick={() => void cancel()}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Search
                </div>
              </button>
            ) : (
              <button
                type="button"
                disabled={!isAuthenticated}
                className="w-full rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-50 disabled:shadow-none"
                onClick={() => void start()}
                title={!isAuthenticated ? 'Sign in to find a match' : undefined}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Match
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
