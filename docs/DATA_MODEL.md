# Modello dati

Fonte di verità del database. Lo schema si crea SOLO con le migrazioni in `supabase/migrations/`.
Questo documento dice cosa deve esistere; le migrazioni dicono come. Se non sono d'accordo, fermarsi e chiedere.
Decisioni del fondatore sull'iscrizione: `docs/decisioni/2026-10-iscrizione.md` (già riportate qui).

Convenzioni: `snake_case`; `id uuid primary key default gen_random_uuid()`; `created_at`/`updated_at timestamptz default now()`
(`updated_at` mantenuto da un trigger); tutti i tempi `timestamptz`; ogni funzione `security definer` imposta `search_path = ''`
e usa nomi qualificati con lo schema. Estensioni: `postgis`, `unaccent`, `pgcrypto` (nello schema `extensions`).
Gli helper interni (trigger, `is_org_member`, `is_org_active`, `make_unique_slug`, `normalize_nif`) stanno nello schema
`private`, che l'API non espone: si possono usare nelle policy ma non chiamare via RPC.
Le tabelle in `public` partono con `revoke all from anon, authenticated` e ricevono solo i grant necessari (anche per colonna).

## Enum
- `org_kind`: `association`, `venue`, `professional`
- `entry_method`: `municipal_registry`, `invite`, `self_declared`, `email_only`
- `venue_activity`: tranquille `libreria`, `sala_pequena`, `centro_cultural`, `galeria`, `taller_estudio`, `cafe_cultural`;
  dubbie `discoteca_club`, `bar_nocturno`, `otro`. La lista "dubbia" vive **solo** in `is_doubtful_activity()`: TypeScript non la ripete.
- `org_status`: `active`, `suspended`
- `moderation_action`: `suspend`, `reactivate`, `delete`
- `event_category`: `musica`, `teatro_danza`, `arte`, `talleres`, `encuentros`, `comunidad`, `otros`
- `price_type`: `free`, `donation`, `paid`
- `recurrence`: `none`, `weekly`, `monthly`
- `thread_status`: `pending`, `confirmed`
- `space_type`: `sala`, `local`, `exterior`, `estudio`, `otro`

## Tabelle

| Tabella | Blocco | Scopo | Dati personali |
|---|---|---|---|
| `municipal_associations` | onboarding | Copia minima dell'elenco del Comune, per riconoscere le associazioni dal NIF | no (enti, open data) |
| `organization_verifications` | onboarding | Quale organizzazione ha usato quale NIF | no (NIF di enti: mai DNI/NIE) |
| `organization_answers` | onboarding | Le risposte aperte dell'iscrizione | no (testo scritto dall'ente, privato) |
| `terms_acceptances` | onboarding | Chi ha accettato quale versione di condiciones/privacidad, quando, dichiarazione di età | user id |
| `organizations` | organizations | Scheda pubblica di associazioni, espacios e professionisti | contatti scelti dall'organizzazione (pubblici per scelta) |
| `memberships` | auth | Quale utente gestisce quale organizzazione | user id |
| `events` | events | Eventi e regole di ripetizione | no (le immagini possono mostrare persone: chi carica dichiara i diritti) |
| `event_organizers` | events | Proprietario e co-organizzatori di un evento | no |
| `threads` | threads | Fili tra due associazioni | no |
| `invites` | invites | Link di invito personali | user id di chi crea |
| `spaces` | spaces | Spazi offerti in affitto/prestito (solo utenti registrati) | contatto scelto dall'ente |
| `neighborhoods` | map | Barrios ufficiali di Madrid con confini (open data) | no |
| `app_admins` | account | Chi può usare la pagina privata di revisione (oggi solo il fondatore) | user id |
| `moderation_actions` | account | Storico di sospensioni, riattivazioni ed eliminazioni, con motivazione | user id dell'admin; conservazione max 3 anni |
| `geocode_cache` | lib (condivisa) | Cache dei risultati di Nominatim | indirizzi (non collegati a persone) |
| `rate_limits` | lib (condivisa) | Contatori anti-abuso | solo chiavi hash, mai IP o email in chiaro |

### Chi entra e come

