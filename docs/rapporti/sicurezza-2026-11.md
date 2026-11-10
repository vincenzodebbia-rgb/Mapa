# Controllo di sicurezza — novembre 2026

Data: 10 novembre 2026 · Ramo: `feat/onboarding` (commit `31fb8b6`) · Tipo: sola lettura, nessuna correzione.

Ambito: tutte le migrazioni in `supabase/migrations/`, RLS e policy (anche Storage), funzioni SQL, codice in `src/`
(action, data, pagine, proxy, librerie), `next.config.ts` (CSP e header), workflow di CI, `.gitignore`, cronologia git
(ricerca di chiavi), `npm audit`. Non controllato: le impostazioni dei progetti Supabase e Vercel nei rispettivi
pannelli (non si vedono dal repository): sono elencate in fondo come "da verificare".

Gravità: **Alta** = un estraneo può fare danni reali oggi · **Media** = un abuso possibile con un account normale, o un
rischio che dipende da un'impostazione non verificabile · **Bassa** = difetto limitato o difesa in profondità ·
**Info** = nota, niente da fare subito.

## Riepilogo

| # | Gravità | Problema | Serve una decisione del fondatore? |
|---|---|---|---|
| A1 | Alta | Chiunque può iscrivere un'associazione altrui come "verificata" con dati pubblici del Comune | Sì |
| M1 | Media | I limiti di eventi, inviti e fili stanno solo nelle action: le tabelle accettano scritture dirette | Sì (come) |
| M2 | Media | L'API Auth di Supabase manda link magici senza Turnstile né i nostri limiti | Sì (pannello Supabase) |
| M3 | Media | Il link magico prende l'origine dalla richiesta: sicuro solo se l'elenco dei Redirect URL è stretto | Verifica nel pannello |
| M4 | Media | Le policy di Storage permettono caricamenti diretti che saltano la ri-codifica (EXIF/GPS) | Sì (D1 sessione 6) |
| M5 | Media | Le funzioni dell'iscrizione si chiamano via RPC saltando zod, Turnstile e limite dell'action | Sì |
| M6 | Media | Co-organizzatori aggiunti senza il loro consenso | Sì (D7 sessione 6) |
| B1 | Bassa | Un'organizzazione sospesa può ancora modificare scheda, eventi, spazi e fili | Sì |
| B2 | Bassa | Chi propone un filo può riscriverne la storia dopo la conferma dell'altra parte | Sì |
| B3 | Bassa | Il segno "verificada" resta anche dopo un cambio di nome | Sì |
| B4 | Bassa | `contact_email` senza controllo di formato nel database; `mailto:` costruito con il valore grezzo | No |
| B5 | Bassa | I contatti di "Gente que hace cosas" (persone fisiche) si possono scaricare in blocco dall'API | Sì (testo informativa) |
| B6 | Bassa | IP del limite di frequenza letto da `x-forwarded-for` | No |
| B7 | Bassa | Le pagine pubbliche in cache possono mostrare per qualche minuto un ente appena sospeso | No (nota per la sessione 7) |
| B8 | Bassa | GitHub Actions fissate per tag, non per SHA, anche nel deploy con la password di produzione | Sì |
| B9 | Bassa | `event_occurrences()` / `event_schedule()` espandono tutti gli eventi a ogni chiamata anonima | No |
| B10 | Bassa | 9 vulnerabilità "moderate" solo nelle dipendenze di sviluppo | No |
| B11–B14 | Bassa | Aperti dopo A1/M1/M5 (11/11): tentativi falliti non contati, tetto globale, inviti e fili, contatto segnaposto | Prima del lancio |
| I1–I4 | Info | Cose controllate e a posto; impostazioni da verificare nei pannelli | — |

---

## Alta

### A1 — Rivendicare un'associazione altrui e ottenere il segno "verificada"

**Dove:** `register_entity()` in `supabase/migrations/20261030121855_registration_v2.sql:141-143, 173`;
`scripts/import-municipal-associations.ts:3` (fonte dei dati).

