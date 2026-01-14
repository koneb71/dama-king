## Summary

Describe what this PR changes and why.

## Changes

- 

## Test plan

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Manual verification:
  - [ ] Relevant pages load (e.g. `/`, `/lobby`, `/game/:id`)
  - [ ] Auth flow (guest and/or email/OAuth if applicable)
  - [ ] Game flow (join → move → realtime update)

## Screenshots / video (UI changes)

Paste screenshots or a short recording.

## Database / Supabase changes (if any)

- [ ] New/updated migration added under `supabase/migrations/`
- [ ] RLS policies reviewed (no unintended access)
- [ ] Realtime implications considered (subscriptions still work)
- [ ] RPCs are `security definer` where needed, and safe from injection

## Checklist

- [ ] This PR is scoped (one main change)
- [ ] Types are correct and strict
- [ ] No secrets committed (`.env*`, service role keys, etc.)
- [ ] User-facing copy is clear
- [ ] I agree to license my contribution under the project license (see `LICENSE`)