| Chi | Come entra | Revisione | `entry_method` |
|---|---|---|---|
| Associazione nell'elenco del Comune (NIF in `municipal_associations`) | subito | nessuna | `municipal_registry` |
| Chiunque con un invito valido di un'associazione attiva, di qualunque tipo | subito | nessuna | `invite` |
| Espacio (`venue`) con attività tranquilla | email + NIF + attività + domande | nessuna | `self_declared` |
| Espacio (`venue`) con attività dubbia, senza invito | subito | `flagged_for_review = true` | `self_declared` |
| Professionista o collettivo | solo email | nessuna | `email_only` |
| Associazione fuori elenco e senza invito | subito; **DA DECIDERE (sessione 5)** se con avviso | per ora nessuna | `self_declared` |

Lo schema permette entrambe le scelte dell'ultimo caso: cambia solo se `register_entity()` mette `flagged_for_review = true`.

### municipal_associations (privata)
`cif text primary key` (normalizzato: maiuscolo, senza spazi né simboli; formato da ente), `name text not null`, `registry_number text`,
`district text`, `neighborhood text`, `category text`, `imported_at timestamptz default now()`.
- RLS attiva, **nessuna policy**. Si legge solo tramite `lookup_municipal_association()` e `register_entity()`.
- Si importano **solo** `CIF`, `Razon_Social`, `Num_Inscripcion`, `Distrito`, `Barrio`, `Categoria`. **Mai** telefono, email,
  indirizzo, numero soci. Righe con lo stesso CIF unite in una. Si importa anche la categoria "Comerciantes, empresarios,
  profesionales y autónomos" (come trattarla: sessione 5). Script `scripts/import-municipal-associations.ts` (sessione 5);
  nella seed solo 5 righe fittizie.
- Fonte: "Entidades de participación ciudadana. Asociaciones (Sección 1ª)", CSV `;`, UTF-8 con BOM, CC BY 4.0 (attribuzione in `/legal`).

### organization_verifications (privata)
`organization_id uuid primary key references organizations on delete cascade`, `nif text unique not null`, `verified_at timestamptz default now()`.
- RLS attiva, nessuna policy. Un NIF = un solo account.
- Il NIF è obbligatorio per `association` e `venue`, qualunque sia il modo di ingresso (anche con invito).
- Il NIF si normalizza con `private.normalize_nif()` (maiuscolo, solo lettere e cifre) e accetta **solo il formato degli enti**:
  `^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$`. Mai DNI o NIE (cifra iniziale o X/Y/Z): niente documenti personali.

### organization_answers (privata)
`organization_id uuid primary key references organizations on delete cascade`, `what_for_whom text (≤500)`, `how_sustained text (≤500)`, `updated_at`.
- Domande: "¿Qué hacéis y para quién?" (`what_for_whom`), "¿Cómo se sostiene el proyecto?" (`how_sustained`).
  Il tipo di attività è `organizations.venue_activity`; "Web o red social" è `organizations.contact_url`.
- **Obbligatorie per i `venue`, facoltative per le `association`**; i professionisti non le compilano.
- RLS: `select`/`update` solo dai membri. Inserita da `register_entity()`. Gli admin la leggono solo tramite `admin_review_list()`.

### terms_acceptances (privata dell'utente)
`id`, `user_id uuid references auth.users on delete cascade`, `terms_version text not null`, `privacy_version text not null`,
`age_confirmed boolean not null`, `accepted_at timestamptz default now()`.
RLS: `select` delle proprie righe. Inserita solo da `register_entity()` / `create_professional()`.

### organizations (scheda pubblica)
`id`, `kind org_kind not null`, `slug text unique not null` (non cambia mai), `name text not null (≤120)`, `one_liner text (≤120)`,
`when_to_visit text (≤120)`, `contact_email text`, `contact_phone text`, `contact_url text` (solo http/https, check),
`address text`, `location geography(Point,4326)` (null = nessun punto), `neighborhood_id uuid references neighborhoods`,
`usual_category event_category`, `seeking_offering text (≤200)` (professionisti), `indexable boolean default true`
(professionisti: "Mostrar mi perfil en Google"; associazioni e espacios sempre true), `verified boolean default false`,
`entry_method entry_method not null`, `venue_activity venue_activity`, `status org_status not null default 'active'`,
`flagged_for_review boolean not null default false`, `last_reviewed_at timestamptz`,
`last_activity_at timestamptz default now()`, `created_at`, `updated_at`.
- Vincoli: `kind = 'professional'` ⇒ `location is null` (i professionisti non hanno un punto proprio);
  `venue_activity` obbligatoria se `kind = 'venue'`, nulla altrimenti.