**Cosa succede.** L'elenco del Comune (dataset 206117 di datos.madrid.es) è un CSV pubblico che contiene CIF e nome
di ogni associazione. `register_entity()` considera "nell'elenco" = "è lei": se il NIF è in `municipal_associations`,
l'organizzazione nasce con `entry_method = 'municipal_registry'`, `verified = true` e **senza avviso** al fondatore.
Quindi chiunque, con una email qualsiasi, può scaricare il CSV, iscriversi come "Asociación Vecinal X" e comparire
subito come verificata. L'associazione vera, quando arriva, riceve `already_claimed` e deve scrivere all'indirizzo di
contatto. Anche il limite di 10 ricerche al giorno su `lookup_municipal_association` (pensato contro chi prova i NIF
uno a uno) protegge poco: l'elenco intero è già pubblico.

**Impatto.** Furto d'identità di un'associazione con il segno di fiducia più forte del prodotto; l'ente vero è
bloccato finché il fondatore non interviene a mano.

**Proposta** (da scegliere):
1. *Minima, subito:* anche le iscrizioni `municipal_registry` ricevono un avviso (nuovo `flag_reason`, per esempio
   `registry_unconfirmed`) e `verified` diventa `true` solo con `mark_reviewed()`. Costo: più lavoro di revisione.
2. *Media:* "verificada" solo per chi entra con un invito di un'associazione già verificata, oppure dopo un controllo
   del fondatore (per esempio una email all'indirizzo che l'associazione ha sul proprio sito).
