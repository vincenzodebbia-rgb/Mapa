# Rapporto della sessione 6 — eventi (notte del 13-14 novembre 2026)

Ramo `feat/eventi`, creato da `main` aggiornato (merge della PR #17). Solo commit locali, **niente push**.
La migrazione nuova **non è applicata**: la applica il fondatore domattina (comandi in fondo).

## 1. Cosa è stato fatto
**Punto 0 — accesso**
- Con `NEXT_PUBLIC_DEMO=1`, `/entrar` e `/registro` rimandano alla mappa (`/`).
- Se manca `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, oppure una delle variabili segrete del server (`SUPABASE_SECRET_KEY`,
  `TURNSTILE_SECRET_KEY`, `NOMINATIM_USER_AGENT`), `/entrar` e `/registro` mostrano "El acceso estará disponible pronto"
  invece della pagina d'errore. Le due action (link magico, iscrizione) rispondono con un errore pulito anche se chiamate
  direttamente. Lo stato si decide in un solo posto: `src/lib/access.ts`.

**Decisioni del 13 novembre** (`docs/decisioni/2026-11-13-eventi.md`)
- D4: un evento già finito non si pubblica, controllato nel modulo e nel database (trigger `events_not_in_past`).
- D5: un evento può passare la mezzanotte (fine prima dell'inizio = giorno dopo), al massimo 24 ore. La mappa Hoy lo mostra
  finché non è finito: era già così (vista `map_items` e stato `pulse`), nessuna modifica necessaria.
- D7: niente co-organizzatori, nemmeno via API (tolti policy e permesso di `insert` su `event_organizers`).
- D8: dopo "Publicar", evento di oggi → `/?evento=<slug>` (mappa Hoy centrata sul punto, popup aperto); futuro → `/e/<slug>`.

**Modulo "Nuevo evento"** (`/panel/eventos/nuevo`)
- 4 blocchi: Qué (titolo, tipo, prezzo), Cuándo (giorno, inizio, fine, ripetizione), Dónde (indirizzo + "Buscar en el mapa"
  + pin, nome del luogo), Más (descrizione, chiuso).
- Precompilato: oggi, 19:00–21:00 (o dalla prossima ora piena di sera), categoria abituale, sede con il pin già al suo posto.
  Per un'associazione con sede bastano titolo e ora.
- `createEvent`: zod → utente e organizzazione attiva → limite 20 al giorno → pin o geocodifica → insert con i permessi
  dell'utente (la RLS decide) → aggiornamento delle cache → redirect D8.

**/panel**: pulsante "Nuevo evento", "Mis eventos" (prossimi con "Eliminar" e conferma, poi passati).

## 2. File (per blocco)
- **events:** `actions.ts` (nuovo), `schema.ts` (nuovo) + test, `types.ts`, `data.ts` (`getEventOwner`, `getMyEvents`),
  `components/event-form.tsx`, `components/my-events-list.tsx`, `components/delete-event-button.tsx` (nuovi), `CLAUDE.md`.
- **map:** `schema.ts` (parametro `evento`) + test, `components/hoy-view.tsx`, `components/map-view.tsx` (punto aperto).
- **auth / onboarding:** `auth/actions.ts`, `onboarding/actions.ts` (controllo di accesso), `onboarding/schema.ts`,
  `onboarding/components/registration-form.tsx` (campi spostati).
- **pagine:** `src/app/entrar/page.tsx`, `src/app/registro/page.tsx`, `src/app/panel/page.tsx`,
  `src/app/panel/eventos/nuevo/page.tsx` (nuova).
- **condivisi:** `src/lib/access.ts` (+ test), `src/lib/server-env.ts`, `src/lib/dates.ts` (+ test),
  `src/lib/domain/address.ts` (nuovo), `src/components/ui/form-field.tsx` e `address-field.tsx` (spostati da onboarding),
  `src/components/ui/point-field.tsx` (punto iniziale), `messages/es.json`.
- **database:** `supabase/migrations/20261113194715_events_session6.sql`, `supabase/tests/18_event_writes.sql`.
- **e2e:** `e2e/events.spec.ts` (nuovo), `e2e/demo.spec.ts`.
- **docs:** `docs/decisioni/2026-11-13-eventi.md`, `docs/DATA_MODEL.md`, questo rapporto, `PROGRESS.md`.

## 3. Commit (su `feat/eventi`)
1. `b7b6618` feat: accesso nascosto nella demo e "disponible pronto" senza chiavi
2. `b7567b4` feat(db): niente eventi nel passato e niente co-organizzatori via API (D4, D7)
3. `29fc14b` feat(events): schema del modulo, ore di Madrid e campi condivisi
4. `b15265c` feat(events): modulo Nuevo evento, Mis eventos ed evento aperto sulla mappa
5. `f01e10c` test(e2e): Nuevo evento, mappa Hoy aperta, titolo HTML, passato, Eliminar
6. docs: decisioni, rapporto e PROGRESS (questo commit)

## 4. Esito dei test
- `npm run check`: typecheck e lint verdi, Vitest **172/172** (31 file).
- `npm run deps`: nessuna violazione. `npm run build`: verde.
- e2e (`npx playwright test`): **22 verdi, 4 rossi attesi**. I 4 rossi pubblicano un evento: senza la migrazione nuova il
  database rifiuta l'insert (manca `grant insert (slug)`) e il modulo mostra "No podéis publicar eventos con esta
  organización". Non sono stati indeboliti. Verdi anche "un evento ya terminado no se publica" e "sin sesión → /entrar".
- e2e demo (`npm run e2e:demo`): 6/6 verdi (al primo giro un test è andato in timeout per la prima compilazione lenta,
  al secondo giro tutto verde).
- pgTAP: **non eseguiti** (nessun database locale, e la regola di stanotte era non toccare mapa-dev). Il nuovo file 18 e
  gli altri 17 girano in CI (db-test) appena c'è una PR.

## 5. Punti "da confermare" (scelte dell'agente)
1. **D4, cosa vuol dire "nel passato":** "già finito". Un evento in corso si può pubblicare. In modifica conta solo se si
   cambiano orari o ripetizione (la descrizione di un evento passato resta modificabile); per una serie conta l'ultimo giorno.
2. **Cambio dell'ora (piano D4 b, c):** un'ora che non esiste si rifiuta con un messaggio, un'ora doppia prende la prima.
3. **Fine uguale all'inizio** (19:00 → 19:00) = 24 ore, accettato. Più di 24 ore reali (notte del cambio d'ora) no.
4. **D1 immagini:** colonna `image_path` e bucket `event-images` lasciati come sono (nessuna migrazione distruttiva).
5. **D2 campo indirizzo:** `FormField` e `AddressField` spostati in `src/components/ui`; ogni blocco ha la sua action di
   ricerca (`locateAddress` per l'iscrizione, `locateEventAddress` per gli eventi), con lo stesso limite di 30 all'ora
   per utente (stessa chiave).
6. **D3 categoria precompilata:** `usual_category` dell'iscrizione; senza, il campo è da scegliere (niente conteggio "la più
   usata").
7. **D6:** non serve (niente co-organizzatori). Mis eventos mostra solo gli eventi di cui si è titolari.
8. **D9 limiti:** 20 eventi al giorno (deciso), 60 eliminazioni all'ora per organizzazione. Modifiche: non fatte (vedi §6).
9. **D10 Mis eventos:** senza espandere le ripetizioni; una serie è "in arrivo" finché il suo ultimo giorno non è passato e
   si mostra la data della prima occorrenza + "se repite hasta…", non la prossima occorrenza.
10. **D11, D12:** mensile = stesso giorno del mese; una serie si cambia solo tutta (nessuna eccezione per una data).
11. **D13 Open Graph:** rimandato alla fase di design.
12. **Slug all'inserimento:** superato dalla correzione 1 del fondatore (vedi §8).
13. **"Accesso disponibile"** richiede anche `NOMINATIM_USER_AGENT`: senza, il server rifiuta tutte le variabili segrete
    insieme (`getServerEnv`), quindi anche il link magico si romperebbe.
14. **Testo del prezzo "a offerta":** "Aportación voluntaria", come nei filtri della mappa.
15. **Orario proposto:** 19:00–21:00; dalle 19 in poi la prossima ora piena (+2 ore, anche dopo mezzanotte); dopo le 23 domani.

## 6. Punti saltati (non bloccanti, da fare dopo)
- **Archivo** (numero di eventi dell'anno) in /panel.
- e2e del piano non scritti: "Gente que hace cosas" in un bar non registrato, evento settimanale con 2 occorrenze.
- Prova a secco dei pgTAP su mapa-dev: non fatta (la fa la CI, db-test).
- Revisione con `architecture-reviewer`: non lanciata.

## 7. Dopo il push, nell'ordine
1. PR in bozza verso `main` (la apre il fondatore). CI: check, secrets-scan, db-test con pgTAP 1–18. **~4-5 minuti.**
2. Solo con db-test verde, il fondatore: `npx supabase db push --linked --dry-run` (**~10 s**), poi
   `npx supabase db push --linked` (**~15 s**).
3. L'agente: `npm run db:types` (**~15 s**): `slug` diventa facoltativo nell'insert. Poi toglie il segnaposto `slug: "nuevo"`
   da `createEvent` (riga con il TODO), `npm run check` (**~1-2 min**), `npx playwright test` (**~2-3 min**: i 4 rossi
   devono diventare verdi), commit di tipi + correzione, push sulla stessa PR.

## 8. Correzioni e decisioni dopo il rapporto (14 novembre)
**Correzioni**
1. **Slug:** tolto `grant insert (slug)`. La colonna ha ora un valore predefinito (stringa vuota: se il trigger mancasse,
   il vincolo sul formato la rifiuterebbe) e gli utenti non hanno nessun permesso su `slug`. Il trigger continua a
   scriverlo dal titolo. pgTAP 18: l'utente che manda uno slug riceve 42501; senza slug l'insert funziona; il titolo
   cambia e lo slug no.
   **Attenzione:** il tipo generato smette di chiedere `slug` solo dopo l'applicazione della migrazione e `npm run db:types`.
   Fino ad allora `createEvent` manda ancora il segnaposto (altrimenti il typecheck della CI fallisce): con la migrazione
   applicata e i tipi vecchi la pubblicazione è rifiutata. Va tolto subito dopo la rigenerazione dei tipi (§7, passo 3).
2. **Bucket `event-images`: trovato un buco.** Le policy `event_images_insert_members` e `event_images_update_members`
   (sessione 2) permettevano a ogni membro di un'organizzazione attiva di caricare e riscrivere file nella cartella della
   propria organizzazione, direttamente con l'API Storage (l'interfaccia non ha mai avuto un campo immagine). Tolte nella
   migrazione. Restano la lettura (il bucket è vuoto) e la cancellazione (serve a eliminare l'account). In più gli utenti non
   possono più scrivere la colonna `image_path` (nessun codice la usa). Il bucket in sé resta (D1: si toglie più avanti).
   `service_role` può ancora scriverci, come in ogni bucket: lo usa solo il nostro server. pgTAP 18: il membro che carica
   in `event-images` riceve 42501.
3. **Test "un'altra organizzazione":** pgTAP 18 (B prova update, delete e cambio di `owner_org` su un evento di A: nessuna
   riga toccata o 42501) ed e2e (`/panel/eventos/<id di A>` → 404; modulo ed Eliminar con l'id di A nel campo nascosto →
   rifiutati, l'evento di A non cambia).

**Decisioni**
- **A:** fine uguale all'inizio rifiutata ("La hora de fin debe ser distinta de la de inicio") nel modulo e nel database
  (vincolo `events_end_differs_from_start` sulle ore di Madrid, `not valid` per non bloccare la migrazione su righe vecchie:
  vale per ogni insert e update da adesso).
- **B:** `/panel/eventos/[id]` con lo stesso modulo, `updateEvent` (zod → utente e organizzazione proprietaria attiva →
  limite 60 all'ora → punto → update con la RLS → cache → `/panel?evento=guardado`). Pulsante "Editar" in Mis eventos.
  Per una serie già cominciata conta l'ultimo giorno, come nel trigger; un evento singolo già finito mostra "ya ha
  terminado" invece del modulo.

**Esito dei test dopo le correzioni**
- `npm run check`: typecheck e lint verdi, Vitest **175/175**. `npm run deps`: verde. `npm run build`: verde.
- e2e: **24 verdi, 4 rossi attesi** (pubblicazione dal modulo: aspettano migrazione + tipi + tolto il segnaposto).
  Verdi: modifica (titolo nuovo, stesso slug) e "un'altra organizzazione" (404 e rifiuti).
- pgTAP: in CI (db-test) con la PR.
