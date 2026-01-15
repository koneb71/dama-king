import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/layout/Footer';
import { LandingHeroClient } from '@/components/landing/LandingHeroClient';
import { LandingCtaBannerClient } from '@/components/landing/LandingCtaBannerClient';

export const metadata: Metadata = {
  title: 'Dama King - Play Filipino Checkers Online | Free Multiplayer Game',
  description:
    'Play Dama (Filipino Checkers) online for free! Challenge friends, compete in ranked matches, climb the leaderboard, or practice against AI. The best Filipino checkers game on the web.',
  keywords: [
    'dama',
    'filipino checkers',
    'checkers online',
    'draughts',
    'board game',
    'multiplayer game',
    'free game',
    'strategy game',
    'play checkers',
    'dama king',
  ],
  openGraph: {
    title: 'Dama King - Play Filipino Checkers Online',
    description: 'Challenge players worldwide in Filipino Checkers. Play ranked matches, climb the leaderboard, and become the Dama King!',
    type: 'website',
    locale: 'en_US',
    siteName: 'Dama King',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dama King - Play Filipino Checkers Online',
    description: 'Challenge players worldwide in Filipino Checkers. Free to play!',
  },
  robots: {
    index: true,
    follow: true,
  },
};

function CheckerPiece({ color, size = 'md' }: { color: 'red' | 'black'; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };
  return (
    <div
      className={[
        sizes[size],
        'rounded-full shadow-lg',
        color === 'red'
          ? 'bg-gradient-to-br from-red-500 to-red-700 ring-2 ring-red-300/50'
          : 'bg-gradient-to-br from-zinc-700 to-zinc-900 ring-2 ring-zinc-400/30 dark:from-zinc-300 dark:to-zinc-500 dark:ring-zinc-600/30',
      ].join(' ')}
    />
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-zinc-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl dark:border-white/10 dark:bg-zinc-900/80">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/25 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-lg font-bold text-white shadow-lg">
          {number}
        </div>
        {number < 3 && <div className="mt-2 h-full w-0.5 bg-gradient-to-b from-red-500 to-transparent" />}
      </div>
      <div className="pb-8">
        <h3 className="mb-1 text-lg font-bold">{title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-20">
        {/* Floating decorative pieces */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-4 top-20 opacity-20 sm:left-10">
            <CheckerPiece color="red" size="lg" />
          </div>
          <div className="absolute right-10 top-32 opacity-15 sm:right-20">
            <CheckerPiece color="black" size="md" />
          </div>
          <div className="absolute bottom-20 left-1/4 opacity-20">
            <CheckerPiece color="black" size="sm" />
          </div>
          <div className="absolute bottom-32 right-1/4 opacity-15">
            <CheckerPiece color="red" size="md" />
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Hero Text */}
            <div className="text-center lg:text-left">
              <LandingHeroClient variant="badge" />

              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Play{' '}
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  Filipino Checkers
                </span>{' '}
                Online
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400 lg:mx-0">
                Master the classic Filipino board game. Challenge players worldwide, climb the ranked ladder, and become
                the ultimate <strong>Dama King</strong>.
              </p>

              <LandingHeroClient variant="cta" />

              <div
                className="
                  mt-6 flex flex-col items-stretch gap-3 justify-center
                  w-full max-w-xs sm:max-w-xs mx-auto
                  lg:flex-row lg:items-center lg:gap-4 lg:justify-start lg:max-w-none
                "
              >
                <a
                  href="https://www.producthunt.com/products/dama-king?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-dama-king"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block dark:hidden w-full"
                  style={{ height: '56px', maxWidth: '100%' }}
                >
                  <img
                    alt="Dama King - Play Filipino Dama online: ranked, chat, AI, replays | Product Hunt"
                    width="222"
                    height="56"
                    style={{
                      height: '56px',
                      minHeight: '56px',
                      maxHeight: '56px',
                      width: '100%',
                      maxWidth: '100%',
                      display: 'block',
                      objectFit: 'contain',
                    }}
                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1063048&theme=light&t=1768425319270"
                  />
                </a>
                <a
                  href="https://www.producthunt.com/products/dama-king?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-dama-king"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden dark:block w-full"
                  style={{ height: '56px', maxWidth: '100%' }}
                >
                  <img
                    alt="Dama King - Play Filipino Dama online: ranked, chat, AI, replays | Product Hunt"
                    width="222"
                    height="56"
                    style={{
                      height: '56px',
                      minHeight: '56px',
                      maxHeight: '56px',
                      width: '100%',
                      maxWidth: '100%',
                      display: 'block',
                      objectFit: 'contain',
                    }}
                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1063048&theme=dark&t=1768425319270"
                  />
                </a>
                <a
                  href="https://www.nxgntools.com/tools/dama-king?utm_source=dama-king"
                  target="_blank"
                  rel="noopener"
                  className="w-full px-[10%] sm:px-0"
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '56px',
                    maxWidth: '100%',
                  }}
                >
                  <img
                    src="https://www.nxgntools.com/api/embed/dama-king?type=FEATURED_ON"
                    alt="NextGen Tools Badge - The #1 AI Tools Directory & Launch Platform"
                    style={{
                      height: '56px',
                      minHeight: '56px',
                      maxHeight: '56px',
                      width: '100%',
                      maxWidth: '100%',
                      display: 'block',
                      objectFit: 'contain',
                    }}
                  />
                </a>
              </div>

            </div>

            {/* Hero Board Preview */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto w-fit">
                {/* Glow effect */}
                <div className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 blur-2xl" />

                {/* Board with wooden frame */}
                <div className="relative rounded-2xl bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 p-3 shadow-2xl">
                  <div className="rounded-xl bg-gradient-to-br from-amber-700/20 to-transparent p-0.5">
                    <div className="grid h-72 w-72 grid-cols-8 overflow-hidden rounded-lg shadow-inner">
                      {Array.from({ length: 64 }).map((_, i) => {
                        const row = Math.floor(i / 8);
                        const col = i % 8;
                        const isDark = (row + col) % 2 === 1;
                        const hasPiece = isDark && (row < 3 || row > 4);
                        const isRed = row > 4;
                        return (
                          <div
                            key={i}
                            className={
                              isDark
                                ? 'bg-gradient-to-br from-emerald-800 to-emerald-900'
                                : 'bg-gradient-to-br from-amber-100 to-amber-200'
                            }
                          >
                            {hasPiece && (
                              <div className="flex h-full items-center justify-center">
                                <div
                                  className={[
                                    'relative h-7 w-7 rounded-full shadow-lg',
                                    isRed
                                      ? 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-red-900/50'
                                      : 'bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-800 shadow-black/50',
                                  ].join(' ')}
                                >
                                  {/* Piece highlight */}
                                  <div
                                    className={[
                                      'absolute inset-0.5 rounded-full',
                                      isRed
                                        ? 'bg-gradient-to-br from-red-400/50 via-transparent to-transparent'
                                        : 'bg-gradient-to-br from-zinc-400/30 via-transparent to-transparent',
                                    ].join(' ')}
                                  />
                                  {/* Inner ring */}
                                  <div
                                    className={[
                                      'absolute inset-1 rounded-full border',
                                      isRed ? 'border-red-400/30' : 'border-zinc-500/30',
                                    ].join(' ')}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Floating stats are rendered by LandingHeroClient (real-time) */}
                <LandingHeroClient variant="floating" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24" id="features">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Why Choose{' '}
              <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                Dama King
              </span>
              ?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
              The most feature-rich Filipino Checkers platform on the web. Play anytime, anywhere.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              title="Play Worldwide"
              description="Challenge players from around the globe in real-time multiplayer matches. Find opponents instantly."
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
              title="Ranked Matches"
              description="Compete in ranked games to earn ELO points and climb the global leaderboard. Prove you're the best!"
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
              title="AI Practice"
              description="Sharpen your skills against our intelligent AI with three difficulty levels. Perfect for beginners!"
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
              title="Private Rooms"
              description="Create private game rooms with unique codes. Invite friends and family for friendly matches."
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              }
              title="In-Game Chat"
              description="Chat with your opponents during matches. Make friends and build your gaming community."
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              }
              title="Spectator Mode"
              description="Watch live games and learn from top players. Great way to improve your strategy."
            />
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="py-16 sm:py-24" id="how-to-play">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
                Get Started in{' '}
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  3 Easy Steps
                </span>
              </h2>
              <div className="space-y-2">
                <StepCard
                  number={1}
                  title="Create Your Account"
                  description="Sign up for free with Google or email. You can also play as a guest instantly — no registration required!"
                />
                <StepCard
                  number={2}
                  title="Choose Your Mode"
                  description="Practice against our AI, or jump into the online lobby to find real opponents. Create private rooms to play with friends."
                />
                <StepCard
                  number={3}
                  title="Start Playing & Climbing"
                  description="Win games to earn ELO points and climb the leaderboard. Track your stats and become the ultimate Dama King!"
                />
              </div>
              <Link
                href="/play"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl"
              >
                Start Playing Now
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            {/* Rules Card */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
              <h3 className="mb-6 text-xl font-bold">Quick Rules</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    ✓
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-zinc-100">Move diagonally</strong> — Pieces move one
                    square diagonally forward
                  </span>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    ✓
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-zinc-100">Capture is mandatory</strong> — You must capture
                    if a capture is available
                  </span>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    ✓
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-zinc-100">Flying Kings</strong> — Kings can move multiple
                    squares diagonally
                  </span>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    ✓
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-zinc-100">Backward capture</strong> — Men can capture
                    backward as well as forward
                  </span>
                </li>
                <li className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    ✓
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <strong className="text-zinc-900 dark:text-zinc-100">Promotion</strong> — Reach the opposite end to
                    promote to King
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-500 to-orange-500 p-8 text-center text-white shadow-2xl sm:p-12">
            {/* Decorative elements */}
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10" />

            <div className="relative">
              <LandingCtaBannerClient />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