- `verified = true` solo per `entry_method = 'municipal_registry'`.
- In tutta la UI `venue` si chiama "Espacio" (sezione "Espacios"). Conflitto di nome con la tabella `spaces`: il nome delle due sezioni
  si decide nella sessione 9, lo schema non cambia.
- RLS `select` (`anon`, `authenticated`): `status = 'active'` **oppure** l'utente è membro (vede la propria organizzazione anche sospesa,
  per leggere la motivazione e scaricare i dati). Nessuna policy `insert` (solo funzioni). `update` solo dai membri.
- Privilegi per colonna: `grant update (name, one_liner, when_to_visit, contact_email, contact_phone, contact_url, address, location,
  usual_category, seeking_offering, indexable, venue_activity)`. L'utente non cambia mai `kind`, `slug`, `verified`, `entry_method`,
  `status`, `flagged_for_review`, `last_reviewed_at`, `last_activity_at`.
- Trigger: `slug` generato all'inserimento; `neighborhood_id` da `location` (`ST_Covers` su `neighborhoods.boundary`);
  `last_activity_at` aggiornato quando cambia la scheda; se cambia `venue_activity` verso un'attività dubbia e l'ente non è entrato
  con invito, `flagged_for_review = true` (il trigger non lo rimette mai a false: lo fa solo `mark_reviewed()`).

### memberships
`user_id uuid references auth.users on delete cascade`, `organization_id uuid references organizations on delete cascade`,
`role text check (role = 'owner')`, `created_at`, primary key (`user_id`, `organization_id`). Un utente = una organizzazione nella v1 (unique su `user_id`).
RLS: `select` delle proprie righe. Nessuna policy di scrittura (solo funzioni).

### events
`id`, `slug text unique not null`, `title text not null (≤120)`, `description text (≤500)`, `category event_category not null`,
`price_type price_type not null default 'free'`, `price_amount numeric(8,2)` (obbligatorio se e solo se `paid`, ≥ 0; **nessun tetto di prezzo**),
`starts_at timestamptz not null`, `ends_at timestamptz not null` (check `ends_at > starts_at`, max 24 h),
`recurrence recurrence not null default 'none'`, `recurrence_until date` (obbligatoria se e solo se ripetuto, ≤ 6 mesi dopo `starts_at`),
`venue_name text`, `address text not null`, `location geography(Point,4326) not null`, `neighborhood_id uuid references neighborhoods`,
`image_path text` (path nel bucket `event-images`), `owner_org uuid not null references organizations on delete cascade`,
`created_at`, `updated_at`.
- RLS: `select` a `anon, authenticated` se l'organizzazione proprietaria è `active` (archivio compreso), oppure ai suoi membri.
  `insert` se l'utente è membro di `owner_org` e l'organizzazione è `active`. L'action chiama prima
  `check_rate_limit('event:' || owner_org, 20, interval '1 day')` (mai dentro una policy: le policy non hanno effetti collaterali).
  `update`/`delete` solo i membri di `owner_org`. `owner_org` e `slug` non si cambiano (grant per colonna).
- Trigger: `slug` all'inserimento; `neighborhood_id` da `location`; all'inserimento/modifica aggiorna `organizations.last_activity_at`
  di tutti gli organizzatori; all'inserimento aggiunge la riga `owner` in `event_organizers`.
- Indici: `starts_at`, `owner_org`, GIST su `location`.
- Formati aperti più avanti (flag `openFeeds`): `id`, `slug` e `updated_at` sono stabili.

### event_organizers
`event_id uuid references events on delete cascade`, `organization_id uuid references organizations on delete cascade`,
`role text check (role in ('owner','co'))`, primary key (`event_id`, `organization_id`).
RLS: `select` se l'evento è visibile. `insert` di righe `co` dai membri dell'`owner_org` dell'evento (entrambe le organizzazioni `active`).
`delete` di una riga `co` dai membri dell'owner org OPPURE da quelli del co-organizzatore (che si toglie).

### threads
`id`, `proposer_org uuid references organizations on delete cascade`, `receiver_org uuid references organizations on delete cascade`,
`status thread_status not null default 'pending'`, `story_proposer text (≤300) not null`, `story_receiver text (≤300)`,
`color_seed smallint not null default floor(random()*4)::smallint`, `created_at`, `confirmed_at timestamptz`,
`expires_at timestamptz not null default now() + interval '60 days'`.
- Vincoli: `proposer_org <> receiver_org`; coppia unica in qualunque direzione (indice unico su `least(...), greatest(...)`);
  entrambe `association` (trigger).
