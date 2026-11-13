# Progress

Updated by the agent at the end of every session. Newest first.

## Status
- Fase: **sessione 5 finita nel codice** sul ramo `feat/onboarding` (pushato il 5/11 fino a `3203a77`; i due commit della
  notte del 5/11 sono **solo locali**). Manca la prova vera: un'associazione di prova si registra **dal telefono** con il link
  magico ricevuto per email e arriva a `/panel` (chiusura della sessione 5 in BUILD_PLAN). Poi PR con CI.
- Piano della sessione 6 scritto (senza codice) in `docs/piani/sessione-6.md`, con 13 punti da decidere (D1–D13).
- Correzioni di sicurezza A1, M1, M5 nella PR in bozza #17: migrazione `20261110211136_security_a1_m1_m5` applicata a
  mapa-dev dal fondatore il 13/11. Tipi rigenerati (nessuna differenza), check, deps ed e2e 20/20 verdi; in CI check,
  secrets-scan e db-test (pgTAP 1–17) verdi.

## Done
### 2026-11-11 — Dopo il rapporto A1/M1/M5 (decisioni del fondatore)
- CLI Supabase fissata a `2.122.0` come devDependency esatta: `npx supabase` usa sempre quella.
- Tasto di rivendicazione su tutte le schede: "¿Es tu asociación?", "¿Es tu espacio?", "¿Es tu perfil?" (`claim.*` per
  `kind`); nell'errore del NIF già registrato il testo segue il tipo (entità o attività commerciale). Mai il NIF.
- Nessun avviso al fondatore per le associazioni dell'elenco (resta com'è).
- Rapporto di sicurezza: nuovi punti B11–B14 da rivedere prima del lancio.
- check verde (146 test), deps verde, e2e 19/20 (stesso rosso: migrazione non ancora su mapa-dev).

