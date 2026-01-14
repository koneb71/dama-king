import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="footerPieceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="footerCrownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="18" r="12" fill="url(#footerPieceGrad)" />
              <circle cx="16" cy="18" r="9" fill="none" stroke="#fff" strokeWidth="1" opacity="0.3" />
              <path d="M9 12 L11.5 8 L14 11 L16 6 L18 11 L20.5 8 L23 12 L22 14 L10 14 Z" fill="url(#footerCrownGrad)" />
              <circle cx="16" cy="9" r="1" fill="#fff" opacity="0.9" />
            </svg>
            <span className="text-lg font-bold">Dama King</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/play" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Play vs AI
            </Link>
            <Link href="/lobby" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Online Lobby
            </Link>
            <Link href="/leaderboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Leaderboard
            </Link>
            <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Contact
            </Link>
            <Link href="/signin" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Sign In
            </Link>
          </nav>
          <p className="text-sm text-zinc-500">© {new Date().getFullYear()} Dama King. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
