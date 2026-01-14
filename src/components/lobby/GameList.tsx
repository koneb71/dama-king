'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import type { LobbyGameRow } from '@/components/lobby/types';

type Props = {
  games: LobbyGameRow[];
  loading: boolean;
  joiningGameId: string | null;
  isAuthenticated: boolean;
  onJoin: (gameId: string) => void;
};

function shortId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.slice(0, 8);
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return d.toLocaleDateString();
}

export function GameList({ games, loading, joiningGameId, isAuthenticated, onJoin }: Props) {
  const rows = useMemo(() => games ?? [], [games]);

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/80 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
      {/* Header */}
      <div className="border-b border-zinc-200/80 p-5 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold">Public Games</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Join any open game instantly</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                Loading...
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                {rows.length} {rows.length === 1 ? 'game' : 'games'} available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Games List */}
      <div className="divide-y divide-zinc-100 dark:divide-white/5">
        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-500" />
            <div className="text-zinc-500 dark:text-zinc-400">Loading games...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <svg className="h-10 w-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h4 className="mb-2 text-lg font-semibold">No Open Games</h4>
            <p className="mx-auto max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Be the first to create a game! Click "Create Game" above or use Quick Match to find an opponent automatically.
            </p>
          </div>
        ) : (
          rows.map((g, index) => {
            const busy = joiningGameId === g.id;
            return (
              <div
                key={g.id}
                className="group relative p-5 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
              >
                {/* Game number badge */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-600 opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Game Info */}
                  <div className="flex items-center gap-4">
                    {/* Game Avatar */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
                      <div className="grid h-8 w-8 grid-cols-2 gap-0.5 rounded">
                        <div className="rounded-tl bg-emerald-600" />
                        <div className="rounded-tr bg-amber-100" />
                        <div className="rounded-bl bg-amber-100" />
                        <div className="rounded-br bg-emerald-600" />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Game #{index + 1}</span>
                        {g.is_ranked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Ranked
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Host: <span className="font-mono text-xs">{shortId(g.red_player_id)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {timeAgo(g.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/game/${g.id}`}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Watch
                    </Link>

                    <button
                      type="button"
                      disabled={!isAuthenticated || busy}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:shadow-none"
                      onClick={() => onJoin(g.id)}
                      title={!isAuthenticated ? 'Sign in to join' : undefined}
                    >
                      {busy ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          Join Game
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      {rows.length > 0 && (
        <div className="border-t border-zinc-200/80 px-5 py-3 dark:border-white/10">
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Games auto-refresh every few seconds
          </div>
        </div>
      )}
    </div>
  );
}
