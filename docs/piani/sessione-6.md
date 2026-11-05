# Piano della sessione 6 — Eventi (ramo `feat/events`)

> Bozza scritta dall'agente il 5 novembre 2026, **senza codice**, da approvare con il fondatore.
> Fonti: `docs/BUILD_PLAN.md` (sessione 6), `docs/SPEC.md` §2, §5, §9, §12, §16, `docs/DATA_MODEL.md` (events, event_organizers,
> funzioni, viste), `docs/decisioni/2026-10-revisione-sezioni.md` (§3, §8, foto), `docs/decisioni/2026-10-29-iscrizione.md`,
> `src/features/events/CLAUDE.md` e il codice già esistente (pagina evento, viste, `event_occurrences`, `event_schedule`).
> I punti da decidere sono raccolti in fondo (§9) e richiamati nel testo come **[D1]**, **[D2]**…

## 1. Obiettivo e criterio di chiusura
- Un'organizzazione con accesso crea un evento **dal telefono in meno di un minuto** (obiettivo SPEC: 30 secondi) e lo vede
  acceso sulla mappa Hoy (`pulse` se è oggi, `lit` nei prossimi 7 giorni).
- Copre i criteri di accettazione SPEC §16: n. 3 (evento con titolo e data, il resto precompilato), n. 4 (un professionista
  crea un evento in un bar, che compare sulla mappa solo per quell'evento), n. 7 (titolo con `<script>` mostrato come testo,
  oggi coperto solo da test unitari: con il modulo diventa un e2e), n. 8 (nessuno modifica eventi di altri).

## 2. Cosa c'è già (non si rifà)
- **Database**: tabelle `events` ed `event_organizers` con RLS, grant per colonna, trigger (slug, barrio dal punto,
  `last_activity_at`, riga `owner` automatica), `event_occurrences` (ripetizioni in ora di Madrid), `event_schedule`, viste
  `map_items` e `upcoming_events`, vincoli: durata ≤ 24 h, `price_amount` se e solo se `paid`, `recurrence_until` ≤ 6 mesi
  (in ora di Madrid). Test pgTAP 04, 05, 08, 10, 13, 15.
- **Pagina evento** `/e/[slug]` (sessione 4): statica, 404 e 308 veri, JSON-LD, Compartir, "Cómo llegar", Open Graph solo testo
  senza immagine.
- **Sessione 5**: `src/lib/geocode.ts` (Nominatim con cache e ritmo) e `src/lib/domain/geocode.ts`, pin trascinabile
  `LocationPicker` nel blocco `map` con `PointFieldProvider` (`src/components/ui/point-field.tsx`), limiti di frequenza
  (`src/lib/rate-limit.ts`), utente con `getCurrentUserId()`, `/panel` provvisorio.

