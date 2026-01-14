# Dama King

Play **Filipino Dama (checkers)** online: create/join games, spectate, chat, play ranked matchmaking, and track stats/leaderboards.

## Features

- **Online multiplayer**: public games, private room codes, spectating
- **Ranked matchmaking**: rating-window pairing via a secure Supabase RPC
- **Chat**: per-game chat with realtime inserts
- **Replay/history**: moves stored per game for replay/history views
- **AI practice**: in-browser rules engine + AI (easy/medium/hard)
- **Stats & leaderboard**: ELO updates on finished ranked games (with guest/timeout safeguards)
- **Idle game cleanup**: scheduled “close idle games” job

## Tech stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Supabase**: Auth, Postgres (RLS), Realtime, RPCs, Edge Functions
- **Docker**: production container with runtime env injection

## Requirements

- Node.js (project Docker image uses **Node 22**)
- A Supabase project (Postgres + Auth + Realtime)

## Environment variables

Copy `env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Notes:
- `NEXT_PUBLIC_*` values are intentionally exposed to the browser.
- **Do not commit** `.env.local` (it should stay local/private).

## Supabase setup (schema + RLS + RPCs)

All database changes live in `supabase/migrations/`.

Minimum setup:
- Run **all** SQL migrations in order (starting from `001_initial_schema.sql`).
- Ensure Supabase Realtime is enabled (used for chat + game/move subscriptions).

You can apply migrations either by:
- **Supabase Dashboard SQL Editor**: copy/paste each migration file in order, or
- **Supabase CLI** (if you use it locally): run the migrations flow for the `supabase/` folder.

What the schema includes:
- Tables: `players`, `player_stats`, `games`, `moves`, `chat_messages`, `matchmaking_queue`, `game_spectators`
- **RLS policies** to restrict writes and control game visibility
- Security-definer RPCs such as:
  - `matchmake(...)` (rating matchmaking)
  - `join_game(...)` (controlled join)
  - `spectate_game(...)` (controlled spectate unlock)
  - `site_stats()` (public aggregate numbers for landing page)

## Running locally (dev)

Install deps and start the dev server:

```bash
npm ci
npm run dev
```

Then open `http://localhost:3000`.

## Running with Docker (production-style)

This repo supports **runtime** injection of `NEXT_PUBLIC_*` values (not only build-time) via:
- `docker-entrypoint.sh` → writes `public/runtime-env.js`
- `src/app/layout.tsx` → loads `/runtime-env.js` before the app runs

Example:

```bash
docker build -t dama-king .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY" \
  dama-king
```

## Scheduled job: close idle games

Idle active games can be auto-closed to prevent abandoned matches.

- DB function: `public.close_idle_games(p_idle_minutes int)` (see `supabase/migrations/011_close_idle_games.sql`)
- Edge Function: `supabase/functions/close-idle-games/`
  - Calls `close_idle_games(10)` using the **service role key**
  - Supports optional `CRON_SECRET` header check (`x-cron-secret`)

To use it:
- Deploy the Edge Function and schedule it from Supabase Dashboard (or call it from an external cron).
- Configure Edge Function env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - optionally `CRON_SECRET`

## Project map

- App routes: `src/app/*`
  - Game room: `src/app/game/[gameId]/page.tsx`
- Game logic: `src/game/*` (rules engine + AI)
- UI: `src/components/*`
- Client hooks: `src/hooks/*` (auth, chat, matchmaking)
- Supabase: `supabase/migrations/*` + `supabase/functions/*`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## License (Noncommercial)

This project is licensed under the **PolyForm Noncommercial 1.0.0** license.

- **You may use, modify, and share this project for noncommercial purposes.**
- **Commercial use is not permitted** without a separate license/permission from the copyright holder(s).

See `LICENSE` for the full text.

## Troubleshooting

- **Build fails with “Missing NEXT_PUBLIC_SUPABASE_*”**:
  - In Docker, pass env vars at `docker run` time (runtime injection is supported).
  - Locally, ensure `.env.local` exists and contains the values.
- **Realtime updates not arriving**:
  - Confirm Supabase Realtime is enabled and the relevant tables are configured for replication.
- **Can’t view a private game**:
  - Private games rely on room code + RPC policies; verify you ran all migrations.
