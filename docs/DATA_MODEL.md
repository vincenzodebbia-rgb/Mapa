# Data model

Source of truth for the database. The schema is created ONLY by migrations in `supabase/migrations/`.
This document says what must exist; the migrations say how. If they disagree, stop and ask.

Conventions: `snake_case`; `id uuid primary key default gen_random_uuid()`; `created_at`/`updated_at timestamptz default now()`
(`updated_at` kept by a trigger); all times `timestamptz`; every function `security definer` sets `search_path = ''`
and uses schema-qualified names. Extensions: `postgis`, `unaccent`, `pgcrypto` (in the `extensions` schema).

## Enums
- `org_kind`: `association`, `professional`
- `event_category`: `musica`, `teatro_danza`, `arte`, `talleres`, `encuentros`, `comunidad`, `otros`
- `price_type`: `free`, `donation`, `paid`
- `recurrence`: `none`, `weekly`, `monthly`
- `thread_status`: `pending`, `confirmed`
- `space_type`: `sala`, `local`, `exterior`, `estudio`, `otro`

## Tables

| Table | Owner block | Purpose | Personal data |
|---|---|---|---|
| `registry_entities` | onboarding | Imported municipal register, used ONLY to verify numbers | names of registered entities (public open data) |
| `organization_verifications` | onboarding | Which organization claimed which registry number | no |
| `terms_acceptances` | onboarding | Who accepted which version of terms/privacy, when, age declaration | user id |
| `organizations` | organizations | Public profile of associations and professionals | contact fields chosen by the organization (public by design) |
| `memberships` | auth | Which user manages which organization | user id |
| `events` | events | Events and recurrence rules | no (images may show people: uploader declares rights) |
| `event_organizers` | events | Owner and co-organizers of an event | no |
| `threads` | threads | Connections between two associations | no |
| `invites` | invites | Personal invitation links | user id of creator |
| `spaces` | spaces | Spaces offered by associations (logged-in only) | contact chosen by the association |
| `neighborhoods` | map | Official Madrid barrios with boundaries (open data) | no |
| `geocode_cache` | lib (shared) | Cache of Nominatim results | addresses (not linked to people) |
| `rate_limits` | lib (shared) | Counters for anti-abuse limits | hashed key only, never raw IP or email |

### registry_entities (private)
`registry_number text primary key` (normalized: uppercase, no spaces), `name text`, `district text`, `source_updated_at date`.
RLS enabled, **no policies** for `anon`/`authenticated`. Read only by `claim_association()`.
Filled by `scripts/import-registry.ts` (server, secret key) from the city open-data file. Attribution in `/legal`.

### organization_verifications (private)
`organization_id uuid primary key references organizations on delete cascade`, `registry_number text unique not null`, `verified_at timestamptz`.
RLS enabled, no policies.

### terms_acceptances (private to the user)
`user_id uuid references auth.users on delete cascade`, `terms_version text`, `privacy_version text`, `age_confirmed boolean not null`, `accepted_at timestamptz default now()`.
RLS: `select` own rows. Inserted only by `claim_association()` / `create_professional()`.

