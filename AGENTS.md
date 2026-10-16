<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!--
  Single source of rules for every AI agent and every human contributor.
  Keep under 200 lines. If create-next-app or `next dev` adds a block between
  BEGIN:nextjs-agent-rules / END:nextjs-agent-rules, keep it above this file's content and commit it.
-->

# Project rules

A free, open-source (AGPL-3.0) map of what small cultural and social associations, collectives
and professionals in Madrid are doing today, and the threads between associations.
Product: `docs/SPEC.md`. Data: `docs/DATA_MODEL.md`. Steps: `docs/BUILD_PLAN.md`.
Privacy and ownership rules: `docs/PRIVACY_AND_OWNERSHIP.md`. Design slots: `docs/DESIGN_HANDOFF.md`.
The product name and visual identity are NOT decided. Never invent them (see Design).

## Stack (do not change without a new ADR in docs/adr/)
Next.js 16 App Router · TypeScript strict · React 19 · Supabase (Postgres, Auth with magic link,
Storage, RLS) via `@supabase/ssr` · MapLibre GL via `react-map-gl/maplibre` + OpenFreeMap tiles ·
Tailwind CSS v4 · next-intl (Spanish only, no locale in URLs) · zod · Vitest · Playwright · npm.
Hosting: Vercel (functions region fra1). Supabase projects in an EU region.

## Commands
- `npm run dev` · `npm run lint` (= `eslint .`; `next lint` no longer exists) · `npm run typecheck`
- `npm test` (Vitest) · `npm run e2e` (Playwright) · `npm run deps` (dependency-cruiser)
- `npm run check` = typecheck + lint + test. Run it before saying a task is done, and paste the output.
- Database (no Docker): `npx supabase migration new <name>` → write SQL → `npx supabase db push`
  (CLI linked ONLY to the dev project) → `npm run db:types` → commit migration + types together.
  Production is migrated only by CI. Never use the Supabase dashboard to change the schema.

## Architecture: blocks
- `src/app/` = routing and composition only. A page may call several blocks. No SQL, no Supabase calls.
  Writes that touch two blocks live in `src/app/**/actions.ts` or in a SQL function.
- Blocks: `src/features/{auth,onboarding,organizations,events,threads,invites,spaces,account,map}`.
  Do not create a new block without asking the human.
- IMPORTANT: a block never imports another block. If you need its data: compose in the page,
  pass a slot (`children` or a prop with a component), or read a SQL view. Lint enforces this.
- Every block exposes only these files, with these names:
  - `data.ts` — `import 'server-only'`; reads; returns DTOs from `types.ts`. Explicit columns, never `select('*')`.
  - `actions.ts` — `'use server'`; order is always: zod `safeParse` → current user + membership check
    → rate limit (if public-facing) → write → `revalidatePath`/`updateTag`. Return `{ ok, error }`.
  - `schema.ts` (zod) · `types.ts` (DTOs) · `components/` · optional `CLAUDE.md` with block rules.
  - No `index.ts`, no `export *`, no barrel files.
- `src/lib/database.types.ts` is GENERATED. Import it only in `data.ts` and `actions.ts`.
  Components and pages receive DTOs.
- `map` is a read model: it reads the views `map_items` and `connection_lines` and owns `neighborhoods`.
- `src/lib/` = code used by 2+ blocks (supabase clients, dates, env, rate-limit, turnstile, i18n).
  Pure domain helpers in `src/lib/domain/`. Before writing a helper, search `src/lib` and `src/components/ui`.
- `src/components/ui/` = generic primitives (Button, Input, Sheet…). They use tokens only, no data.
- Feature flags only in `src/config/flags.ts`, each with an expiry-date comment.
- Every Supabase call checks `error`. Use `unwrap()` from `src/lib/supabase/unwrap.ts`.
  An RLS-denied SELECT returns an empty list, not an error: test reads with real roles.

## Database
- Schema changes only as new files in `supabase/migrations/`. Merged migrations are immutable
  (a hook blocks edits). Breaking changes in three PRs: expand → migrate data → contract.
- Every table: `enable row level security` in the same migration that creates it, with policies.
- Every view: `with (security_invoker = true)`. Otherwise it bypasses RLS.
- Roles and memberships live in tables (`memberships`), never in `user_metadata`.
- Times are `timestamptz`. Display in Europe/Madrid with `src/lib/dates.ts` only.
- Slugs are generated once, unique, and never change when a title changes.
- Write an RLS test (pgTAP in `supabase/tests/`) for every new table or policy.

