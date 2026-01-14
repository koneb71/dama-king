'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';

type AuthTab = 'signin' | 'signup';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function CheckerPiece({ color, delay }: { color: 'red' | 'black'; delay: number }) {
  return (
    <div
      className={[
        'h-8 w-8 rounded-full shadow-lg sm:h-10 sm:w-10',
        color === 'red'
          ? 'bg-gradient-to-br from-red-500 to-red-700 ring-2 ring-red-300/50'
          : 'bg-gradient-to-br from-zinc-700 to-zinc-900 ring-2 ring-zinc-400/30 dark:from-zinc-200 dark:to-zinc-400 dark:ring-zinc-500/30',
      ].join(' ')}
      style={{
        animation: `float 3s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function FloatingPieces() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[10%] top-[15%] opacity-20">
        <CheckerPiece color="red" delay={0} />
      </div>
      <div className="absolute right-[15%] top-[20%] opacity-15">
        <CheckerPiece color="black" delay={0.5} />
      </div>
      <div className="absolute bottom-[25%] left-[20%] opacity-20">
        <CheckerPiece color="black" delay={1} />
      </div>
      <div className="absolute bottom-[30%] right-[10%] opacity-15">
        <CheckerPiece color="red" delay={1.5} />
      </div>
      <div className="absolute left-[5%] top-[50%] opacity-10">
        <CheckerPiece color="red" delay={2} />
      </div>
      <div className="absolute right-[25%] top-[60%] opacity-10">
        <CheckerPiece color="black" delay={2.5} />
      </div>
    </div>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const {
    isLoading,
    error,
    player,
    isAuthenticated,
    isGuest,
    signInAsGuest,
    signInWithOAuth,
    upgradeGuestWithOAuth,
    signUpWithEmail,
    signInWithEmail,
    sendPasswordResetEmail,
  } = useAuth();

  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const providerMode = useMemo(
    () => (isAuthenticated && isGuest ? 'upgrade' : 'signin'),
    [isAuthenticated, isGuest],
  );

  // Redirect authenticated users to lobby
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      router.push('/lobby');
    }
  }, [isAuthenticated, isGuest, router]);

  async function run(label: string, fn: () => Promise<void>) {
    setInfo(null);
    setBusy(label);
    try {
      await fn();
      if (label === 'signup') {
        setInfo('Check your email to confirm your account.');
      } else if (label === 'reset') {
        setInfo('Password reset email sent. Check your inbox.');
        setShowForgotPassword(false);
      }
    } catch {
      // error is shown from hook
    } finally {
      setBusy(null);
    }
  }

  // Show welcome screen for authenticated guests
  if (isAuthenticated && isGuest) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <FloatingPieces />
          <div className="relative z-10 w-full max-w-md px-4 py-12">
          <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold">Welcome, {player?.username ?? 'Guest'}!</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                You're playing as a guest. Upgrade your account to save your progress.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/play"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Play vs AI
              </Link>
              <Link
                href="/lobby"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Online Lobby
              </Link>
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <p className="mb-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Upgrade to save your progress
              </p>
              <button
                onClick={() => run('oauth-google', () => upgradeGuestWithOAuth('google'))}
                disabled={!!busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>
          <style jsx>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(5deg); }
            }
          `}</style>
        </div>

        <Footer />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <FloatingPieces />

        <div className="relative z-10 w-full max-w-md px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="signinPieceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444"/>
                  <stop offset="100%" stopColor="#f97316"/>
                </linearGradient>
                <linearGradient id="signinCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24"/>
                  <stop offset="100%" stopColor="#f59e0b"/>
                </linearGradient>
              </defs>
              <circle cx="32" cy="36" r="24" fill="url(#signinPieceGrad)"/>
              <circle cx="32" cy="36" r="18" fill="none" stroke="#fff" strokeWidth="2" opacity="0.3"/>
              <path d="M18 24 L23 16 L28 22 L32 12 L36 22 L41 16 L46 24 L44 28 L20 28 Z" fill="url(#signinCrownGrad)"/>
              <circle cx="32" cy="18" r="2" fill="#fff" opacity="0.9"/>
              <circle cx="23" cy="21" r="1.5" fill="#fff" opacity="0.7"/>
              <circle cx="41" cy="21" r="1.5" fill="#fff" opacity="0.7"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Dama King
            </span>
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Sign in to track your progress and compete on the leaderboard
          </p>
        </div>

        {/* Quick play button */}
        <button
          onClick={() => run('guest', () => signInAsGuest({ username }))}
          disabled={!!busy}
          className="group mb-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4 text-lg font-semibold text-white shadow-xl shadow-red-500/25 transition-all hover:shadow-2xl hover:shadow-red-500/30 disabled:opacity-50"
        >
          <svg
            className="h-6 w-6 transition-transform group-hover:scale-110"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {busy === 'guest' ? 'Starting...' : 'Quick Play as Guest'}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 text-zinc-500 dark:from-zinc-950 dark:via-black dark:to-zinc-900 dark:text-zinc-400">
              or continue with
            </span>
          </div>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
          {/* Social login */}
          <div className="mb-6">
            <button
              onClick={() =>
                run('oauth-google', () =>
                  providerMode === 'upgrade' ? upgradeGuestWithOAuth('google') : signInWithOAuth('google'),
                )
              }
              disabled={!!busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 font-medium transition-all hover:bg-zinc-50 hover:shadow-md disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">or use email</span>
            </div>
          </div>

          {/* Tabs */}
          {!showForgotPassword && (
            <div className="mb-4 flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                onClick={() => setTab('signin')}
                className={[
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                  tab === 'signin'
                    ? 'bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300',
                ].join(' ')}
              >
                Sign in
              </button>
              <button
                onClick={() => setTab('signup')}
                className={[
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                  tab === 'signup'
                    ? 'bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300',
                ].join(' ')}
              >
                Sign up
              </button>
            </div>
          )}

          {showForgotPassword ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run('reset', () => sendPasswordResetEmail(email));
              }}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Reset password</h3>
                <p className="mt-1 text-sm text-zinc-500">Enter your email to receive a reset link.</p>
              </div>
              <input
                className="mb-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <button
                type="submit"
                disabled={!!busy}
                className="mb-3 w-full rounded-xl bg-zinc-900 py-3 font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
              >
                {busy === 'reset' ? 'Sending...' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (tab === 'signin') {
                  run('signin', () => signInWithEmail(email, password));
                } else {
                  run('signup', () => signUpWithEmail(email, password, { username }));
                }
              }}
            >
              {tab === 'signup' && (
                <input
                  className="mb-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10"
                  placeholder="Username (optional)"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              )}
              <input
                className="mb-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                className="mb-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                required
              />

              <button
                type="submit"
                disabled={!!busy}
                className="w-full rounded-xl bg-zinc-900 py-3 font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
              >
                {busy === 'signin' || busy === 'signup'
                  ? 'Please wait...'
                  : tab === 'signin'
                    ? 'Sign in'
                    : 'Create account'}
              </button>

              {tab === 'signin' && (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="mt-3 w-full text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  Forgot password?
                </button>
              )}
            </form>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
          {info && (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-center text-sm text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              {info}
            </p>
          )}
        </div>

        {/* Bottom links */}
        <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            ← Back to home
          </Link>
        </div>
      </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
        `}</style>
      </div>

      <Footer />
    </div>
  );
}