### organizations (public profile)
`id`, `kind org_kind not null`, `slug text unique not null` (never changes), `name text not null (≤120)`, `one_liner text (≤120)`,
`when_to_visit text (≤120)`, `contact_email text`, `contact_phone text`, `contact_url text` (http/https only, check constraint),
`address text`, `location geography(Point,4326)` (null = no pin), `neighborhood_id uuid references neighborhoods`,
`usual_category event_category`, `seeking_offering text (≤200)` (professionals), `indexable boolean default true`
(professionals' "Mostrar mi perfil en Google"; associations always true), `verified boolean default false`,
`last_activity_at timestamptz default now()`, `created_at`, `updated_at`.
- Constraint: `kind = 'professional'` ⇒ `location is null` (professionals never get their own pin).
- RLS: `select` to `anon, authenticated` (all rows: it is a public directory).
  No `insert` policy (created by functions). `update` only if `exists (select 1 from memberships m where m.organization_id = id and m.user_id = (select auth.uid()))`.
- Column privileges: `revoke update on organizations from authenticated; grant update (name, one_liner, when_to_visit, contact_email, contact_phone, contact_url, address, location, usual_category, seeking_offering, indexable) on organizations to authenticated;` — so users can never change `kind`, `slug`, `verified`, `last_activity_at`.
- Triggers: set `neighborhood_id` from `location` (PostGIS `ST_Covers` on `neighborhoods.boundary`); bump `last_activity_at` on profile update.

### memberships
`user_id uuid references auth.users on delete cascade`, `organization_id uuid references organizations on delete cascade`, `role text check (role = 'owner')`, `created_at`, primary key (`user_id`, `organization_id`).
RLS: `select` own rows only. No insert/update/delete policies (functions only). One user = one organization in v1.

### events
`id`, `slug text unique not null`, `title text not null (≤120)`, `description text (≤500)`, `category event_category not null`,
`price_type price_type not null default 'free'`, `price_amount numeric(8,2)` (required iff `paid`),
`starts_at timestamptz not null`, `ends_at timestamptz not null` (check `ends_at > starts_at`, max 24 h),
`recurrence recurrence not null default 'none'`, `recurrence_until date` (required iff recurring, ≤ 6 months after `starts_at`),
`venue_name text`, `address text not null`, `location geography(Point,4326) not null`, `neighborhood_id uuid references neighborhoods`,
`image_path text` (path in bucket `event-images`), `owner_org uuid not null references organizations on delete cascade`,
`created_at`, `updated_at`.
- RLS: `select` to `anon, authenticated` (archive included: past events are not secret, they just leave the map).
  `insert` if the user is a member of `owner_org`. The action calls `check_rate_limit('event:' || owner_org, 20, interval '1 day')` before inserting (never inside a policy: policies must have no side effects).
  `update`/`delete` only members of `owner_org`.
- Triggers: set `neighborhood_id` from `location`; on insert/update bump `organizations.last_activity_at` for all organizers;
  on insert add the `owner_org` row to `event_organizers`.
- Indexes: `starts_at`, `owner_org`, GIST on `location`.
- Open formats later (flag `openFeeds`): `id`, `slug` and `updated_at` are stable, so iCal/JSON/ActivityPub can be added without schema changes.

### event_organizers
`event_id uuid references events on delete cascade`, `organization_id uuid references organizations on delete cascade`, `role text check (role in ('owner','co'))`, primary key (`event_id`, `organization_id`).
RLS: `select` public. `insert` of `co` rows by members of the event's `owner_org`. `delete` of a `co` row by members of the owner org OR by members of that co-organizer (leaving).

### threads
`id`, `proposer_org uuid references organizations on delete cascade`, `receiver_org uuid references organizations on delete cascade`,
`status thread_status not null default 'pending'`, `story_proposer text (≤300) not null`, `story_receiver text (≤300)`,
`color_seed smallint not null default floor(random()*4)::smallint`, `created_at`, `confirmed_at timestamptz`,
`expires_at timestamptz not null default now() + interval '60 days'`.
- Constraints: `proposer_org <> receiver_org`; unique pair regardless of direction (unique index on `least(...), greatest(...)`); both organizations must be `association` (trigger).
- RLS:
  - `select` to `anon, authenticated` where `status = 'confirmed'`;
  - `select` to `authenticated` where `status = 'pending' and expires_at > now()` and the user is a member of `proposer_org` or `receiver_org`;
  - `insert` by members of `proposer_org` (status must be `pending`);
  - `update` by members of `receiver_org` to accept (`pending → confirmed`, sets `confirmed_at`) and to edit `story_receiver`; by members of `proposer_org` to edit `story_proposer`. Enforced by a trigger that rejects any other column change.
  - `delete` by members of either side.
- Expiry needs no cron: expired pending threads are invisible by policy and can be purged later.

### invites
`id`, `token text unique not null default encode(extensions.gen_random_bytes(18), 'base64url')`, `organization_id uuid references organizations on delete cascade`,
`created_by uuid references auth.users on delete set null`, `created_at`, `expires_at default now() + interval '30 days'`, `used_at timestamptz`, `used_by_org uuid references organizations on delete set null`.
RLS: `select`/`insert` by members of `organization_id`. Public landing reads only through `get_invite(token)`.
Limit: the action calls `check_rate_limit('invite:' || organization_id, 20, interval '1 day')` before inserting.

### spaces
`id`, `organization_id uuid references organizations on delete cascade` (must be `association`, trigger), `space_type space_type`, `neighborhood_id uuid references neighborhoods`,
`price_type price_type` (only `free` or `paid`), `description text (≤300)`, `contact text (≤200)`, `created_at`, `updated_at`.
RLS: `select` to `authenticated` only. `insert`/`update`/`delete` by members of `organization_id`.

### neighborhoods
`id`, `slug text unique`, `name text`, `district text`, `boundary geography(MultiPolygon,4326)`, `centroid geography(Point,4326)`.
RLS: `select` public. Filled once by `scripts/import-neighborhoods.ts` from the city open-data boundaries. Attribution in `/legal`.

### geocode_cache
`query_normalized text primary key`, `location geography(Point,4326)`, `display_name text`, `created_at`.
RLS enabled, no policies. Read/written only by `src/lib/domain/geocode.ts` (server-only, secret key).

### rate_limits
`key text`, `window_start timestamptz`, `count int`, primary key (`key`, `window_start`). RLS enabled, no policies.
Keys are never raw personal data: use organization ids, or `sha256(ip || daily_salt)` for anonymous sign-up attempts.

## Storage
Bucket `event-images`: public read. Object path `"{organization_id}/{event_id}.webp"`.
Insert/update/delete policy: `(storage.foldername(name))[1]::uuid` is an organization the user is a member of.
Files are uploaded only by the server action after `sharp` re-encodes to WebP, max 1600 px, metadata stripped.
Deleting rows does not delete files: actions delete files through the Storage API first.

## Views (read models) — all `with (security_invoker = true)`
- `map_items`: one row per thing that can light up on the map in the window `[now(), now() + 7 days]`:
  - event occurrences from `public.event_occurrences(now(), now() + interval '7 days')` that have not ended,
    with `item_type = 'event'`, slug, title, category, price_type, price_amount, occ_start, occ_end, venue_name, address,
    lng/lat, neighborhood slug, organizer names (`string_agg` ordered: owner first);
  - associations with a location, with `item_type = 'organization'`, slug, name, lng/lat, `last_activity_at`.
  The light state is computed in TypeScript by `getLightState(item, now)` (pure, unit-tested).
- `connection_lines`: confirmed threads with both organizations' slug, name, lng/lat, both stories, `color_seed`.
  Because it is `security_invoker`, `pending` threads never appear for `anon` or third parties (pgTAP test).

## Functions
| Function | Kind | What it does |
|---|---|---|
| `event_occurrences(p_from, p_to)` | SQL, security invoker | Expands recurrences into `(event_id, occ_start, occ_end)`. **Computes in local time** (`(starts_at at time zone 'Europe/Madrid') + k * interval '1 week'`, then back to `timestamptz`) so 19:00 stays 19:00 across daylight-saving changes. Monthly uses `start + k months` from the original date (no drift). The single implementation of recurrence: TypeScript never re-implements it. |
| `claim_association(p_registry_number, p_name, p_terms_version, p_privacy_version, p_age_confirmed, p_invite_token default null)` | security definer | Requires `auth.uid()`; normalizes the number; checks it exists in `registry_entities` and is unused; creates organization (`verified = true`, unique slug), verification row, membership, terms acceptance; marks the invite used. All or nothing. Returns the slug or a coded error (`not_found`, `already_claimed`, `already_member`). |
| `create_professional(p_name, p_one_liner, p_terms_version, p_privacy_version, p_age_confirmed, p_invite_token default null)` | security definer | Same pattern for professionals. |
| `get_invite(p_token)` | security definer | Returns only the inviter organization's name and slug if the token is valid and unused. |
| `export_my_data()` | security definer | Returns a `jsonb` with the user's email, memberships, terms acceptances, and everything their organization published. |
| `delete_my_account()` | security definer | Deletes the user's organization if they are its only member (cascades events, organizers, threads, invites, spaces, verification), then `auth.users` row. The action deletes Storage files first. |
| `check_rate_limit(p_key, p_max, p_window)` | security definer | Increments the counter for the current window and returns `false` when over the limit. |
| `make_unique_slug(p_text, p_table)` | security definer | `unaccent`, lowercase, hyphens, max 60 chars, numeric suffix on collision. Used only at creation. |

## Tests that must exist (pgTAP, `supabase/tests/`)
1. `anon` cannot read `registry_entities`, `organization_verifications`, `terms_acceptances`, `geocode_cache`, `rate_limits`.
2. `anon` cannot insert/update/delete anything.
3. A member of A cannot update B's organization, events, spaces, or threads stories.
4. A user cannot change `kind`, `slug`, `verified` or `last_activity_at` of their own organization.
5. A `pending` thread is visible to A and B only, also through `connection_lines`.
6. `claim_association` with an unknown number fails; with a used number fails; with a valid one creates exactly one org + membership.
7. `event_occurrences` keeps 19:00 local across the last Sunday of March and October; monthly from the 31st does not drift.
8. `delete_my_account` leaves no row referencing the user.
9. Every view in `public` has `security_invoker = true` (query `pg_class.reloptions`).
10. Every table in `public` has RLS enabled (query `pg_tables.rowsecurity`).

## Schema change rules
- New migration per change; merged migrations are immutable.
- Rename/remove = expand (add new) → migrate (backfill, switch code) → contract (drop old), in three PRs.
- After every migration: `npm run db:types` and commit the generated types in the same PR.