## Security and privacy (non-negotiable, details in docs/PRIVACY_AND_OWNERSHIP.md)
- Text from the database is always rendered as text: no `dangerouslySetInnerHTML`, no `innerHTML`,
  no MapLibre `setHTML`. Popups are built with `textContent` in `features/map/build-popup.ts`.
- Links from users accept only `https:` and `http:`.
- The secret key (`SUPABASE_SECRET_KEY`) is used only in server files with `import 'server-only'`.
  Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be public.
- Collect the minimum. Never add analytics, trackers, third-party scripts, cookies other than the
  Supabase auth cookie, fingerprinting, geolocation or camera permissions.
- Registry numbers and imported registry rows are never readable by `anon` or `authenticated`.
- Uploaded images are re-encoded server-side (sharp), resized, and stripped of EXIF/GPS metadata.
- Server code checks the user with `supabase.auth.getClaims()` (or `getUser()`), never `getSession()`.
- Every action that a stranger can trigger (sign-up, invite, event create) has Turnstile and/or a rate limit.
- Never log personal data (emails, phones, IPs). Never put real people or real associations in seed data.

## Design (identity not decided yet)
- All visual values live in three places only: tokens in `src/app/globals.css` (`@theme`),
  `src/config/brand.ts` (name, tagline, logo paths, map style URL), and `public/brand/`.
- No hex/rgb/oklch values anywhere else (lint blocks hex), no `style={{}}` (lint blocks it),
  no Tailwind default palette (it is disabled), no font names outside `globals.css`.
- MapLibre needs real color values: read them at runtime from CSS variables (`--color-*`).
- Use neutral placeholder UI. Do not design a logo, cover, intro animation or illustrations.
  The intro/cover slot exists behind the flag `intro` (off). See `docs/DESIGN_HANDOFF.md`.
- Mobile first. Accessible: every map view has an equivalent list view; contrast AA; focus visible.

## Language and naming
- Code, identifiers, comments, commits, PRs, technical docs: English.
- All UI text: Spanish, only in `messages/es.json`. No UI strings in components.
- Terms: see `docs/glossary.md` (asociación → organization kind `association`, hilo → `thread`,
  barrio → `neighborhood`, ficha → `profile`).
- Files kebab-case, components PascalCase, functions are explicit verbs (`getMapItems`, not `fetchData`).
- Named exports everywhere except Next.js special files (`page`, `layout`, `route`…).
- Comment the why, not the what.

## Next.js 16 gotchas (read node_modules/next/dist/docs/ when unsure)
- `src/proxy.ts`, not `middleware.ts`. Do not do authorization only in the proxy: re-check in the page/action.
- `await params`, `await searchParams`, `await cookies()`, `await headers()`.
- `revalidateTag(tag, 'max')` takes two arguments; use `updateTag()` inside Server Actions.
- `next build` does not lint: CI runs `npm run lint` as its own step.
- `dynamic(..., { ssr: false })` is not allowed in Server Components: wrap it in a small client component.

## Never
- Edit `.env*` files, merged migrations, `src/lib/database.types.ts` by hand, CI config, or this file
  without the human asking.
- Delete, skip (`.skip`/`.only`) or weaken a test to make it pass. If a test is wrong, say so and stop.
- Use `@ts-ignore`, `eslint-disable`, `as any`, or comment out code to "fix" a bug. Fix the cause.
- Add a dependency without saying why and asking.
- Build features listed as out of scope in `docs/SPEC.md` §13.
- Push to `main`. Work on a branch, open a PR.

## Workflow
1. Read the relevant part of `docs/SPEC.md` and `docs/DATA_MODEL.md`. For anything bigger than a
   one-line fix, propose a plan first (plan mode) and wait for approval.
2. One feature per branch: `feat/<short-name>`. Small commits, Conventional Commits.
3. Before "done": run `npm run check` (and `npm run e2e` if UI flows changed) and paste the output.
4. End of session: update `PROGRESS.md` (done / next / known issues) and list the files you touched,
   grouped by block, in plain Spanish or Italian for the founder.
5. If a request conflicts with these rules, say so and ask. Do not silently work around a rule.