- RLS:
  - `select` a `anon, authenticated` se `status = 'confirmed'` ed entrambe le organizzazioni sono `active`;
  - `select` ai membri di una delle due (anche sospesa, anche pending non scaduto);
  - `insert` dai membri di `proposer_org` attiva (status `pending`);
  - `update` dai membri dell'una o dell'altra; un trigger permette solo: `receiver` accetta (`pending → confirmed`, imposta `confirmed_at`)
    e modifica `story_receiver`; `proposer` modifica `story_proposer`. Qualsiasi altro cambio è rifiutato.
  - `delete` dai membri di una delle due.
- La scadenza non richiede cron: i pending scaduti sono invisibili agli estranei e si possono cancellare più avanti.

### invites
`id`, `token text unique not null default encode(extensions.gen_random_bytes(18), 'base64url')`, `organization_id uuid references organizations on delete cascade`,
`created_by uuid references auth.users on delete set null default auth.uid()`, `created_at`, `expires_at default now() + interval '30 days'`,
`used_at timestamptz`, `used_by_org uuid references organizations on delete set null`.
- Solo un'organizzazione `association` e `active` crea inviti (trigger). Chi usa l'invito entra con `entry_method = 'invite'`,
  qualunque `kind` scelga, senza avviso.
- RLS: `select`/`insert` dai membri di `organization_id`. La landing pubblica legge solo tramite `get_invite(token)`.
- Limite: l'action chiama `check_rate_limit('invite:' || organization_id, 20, interval '1 day')` prima di inserire.

### spaces
`id`, `organization_id uuid references organizations on delete cascade` (`association` o `venue`, trigger), `space_type space_type`,
`neighborhood_id uuid references neighborhoods`, `price_type price_type` (solo `free` o `paid`), `description text (≤300)`,
`contact text (≤200)`, `created_at`, `updated_at`.
RLS: `select` solo a `authenticated`, se l'organizzazione è `active` o l'utente ne è membro. `insert` (organizzazione `active`)/`update`/`delete` dai membri.

### neighborhoods
`id`, `slug text unique`, `name text`, `district text`, `boundary geography(MultiPolygon,4326)`, `centroid geography(Point,4326)`.
RLS: `select` pubblico. Riempita una volta da `scripts/import-neighborhoods.ts` dai confini open data del Comune (la seed contiene
solo rettangoli segnaposto). Attribuzione in `/legal`.

### app_admins
`user_id uuid primary key references auth.users on delete cascade`, `created_at`.
RLS attiva, **nessuna policy**. Il fondatore si aggiunge **una volta**, a mano, dopo il primo login su mapa-dev e su mapa-prod
(procedura in `docs/operations.md`). Mai ruoli in `user_metadata`.

### moderation_actions (privata)
`id`, `organization_id uuid` (**senza** foreign key: la riga resta dopo l'eliminazione), `organization_name text not null` (copia al momento dell'azione),
`action moderation_action not null`, `reason text not null (≤1000)`, `admin_id uuid references auth.users on delete set null`, `created_at`.
RLS attiva, nessuna policy. Scritta solo da `moderate_organization()`. Conservazione: finché serve per eventuali reclami, massimo 3 anni.
La motivazione arriva all'organizzazione per email dall'action (testo standard in `messages/es.json` + motivo), come chiede il DSA.

### geocode_cache
`query_normalized text primary key`, `location geography(Point,4326)`, `display_name text`, `created_at`.
RLS attiva, nessuna policy. Letta/scritta solo da `src/lib/domain/geocode.ts` (server-only, chiave secret).

### rate_limits
`key text`, `window_start timestamptz`, `count int`, primary key (`key`, `window_start`). RLS attiva, nessuna policy.
Le chiavi non sono mai dati personali in chiaro: id di organizzazioni, oppure `sha256(ip || sale_giornaliero)` per i tentativi anonimi.

## Storage
Bucket `event-images`: lettura pubblica, solo `image/webp`, max 5 MB. Path `"{organization_id}/{event_id}.webp"`.
Policy insert/update/delete: la prima cartella del path è un'organizzazione di cui l'utente è membro.
I file li carica solo l'action dopo che `sharp` li ha ri-codificati in WebP, max 1600 px, senza metadati.
Cancellare righe non cancella i file: le action cancellano prima i file tramite l'API Storage.

