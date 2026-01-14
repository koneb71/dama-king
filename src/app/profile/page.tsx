'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type StatsRow = {
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  updated_at: string;
};

function normalizeUsername(input: string): string {
  const trimmed = input.trim();
  const cleaned = trimmed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 24);
}

function firstNameFromDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Player';
  const token = trimmed.split(/\s+/)[0] ?? trimmed;
  return token.replace(/_/g, ' ');
}

export default function ProfilePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const {
    isLoading: authLoading,
    isAuthenticated,
    isGuest,
    user,
    player,
    signInAsGuest,
    signInWithOAuth,
    upgradeGuestWithOAuth,
    refreshPlayer,
  } = useAuth();

  const [stats, setStats] = useState<StatsRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usernameDraft, setUsernameDraft] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const displayName = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    return (
      player?.username ||
      (typeof meta?.full_name === 'string' ? meta.full_name : null) ||
      (typeof meta?.name === 'string' ? meta.name : null) ||
      (user?.email ? user.email.split('@')[0] : null) ||
      'Guest'
    );
  }, [player?.username, user?.email, user?.user_metadata]);

  const firstName = useMemo(() => firstNameFromDisplayName(displayName), [displayName]);

  const avatarUrl = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta = meta?.avatar_url || meta?.picture;
    return player?.avatar_url || (typeof fromMeta === 'string' ? fromMeta : null);
  }, [player?.avatar_url, user?.user_metadata]);

  const winRate = useMemo(() => {
    if (!stats || stats.games_played <= 0) return null;
    return Math.round((stats.wins / stats.games_played) * 1000) / 10;
  }, [stats]);

  useEffect(() => {
    setUsernameDraft(player?.username ?? '');
  }, [player?.username]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setStats(null);
      if (!isAuthenticated || !user) return;

      setLoading(true);
      try {
        const { data, error: selErr } = await supabase
          .from('player_stats')
          .select('rating, games_played, wins, losses, draws, updated_at')
          .eq('player_id', user.id)
          .maybeSingle();
        if (selErr) throw selErr;
        if (cancelled) return;
        setStats((data as StatsRow | null) ?? null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load stats.';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, supabase, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveUsername() {
    setSaveMsg(null);
    setError(null);
    if (!isAuthenticated || !user) return;
    if (saveBusy) return;

    const next = normalizeUsername(usernameDraft);
    if (next.length < 3) {
      setSaveMsg('Username must be at least 3 characters.');
      return;
    }

    setSaveBusy(true);
    try {
      const { error: updErr } = await supabase.from('players').update({ username: next }).eq('id', user.id);
      if (updErr) throw updErr;
      await refreshPlayer();
      setSaveMsg('Saved.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save username.';
      setSaveMsg(msg);
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-zinc-200/50 bg-gradient-to-r from-purple-500/5 via-transparent to-emerald-500/5 dark:border-white/5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  href="/"
                >
                  ← Home
                </Link>
                <span className="text-xs text-zinc-400">/</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Profile</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-zinc-900">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" src={avatarUrl} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold text-white">
                      {firstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{firstName}</h1>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    {isAuthenticated ? (
                      <>
                        {isGuest ? 'Guest account • Upgrade to save progress' : 'Signed in'}
                      </>
                    ) : (
                      'Sign in to view your stats'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/lobby"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Online lobby
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Leaderboard
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          {isAuthenticated ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Rating</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                  {loading ? '…' : stats?.rating ?? '—'}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Games</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{loading ? '…' : stats?.games_played ?? '—'}</div>
              </div>
              <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Record</div>
                <div className="mt-1 text-sm font-semibold tabular-nums">
                  <span className="text-emerald-600 dark:text-emerald-400">{loading ? '…' : stats?.wins ?? '—'}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-red-500 dark:text-red-400">{loading ? '…' : stats?.losses ?? '—'}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-zinc-600 dark:text-zinc-300">{loading ? '…' : stats?.draws ?? '—'}</span>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/60">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Win rate</div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {winRate === null ? '—' : `${winRate}%`}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error ? (
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
        ) : null}

        {/* Not signed in */}
        {!authLoading && !isAuthenticated ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <h2 className="text-xl font-bold">Sign in to see your profile</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Track your stats, see your rating, and appear on the leaderboard (ranked matches only).
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/signin"
                  className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => void signInAsGuest()}
                >
                  Play as guest
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-purple-500/10 to-emerald-500/10 p-6 dark:border-white/10">
              <h3 className="text-lg font-bold">Why sign in?</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Save your progress
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Compete in ranked matches
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Appear on the leaderboard
                </li>
              </ul>
            </div>
          </div>
        ) : null}

        {/* Signed in */}
        {isAuthenticated ? (
          <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
            {/* Left: Stats */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Your stats</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      ELO changes only for ranked games.
                    </p>
                  </div>
                  {isGuest ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Guest
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Signed in
                    </span>
                  )}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-black/30">
                    <div className="text-xs text-zinc-500">Rating</div>
                    <div className="mt-1 text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                      {loading ? '…' : stats?.rating ?? '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-black/30">
                    <div className="text-xs text-zinc-500">Win rate</div>
                    <div className="mt-1 text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {winRate === null ? '—' : `${winRate}%`}
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        style={{ width: `${Math.min(winRate ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-zinc-50 p-4 dark:bg-black/30">
                  <div className="text-xs text-zinc-500">Record</div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm font-semibold tabular-nums">
                    <span>
                      <span className="text-zinc-500">W</span>{' '}
                      <span className="text-emerald-600 dark:text-emerald-400">{loading ? '…' : stats?.wins ?? '—'}</span>
                    </span>
                    <span>
                      <span className="text-zinc-500">L</span>{' '}
                      <span className="text-red-500 dark:text-red-400">{loading ? '…' : stats?.losses ?? '—'}</span>
                    </span>
                    <span>
                      <span className="text-zinc-500">D</span>{' '}
                      <span className="text-zinc-700 dark:text-zinc-200">{loading ? '…' : stats?.draws ?? '—'}</span>
                    </span>
                    <span className="text-zinc-500">
                      Games{' '}
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {loading ? '…' : stats?.games_played ?? '—'}
                      </span>
                    </span>
                  </div>
                </div>

                {isGuest ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200">
                    Guest accounts can play, but are not included in ranked leaderboards. Upgrade to save your progress.
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right: Account */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
                <h2 className="text-lg font-bold">Account</h2>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Username
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={usernameDraft}
                        onChange={(e) => setUsernameDraft(e.target.value)}
                        placeholder="your_name"
                        className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-white/10 dark:bg-black/30"
                        maxLength={32}
                      />
                      <button
                        type="button"
                        onClick={() => void saveUsername()}
                        disabled={saveBusy || usernameDraft.trim().length === 0}
                        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                      >
                        {saveBusy ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Lowercase letters, numbers, and underscores. Max 24 characters.
                    </div>
                    {saveMsg ? (
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{saveMsg}</div>
                    ) : null}
                  </div>

                  <div className="rounded-xl bg-zinc-50 p-4 dark:bg-black/30">
                    <div className="text-xs text-zinc-500">User ID</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="truncate font-mono text-xs text-zinc-700 dark:text-zinc-300">{user?.id}</code>
                      <button
                        type="button"
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
                        onClick={() => void navigator.clipboard?.writeText(user?.id ?? '')}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {isGuest ? (
                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-500/20 dark:bg-purple-900/10">
                      <div className="font-semibold text-purple-800 dark:text-purple-200">Upgrade your account</div>
                      <p className="mt-1 text-sm text-purple-700/80 dark:text-purple-300/80">
                        Keep your username and save progress by connecting Google.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void upgradeGuestWithOAuth('google')}
                          className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:shadow-xl"
                        >
                          Continue with Google
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-900/10">
                      <div className="font-semibold text-emerald-800 dark:text-emerald-200">Connected</div>
                      <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">
                        Your account is connected. You can sign in with Google anytime.
                      </p>
                    </div>
                  )}

                  {!isGuest ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => void signInWithOAuth('google')}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-white/10 dark:bg-black/30 dark:text-zinc-100 dark:hover:bg-white/5"
                      >
                        Reconnect Google (optional)
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

