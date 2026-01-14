# Contributing to Dama King

Thanks for your interest in contributing!

## Quick start (local dev)

1. Fork and clone the repo
2. Install dependencies:

```bash
npm ci
```

3. Configure environment variables:
   - Copy `env.example` → `.env.local`
   - Set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Ensure your Supabase project has the schema applied:
   - Run all SQL files in `supabase/migrations/` (in order).

5. Run the app:

```bash
npm run dev
```

## What to work on

- Bugs and small improvements: check issues first (or open one)
- New features: open an issue to discuss scope and design before you start

## Development guidelines

- **TypeScript**: keep types strict; avoid `any` unless unavoidable.
- **UI**: follow existing patterns in `src/components/*` and `src/app/*`.
- **Game logic**:
  - Keep pure logic in `src/game/*` (no React, no Supabase).
  - Avoid mixing UI state and rules engine concerns.
- **Supabase changes**:
  - Any DB changes should be a new migration in `supabase/migrations/`.
  - Prefer **security-definer RPCs** for actions that must not be direct client table writes.
  - Be mindful of RLS policy recursion and realtime replication needs.

## Code quality

Before opening a PR, please run:

```bash
npm run lint
npm run build
```

If you add new behavior, include a short test plan in your PR description (even if it’s manual).

## Commit / PR expectations

- **One focused change per PR** when possible.
- Include:
  - What changed and why
  - Screenshots/video for UI changes
  - Migration notes for DB changes
  - A clear test plan

## Reporting security issues

Please do **not** open public issues for security vulnerabilities. See `SECURITY.md`.

## License and contributions

By contributing, you agree that your contributions will be licensed under the project license:
**PolyForm Noncommercial 1.0.0** (see `LICENSE`).