3. In ogni caso: scrivere in `docs/operations.md` la procedura per "il nostro NIF è già usato" (chi controlla cosa, come
   si trasferisce o si elimina l'organizzazione abusiva) e citarla nel messaggio `alreadyClaimed`.

---

## Media

### M1 — I limiti di frequenza di eventi, inviti e fili non valgono per le scritture dirette

**Dove:** grant e commenti in `20261018100004_events.sql:124-143` ("Il limite di 20 al giorno lo applica l'action"),
`20261018100006_invites.sql:40-41`, `20261018100005_threads.sql:98`.

**Cosa succede.** `authenticated` ha `insert` diretto su `events`, `event_organizers`, `invites` e `threads`. Ogni utente
ha il proprio token di sessione nel cookie di Supabase del proprio browser, quindi un membro può chiamare `POST /rest/v1/events` con la chiave publishable e il proprio JWT, senza passare dalle action: niente limite
di 20 eventi al giorno, niente limite sugli inviti, niente limite sui fili pending (si possono proporre fili a tutte le
associazioni di Madrid in un colpo). Le action degli eventi arrivano con la sessione 6: è il momento giusto per
decidere.

**Proposta.** Mettere il limite dove passa ogni scrittura, cioè nel database:
- *Opzione A (consigliata):* togliere la `grant insert` diretta e scrivere tramite funzioni `security definer`
  (`create_event`, `create_invite`, `propose_thread`) che chiamano `check_rate_limit` con una chiave per organizzazione.
- *Opzione B:* trigger `before insert` che contano le righe dell'organizzazione nelle ultime 24 ore e rifiutano oltre il
  tetto. Più semplice, ma un conteggio per ogni insert.
In entrambi i casi un test pgTAP che prova a superare il limite con un insert diretto.

### M2 — Link magici mandati senza Turnstile tramite l'API Auth di Supabase

**Dove:** `src/features/auth/actions.ts:36-71`; `supabase/config.toml:214-217` (captcha commentato, vale solo in locale).

**Cosa succede.** L'action `requestMagicLink` fa bene il suo lavoro (Turnstile, limite per connessione e per email).
Ma la chiave publishable è pubblica per definizione, e `POST https://<progetto>.supabase.co/auth/v1/otp` crea utenti e
manda email senza passare da Next.js: niente Turnstile, solo i limiti generici di Supabase Auth. Un robot può creare
account in massa e usare il nostro dominio/SMTP per mandare email a indirizzi di terzi (reputazione del mittente,
quota SMTP). Insieme a M5 e M1 è la porta d'ingresso di ogni abuso automatico.

**Proposta.** Attivare la "CAPTCHA protection" di Supabase Auth con Turnstile nel pannello (prod e dev) e passare il
token a `signInWithOtp({ options: { captchaToken } })`. Attenzione: un token Turnstile vale **una sola volta**, quindi
`verifyTurnstileToken` nell'action va tolta (la verifica la fa Supabase), altrimenti la seconda verifica fallisce
sempre. Controllare anche i "Rate limits" di Auth (email all'ora) e usare uno SMTP proprio prima del pilota.

### M3 — Indirizzo di ritorno del link magico preso dall'header `Origin`

**Dove:** `src/features/auth/actions.ts:21-33`.

**Cosa succede.** `emailRedirectTo` usa l'origine della richiesta, così il link funziona su localhost e sulle anteprime
Vercel. Next.js rifiuta le Server Action con `Origin` diverso da `Host`, e Supabase manda il link solo verso indirizzi
del suo elenco "Redirect URLs": quindi oggi il rischio dipende **solo** da quell'elenco, che dal repository non si vede.
Se contiene un jolly largo (per esempio `https://*.vercel.app/**`), un attaccante chiama direttamente `/auth/v1/otp` con
l'email della vittima e `redirect_to` verso un proprio progetto Vercel: la vittima riceve un'email autentica, clicca, e
il `token_hash` arriva all'attaccante → accesso all'account.

**Proposta.** Verificare nel pannello Supabase che gli URL siano esatti: dominio di produzione, `http://localhost:3000`
e al massimo il prefisso delle anteprime del proprio team (`https://mapa-*-<team>.vercel.app/**`), mai `*.vercel.app`.
In produzione si può anche ignorare `Origin` e usare sempre `getSiteUrl()`.

### M4 — Caricamenti diretti nello Storage che saltano la ri-codifica

**Dove:** `20261018100012_storage.sql:29-46` (bucket `event-images`), `20261022165540_org_logo_story.sql:61-84`
(bucket `org-logos`).

**Cosa succede.** Le policy permettono a ogni membro di caricare qualsiasi file nella cartella della propria
organizzazione, direttamente con l'API Storage. Il bucket controlla solo il `Content-Type` dichiarato (`image/webp`),
non il contenuto: si possono pubblicare byte arbitrari, oppure foto con EXIF/GPS, saltando `sharp` (regola di AGENTS.md
"re-encoded server-side"). Non c'è limite al numero di file (5 MB l'uno per gli eventi). Il commento "le immagini
arrivano solo dall'action" oggi non è garantito da niente. Per `org-logos` la colonna `logo_path` è fissata a
`{id}/logo.webp`, ma la policy no.

**Proposta.**
- `event-images`: il piano della sessione 6 propone già di toglierlo (**D1**): farlo, così sparisce anche il problema.
- `org-logos`: togliere le policy `insert`/`update` per `authenticated` e caricare dall'action con il client admin dopo
  la ri-codifica (l'action ha già controllato utente e membership); oppure, se si vogliono tenere, restringere la policy
  a `name = <org_id> || '/logo.webp'`.

### M5 — Le funzioni dell'iscrizione si chiamano direttamente via RPC

**Dove:** `grant execute ... to authenticated` di `register_entity` e `create_professional`
(`20261030121855_registration_v2.sql:212-215, 311-313`).

**Cosa succede.** Un utente con accesso può chiamare `/rest/v1/rpc/register_entity` senza passare dall'action: niente
Turnstile, niente limite di 5 all'ora, niente zod. L'effetto è contenuto (una sola organizzazione per account, il
database ricontrolla NIF, lunghezze, URL e coordinate), ma: `contact_email` e `contact_phone` non hanno un controllo di
formato nel database (vedi B4), e insieme a M2 un robot può creare account e organizzazioni senza mai vedere Turnstile.

**Proposta.** Se si risolve M2 (captcha in Supabase Auth) il rischio scende molto e basta B4. In alternativa: funzioni
eseguibili solo da `service_role` con un parametro `p_user_id`, chiamate dall'action dopo i controlli (più codice,
più attenzione a non fidarsi del parametro).

### M6 — Co-organizzatori senza consenso

**Dove:** policy `event_organizers_insert_co` (`20261018100004_events.sql:167-175`) e `events_after_write` (righe 95-113).

**Cosa succede.** Il proprietario di un evento può aggiungere come co-organizzatrice **qualsiasi** organizzazione
attiva, senza che lei lo sappia. L'evento compare con "Organizado por X y Y", nella scheda pubblica di Y (`upcoming_events`
filtra per `organizer_ids`) e ogni modifica dell'evento aggiorna `last_activity_at` di Y (la sua "luce" sulla mappa).
SPEC §97 prevede che il co-organizzatore possa togliersi, ma solo dopo essersene accorto. Si presta a eventi spam o
diffamatori "firmati" da un'associazione rispettata.

