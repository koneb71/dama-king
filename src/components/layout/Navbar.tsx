'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { href: '/play', label: 'Play vs AI' },
  { href: '/lobby', label: 'Lobby' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/recent', label: 'Recent Games' },
];

export function Navbar() {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, player, user, signInAsGuest, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const displayName =
    player?.username ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.full_name ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.name ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'Guest';

  const firstName = useMemo(() => {
    const name = String(displayName ?? '').trim();
    if (!name) return 'Guest';
    // take first token, but keep usernames with underscores readable
    const token = name.split(/\s+/)[0] ?? name;
    return token.replace(/_/g, ' ');
  }, [displayName]);

  const avatarUrl = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta = meta?.avatar_url || meta?.picture;
    return player?.avatar_url || (typeof fromMeta === 'string' ? fromMeta : null);
  }, [player?.avatar_url, user?.user_metadata]);

  const displayInitial = (firstName?.trim()?.charAt(0) || 'G').toUpperCase();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close account dropdown on outside click / Escape
  useEffect(() => {
    if (!accountMenuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = accountMenuRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && !el.contains(target)) setAccountMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('touchstart', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('touchstart', onPointerDown);
    };
  }, [accountMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-black/80">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="navPieceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444"/>
                <stop offset="100%" stopColor="#f97316"/>
              </linearGradient>
              <linearGradient id="navCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#f59e0b"/>
              </linearGradient>
            </defs>
            <circle cx="16" cy="18" r="12" fill="url(#navPieceGrad)"/>
            <circle cx="16" cy="18" r="9" fill="none" stroke="#fff" strokeWidth="1" opacity="0.3"/>
            <path d="M9 12 L11.5 8 L14 11 L16 6 L18 11 L20.5 8 L23 12 L22 14 L10 14 Z" fill="url(#navCrownGrad)"/>
            <circle cx="16" cy="9" r="1" fill="#fff" opacity="0.9"/>
          </svg>
          <span>Dama King</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Desktop Auth Section */}
        <div className="hidden items-center gap-3 md:flex">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          ) : isAuthenticated ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl bg-white/90 px-2 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-white focus:outline-none focus:ring-0 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
              >
                <span className="relative h-8 w-8 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" src={avatarUrl} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500 dark:text-zinc-300">
                      {displayInitial}
                    </span>
                  )}
                </span>
                <span className="max-w-[140px] truncate">{firstName}</span>
                <svg className="h-4 w-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {accountMenuOpen ? (
                <div
                  className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900"
                  role="menu"
                >
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                  <Link
                    href="/history"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    History
                  </Link>
                  <Link
                    href="/recent"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recent
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                    role="menuitem"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/15 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/5"
              >
                Sign in
              </Link>
              <button
                onClick={() => void signInAsGuest({})}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
              >
                Play as Guest
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-zinc-200 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-black/95 md:hidden">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-1">
              {navLinks.map(({ href, label }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      'rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Auth Section */}
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-white/10">
              {isLoading ? (
                <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              ) : isAuthenticated ? (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((v) => !v)}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/90 px-3 py-2.5 text-left text-sm font-medium text-zinc-900 focus:outline-none focus:ring-0 dark:bg-white/5 dark:text-zinc-100"
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                  >
                    <span className="flex items-center gap-3">
                      <span className="relative h-9 w-9 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" src={avatarUrl} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-500 dark:text-zinc-300">
                            {displayInitial}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{firstName}</span>
                        <span className="block truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          Account
                        </span>
                      </span>
                    </span>
                    <svg className="h-4 w-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {accountMenuOpen ? (
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-black">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </Link>
                      <Link
                        href="/history"
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        History
                      </Link>
                      <Link
                        href="/recent"
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent
                      </Link>
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => void signInAsGuest({})}
                    className="rounded-md bg-zinc-900 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
                  >
                    Play as Guest
                  </button>
                  <Link
                    href="/signin"
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/15 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/5"
                  >
                    Sign in
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