### 2026-11-10 — Correzioni di sicurezza A1, M1, M5 (docs/rapporti/sicurezza-2026-11.md)
- A1 (decisione del fondatore, `docs/decisioni/2026-11-10-verifica.md`): niente più "Verificada en el registro municipal".
  `verified` tolto dal DTO e dalla scheda; nel database `revoke select (verified)` da anon/authenticated, tutte le righe a
  `false`, `register_entity` non lo accende più. `entry_method = 'municipal_registry'` resta come dato interno.
  Pulsante "¿Es tu asociación?" (mailto a `brand.contactEmail`, nome della scheda nell'oggetto, mai il NIF) nella scheda
  delle associazioni e sotto l'errore "Este NIF ya está registrado". Helper condiviso `src/lib/claim-contact.ts`.
- M1: trigger `events_rate_limit` (20 eventi al giorno per organizzazione, chiave `db:event:<org>`), vale anche per gli
  insert diretti via API. M5: tetto di 60 nuove organizzazioni all'ora in tutto il sito in `register_entity` e
  `create_professional` (chiave `db:new-organizations`). Errore `rate_limited` → "Demasiados intentos".
- Test: pgTAP 17 nuovo; 07 e 16 aggiornati (`verified` ora `false`, contatore M5 azzerato nella transazione); Vitest
  `claim-contact.test.ts` e `rate_limited` nel mapper; e2e: niente "verificada" nella scheda, link "¿Es tu asociación?".
- check verde (145 test), deps verde, e2e 18/19: l'unico rosso aspetta la migrazione su mapa-dev (vedi Known issues).

### 2026-11-05 (notte, in autonomia) — Commenti in italiano e piano della sessione 6
- Tutti i commenti del codice tradotti in italiano (regola di AGENTS.md): `src/`, `scripts/`, `e2e/`, file di configurazione
  e `globals.css`, 120 file. Codice, nomi e testi dell'interfaccia invariati: verificato file per file ristampando il codice
  con il compilatore TypeScript senza commenti (identico prima e dopo), per il CSS togliendo i commenti.
  Non toccati: migrazioni già unite (immutabili; quelle nuove erano già in italiano), `database.types.ts` (generato),
  hook in `.claude/hooks/` e CI (configurazione protetta), i `CLAUDE.md` dei blocchi (documenti in inglese, non commenti: da
  decidere se tradurli).
- check (142 test), deps, build ed e2e (19/19) verdi dopo la traduzione.
- `docs/piani/sessione-6.md`: piano dettagliato della sessione 6 (pagine, modulo in 4 blocchi, file per blocco, database,
  test, ordine di lavoro) e i punti da decidere con il fondatore.

### 2026-11-04/05 — Sessione 5 (seconda parte): accesso, iscrizione, revisione
- `src/lib`: `domain/nif.ts` (copia di `normalize_nif`, `is_personal_nif`, `nif_allowed_for`: un DNI/NIE non parte mai
  verso il database), `turnstile.ts` (fallisce chiuso, non invia l'IP a Cloudflare), `rate-limit.ts` (chiavi HMAC-SHA256
  con sale giornaliero ricavato dalla chiave secret: IP ed email mai in chiaro; nessuna variabile nuova),
  `geocode.ts` + `domain/geocode.ts` (Nominatim, User-Agent del progetto, cache in `geocode_cache`, 1 richiesta al secondo
  per processo, solo Comunidad de Madrid), `supabase/current-user.ts` (`getClaims()` + `connection()`),
  `legal-versions.ts` (`2026-11-provisional`), `cache-tags.ts` (`ORGANIZATIONS_TAG` condiviso).
- `components/ui`: `TurnstileWidget` (render esplicito, nuovo token a ogni tentativo) e `PointFieldProvider`
  (il punto lng/lat condiviso tra l'indirizzo del blocco onboarding e il pin del blocco map, senza import tra blocchi).
- **auth**: `/entrar` (Turnstile + 5 link all'ora per connessione + 3 all'ora per email; stessa risposta per ogni email),
  `/auth/confirm` (`token_hash` del template nuovo e `code` del link standard; poi sempre `/panel`, nessun `next`, nessun
  redirect aperto), "Salir". Il link torna sul sito che si sta usando (`origin` della richiesta + `/auth/confirm`).
- **onboarding**: `/registro` → anonimo: modulo email; con organizzazione: `/panel`; "¿Qué sois?" (form GET `?tipo=`,
  funziona senza JS); campi per tipo come SPEC §8; "¿Sois *nombre*?" (lookup 10 al giorno per connessione, client admin);
  "Buscar en el mapa" (30 all'ora per utente) e, senza JS, geocodifica all'invio; 5 tentativi all'ora per utente;
  una sola chiamata SQL; errori SQL tradotti in messaggi (`mapRegistrationDbError`). Inviti non ancora (sessione 7).
- **map**: secondo componente MapLibre `location-picker-map.tsx` (pin trascinabile, mappa limitata alla Comunidad de
  Madrid), passato come slot; worker in `maplibre-worker.ts`; CLAUDE.md del blocco aggiornato (due componenti).
- **account**: `/revision` solo per admin (gli altri ricevono 404), sola lettura, righe segnalate di `admin_review_list`
  con motivo, tipo, attività, barrio, web, risposte. Mai NIF né email. `noindex`.
- **organizations**: `getOrganizationForUser` per `/panel` provvisorio (nome, link alla scheda, Salir).
- `scripts/import-municipal-associations.ts`: CSV del Comune (dataset 206117), parser CSV a mano (virgolette doppie),
  solo 6 colonne, CIF uniti (categorie unite con ` | `), categoria Comerciantes saltata, CIF personali o malformati saltati.
  Prova a secco di default; `--write` (e `--prune`) solo con le chiavi di produzione: **rifiuta mapa-dev**.
  Prova a secco sul file del 24/10/2026: 3283 righe → 2986 associazioni, 109 unite, 157 Comerciantes, 27 senza CIF, 4 CIF non validi.
- Test: Vitest 142/142 (nuovi: NIF, Turnstile, rate limit, geocode, schema di auth e onboarding, script). Playwright
  19/19 con `workers: 1` (nuovi 6: associazione in elenco verificata fino a `/panel`; NIF già usato, personale, di un
  altro tipo; fuori elenco con avviso; commerciale senza NIF con pin e avviso `no_nif`; pagine private senza sessione;
  link non valido). Utenti creati con l'admin e cancellati a fine test; nessuna email inviata.
- `@architecture-reviewer`: prima STOP per 3 punti, tutti corretti: (1) l'e2e ora controlla `error` su ogni chiamata
  admin; (2) anche l'id utente nelle chiavi dei limiti passa per l'HMAC (DATA_MODEL `rate_limits` aggiornato);
  (3) l'e2e si rifiuta di girare se il progetto non è mapa-dev. Dopo le correzioni: check, deps, build, e2e verdi.

## Done (prima parte)
### 2026-10-30 — Sessione 5 (prima parte): iscrizione, schema
- Decisioni del 29 ottobre applicate a SPEC, DATA_MODEL, PRIVACY, glossary, BUILD_PLAN; documento in
  `docs/decisioni/2026-10-29-iscrizione.md` con le scelte del fondatore sul piano (A–F).
- **Mappatura** "¿Qué sois?" → `entity_type` → `kind` (un solo posto: `private.kind_for_entity_type`): asociación,
  fundación, cooperativa, entidad pública → `association`; actividad comercial → `venue`; gente que hace cosas → `professional`.
- Migrazione `20261030121852_entity_type`: enum `entity_type` e `flag_reason`; `organizations.entity_type` (privata, non
  modificabile) e `flag_reason` (privata); `organization_answers.what_they_offer` (`how_sustained` resta per le associazioni);
  NIF unico tranne P/Q/S (indice parziale); helper `is_personal_nif` e `nif_allowed_for` (G / G / F / P-Q-S / A-B-E-J);
  trigger: barrio scelto per i professionisti (`grant update (neighborhood_id)`, per gli altri si ricalcola sempre dal punto),
  motivo `doubtful_activity` quando l'avviso si accende cambiando attività. Righe esistenti riempite da `kind`.
- Migrazione `20261030121855_registration_v2`: `register_entity` nuova firma (tipo, NIF facoltativo solo per `commercial`,
  scheda completa, indirizzo + lng/lat obbligatori per `commercial`, punto solo dentro la Comunidad de Madrid →
  `invalid_location`), restituisce `(slug, flagged, flag_reason)`; avviso: fuori elenco `not_in_registry`, ente pubblico
  sempre `public_entity`, commerciale senza NIF `no_nif`, attività dubbia `doubtful_activity`, invito mai.
  `create_professional` con barrio (slug), contatti, Busco/Ofrezco, `indexable`. `admin_review_list` con tipo,
  `what_they_offer`, motivo. `mark_reviewed` azzera anche il motivo.
- pgTAP: 07 adattato (DNI/NIE → `personal_nif`; associazione fuori elenco ora segnalata), nuovo 16 (43 asserzioni).
  Prova a secco prima del push, ogni file in transazione annullata: **226/226 verdi**, mapa-dev pulito dopo.
- Dopo il push: tipi rigenerati; su mapa-dev 7 `association`, 3 `commercial` (1 segnalata), 2 `informal`.
  Seed aggiornata (risposte degli espacios in `what_they_offer`, motivo del club).
- Protezioni per la modalità automatica (commit separato): `protect-commands.sh` blocca ogni comando che nomina un file
  `.env*` (tranne `.env.example`) o carica dotenv; `settings.json` con allow/ask/deny nuovi; riga in AGENTS.md.
  Nota pratica: il blocco guarda il testo, quindi blocca anche messaggi di commit che nominano quei file.
- Prova a secco senza Docker (da rifare così): per ogni file di `supabase/tests/`, un file con `begin;` + migrazioni nuove +
  corpo del test con ogni `select <asserzione>` a inizio riga riscritto in `insert into pg_temp.__r (line) select …`
  (tabella temporanea con `grant all … to public`, perché i test cambiano ruolo), poi un blocco `do` che fa
  `raise exception` con totale e righe non `ok`. Lanciato con `npx supabase db query --linked -f <file>`.

## Done (prima)
### 2026-10-29 — Punto demo privata
- Flag `demo` in `src/config/flags.ts`: acceso solo con `NEXT_PUBLIC_DEMO=1` (letto al build). Senza variabile il sito
  vero non cambia (e2e: niente banner, niente `X-Robots-Tag`, robots e sitemap come prima).
- Banner "Demo · datos de ejemplo" (`messages/es.json` → `demo.banner`) in cima a ogni pagina, sticky, colori dai token.
  Le viste a tutto schermo usano `h-app`/`min-h-app` (`globals.css`, `--app-top-offset`): sul telefono le mappe Hoy e
  Conexiones restano alte quanto lo schermo, senza scorrere.
- noindex ovunque in demo: header `X-Robots-Tag: noindex, nofollow` (next.config) + meta dal layout. `/a`, `/e` e
  `/barrio` usano `getPageRobots()` (`src/lib/seo/robots.ts`), perché in Next un `robots` della pagina, anche
  `undefined`, sostituisce quello del layout. robots.txt in demo senza `Disallow` (i crawler devono leggere il noindex);
  sitemap vuota senza leggere il database.
- Seed controllata: tutti i nomi sono chiaramente inventati ("ficticio/a", "de Prueba", "Imaginaria"…). Nessuna modifica.
- Test: 4 file unitari nuovi (flag, robots della pagina, robots.txt, sitemap, con e senza variabile); e2e
  `npm run e2e:demo` (5 test, server su 3001 con la variabile) + 1 test nuovo senza variabile (13 in tutto).

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
- **Chiudere la sessione 5** (fondatore): ok al push di `feat/onboarding` → PR con CI verde → dall'anteprima Vercel sul
  telefono: `/registro`, email, link, "¿Qué sois?" → Asociación con un NIF fittizio libero (`G99000045` o `G99000052`)
  → `/panel`. Prima servono:
  - Supabase mapa-dev → Auth → Redirect URLs: `http://localhost:3000/**`, `https://<progetto-mapa>.vercel.app/**`,
    `https://<progetto-mapa-demo>.vercel.app/**`, `https://*-<slug-del-team>.vercel.app/**`.
  - Template "Magic Link" **e** "Confirm signup" con il link `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`.
  - Vercel (Preview e Production di `mapa`, `mapa-demo`): `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
    (chiavi vere di Cloudflare con i domini Vercel; quelle di prova solo in locale), `NOMINATIM_USER_AGENT`
    (`mapa-madrid/0.1 (+https://github.com/vincenzodebbia-rgb/Mapa)`), `SUPABASE_SECRET_KEY`.
  - Dopo il primo accesso: riga in `app_admins` (SQL in fondo a questa sezione) per vedere `/revision`.
  - Ricorda: l'email standard di Supabase arriva solo agli indirizzi del team del progetto (vedi "Bloccante per il pilota").
- Produzione (quando ci sarà mapa-prod con le migrazioni): import dell'elenco del Comune con
  `node --env-file=<file con le chiavi di produzione> scripts/import-municipal-associations.ts --write` (prima senza
  `--write` per vedere i conteggi). Il nome del file del Comune cambia a ogni aggiornamento: passare l'URL nuovo.
- SQL `app_admins` (una volta per progetto, dopo il primo accesso):
  `insert into public.app_admins (user_id) select id from auth.users where email = 'TUA_EMAIL_QUI' on conflict (user_id) do nothing;`
- Fondatore: PR di `feat/public-pages` con CI verde (anche `db-test` con i test 14-15), `@architecture-reviewer`,
  anteprima Vercel dal telefono (`/a/…`, `/e/…`, `/barrio/opanel`, `/sitemap.xml`).
- `NEXT_PUBLIC_SITE_URL`: Vercel `mapa` Production = `https://<dominio>` quando ci sarà (fino ad allora vuota va bene,
  si usa il dominio `*.vercel.app`); Preview: non impostarla; `mapa-demo` Production: facoltativa; GitHub Actions: non serve.
- Fondatore: progetto Vercel `mapa-demo` con le variabili di mapa-dev in Production + `NEXT_PUBLIC_DEMO=1`
  (`docs/operations.md`); prima di mostrarla rilanciare la seed se gli eventi singoli sono finiti; riga in `memberships`.
- Sessione 7: caricamento del logo con `reencodeLogo` e `updateTag(ORGANIZATIONS_TAG)`; sessione 6: `updateTag(EVENTS_TAG)`.

## Bloccante per il pilota
- **Servizio email** (da decidere con il dominio, prima del pilota): oggi non si invia nessuna email nostra. L'email standard di
  Supabase manda i link magici **solo agli indirizzi del team del progetto** (e circa 2 all'ora): utenti veri non possono entrare
  finché non c'è un SMTP nostro. Lo stesso servizio servirà per gli avvisi al fondatore (`FOUNDER_NOTIFICATION_EMAIL`, variabile
  server) e per le motivazioni DSA di `moderate_organization`.

## Domande della sessione 5 — risolte il 29-30 ottobre (`docs/decisioni/2026-10-29-iscrizione.md`)
- Autonomo con solo NIF personale: artisti → "Gente que hace cosas"; bar o libreria → "Actividad comercial" senza NIF (con avviso).
- Associazione fuori elenco e senza invito: entra subito, con avviso (`flag_reason = 'not_in_registry'`).
- Categoria "Comerciantes, empresarios, profesionales y autónomos": non si importa, quindi risulta fuori elenco.

## Regole per la sessione 5 (decise dal fondatore)
- L'email restituita da `moderate_organization` serve **solo** all'action per inviare la motivazione all'organizzazione:
  non va mai mostrata nell'interfaccia, né restituita al client, né scritta nei log.
- Le email alle organizzazioni (motivazioni, avvisi, ecc.) partono **sempre** da un indirizzo del progetto sul dominio
  definitivo, **mai** da un'email personale.

## Known issues
- (10/11) Restano aperti dal rapporto di sicurezza: M1 per inviti e fili (solo eventi corretti), M2, M3, M4, M6, B1–B14.
  Il tetto M5 conta solo le iscrizioni riuscite (un'eccezione annulla anche il conteggio): i tentativi falliti via RPC
  (per esempio per scoprire quali NIF sono già usati) non hanno limite nel database.
- Nominatim: il ritmo di 1 richiesta al secondo vale per processo; su Vercel più istanze possono superarlo di poco.
  Lo frenano la cache e il limite di 30 ricerche all'ora per utente. Se servirà, un limite globale con `check_rate_limit`.
- In locale (senza `x-forwarded-for`) tutte le richieste hanno la stessa chiave di connessione: i limiti per connessione
  (link magici, lookup 10 al giorno) sono condivisi tra le prove. Su Vercel l'header c'è sempre.
- L'e2e dell'iscrizione legge le chiavi dal file locale del fondatore con `process.loadEnvFile` (non le stampa) e chiama
  Nominatim vero una volta (poi resta in cache). Gli e2e restano fuori dalla CI.
- Il modulo d'iscrizione dopo un errore ricrea i campi con i valori inviati; la casella "Mostrar mi perfil en Google"
  torna però sempre selezionata.
- Inviti: `register_entity` / `create_professional` accettano il token, ma il modulo non lo manda ancora (sessione 7).
- Il link dell'email si costruisce dall'header `Origin` della richiesta: è sicuro finché Next controlla l'origine delle
  action e i Redirect URL di Supabase non hanno jolly larghi (mai `https://*.vercel.app/**`, solo `*-<slug-del-team>`).
- `confirmEmailLink` sta in `auth/actions.ts` (`'use server'`), quindi è chiamabile anche come action: rischio basso
  (fa solo ciò che fa il link). Si può spostare in un helper server-only se il blocco ne avrà bisogno.
- I `CLAUDE.md` dei blocchi (`src/features/*/CLAUDE.md`) sono ancora in inglese: sono documenti per l'agente, non commenti;
  AGENTS.md vuole i documenti in italiano. Da decidere se tradurli.
- PR: spiegare nel testo Turnstile (script Cloudflare, già nella CSP), Nominatim (indirizzi dei luoghi) e l'uso della
  chiave secret negli e2e locali (R9).
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
- `npm run e2e:demo` avvia un secondo `next dev` (porta 3001): Next ne permette uno per cartella, quindi va lanciato
  con `npm run dev` spento e dopo `npm run e2e`, non insieme.
- Playwright: su questo PC c'è solo Chromium (`npx playwright install chromium`). Gli e2e non girano in CI (serve
  la seed di mapa-dev): da decidere prima del lancio.
- Seed su mapa-dev: gli eventi singoli coprono i 30 giorni dopo l'ultimo caricamento (25/10); settimanali e mensile
  ~6 mesi. Prima della demo (o se la mappa si svuota) rilanciare `npx supabase db query --linked -f supabase/seed.sql`:
  tocca solo i dati fittizi, ma cancella anche le membership verso le organizzazioni fittizie (da riaggiungere a mano).
- Le pagine pubbliche sono in cache per minuti (`cacheLife("minutes")`): una modifica fatta direttamente nel database
  compare dopo al massimo qualche minuto. Le action future devono chiamare `updateTag`.
- Su un'anteprima Vercel (Preview) canonical, sitemap e JSON-LD puntano al dominio di produzione (valore di riserva di
  `getSiteUrl()`); le anteprime hanno comunque `noindex` da Vercel. "Compartir" invece usa l'indirizzo della pagina aperta
  (`window.location`), con l'URL del sito solo come riserva (corretto dopo la prova dal telefono del 25/10).
- `allowedDevOrigins: ["127.0.0.1"]` in `next.config.ts`: serve solo all'e2e di Compartir in sviluppo.
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