## 3. Pagine (src/app, solo composizione)
| Rotta | Chi | Cosa compone |
|---|---|---|
| `/panel` | utente con organizzazione | Nome + "Nuevo evento" + **Mis eventos** (in arrivo con Editar/Eliminar, pasados) + **Archivo** (numero di eventi dell'anno e totale, solo per loro) + Salir. Resta provvisorio per il resto (Invita, Mi ficha, Mi cuenta: sessione 7). |
| `/panel/eventos/nuevo` | membri di un'organizzazione attiva | Modulo in 4 blocchi, precompilato (§4). |
| `/panel/eventos/[id]` | membri dell'organizzazione proprietaria | Stesso modulo con i valori salvati + "Eliminar evento" con conferma. Co-organizzatori: vedi **[D6]**. |
Tutte `instant = false`, `noindex`, utente ricontrollato nella pagina (`getCurrentUserId()` → altrimenti `/entrar`; senza
organizzazione → `/registro`). `robots.ts` copre già `/panel`.

## 4. Il modulo in 4 blocchi (SPEC §5)
Un solo componente client nel blocco `events` (`components/event-form.tsx`), `useActionState`, campi rimandati indietro
dopo un errore come nell'iscrizione (stesso schema `values` + `key`), testi in `messages/es.json` (gruppo nuovo `eventForm`),
ricevuti come props.
1. **Qué** — `title` (obbligatorio, max 120); `category` precompilata **[D3]**; `price_type` (`free` di default, `donation`,
   `paid`) + `price_amount` solo se `paid` (≥ 0, due decimali, nessun tetto).
2. **Cuándo** — giorno (`<input type="date">`, oggi di default) e ora di inizio/fine (`<input type="time">`, fine proposta
   = inizio + 2 h, proposta fatta nel browser senza obbligo); interruttore "Se repite" → `weekly` | `monthly` + data di fine
   (max 6 mesi). Fine prima dell'inizio = evento che passa la mezzanotte **[D4]**. Eventi nel passato **[D5]**.
3. **Dónde** — precompilato con la sede per associazioni ed espacios con indirizzo; vuoto per "Gente que hace cosas".
   Indirizzo + `venue_name` facoltativo + "Buscar en el mapa" + pin trascinabile (slot del blocco `map`). **Senza coordinate
   non si pubblica**: se manca il pin, l'action geocodifica l'indirizzo; se non lo trova, errore sul campo.
   Componente dell'indirizzo condiviso con l'iscrizione **[D2]**.
4. **Más** (chiuso di default, `<details>`) — descrizione (max 500); **"Organizado junto a"**: ricerca di altre organizzazioni
   per nome, slot passato dalla pagina (il blocco `events` non importa `organizations`) **[D7]**.
Niente campo immagine (decisione del 21 ottobre).

### Ore e fusi
- Nuova funzione in `src/lib/dates.ts`: giorno + ora **di Madrid** → istante ISO (`timestamptz`), unico posto. Test con i due
  cambi d'ora (29 marzo e 25 ottobre 2026), anche per gli orari che non esistono (02:30 del giorno del cambio di marzo) o
  che esistono due volte (02:30 di ottobre) **[D4]**.
- Le ripetizioni restano solo in SQL (`event_occurrences`): TypeScript salva la regola, non calcola occorrenze.

## 5. Blocchi e file
### `events` (blocco proprietario)
- `schema.ts` (zod): `eventFormSchema` con gli stessi limiti delle colonne; prezzo coerente con il tipo; durata ≤ 24 h;
  `recurrence_until` tra il giorno d'inizio e +6 mesi; coordinate dentro la Comunidad de Madrid (`isInsideMadridRegion`);
  `coorganizerIds` (uuid, massimo **[D7]**). Test Vitest.
- `actions.ts` (`'use server'`), ordine di AGENTS.md:
  - `createEvent`: zod → utente + membership di un'organizzazione **attiva** → limite **20 eventi al giorno per
    organizzazione** (`check_rate_limit` con chiave `event:<owner_org>`, l'id dell'organizzazione non è un dato personale)
    → punto (pin o geocodifica) → insert in `events` (con il client dell'utente: la RLS fa da arbitro) → insert delle righe
    `co` → `updateTag(EVENTS_TAG)` e `updateTag(ORGANIZATIONS_TAG)` (le pagine dei barrios usano tutti e due) → redirect
    **[D8]**.
  - `updateEvent`: zod → utente membro dell'`owner_org` → limite di modifiche **[D9]** → update delle sole colonne permesse
    → riallineamento dei co-organizzatori (aggiunte/rimozioni) → `updateTag`.
  - `deleteEvent`: utente membro dell'`owner_org`, conferma → delete (a cascata gli organizzatori) → `updateTag`.
  - `leaveEvent`: un co-organizzatore si toglie (policy già esistente) **[D6]**.
  - Errori del database tradotti come in `mapRegistrationDbError` (violazioni dei vincoli → messaggi sul campo).
- `data.ts`: `getEventForEdit(id, userId)` (client dell'utente, colonne esplicite), `getEventsForOrganization(orgId)` per Mis
  eventos (in arrivo/passati, prossima occorrenza da `event_schedule` o da una vista nuova **[D10]**), `getArchiveCounts(orgId)`,
  `getOrganizationDefaults(orgId)` (sede, categoria) **[D3]**. Letture private: mai in `'use cache'`.
- `components/`: `event-form.tsx`, `my-events-list.tsx`, `archive-counts.tsx`, `delete-event-button.tsx`.
- `CLAUDE.md` del blocco aggiornato (geocodifica ora in `src/lib/geocode.ts`, non `domain/geocode.ts`; slot del pin e della
  ricerca dei co-organizzatori; niente bucket immagini).
### `organizations`
- `data.ts`: `searchOrganizationsByName(query)` per "Organizado junto a" (solo organizzazioni attive, colonne `id, slug, name,
  kind`, massimo 8 risultati) e `getOrganizationPlace(orgId)` (indirizzo + punto della sede, per precompilare **Dónde**).
- `components/coorganizer-picker.tsx` (client): ricerca + elenco scelto, scrive campi nascosti `coorganizerIds` nel modulo
  dell'evento. La ricerca è una Server Action del blocco `organizations`, con limite per utente.
### `map`
- Nessun componente nuovo: si riusa `LocationPicker`. Se serve un punto iniziale (sede o evento in modifica), il
  `PointFieldProvider` riceve un valore iniziale (modifica piccola di `src/components/ui/point-field.tsx`).
### `src/lib`
- `dates.ts`: conversione giorno + ora di Madrid → istante (§4), con test.
- Eventuale spostamento del campo indirizzo e dell'action di geocodifica in un posto comune **[D2]**.

## 6. Database
Nessuna migrazione è **necessaria** per creare, modificare ed eliminare eventi: tabelle, RLS, grant e trigger ci sono già.
Migrazioni **facoltative**, da decidere (il push lo fa il fondatore):
- **[D1]** togliere la colonna `events.image_path` e il bucket `event-images`.
- **[D10]** una vista o funzione per "Mis eventos" (prossima occorrenza di ogni evento di un'organizzazione senza espandere
  tutti gli eventi: oggi `event_schedule` lavora un evento per volta, ma `event_occurrences` dentro espande tutto).
- **[D3]** nessuna colonna nuova se la categoria precompilata è `organizations.usual_category`.
Se c'è una migrazione: test pgTAP nuovi o aggiornati, prova a secco in transazione annullata come nelle sessioni 2-5
(`npx supabase db query --linked` su mapa-dev), poi il fondatore lancia `db push` e si rigenerano i tipi.

## 7. Test
- **Vitest**: `eventFormSchema` (titolo, prezzo, durata, ripetizione, coordinate, co-organizzatori); conversione delle ore di
  Madrid con i cambi d'ora; mappa degli errori del database; stati "in arrivo / passato" di Mis eventos se calcolati in TS.
- **pgTAP**: già coperti RLS di eventi e organizzatori (04, 05, 10). Nuovi test solo con migrazioni **[D1]**, **[D10]**.
  Da aggiungere comunque (file nuovo `17_event_writes.sql`, senza migrazione): oggi nessun test prova che un **membro**
  non può cambiare `owner_org` né `slug` del proprio evento (lo impediscono i grant per colonna e il trigger
  `event_identity_immutable`, ma 04 prova solo un'altra organizzazione), né che un'organizzazione sospesa non può creare eventi
  (10 da ricontrollare), né il co-organizzatore che si toglie da solo.
- **Playwright** (telefono, utenti creati con l'admin e cancellati, solo mapa-dev, come `e2e/onboarding.spec.ts`):
  1. associazione della seed (membership aggiunta dal test) → `/panel/eventos/nuevo` con solo titolo e ora → evento acceso
     su `/` (stesso conteggio punti/elenco dei test della mappa) e su `/e/[slug]`; tempo misurato;
  2. "Gente que hace cosas" crea un evento in un bar non registrato → il punto compare su Hoy, nessun punto su Conexiones;
  3. titolo `<img src=x onerror=alert(1)>` → testo nel popup e nella pagina (SPEC §16.7);
  4. un utente di un'altra organizzazione non apre `/panel/eventos/[id]` né riesce a modificarlo (404);
  5. evento settimanale: 2 occorrenze nella settimana dove previsto; modifica e cancellazione;
  6. co-organizzatore: compare "Organizado por X y Y"; si toglie **[D6]**.
  Attenzione: Nominatim vero nei test (cache dopo il primo giro), come nella sessione 5.

## 8. Ordine di lavoro proposto (commit piccoli)
1. `dates.ts` + test; schema zod + test.
2. Letture (`data.ts` di events e organizations) e pagine `/panel/eventos/nuevo` e `/panel/eventos/[id]` senza salvataggio.
3. `createEvent` → e2e 1 verde (chiusura della sessione); poi `updateEvent`, `deleteEvent`.
4. Co-organizzatori (ricerca, salvataggio, "quitarme").
5. Mis eventos + Archivo in `/panel`.
6. Migrazioni facoltative decise in §9 (prova a secco → push del fondatore → tipi).
7. e2e restanti, `npm run check`, `deps`, `build`, `e2e`, `@architecture-reviewer`, PROGRESS.md.

## 9. Punti aperti da decidere con il fondatore
- **[D1] Bucket `event-images` e colonna `image_path`**: toglierli adesso con una migrazione o lasciarli? Proposta: **togliere
  la colonna** dai grant e dalla tabella (nessun codice la usa) e **lasciare il bucket** vuoto per ora: la funzione
  `private.can_write_event_image` la usano anche le policy di `org-logos`, e Supabase non permette più di cancellare
  righe dello schema `storage` con SQL diretto (va fatto dalla dashboard o dall'API Storage, che per regola non usiamo).
  Alternativa: lasciare tutto com'è e annotarlo.
- **[D2] Campo indirizzo + "Buscar en el mapa" condiviso**: oggi `AddressField` e l'action `locateAddress` stanno nel blocco
  `onboarding`, che `events` non può importare. Proposta: spostare il campo in `src/components/ui/address-field.tsx` (generico,
  riceve l'action come prop) e l'action in un file condiviso di `src/app` (per esempio `src/app/geocode-actions.ts`), passata
  dalle pagine ai due moduli. Alternativa: duplicare il campo nel blocco `events` (più semplice, ma due copie).
- **[D3] Categoria precompilata**: SPEC dice "la più usata dall'organizzazione". Proposta: la più usata tra i suoi eventi
  (conteggio in `data.ts`), altrimenti `organizations.usual_category` dell'iscrizione, altrimenti nessuna (il campo diventa
  obbligatorio da scegliere). Va bene, o basta `usual_category`?
- **[D4] Orari**: (a) se l'ora di fine è prima dell'inizio, si intende il giorno dopo (concerto 22:00–02:00)? Proposta: sì,
  con la durata massima di 24 h già nel database. (b) orari che non esistono al cambio dell'ora (29 marzo 2026, 02:00–03:00):
  proposta: rifiutarli con un messaggio. (c) orari doppi (25 ottobre, 02:00–03:00): proposta: si prende il primo.
- **[D5] Eventi nel passato**: si possono creare eventi già finiti (per l'Archivo)? Proposta: **no** per la creazione (inizio
  non prima di oggi), sì modificare la descrizione di un evento passato. Il database oggi non lo impedisce.
- **[D6] Co-organizzatori: chi vede cosa in `/panel`**: gli eventi in cui la mia organizzazione è co-organizzatrice compaiono
  in "Mis eventos" (solo lettura + "Quitarme")? Proposta: sì, in un elenco separato "Junto a otras". Solo l'owner modifica.
- **[D7] "Organizado junto a"**: (a) chi può essere co-organizzatore: tutte le organizzazioni attive (anche espacios e "Gente
  que hace cosas") o solo associazioni? La policy attuale accetta qualunque organizzazione attiva. (b) quanti al massimo?
  Proposta: tutte le attive, massimo 5. (c) nessun consenso preventivo (non c'è un sistema di notifiche): il co-organizzatore
  si può togliere quando vuole. Va bene, sapendo che qualcuno potrebbe aggiungere un'organizzazione grande senza chiederle?
- **[D8] Dopo "Publicar"**: dove si va? Proposta: alla pagina dell'evento `/e/[slug]` con un messaggio "Publicado" e il
  pulsante Compartir in evidenza (è il momento in cui si condivide). Alternativa: tornare a `/panel`.
- **[D9] Limiti**: 20 eventi creati al giorno per organizzazione (deciso). Per le **modifiche** proposta: 60 all'ora per
  organizzazione; per la ricerca dei co-organizzatori: 60 all'ora per utente. Ok?
- **[D10] "Mis eventos" e prestazioni**: per ogni evento serve la prossima occorrenza. Proposta: nella sessione 6 usare
  `event_schedule` per ogni evento dell'organizzazione (pochi eventi), e solo se diventa lento una vista nuova con migrazione.
- **[D11] Ripetizioni mensili**: oggi "mensile" = stesso giorno del mese (`inizio + k mesi`); un evento il 31 cade il 30 o il
  28/29 nei mesi più corti. Serve anche "il primo giovedì del mese"? Proposta: no nella v1 (si scrive nella descrizione).
- **[D12] Modifica di un evento ripetuto**: si cambia sempre tutta la serie (nessuna eccezione per una sola data, nessun
  "annulla solo il 14"). Proposta: sì nella v1; per cancellare una data si accorcia la serie o si scrive nella descrizione.
- **[D13] Open Graph della pagina evento**: oggi nessuna immagine (scelta permessa da SPEC §5). Generare un'immagine di solo
  testo (titolo, data, luogo) con `next/og` vorrebbe dire un font incorporato e una dipendenza dal design non ancora deciso.
  Proposta: **rimandare** alla fase di design.

## 10. Cosa serve dal fondatore (nella sessione 6)
- Le risposte a §9 (almeno D2, D4, D5, D7, D8 prima di cominciare il modulo).
- Se si decide una migrazione: `npx supabase db push` su mapa-dev dal suo terminale.
- Per la prova di chiusura dal telefono: la riga in `memberships` che lega il suo utente a un'associazione della seed su
  mapa-dev (come `app_admins`), oppure un'associazione registrata da lui con un NIF fittizio libero (`G99000045`, `G99000052`).
- Ancora aperto dalla sessione 5: Redirect URL e template email su Supabase, chiavi Turnstile vere su Vercel, PR di
  `feat/onboarding` (vedi `PROGRESS.md`).
