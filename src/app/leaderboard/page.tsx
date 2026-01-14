'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type LeaderboardRow = {
  rank: number;
  player_id: string;
  username: string;
  avatar_url: string | null;
  is_guest: boolean;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate_pct: number;
};

function getRankIcon(rank: number) {
  if (rank === 1) return '👑';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function getRankColor(rank: number) {
  if (rank === 1) return 'from-amber-400 to-yellow-500';
  if (rank === 2) return 'from-zinc-300 to-zinc-400';
  if (rank === 3) return 'from-amber-600 to-amber-700';
  return 'from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600';
}

export default function LeaderboardPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useAuth();

  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const { data, error: selErr } = await supabase
          .from('leaderboard')
          .select(
            'rank, player_id, username, avatar_url, is_guest, rating, games_played, wins, losses, draws, win_rate_pct',
          )
          .order('rank', { ascending: true })
          .limit(100);

        if (selErr) throw selErr;
        if (cancelled) return;
        setRows((data as LeaderboardRow[] | null) ?? []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load leaderboard.';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const topThree = rows.slice(0, 3);
  const rest = rows.slice(3);
  const myRank = rows.find((r) => r.player_id === user?.id);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-zinc-200/50 bg-gradient-to-r from-amber-500/5 via-transparent to-purple-500/5 dark:border-white/5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* Title Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  href="/"
                >
                  ← Home
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/25">
                  <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Leaderboard</h1>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    Top players ranked by ELO rating
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/lobby"
                className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Play Online
              </Link>
              <Link
                href="/play"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/30"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Practice vs AI
              </Link>
            </div>
          </div>

          {/* Your Rank Card */}
          {myRank && (
            <div className="mt-8">
              <div className="rounded-2xl border border-purple-200/50 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 p-5 dark:border-purple-500/20">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-xl font-bold text-white shadow-lg">
                      #{myRank.rank}
                    </div>
                    <div>
                      <div className="text-sm text-purple-600 dark:text-purple-400">Your Ranking</div>
                      <div className="text-xl font-bold">{myRank.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{myRank.rating}</div>
                      <div className="text-xs text-zinc-500">ELO Rating</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{myRank.win_rate_pct}%</div>
                      <div className="text-xs text-zinc-500">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{myRank.games_played}</div>
                      <div className="text-xs text-zinc-500">Games</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-medium text-red-800 dark:text-red-200">Failed to load leaderboard</div>
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
            <div className="text-lg font-medium text-zinc-600 dark:text-zinc-400">Loading rankings...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <svg className="h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold">No Rankings Yet</h3>
            <p className="mx-auto max-w-md text-zinc-500 dark:text-zinc-400">
              Be the first to climb the ranks! Play ranked matches in the online lobby to appear on the leaderboard.
            </p>
            <Link
              href="/lobby"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl"
            >
              Start Playing
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length >= 3 && (
              <div className="mb-10">
                <h2 className="mb-6 text-center text-xl font-bold">🏆 Top Champions</h2>
                <div className="flex flex-wrap items-end justify-center gap-4">
                  {/* 2nd Place */}
                  <div className="order-1 w-full sm:order-none sm:w-auto">
                    <div className="mx-auto max-w-[200px] rounded-2xl border border-zinc-200/80 bg-white/80 p-5 text-center shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80 sm:mb-0">
                      <div className="relative mx-auto mb-3 h-20 w-20">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 p-1">
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-zinc-900">
                            {topThree[1].avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={topThree[1].avatar_url} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-2xl font-bold text-zinc-400">{topThree[1].username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 text-lg shadow-lg">
                          🥈
                        </div>
                      </div>
                      <div className="font-bold">{topThree[1].username}</div>
                      <div className="mt-1 text-2xl font-bold text-zinc-500">{topThree[1].rating}</div>
                      <div className="text-xs text-zinc-400">{topThree[1].wins}W / {topThree[1].losses}L</div>
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="order-0 w-full sm:order-none sm:w-auto">
                    <div className="mx-auto max-w-[220px] rounded-2xl border-2 border-amber-300/50 bg-gradient-to-b from-amber-50 to-white p-6 text-center shadow-2xl dark:border-amber-500/30 dark:from-amber-900/20 dark:to-zinc-900">
                      <div className="relative mx-auto mb-3 h-24 w-24">
                        <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 opacity-50" />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 p-1">
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-zinc-900">
                            {topThree[0].avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={topThree[0].avatar_url} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-3xl font-bold text-amber-500">{topThree[0].username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-xl shadow-lg">
                          👑
                        </div>
                      </div>
                      <div className="text-lg font-bold">{topThree[0].username}</div>
                      <div className="mt-1 bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-3xl font-bold text-transparent">{topThree[0].rating}</div>
                      <div className="mt-1 text-sm text-zinc-500">{topThree[0].wins}W / {topThree[0].losses}L • {topThree[0].win_rate_pct}%</div>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="order-2 w-full sm:order-none sm:w-auto">
                    <div className="mx-auto max-w-[200px] rounded-2xl border border-zinc-200/80 bg-white/80 p-5 text-center shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
                      <div className="relative mx-auto mb-3 h-20 w-20">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 p-1">
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-zinc-900">
                            {topThree[2].avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={topThree[2].avatar_url} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-2xl font-bold text-amber-600">{topThree[2].username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-lg shadow-lg">
                          🥉
                        </div>
                      </div>
                      <div className="font-bold">{topThree[2].username}</div>
                      <div className="mt-1 text-2xl font-bold text-amber-600">{topThree[2].rating}</div>
                      <div className="text-xs text-zinc-400">{topThree[2].wins}W / {topThree[2].losses}L</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rankings Table */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <div className="border-b border-zinc-200/80 p-5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold">Full Rankings</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">All ranked players by ELO</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50 text-xs uppercase tracking-wider text-zinc-500 dark:border-white/5 dark:bg-white/5 dark:text-zinc-400">
                      <th className="px-5 py-4 text-left font-semibold">Rank</th>
                      <th className="px-5 py-4 text-left font-semibold">Player</th>
                      <th className="px-5 py-4 text-center font-semibold">Rating</th>
                      <th className="hidden px-5 py-4 text-center font-semibold sm:table-cell">W/L/D</th>
                      <th className="px-5 py-4 text-center font-semibold">Games</th>
                      <th className="px-5 py-4 text-center font-semibold">Win%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                    {(rest.length > 0 ? rest : rows).map((r) => {
                      const isMe = r.player_id === user?.id;
                      const rankIcon = getRankIcon(r.rank);
                      return (
                        <tr
                          key={r.player_id}
                          className={`transition-colors ${isMe ? 'bg-purple-50/50 dark:bg-purple-900/10' : 'hover:bg-zinc-50/50 dark:hover:bg-white/5'}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {rankIcon ? (
                                <span className="text-xl">{rankIcon}</span>
                              ) : (
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${getRankColor(r.rank)} text-sm font-bold text-white`}>
                                  {r.rank}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                                {r.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    alt=""
                                    src={r.avatar_url}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-400">
                                    {r.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 font-semibold">
                                  {r.username}
                                  {isMe && (
                                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                      YOU
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`text-lg font-bold tabular-nums ${r.rank <= 3 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                              {r.rating}
                            </span>
                          </td>
                          <td className="hidden px-5 py-4 text-center sm:table-cell">
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">{r.wins}</span>
                              <span className="text-zinc-400">/</span>
                              <span className="font-medium text-red-500 dark:text-red-400">{r.losses}</span>
                              <span className="text-zinc-400">/</span>
                              <span className="font-medium text-zinc-500">{r.draws}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center font-medium tabular-nums">{r.games_played}</td>
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                  style={{ width: `${Math.min(r.win_rate_pct, 100)}%` }}
                                />
                              </div>
                              <span className="ml-2 text-sm font-semibold tabular-nums">{r.win_rate_pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-200/80 px-5 py-4 dark:border-white/10">
                <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Rankings update after each ranked game
                  </div>
                  <div>Showing top {rows.length} players</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* How ELO Works Section */}
        <div className="mt-12 rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-6 dark:border-white/10 dark:from-zinc-900/50 dark:to-zinc-800/30">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            How Ranking Works
          </h3>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">ELO System</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Win against higher-rated players to gain more points
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Ranked Only</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Only ranked matches affect your ELO rating
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Starting Rating</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  All players start at 1000 ELO points
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