**Proposta** (decisione **D7** della sessione 6): co-organizzazione come i fili, `pending` finché l'altra parte non
conferma (invisibile al pubblico prima); oppure almeno un avviso nella home di Y e `last_activity_at` aggiornato solo
per l'organizzazione che scrive.

---

## Bassa

### B1 — Le organizzazioni sospese possono ancora scrivere

Le policy `update` di `organizations`, `events`, `spaces`, `threads` e `organization_answers` controllano solo la
membership, non lo stato. Un ente sospeso non può creare eventi, ma può modificare quelli esistenti, la scheda, gli
spazi e confermare fili. Il pubblico non lo vede finché resta sospeso, ma alla riattivazione trova contenuti cambiati
durante la sospensione. **Proposta:** aggiungere `private.is_org_active(...)` al `with check` delle `update`
(lasciando `delete` e l'esportazione libere, come oggi), con un test in `10_suspension.sql`.

### B2 — La storia di un filo confermato si può riscrivere da una parte sola

`threads_before_write` (`20261018100005_threads.sql:51-56`) lascia al proponente modificare `story_proposer` anche
dopo `confirmed`. L'altra parte ha confermato un testo che poi cambia, e il filo resta pubblico. **Proposta:** dopo la
conferma, una modifica della propria storia o è vietata o riporta il filo a `pending` (decisione di prodotto).

### B3 — Il segno "verificada" sopravvive a un cambio di nome

`name` è nella `grant update`; `verified` resta `true`. Un ente verificato può rinominarsi in qualcosa di diverso
dall'associazione dell'elenco. **Proposta:** se un'organizzazione verificata cambia nome, accendere un avviso
(`flag_reason`) oppure mostrare accanto al segno il nome ufficiale dell'elenco.

### B4 — `contact_email` senza controllo di formato nel database

Il controllo c'è solo in zod (`src/features/onboarding/schema.ts:38-41`). Con la chiamata diretta (M5) o con un
`update` diretto della scheda si può salvare `x@y.es?bcc=...&body=...`, e `organization-profile.tsx:60` costruisce
`mailto:${contactEmail}` con il valore grezzo (precompila destinatari e testo nel client email di chi clicca). Non è
XSS (React scappa l'attributo). **Proposta:** `check` sulla colonna con un'espressione semplice (niente spazi, `?`, `&`,
una sola `@`) e `encodeURIComponent` nel `mailto:`; per `contact_phone` un `check` sui caratteri ammessi.

### B5 — Contatti di persone fisiche scaricabili in blocco

`anon` può leggere `contact_email` e `contact_phone` di tutte le organizzazioni via API. Per associazioni ed espacios
sono contatti pubblici scelti da loro; per "Gente que hace cosas" sono dati personali, e l'opzione "non mostrarmi su
Google" (`indexable = false`) toglie la pagina dai motori ma non impedisce di scaricare tutti i contatti con una sola
richiesta all'API. **Proposta:** dirlo chiaramente nel modulo e nell'informativa; valutare se per i professionisti
mostrare il contatto solo nella pagina (letta dal server con un client privilegiato o da una vista con meno colonne)
invece che dalla tabella aperta ad `anon`.

### B6 — IP letto da `x-forwarded-for`

`src/lib/rate-limit.ts:25-28` prende il primo indirizzo di `x-forwarded-for`. Su Vercel l'header lo riscrive la
piattaforma, quindi oggi va bene; fuori da Vercel (o dietro un altro proxy) chiunque può cambiare IP a ogni richiesta e
azzerare i limiti per connessione. **Proposta:** preferire `x-vercel-forwarded-for` (o `x-real-ip`) e scrivere nel
commento che la funzione è affidabile solo su Vercel.

### B7 — Cache delle pagine pubbliche dopo una sospensione

`getOrganizationProfile` è in `'use cache'` con `cacheLife("minutes")` e pagine statiche. Quando arriverà l'azione di
moderazione (sessione 7), deve chiamare `updateTag(ORGANIZATIONS_TAG)` e `organization:<slug>` (e i tag degli eventi),
altrimenti un ente sospeso resta visibile fino alla scadenza. Nota per chi implementa, non un difetto attuale.

### B8 — GitHub Actions fissate per tag

`actions/checkout@v4`, `supabase/setup-cli@v1`, `gitleaks/gitleaks-action@v2` sono riferimenti mobili. Nel job
`db-deploy` girano con la password del database di produzione: se un tag venisse spostato su codice malevolo, la
password uscirebbe. **Proposta:** fissare le azioni per SHA del commit (Dependabot sa aggiornarle anche così). File di
CI: si toccano solo con il permesso del fondatore.

### B9 — Espansione di tutte le ripetizioni a ogni chiamata anonima

`event_occurrences(p_from, p_to)` ed `event_schedule()` sono eseguibili da `anon` e calcolano le occorrenze di tutti gli
eventi (fino a 28 per evento) prima di filtrare. Oggi il database è piccolo; con migliaia di eventi una raffica di
chiamate pesa sul database. Il commento in `public_pages.sql:44-45` lo sa già. **Proposta:** parametro `p_event_id`
quando servirà, e un `statement_timeout` per il ruolo `anon` nel pannello.

### B10 — Dipendenze

`npm audit --omit=dev`: **0 vulnerabilità**. `npm audit` completo: 9 "moderate", tutte nelle dipendenze di sviluppo
(catena `minimatch` → `typescript-eslint` / `eslint-config-next`). Non arrivano al sito. **Proposta:** lasciare che
Dependabot le aggiorni (su GitHub c'è già un suo ramo di aggiornamenti minori).

### Da rivedere prima del lancio (aggiunti l'11 novembre, dopo le correzioni A1, M1, M5)

Punti minori lasciati aperti dalla migrazione `20261110211136_security_a1_m1_m5`. Nessuno è un rischio alto oggi, ma
vanno chiusi o accettati per iscritto prima del lancio.

- **B11 — Tentativi falliti non contati dai limiti nel database.** I limiti dentro le funzioni e nel trigger degli eventi
  (`db:new-organizations`, `db:event:<org>`) contano solo le scritture riuscite: un'eccezione annulla tutta la transazione,
  conteggio compreso. Chi chiama `register_entity` via RPC per sapere quali NIF sono già usati (`already_claimed`) non
  trova un limite nel database; lo frena solo il limite dell'action, che però la chiamata diretta salta. *Da valutare:*
  contare i tentativi fuori dalla transazione (per esempio con il limite di Supabase Auth, M2) o rendere
  `register_entity` eseguibile solo da `service_role` (M5, seconda proposta).
- **B12 — Tetto globale di 60 iscrizioni all'ora.** Il tetto M5 vale per tutto il sito, non per utente: un robot che lo
  esaurisce blocca per un'ora anche le iscrizioni vere ("Demasiados intentos"). *Da valutare* con i numeri del pilota:
  un tetto più alto, un tetto per connessione nell'action, oppure il captcha di Supabase Auth (M2), che toglie il robot a
  monte.
- **B13 — Inviti e fili senza limite nel database.** La correzione M1 copre solo `events`. `invites` e `threads`
  accettano ancora insert diretti senza tetto (si possono proporre fili a tutte le organizzazioni in un colpo). *Proposta:*
  lo stesso trigger di `events_rate_limit`, con chiavi `db:invite:<org>` e `db:thread:<org>`, quando inviti e fili
  arrivano nell'interfaccia (sessione 7 e dopo il lancio).
- **B14 — `brand.contactEmail` ancora segnaposto.** `src/config/brand.ts` ha `hola@example.org`: il tasto
  "¿Es tu asociación?" / "¿Es tu espacio?" / "¿Es tu perfil?" e l'errore "Este NIF ya está registrado" mandano lì. Va
  sostituito con il canale di contatto vero del progetto (mai un indirizzo personale) prima che qualcuno lo usi.

---

## Informativo: cosa è stato controllato ed è a posto

### I1 — Database
- Ogni tabella ha la RLS attiva nella stessa migrazione, con `revoke all` e grant per colonna dove serve (anche
  `entry_method`, `flagged_for_review`, `entity_type`, `flag_reason` restano privati).
- Tutte le viste hanno `security_invoker = true`.
- Ogni funzione `security definer` ha `search_path = ''` e nomi qualificati; `EXECUTE` è tolto e ridato solo a chi
  serve; `check_rate_limit` e `lookup_municipal_association` solo a `service_role`.
- Lo schema `private` non è esposto dall'API (`config.toml`: solo `public`, `graphql_public`).
- `municipal_associations`, `organization_verifications`, `geocode_cache`, `rate_limits`, `app_admins`,
  `moderation_actions`: nessuna lettura per `anon`/`authenticated`.
- Admin in tabella (`app_admins`), mai in `user_metadata`; `/revision` risponde 404 a chi non è admin.
- `make_unique_slug` usa `format('%I')` con un elenco chiuso di tabelle: niente SQL injection.
- Token degli inviti: 18 byte casuali (144 bit), indovinarli non è realistico anche senza limite su `get_invite`.

### I2 — Codice dell'app
- Nessun `dangerouslySetInnerHTML`, `innerHTML` o `setHTML`; JSON-LD con `<` neutralizzato; popup con `textContent`.
- Link degli utenti: solo `http(s)` sia nel database (`check`) sia nel codice (`toSafeHttpUrl`, `toSafeHref`).
- Utente sempre da `getClaims()`, mai `getSession()`; il proxy non autorizza niente.
- `/auth/confirm` va sempre a `/panel`: nessun redirect aperto.
- Nessun dato personale negli URL (solo `?error=enlace`, `?tipo=...`); parametri delle pagine validati con zod/regex.
- Log: solo codici d'errore, mai email, IP o NIF. Le chiavi dei limiti sono HMAC con sale giornaliero.
- Chiave secret solo in file con `import 'server-only'` (`admin.ts`, `server-env.ts`, `rate-limit.ts`, `geocode.ts`).

### I3 — Segreti e header
- `.env*` ignorati (tranne `.env.example` con valori di prova); gitleaks in CI; nessuna chiave `sb_secret_` o JWT nella
  cronologia git (ricerca su tutti i rami). Il ref del progetto di sviluppo in `scripts/` non è un segreto.
- CSP: `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`.
  `script-src 'unsafe-inline'` è una scelta documentata (ADR 0007): la difesa vera resta "testo sempre come testo".
  `Permissions-Policy` blocca camera, microfono e geolocalizzazione; `nosniff` e `Referrer-Policy` presenti.
- Non c'è un header HSTS nel codice: Vercel lo aggiunge di solito da sé; verificarlo sul dominio finale.

### I4 — Da verificare nei pannelli (non visibile dal repository)
- **Supabase → Auth → URL Configuration:** elenco dei Redirect URL stretto (vedi M3).
- **Supabase → Auth → Attack Protection:** CAPTCHA con Turnstile (vedi M2); rate limits delle email; SMTP proprio.
- **Supabase → API:** solo gli schemi `public` e `graphql_public` esposti (come in `config.toml`).
- **Supabase → Database:** `statement_timeout` per `anon`/`authenticated` (B9); backup a 30 giorni (come da informativa).
- **Vercel:** HSTS attivo sul dominio; variabili `SUPABASE_SECRET_KEY` e `TURNSTILE_SECRET_KEY` solo in Production/Preview
  e mai con prefisso `NEXT_PUBLIC_`.
