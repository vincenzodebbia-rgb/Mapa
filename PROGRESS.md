# Progress

Updated by the agent at the end of every session. Newest first.

## Status
- Fase: sessione 4 (pagine pubbliche) fatta sul ramo `feat/public-pages`; PR in bozza aperta dal fondatore.
  Migrazioni applicate a mapa-dev dal fondatore (CLI 2.122.0). Dopo: punto demo privata.

## Done
### 2026-10-22/25 — Sessione 4: pagine pubbliche e Google
- **Barrios ufficiali:** `scripts/import-neighborhoods.ts` scarica `Barrios.zip` dal geoportale del Comune (shapefile,
  EPSG:25830, CC BY 4.0) e GENERA la migrazione `neighborhoods_official` (131 barrios; PostGIS trasforma in WGS84,
  upsert per slug, ricalcolo del barrio di organizzazioni ed eventi). Nessuna dipendenza nuova (zip, dbf e shp letti a mano, testati).
- Migrazione `org_logo_story`: `logo_path` (solo `{id}/logo.webp`), `story` (≤1000), bucket `org-logos` con le policy di
  `event-images`. `reencodeLogo` (sharp): WebP ≤256×256 senza metadati; test con un JPEG che contiene davvero il GPS.
  Il caricamento arriva con "Mi ficha" (sessione 7).
