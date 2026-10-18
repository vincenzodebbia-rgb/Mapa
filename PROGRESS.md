# Progress

Updated by the agent at the end of every session. Newest first.

## Status
- Fase: sessione 2 (database) fatta sul ramo `feat/database`, non ancora pushato, nessuna PR.

## Done
### 2026-10-18 — Sessione 2: database
- Decisioni sull'iscrizione applicate a DATA_MODEL, SPEC, PRIVACY_AND_OWNERSHIP, glossary, operations, BUILD_PLAN
  (sessione 5); documento spostato in `docs/decisioni/2026-10-iscrizione.md`. Correzioni del fondatore: i `venue`
  pubblicano `spaces`; NIF solo in formato da ente (mai DNI/NIE); domande obbligatorie per i `venue`, facoltative per le `association`.
- `vercel.json` con `regions: ["fra1"]`. `supabase init` (config.toml; `.temp` fuori da git).
- 12 migrazioni applicate a mapa-dev (`db push` non ha chiesto password): enum, neighborhoods, organizations e tabelle
  dell'iscrizione, events, threads, invites, spaces, geocode_cache/rate_limits, app_admins/moderation_actions,
  funzioni, viste `map_items`/`connection_lines`, bucket `event-images`. Helper interni nello schema `private` (non esposto).
- Grant per colonna: l'utente non può mai scrivere `kind`, `slug`, `verified`, `entry_method`, `status`,
  `flagged_for_review`, `last_reviewed_at`, `last_activity_at`; anon non ha nessun grant di scrittura.
  `lookup_municipal_association` e `check_rate_limit` sono solo per `service_role` (le action le chiamano con il client admin).
- `src/lib/database.types.ts` generato da mapa-dev.
- Seed fittizia applicata a mapa-dev (`db push --include-seed`): 10 organizzazioni (1 sospesa, 1 "faint", 1 espacio
  segnalato), 15 eventi (7 settimanali, uno per giorno della settimana: la mappa resta viva circa 6 mesi), 7 fili.
- 12 file pgTAP (i 16 controlli di DATA_MODEL + extra): **tutti verdi su mapa-dev**, 152 asserzioni. Eseguiti senza Docker con
  `npx supabase db query --linked -f`: ogni `select <test>` scrive in una tabella temporanea e il file finisce con
  `raise exception` che riporta i risultati e annulla la transazione (dopo i test mapa-dev aveva 0 righe).
- Workflow `.github/workflows/db-test.yml`: `supabase start` + `supabase test db` nel runner, senza segreti. Non ancora
  provato (parte al primo push del ramo).
- Security Advisor di mapa-dev: nessun errore. Solo avvisi attesi: RPC `security definer` chiamabili da utenti
  (ognuna controlla `auth.uid()` o `is_admin()`), e "multiple permissive policies" su `threads` (performance, trascurabile).

## Done (sessioni precedenti)
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
- Fondatore: push di `feat/database`, PR, controllare che `db-test` sia verde in Actions; poi aggiungerlo ai check
  obbligatori del ruleset. Dopo il primo login su mapa-dev: aggiungersi ad `app_admins` (`docs/operations.md`).
- Sessione 3 — mappa "Hoy" (la seed su mapa-dev è pronta).

## Domande aperte (sessione 5)
- **Espacio gestito da un autonomo con solo NIF personale** (DNI/NIE): oggi non può iscriversi, perché il NIF accetta solo il
  formato degli enti. Come entra? (es. solo con invito, o come `professional`, o con un altro documento non personale).
- Associazione fuori dall'elenco del Comune e senza invito: entra con o senza avviso al fondatore
  (`register_entity`, commento `DA DECIDERE (sessione 5)`; nessuna migrazione serve oltre a quella riga).
- Categoria del Comune "Comerciantes, empresarios, profesionales y autónomos": come trattarla all'import.

## Known issues
- I client Supabase in `src/lib/supabase/` restano senza il tipo `Database`: AGENTS.md permette di importare
  `database.types.ts` solo in `data.ts` e `actions.ts`. Da decidere con il fondatore se fare un'eccezione per `src/lib/supabase/`.
- `moderate_organization` restituisce come destinatario della motivazione il `contact_email` pubblico o, se manca,
  l'email di accesso di un membro: è un dato personale che arriva solo all'action dell'admin (obbligo DSA).
- CSP allows `'unsafe-inline'` scripts (docs/adr/0007-csp-unsafe-inline.md). Revisit when Next.js SRI is stable.
- Without jq every Edit/Write is blocked by `protect-files.sh` (by design). jq lives in `~/.local/bin`.
- `npm audit`: 5 high in dev-only tooling (`braces` via `eslint-config-next` → `fast-glob`). Not shipped to
  the browser or server. npm's "fix" downgrades to Next 14: do not apply; wait for an upstream release.
- `next build` and `next typegen` fail fast if `NEXT_PUBLIC_SUPABASE_URL` is missing: CI needs the Actions
  variables above before the PR can be green.
- Playwright browsers are not downloaded yet (`npx playwright install` in session 3).