## Viste (read model) — tutte `with (security_invoker = true)`
- `map_items`: una riga per ogni cosa che può accendersi sulla mappa nella finestra `[now(), now() + 7 giorni]`:
  - occorrenze di eventi da `public.event_occurrences(now(), now() + interval '7 days')` non ancora finite,
    con `item_type = 'event'`, slug, titolo (`name`), category, price_type, price_amount, occ_start, occ_end, venue_name, address,
    lng/lat, slug del barrio, nomi degli organizzatori (`string_agg` ordinato: prima l'owner);
  - associazioni ed espacios con una posizione, con `item_type = 'organization'`, `organization_kind`, slug, name, lng/lat, `last_activity_at`.
  Lo stato di luce si calcola in TypeScript con `getLightState(item, now)` (pura, testata).
- `connection_lines`: fili confermati con slug, nome, lng/lat di entrambe le organizzazioni, le due storie, `color_seed`.
- Essendo `security_invoker`, ereditano le policy: niente `pending` per `anon` o terzi, niente elementi di organizzazioni sospese.

## Funzioni
| Funzione | Tipo | Cosa fa |
|---|---|---|
| `event_occurrences(p_from, p_to)` | SQL, security invoker | Espande le ripetizioni in `(event_id, occ_start, occ_end)`. **Calcola in ora locale** (`(starts_at at time zone 'Europe/Madrid') + k * interval '1 week'`, poi di nuovo `timestamptz`), così le 19:00 restano 19:00 al cambio dell'ora. Mensile = `inizio + k mesi` dalla data originale (nessuna deriva). Unica implementazione delle ripetizioni. |
| `is_doubtful_activity(p_activity)` | immutable | `true` per `discoteca_club`, `bar_nocturno`, `otro`. Unico posto della lista. |
| `is_admin()` | security definer, stable | Esiste una riga in `app_admins` per `auth.uid()`. |
| `lookup_municipal_association(p_nif)` | security definer, solo `service_role` | Restituisce solo `found` + `name` ufficiale, per "¿Sois *nombre*?". L'action chiama prima `check_rate_limit` (max 10 al giorno per connessione) e poi questa con il client admin. |
| `register_entity(p_kind, p_nif, p_name, p_terms_version, p_privacy_version, p_age_confirmed, p_invite_token default null, p_venue_activity default null, p_what_for_whom default null, p_how_sustained default null)` | security definer | Per `association` e `venue`. Richiede `auth.uid()`. Normalizza e controlla il NIF; decide `entry_method` (invito valido → `invite`; `association` con NIF in elenco → `municipal_registry`; altrimenti `self_declared`); `flagged_for_review = true` se `venue` + attività dubbia + nessun invito (associazione fuori elenco senza invito: per ora `false`, `-- DA DECIDERE (sessione 5)`). Crea organizzazione (slug unico), verifica, membership, accettazione, risposte; segna l'invito come usato. Tutto o niente. Restituisce `(slug, flagged)`. Errori: `not_authenticated`, `invalid_kind`, `already_member`, `terms_required`, `invalid_name`, `invalid_nif`, `already_claimed`, `venue_activity_required`, `answers_required`, `invalid_invite`. |
| `create_professional(p_name, p_one_liner, p_terms_version, p_privacy_version, p_age_confirmed, p_invite_token default null)` | security definer | Stesso schema per i professionisti; `entry_method` = `invite` con invito valido, altrimenti `email_only`. Restituisce lo slug. |
| `get_invite(p_token)` | security definer | Restituisce solo nome e slug dell'organizzazione che invita, se il token è valido, non usato, non scaduto e l'organizzazione è attiva. |
| `export_my_data()` | security definer | `jsonb` con email dell'utente, membership, accettazioni, organizzazione, NIF, risposte, eventi, organizzatori, fili, inviti, spazi e `moderation_actions` sulla propria organizzazione. |
| `delete_my_account()` | security definer | Elimina l'organizzazione dell'utente se ne è l'unico membro (a cascata: eventi, organizzatori, fili, inviti, spazi, verifica, risposte), poi la riga di `auth.users`. L'action cancella prima i file di Storage. Restano solo le `moderation_actions` (senza riferimenti all'utente). |
| `admin_review_list()` | security definer | Se `is_admin()`: per **tutte** le organizzazioni `id, slug, name, kind, entry_method, venue_activity, neighborhood_name, contact_url, what_for_whom, how_sustained, status, flagged_for_review, created_at, last_reviewed_at`. **Mai** NIF, email, telefono, user id. Altrimenti `forbidden`. |
| `moderate_organization(p_org, p_action, p_reason)` | security definer | Se `is_admin()`: `suspend`/`reactivate` cambiano `status`; `delete` elimina l'organizzazione (stessa cascata di `delete_my_account`, senza toccare `auth.users`). Scrive sempre `moderation_actions`. Motivo obbligatorio. Restituisce all'action l'email a cui mandare la motivazione (`contact_email`, altrimenti l'email di accesso del membro). Errori: `forbidden`, `reason_required`, `not_found`. |
| `mark_reviewed(p_org)` | security definer | Se `is_admin()`: `last_reviewed_at = now()`, `flagged_for_review = false`. |
| `check_rate_limit(p_key, p_max, p_window)` | security definer, solo `service_role` | Incrementa il contatore della finestra corrente e restituisce `false` oltre il limite. Solo `service_role`, così nessuno può consumare il limite di un altro via RPC. |
| `private.make_unique_slug(p_text, p_table)` | security definer | `unaccent`, minuscolo, trattini, max 60 caratteri, suffisso numerico in caso di collisione. Solo alla creazione. |

L'avviso al fondatore per gli espacios dubbi lo manda l'**action** (non il database), alla mail `founderNotificationEmail` in
`src/config/brand.ts` (sessione 5), con nome, tipo, attività, web, risposte. **Mai il NIF né l'email di chi si iscrive.**

## Test che devono esistere (pgTAP, `supabase/tests/`)
1. `anon` non legge `municipal_associations`, `organization_verifications`, `terms_acceptances`, `geocode_cache`, `rate_limits`.
2. `anon` non può inserire/modificare/cancellare niente.
3. Un membro di A non può modificare organizzazione, eventi, spazi o storie dei fili di B.
4. Un utente non può cambiare `kind`, `slug`, `verified` o `last_activity_at` della propria organizzazione.
5. Un filo `pending` è visibile solo ad A e B, anche tramite `connection_lines`.
6. `register_entity` con un NIF già usato fallisce; con un NIF in formato personale (DNI/NIE) fallisce; con uno valido crea esattamente un'organizzazione + membership.
7. `event_occurrences` tiene le 19:00 locali attraverso l'ultima domenica di marzo e di ottobre; il mensile dal 31 non deriva.
8. `delete_my_account` non lascia righe che riferiscono l'utente.
9. Ogni vista in `public` ha `security_invoker = true` (`pg_class.reloptions`).
10. Ogni tabella in `public` ha RLS attiva (`pg_tables.rowsecurity`).
11. `anon` e utenti normali non leggono `municipal_associations`, `organization_answers` (di altri), `app_admins`, `moderation_actions`.
12. Un'organizzazione `suspended` e i suoi eventi, fili e spazi non sono visibili ad `anon` né ad altri utenti, anche tramite `map_items` e `connection_lines`; il suo membro li vede ancora.
13. `admin_review_list()` e `moderate_organization()` falliscono per un non-admin; per un admin `admin_review_list()` non ha colonne con NIF né email.
14. `register_entity`: NIF in elenco → `municipal_registry`, non segnalato; invito valido per una discoteca → `invite`, non segnalato; discoteca senza invito → `self_declared`, segnalato; libreria senza invito → non segnalata; `venue` senza attività → `venue_activity_required`; `venue` senza risposte → `answers_required`.
15. Un utente non può modificare `entry_method`, `status`, `flagged_for_review`, `last_reviewed_at` della propria organizzazione.
16. `lookup_municipal_association` restituisce solo `found` e `name`.

I test girano in GitHub Actions (`.github/workflows/db-test.yml`: `supabase start` + `supabase test db`), oppure a mano su mapa-dev con
`npx supabase test db --linked` (transazione con rollback).

## Regole per cambiare lo schema
- Una migrazione nuova per ogni cambio; le migrazioni unite sono immutabili.
- Rinominare/togliere = expand (aggiungi il nuovo) → migrate (backfill, cambia il codice) → contract (togli il vecchio), in tre PR.
- Dopo ogni migrazione: `npm run db:types` e i tipi generati nella stessa PR.