- Migrazione `public_pages`: viste `upcoming_events` (60 giorni), `neighborhood_pages` (`has_content`), `neighborhood_neighbors`
  (5 m di tolleranza) e funzione `event_schedule` (prossima occorrenza e fine dell'ultima). Test pgTAP 14 e 15.
- pgTAP 1-15 su mapa-dev in transazione annullata: **182/182 ok**. Ogni asserzione scrive in una tabella temporanea,
  il file finisce con `raise exception` che riporta i risultati (la tabella `__tresults__` di pgTAP qui non esiste).
- Seed rieseguibile (cancella solo `5eed0000-…` e i NIF `G99…`), punti calcolati dentro i barrios veri, eventi singoli
  nei 30 giorni dopo il caricamento. Ricaricata su mapa-dev il 25/10: 12 organizzazioni, 24 eventi, 8 barrios con contenuto.
- Pagine `/a/[slug]`, `/e/[slug]`, `/barrio/[slug]`: letture come anon con `createSupabasePublicClient()` (senza cookie) in
  `'use cache'`, `ensureStatic = 'navigation'` + `instant = false` + `generateStaticParams` con un segnaposto non valido
  (`__`): il build non legge il database, la pagina si genera intera al primo accesso, quindi **404 e redirect 308 sono veri**
  (verificati con curl e con Playwright). `/que-es` e `/legal` con testi provvisori e attribuzioni.
- SEO: metadati in spagnolo, canonical, Open Graph solo testo (nessuna immagine), JSON-LD `Event`/`Organization`/
  `BreadcrumbList` resi come figlio di `<script>` (React 19 non tocca virgolette né `&`; `<` → `<`; nessun
  `dangerouslySetInnerHTML`, nessun ADR), `sitemap.ts` (solo pagine indicizzabili, letta a richiesta) e `robots.ts`.
- Compartir: Web Share API dove esiste, link WhatsApp e copia sempre.
- `NEXT_PUBLIC_SITE_URL` non blocca più build e CI: `getSiteUrl()` → variabile, dominio di produzione Vercel, URL del
  deployment, `localhost:3000`.
- PostgREST restituisce le colonne geography in EWKB esadecimale: `parseEwkbPoint` in `src/lib/domain/geo.ts`.
- Playwright: 11 test verdi (4 della mappa + 7 delle pagine pubbliche).

### 2026-10-21/22 — Sessione 3: mappa Hoy e Conexiones
- Revisione del fondatore del 21 ottobre applicata a SPEC e BUILD_PLAN (tutte le sessioni), glossary, DESIGN_HANDOFF,
  CLAUDE.md dei blocchi map ed events; documento in `docs/decisioni/2026-10-revisione-sezioni.md`. Flag `threads` spento.
- **next-intl tolto** (ADR 0008): Smart App Control blocca `@swc/core`, che il plugin carica sempre; dev, build e typecheck
  fallivano. Al suo posto `t()` in `src/lib/i18n/t.ts` (server-only, chiavi controllate dal typecheck, `{variabili}`).
- Migrazione `20261021223424_map_filters` (applicata dal fondatore a mapa-dev): `map_items.organizer_kinds`, punti di
  Conexiones solo per organizzazioni attive, vista `map_neighborhoods` (centro e riquadro dei barrios). Test pgTAP 13.
  Tutti i 13 file pgTAP verdi su mapa-dev (172 asserzioni, transazioni annullate). Tipi rigenerati.
- Blocco `map`: `data.ts`, `schema.ts` (filtri nell'URL), funzioni pure con test (`light-state`, `filter-events`,
  `to-geojson`, `build-popup` con happy-dom), un solo componente MapLibre (`map-view.tsx`) caricato da `map-view-loader.tsx`,
  `HoyView` e `ConexionesView`, legenda, filtri (`next/form`, funzionano anche senza JS), "Solo hoy", vista elenco.
- `/` = Hoy (solo eventi, pulse/lit), `/conexiones` = chi c'è (senza fili). Nuova primitiva `Select` in `src/components/ui`.
- MapLibre 6 + Turbopack: il worker va indicato con `setWorkerUrl(new URL(..., import.meta.url))`, altrimenti 404.
- Playwright: 4 test verdi su `next dev` e su `next build && next start` (punti disegnati = elementi dell'elenco, Solo hoy,
  Conexiones, filtri sbagliati nell'URL). Chromium di Playwright installato su questo PC.
- Nuova dipendenza dev: `happy-dom` (DOM per i test di `build-popup`). Tolte: `next-intl` (e con lei `@swc/core`).

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
- `src/lib/database.types.ts` generato da mapa-dev; i client in `src/lib/supabase/` sono tipizzati con `Database`
  (eccezione approvata, scritta in AGENTS.md). Componenti e pagine ricevono DTO.
- Comandi database bloccati: nuovo hook `.claude/hooks/protect-commands.sh` (db push/reset, link, login, projects, secrets,
  orgs, `--project-ref`, `--db-url`, Management API, `supabase/.temp`), `protect-files.sh` blocca `supabase/.temp/**` e ora
  normalizza i percorsi Windows (`C:\`, `c:/`, `/c/`): prima una grafia diversa poteva far saltare i blocchi in silenzio.
  `db push` e `link` passano da "ask" a "deny". Il push su mapa-dev lo lancia solo il fondatore.
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
- Fondatore: PR di `feat/public-pages` con CI verde (anche `db-test` con i test 14-15), `@architecture-reviewer`,
  anteprima Vercel dal telefono (`/a/…`, `/e/…`, `/barrio/opanel`, `/sitemap.xml`).
- `NEXT_PUBLIC_SITE_URL`: Vercel `mapa` Production = `https://<dominio>` quando ci sarà (fino ad allora vuota va bene,
  si usa il dominio `*.vercel.app`); Preview: non impostarla; `mapa-demo` Production: facoltativa; GitHub Actions: non serve.
- Punto demo privata (BUILD_PLAN): banner "Demo · datos de ejemplo" dietro flag, progetto Vercel `mapa-demo`.
- Sessione 7: caricamento del logo con `reencodeLogo` e `updateTag(ORGANIZATIONS_TAG)`; sessione 6: `updateTag(EVENTS_TAG)`.

## Domande aperte (sessione 5)
- **Espacio gestito da un autonomo con solo NIF personale** (DNI/NIE): oggi non può iscriversi, perché il NIF accetta solo il
  formato degli enti. Come entra? (es. solo con invito, o come `professional`, o con un altro documento non personale).
- Associazione fuori dall'elenco del Comune e senza invito: entra con o senza avviso al fondatore
  (`register_entity`, commento `DA DECIDERE (sessione 5)`; nessuna migrazione serve oltre a quella riga).
- Categoria del Comune "Comerciantes, empresarios, profesionales y autónomos": come trattarla all'import.

## Regole per la sessione 5 (decise dal fondatore)
- L'email restituita da `moderate_organization` serve **solo** all'action per inviare la motivazione all'organizzazione:
  non va mai mostrata nell'interfaccia, né restituita al client, né scritta nei log.
- Le email alle organizzazioni (motivazioni, avvisi, ecc.) partono **sempre** da un indirizzo del progetto sul dominio
  definitivo, **mai** da un'email personale.

## Known issues
- `moderate_organization` restituisce come destinatario della motivazione il `contact_email` pubblico o, se manca,
  l'email di accesso di un membro: è un dato personale che arriva solo all'action dell'admin (obbligo DSA).
- `protect-commands.sh` legge solo il testo del comando: non vede dentro script lanciati da file (`bash x.sh`).
  `settings.local.json` contiene ancora un permesso generico `Bash(npx supabase *)`: lo copre il `deny` + l'hook,
  ma il fondatore può toglierlo.
- CSP allows `'unsafe-inline'` scripts (docs/adr/0007-csp-unsafe-inline.md). Revisit when Next.js SRI is stable.
- Without jq every Edit/Write is blocked by `protect-files.sh` (by design). jq lives in `~/.local/bin`.
- `npm audit`: 5 high in dev-only tooling (`braces` via `eslint-config-next` → `fast-glob`). Not shipped to
  the browser or server. npm's "fix" downgrades to Next 14: do not apply; wait for an upstream release.
- `next build` and `next typegen` fail fast if `NEXT_PUBLIC_SUPABASE_URL` is missing: CI needs the Actions
  variables above before the PR can be green.
- Playwright: su questo PC c'è solo Chromium (`npx playwright install chromium`). Gli e2e non girano in CI (serve
  la seed di mapa-dev): da decidere prima del lancio.
- Seed su mapa-dev: gli eventi singoli coprono i 30 giorni dopo l'ultimo caricamento (25/10); settimanali e mensile
  ~6 mesi. Prima della demo (o se la mappa si svuota) rilanciare `npx supabase db query --linked -f supabase/seed.sql`:
  tocca solo i dati fittizi, ma cancella anche le membership verso le organizzazioni fittizie (da riaggiungere a mano).
- Le pagine pubbliche sono in cache per minuti (`cacheLife("minutes")`): una modifica fatta direttamente nel database
  compare dopo al massimo qualche minuto. Le action future devono chiamare `updateTag`.
- Su un'anteprima Vercel (Preview) il link di "Compartir" e il canonical puntano al dominio di produzione (valore di
  riserva di `getSiteUrl()`); le anteprime hanno comunque `noindex` da Vercel.
- `event_schedule` e `neighborhood_pages` espandono le occorrenze di tutti gli eventi: va bene con pochi eventi; se
  diventa lento, aggiungere un filtro per evento a `event_occurrences`.
- Nessun logo nella seed: il rendering del logo (`next/image` `unoptimized` dallo Storage) non è ancora provato dal vivo.
- SPEC §16.7 (titolo `<img onerror>` come testo) è coperto dai test di `build-popup` e `JsonLd`, non da un e2e: nella seed
  non c'è un titolo così (si potrà fare con il modulo eventi, sessione 6).
- Il server di anteprima del pannello browser dell'app Claude non raggiunge Supabase (`fetch failed`); `npm run dev` dal
  terminale sì. Per provare la mappa: avviare il dev server dal terminale.
- Il form dei filtri mette nell'URL anche i campi vuoti (`?precio=&cat=musica`): vengono ignorati, solo estetica.
- Dal processo dell'agente la CLI Supabase a volte non vede il login (salvato nel Gestore credenziali di Windows); con la
  2.122.0 il 25/10 ha funzionato. La 2.121.0 falliva con `failed to initialise login role: TransportError`.
