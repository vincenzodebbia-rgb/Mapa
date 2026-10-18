# Operations

## Accounts (all owned by the founder, 2FA on, recovery codes offline)
GitHub (repo), Supabase (mapa-dev, mapa-prod, EU region), Vercel (project, functions region fra1),
Cloudflare (Turnstile), domain registrar (after the name is chosen), project email.
Nobody else — human or AI — holds production keys. The CI holds only what db-deploy.yml needs.

## Environments
- dev: Supabase mapa-dev ← Vercel Preview deployments and local development. Claude may touch it.
- prod: Supabase mapa-prod ← Vercel Production. Migrated only by .github/workflows/db-deploy.yml.
- Free plan: a Supabase project pauses after ~7 days without activity; resume it from the dashboard.

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
