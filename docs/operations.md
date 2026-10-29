# Operations

## Accounts (all owned by the founder, 2FA on, recovery codes offline)
GitHub (repo), Supabase (mapa-dev, mapa-prod, EU region), Vercel (project, functions region fra1),
Cloudflare (Turnstile), domain registrar (after the name is chosen), project email.
Nobody else — human or AI — holds production keys. The CI holds only what db-deploy.yml needs.

## Environments
- dev: Supabase mapa-dev ← Vercel Preview deployments and local development. Claude may touch it.
- prod: Supabase mapa-prod ← Vercel Production. Migrated only by .github/workflows/db-deploy.yml.
- Free plan: a Supabase project pauses after ~7 days without activity; resume it from the dashboard.
- demo: Vercel project `mapa-demo` (same repository) with the **mapa-dev** variables in Production plus
  `NEXT_PUBLIC_DEMO=1`. Only the exact value `1` counts. It turns on the banner "Demo · datos de ejemplo",
  `noindex, nofollow` on every response (`X-Robots-Tag` header + meta) and an empty sitemap. robots.txt has no
  `Disallow`, on purpose: crawlers must get in to read the noindex. The value is baked in at build: redeploy after
  changing it. Never set it on the real project or on Preview. Test: `npm run e2e:demo` (stop `npm run dev` first).

## Production migrations (.github/workflows/db-deploy.yml)
Runs on every merge to `main` that touches `supabase/migrations/`, or by hand: Actions → db-deploy → Run workflow.
It uses no Supabase access token and no `supabase link`: it builds the database URL inside the job
(session pooler, port 5432, user `postgres.<ref>`, password URL-encoded and masked) and pushes with it.
Set these in GitHub → Settings → Environments → **production** (the job uses `environment: production`):

| Name | Kind | Value |
|---|---|---|
| `PROD_PROJECT_REF` | secret | mapa-prod project ref (Project Settings → General) |
| `PROD_DB_PASSWORD` | secret | mapa-prod database password (raw, not encoded: the workflow encodes it) |
| `PROD_POOLER_HOST` | variable | host of the **Session pooler** (Connect → Session pooler), e.g. `aws-0-eu-central-1.pooler.supabase.com` |

`SUPABASE_ACCESS_TOKEN` is no longer needed: delete it from GitHub and revoke it in Supabase → Account → Access Tokens.
If the database password is rotated, update `PROD_DB_PASSWORD` the same day.

## Admin access for profile review (once per project)
`app_admins` decides who can open the private review page. It is never set from the app and never stored in `user_metadata`.
1. Log in once with the magic link on the site that uses the project (mapa-dev: preview/local; mapa-prod: production).
2. Supabase dashboard → the project → SQL Editor → run (with your own login email):
   `insert into public.app_admins (user_id) select id from auth.users where email = 'your@email';`
3. Check: `select count(*) from public.app_admins;` returns 1.
This is data, not schema, so the "no dashboard schema changes" rule does not apply. Do it on mapa-dev and on mapa-prod separately.
To remove access: `delete from public.app_admins where user_id = '<id>';`.

## Backups
The Free plan has no automatic backups. Backups contain personal data:
NEVER store them in this public repository, its Actions artifacts or logs.
Option A (free): a separate PRIVATE repository with a scheduled workflow that runs `supabase db dump`
against prod, encrypts the file with `age` (public key in the workflow, private key only offline with the founder)
and keeps the last 30 files. Option B: Supabase Pro (daily backups, 7 days).
Test a restore into mapa-dev once a quarter.

## Incident (data breach or leaked key)
1. Rotate the leaked key immediately (Supabase → API keys; Vercel env; GitHub secrets).
2. Write down what happened, when, which data, how many people.
3. If personal data may be exposed and there is a risk for people: notify the AEPD within 72 hours
   (sede.agpd.gob.es) and, if the risk is high, tell the affected users.
4. Fix the cause, add a test that would have caught it, write an ADR.

## Removing illegal content (DSA)
Notices arrive at the address in brand.illegalContentEmail. Act quickly on clear cases, keep a note of the
notice and decision, and send the organization the standard statement of reasons (messages/es.json → legal.removal).
