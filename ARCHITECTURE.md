# Architecture

One page. Read it twice a year; it names files without linking them on purpose.

## The problem
Show on a map, today, what small associations and cultural professionals in Madrid are doing, and which
associations know each other. A solo, non-programmer founder builds it with an AI agent; a programmer must be
able to take it over. So the code favours one obvious way to do each thing over cleverness.

## Shape
A single Next.js 16 app on Vercel and a Supabase Postgres database. Three layers, dependencies flow one way:

    src/app        "the director": routes and composition. Calls blocks. No SQL.
       ↓
    src/features   "departments": nine blocks that never import each other
                   auth · onboarding · organizations · events · threads · invites · spaces · account · map
       ↓
    src/lib, src/components/ui, src/config   "the storeroom": shared code that imports no block

Each block exposes the same files: data.ts (server-only reads → DTOs), actions.ts (validated writes),
schema.ts (zod), types.ts (DTOs), components/. When a screen needs two blocks, the page composes them, passes a
slot, or reads a SQL view. When a write touches two blocks, it is a SQL function (one transaction) or a page-level action.

The map is a read model: the views map_items and connection_lines. Recurring events are expanded in one place,
the SQL function event_occurrences, in Madrid local time.

## Invariants (expressed as absences)
- No block imports another block. lib/components/config import no block.
- No Supabase client is created outside src/lib/supabase.
- No table without row level security; no view without security_invoker.
- No role or permission in user_metadata; memberships live in a table.
- No secret key outside server-only files.
- No database text rendered as HTML.
- No colour, font or brand value outside src/app/globals.css, src/config/brand.ts and public/brand.
- No UI string outside messages/es.json.
- No cookie except the auth session; no analytics, trackers or third-party scripts.
- No schema change outside a new migration file.

## Cross-cutting
- Auth: magic link; src/proxy.ts only refreshes the session; pages and actions re-check the user.
- Time: timestamptz everywhere; displayed in Europe/Madrid via src/lib/dates.ts.
- Geography: PostGIS points; barrio assigned by trigger from official boundaries; geocoding server-side with cache.
- Abuse: Turnstile on public forms, check_rate_limit() before writes. No moderation queue, no peer reporting.
- Guardians: ESLint boundaries, dependency-cruiser, TypeScript strict with generated DB types, pgTAP RLS tests,
  CI required on main, Claude Code hooks protecting merged migrations and .env files.

Decisions and their reasons: docs/adr/.
