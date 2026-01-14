'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CreateGameModal } from '@/components/lobby/CreateGameModal';
import { GameList } from '@/components/lobby/GameList';
import { JoinByCodeModal } from '@/components/lobby/JoinByCodeModal';
import { MatchmakingQueue } from '@/components/lobby/MatchmakingQueue';
import type { LobbyGameRow } from '@/components/lobby/types';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LobbyPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { isLoading: authLoading, isAuthenticated, player, signInAsGuest } = useAuth();

  const [games, setGames] = useState<LobbyGameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrivate, setCreatePrivate] = useState(false);
  const [joinByCodeOpen, setJoinByCodeOpen] = useState(false);

  async function loadGames() {
    setError(null);
    setLoading(true);
    try {
      const { data, error: selErr } = await supabase
        .from('games')
        .select(
          'id, red_player_id, black_player_id, current_turn, status, room_code, is_public, is_ranked, created_at, updated_at',
        )
        .eq('status', 'waiting')
        .eq('is_public', true)
        .is('black_player_id', null)
        .not('red_player_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selErr) throw selErr;
      setGames((data as LobbyGameRow[] | null) ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load lobby games.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGames();
    const id = window.setInterval(() => void loadGames(), 4500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function joinGame(gameId: string) {
    if (!isAuthenticated) return;
    if (joiningGameId) return;
    setError(null);
    setJoiningGameId(gameId);
    try {
      const { data, error: joinErr } = await supabase.rpc('join_game', {
        p_game_id: gameId,
        p_room_code: null,
      });
      if (joinErr) throw joinErr;
      const joined = data as LobbyGameRow | null;
      if (!joined) throw new Error('Failed to join game.');
      window.location.href = `/game/${joined.id}`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join game.';
      setError(msg);
      void loadGames();
    } finally {
      setJoiningGameId(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-zinc-200/50 bg-gradient-to-r from-emerald-500/5 via-transparent to-amber-500/5 dark:border-white/5">
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
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Online Lobby</h1>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    Find opponents, create games, or jump into quick matches
                  </p>
                </div>
              </div>
            </div>

            {/* User Section */}
            <div className="flex flex-wrap items-center gap-3">
              {!authLoading && !isAuthenticated ? (
                <button
                  type="button"
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30"
                  onClick={() => void signInAsGuest()}
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quick Play as Guest
                </button>
              ) : player?.username ? (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Playing as</div>
                    <div className="font-semibold">{player.username}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{games.length}</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Open Games</div>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Live</span>
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Auto-refreshing</div>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">∞</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Free to Play</div>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">ELO</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Ranked System</div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-left text-white shadow-xl shadow-emerald-500/20 transition-all hover:shadow-2xl hover:shadow-emerald-500/30"
            onClick={() => {
              setCreatePrivate(false);
              setCreateOpen(true);
            }}
          >
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Create Game</h3>
              <p className="mt-1 text-sm opacity-90">Host a new match and wait for an opponent</p>
            </div>
          </button>

          <button
            type="button"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 p-6 text-left text-white shadow-xl shadow-black/20 transition-all hover:shadow-2xl dark:from-zinc-100 dark:to-zinc-300 dark:text-black"
            onClick={() => {
              setCreatePrivate(true);
              setCreateOpen(true);
            }}
          >
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 dark:bg-black/10">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 1.657-1.343 3-3 3S6 12.657 6 11s1.343-3 3-3 3 1.343 3 3zm6 0c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 20c1.5-3 4-4.5 7-4.5S14.5 17 16 20" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 20c1.2-2.4 3.2-3.8 6-4.2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Private Match</h3>
              <p className="mt-1 text-sm opacity-90">Create a room code to share with a friend</p>
            </div>
          </button>

          <button
            type="button"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-left text-white shadow-xl shadow-purple-500/20 transition-all hover:shadow-2xl hover:shadow-purple-500/30"
            onClick={() => setJoinByCodeOpen(true)}
          >
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Join by Code</h3>
              <p className="mt-1 text-sm opacity-90">Enter a 6-character room code</p>
            </div>
          </button>

          <Link
            href="/play"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-left text-white shadow-xl shadow-amber-500/20 transition-all hover:shadow-2xl hover:shadow-amber-500/30"
          >
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Play vs AI</h3>
              <p className="mt-1 text-sm opacity-90">Practice against computer opponents</p>
            </div>
          </Link>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-medium text-red-800 dark:text-red-200">Something went wrong</div>
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            </div>
          </div>
        )}

        {/* Matchmaking Section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Quick Match</h2>
          </div>
          <MatchmakingQueue />
        </div>

        {/* Games List Section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Open Games</h2>
            </div>
            <button
              type="button"
              onClick={() => void loadGames()}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          <GameList
            games={games}
            loading={loading}
            joiningGameId={joiningGameId}
            isAuthenticated={isAuthenticated}
            onJoin={(id) => void joinGame(id)}
          />
        </div>

        {/* Tips Section */}
        <div className="mt-12 rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-6 dark:border-white/10 dark:from-zinc-900/50 dark:to-zinc-800/30">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Tips for New Players
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                1
              </div>
              <div>
                <div className="font-medium">Practice First</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Play against the AI to learn the rules</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                2
              </div>
              <div>
                <div className="font-medium">Quick Match</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Use matchmaking for instant games</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                3
              </div>
              <div>
                <div className="font-medium">Play Ranked</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Sign in to track your ELO rating</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CreateGameModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        canCreate={isAuthenticated}
        initialIsPublic={createPrivate ? false : true}
        initialIsRanked={false}
        onCreated={() => {
          void loadGames();
        }}
      />

      <JoinByCodeModal
        open={joinByCodeOpen}
        onClose={() => setJoinByCodeOpen(false)}
        onJoined={() => {
          setJoinByCodeOpen(false);
          void loadGames();
        }}
      />
    </div>
  );
}
