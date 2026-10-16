# Progress

Updated by the agent at the end of every session. Newest first.

## Status
- Phase: session 1 done on branch `chore/skeleton` (not pushed, no PR yet).

## Done
### 2026-10-16 — Session 1: skeleton and guardrails
- Next.js 16.4.2 + React 19.3 scaffolded with create-next-app@16 (temp folder, copied without overwriting).
- Dependencies from BUILD_PLAN session 1. `@types/node` is `^22` (vitest 5 needs it; matches CI Node 22).
- Scripts: `typecheck` (= `next typegen && tsc --noEmit`, so `LayoutProps`/`PageProps` exist on a clean
  checkout), `lint`, `deps`, `test`, `e2e`, `check`, `db:types` (dev project `jvthbqxmequhgliofnpb`).
- `src/lib`: supabase `server`/`client`/`proxy-session`/`admin`/`unwrap`, `env.ts` (public) +
  `server-env.ts` (server-only secrets), `dates.ts` (Europe/Madrid, DST tests), `i18n/request.ts`.
- `src/proxy.ts` refreshes the session only. Nine empty block folders. Button/Input on tokens.
  Placeholder home with `brand.appName` and `messages/es.json`.
- Security headers in `next.config.ts`: static CSP, nosniff, Referrer-Policy, Permissions-Policy.
- Verified: lint fails on a block-to-block import and on a hex color (and `deps` fails too);
  `check`, `deps`, `build` green; home loads with an empty browser console and hydrates.
- `jq` installed (winget) and copied to `~/.local/bin` so the Claude app sees it; the
  protect-files hook really blocks writing `.env.fake` on Windows.
- Hooks hardened: `protect-files.sh` fails closed (no jq / unreadable input → edit blocked);
  `check-on-stop.sh` warns and exits 0 without jq, so it can never loop. Both tested.
- ADR 0007 records the CSP `'unsafe-inline'` decision.

## Next
- Founder: GitHub ruleset on `main`, Actions variables `DEV_SUPABASE_URL` and
  `DEV_SUPABASE_PUBLISHABLE_KEY`, Vercel project (functions region fra1, Preview → dev, Production → prod).
  Then push `chore/skeleton` and open the PR.
- Session 2 — database (docs/BUILD_PLAN.md).

## Known issues
- CSP allows `'unsafe-inline'` scripts (docs/adr/0007-csp-unsafe-inline.md). Revisit when Next.js SRI is stable.
- Without jq every Edit/Write is blocked by `protect-files.sh` (by design). jq lives in `~/.local/bin`.
- `npm audit`: 5 high in dev-only tooling (`braces` via `eslint-config-next` → `fast-glob`). Not shipped to
  the browser or server. npm's "fix" downgrades to Next 14: do not apply; wait for an upstream release.
- `next build` and `next typegen` fail fast if `NEXT_PUBLIC_SUPABASE_URL` is missing: CI needs the Actions
  variables above before the PR can be green.
- The Supabase clients are untyped until `src/lib/database.types.ts` exists (session 2).
- Playwright browsers are not downloaded yet (`npx playwright install` in session 3).
