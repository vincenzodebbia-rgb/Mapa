# Rapporto della sessione 7 — Mi ficha, Mi cuenta, Archivo, Ayuda y contacto (14 novembre 2026)

Lavoro in autonomia (fondatore assente). Ramo `feat/profilo`, creato da `chore/aggiornamenti` (dipendenze già
aggiornate). Solo commit locali, **niente push**. La migrazione nuova **non è applicata**. Piano:
`docs/piani/sessione-7.md`.

## 1. Pulizia (prima della sessione 7)
- `main` aggiornato fino al merge della PR #20; remote `origin` ora `https://github.com/vincenzodebbia-rgb/Mapa.git`.
- Branch `chore/aggiornamenti`, commit `2c5bd15`: aggiornamenti patch e minor. Il push di questo branch è stato fatto
  **prima** del cambio di programma, con il permesso del fondatore. La PR non è ancora aperta: testo al §7.
- Test sulla pulizia: Vitest 179/179, deps, build, e2e 30/30, e2e demo 6/6. Nessun pacchetto riportato indietro.
- Major non fatti: `eslint` 10, `typescript` 7, `@types/node` 26 (CI e Vercel usano Node 22), CLI `supabase` 3 (fissata a
  2.122.0 di proposito).

## 2. Cosa è stato fatto nella sessione 7
**Database** (migrazione `20261114133035_profile_account`, una sola)
- `organization_slugs`: i vecchi slug di un'organizzazione, riservati a lei. RLS: lettura solo se l'organizzazione è
  visibile (una sospesa non rimanda), nessuna scrittura per gli utenti.
- Quando cambia il nome cambia lo slug (trigger `organizations_before_write` → `private.next_organization_slug`):
  stesso slug se cambiano solo maiuscole o accenti; un vecchio slug proprio si riprende; altrimenti uno nuovo e unico.
  Al massimo 5 cambi di slug ogni 30 giorni per organizzazione (`rate_limited`).
- `make_unique_slug` considera occupati anche i vecchi slug: nessun'altra organizzazione li prende.
- Vincolo `organizations_contact_email_format` (B4 del rapporto di sicurezza), `not valid`.
- `delete_my_account()` elimina **sempre** la realtà (anche con altri membri) e, a cascata, eventi, risposte, NIF e vecchi
  slug. `export_my_data()` contiene anche i vecchi slug.

**Mi ficha** (`/panel/ficha`, blocco `organizations`)
- Campi dell'iscrizione per tipo; contatti pubblici (email, telefono, web o red social) in un blocco a sé; "Nuestra
  historia" (associazioni ed espacios, max 1000); "Mostrar mi perfil en Google" per "Gente que hace cosas".
- NIF ed entity_type non sono nel modulo e non si scrivono. Il tipo si legge sempre dal database.
- `updateProfile`: organizzazione attiva, limite 30/ora, pin o geocodifica, risposte dell'iscrizione aggiornate, cache di
  schede ed eventi aggiornata.
- Scheda pubblica: `mailto:` codificato (B4).

**Mi cuenta** (`/panel/cuenta`, blocco `account`)
- "Descargar mis datos": `GET /panel/cuenta/datos`, file `mis-datos-<data>.json`, `private, no-store`, 10/ora; senza
  sessione → `/entrar`.
- "Eliminar cuenta": la pagina spiega prima cosa si cancella; conferma scritta `ELIMINAR`; prima i file di Storage (logo,
  se c'è), poi `delete_my_account()`, uscita, home.

**/panel**: Archivo (eventi finiti quest'anno e in totale, solo per la realtà), link a Mi ficha e Mi cuenta, Ayuda y
contacto (`brand.contactEmail` + `/legal`).

**Codice condiviso**: `src/lib/domain/form-fields.ts` (validazione comune a iscrizione e Mi ficha), `EVENTS_TAG` spostato
in `src/lib/cache-tags.ts`.

## 3. Commit (su `feat/profilo`, sopra `2c5bd15`)
1. `e3ed2f1` docs: piano della sessione 7
2. `652871c` feat(db): slug che segue il nome con i vecchi riservati, email controllata, account eliminato sempre con la realtà
3. `9a5eefa` feat(organizations): Mi ficha, modifica della scheda pubblica per tipo
4. `e7c3d43` feat: Mi cuenta (scarica i dati, elimina l'account), Archivo e Ayuda y contacto
5. `8db6d96` test(e2e): Mi ficha, Mi cuenta, Archivo e Ayuda
6. docs: rapporto della sessione 7 e PROGRESS (questo commit)

## 4. Test
- `npm run check`: typecheck e lint verdi, Vitest **188/188** (34 file).
- `npm run deps`: nessuna violazione. `npm run build`: verde.
- e2e: **36/37**. L'unico rosso, atteso e non indebolito: "cambiar el nombre cambia la dirección y la antigua lleva a la
  nueva". Senza la migrazione lo slug non cambia; dopo, servono i tipi rigenerati e la lettura dei vecchi slug (§6).
  Verdi: Mi ficha (salvataggio, email non valida, Google), Mi cuenta (JSON con i propri dati, niente dati senza sessione),
  Eliminar cuenta (parola sbagliata → niente; giusta → realtà, eventi e utente spariti, scheda 404), Archivo e Ayuda.
- pgTAP: nuovo `19_profile_account.sql`, aggiornato `05_protected_columns.sql`. **Non eseguiti** (nessun database locale e
  regola di non toccare mapa-dev): li prova la CI (db-test) con la PR.

## 5. Da confermare (scelte dell'agente)
1. **[P1] Campi di Mi ficha**: gli stessi dell'iscrizione per tipo, comprese le risposte private (`what_for_whom`,
   `how_sustained`, `what_they_offer`), con un aiuto che dice che non sono pubbliche.
2. **[P2] Organizzazione sospesa**: non può modificare la scheda né le risposte. **Corretto il 14 novembre su tua richiesta**:
   ora lo blocca anche il database (policy di `update` di `organizations` e `organization_answers` con
   `is_org_active`), oltre a pagina e action. Eventi, spazi e fili delle sospese restano come oggi (resto di B1).
3. **[P3] Contatti nel database**: vincolo solo sull'email. Il telefono resta libero (≤ 30): l'iscrizione accetta già
   qualsiasi testo e un vincolo nuovo potrebbe rompere iscrizioni valide.
4. **[P4] Slug**: per le organizzazioni lo slug segue il nome, per gli eventi non cambia mai. **AGENTS.md aggiornato il
   14 novembre con il tuo permesso.** Il test pgTAP 05, che verificava la vecchia regola, ora verifica la nuova.
5. **[P5] Limite dei cambi di slug**: 5 ogni 30 giorni per organizzazione (ogni cambio riserva uno slug per sempre).
6. **[P6] Vecchi slug dopo l'eliminazione dell'account**: tornano liberi (a cascata, come chiedevi: "i vecchi slug" si
   cancellano).
7. **[P7] Conferma dell'eliminazione**: la parola `ELIMINAR` in maiuscolo; limite 5 tentativi all'ora.
8. **[P8] Archivo**: "eventi fatti" = già finiti; "quest'anno" = cominciati dal 1° gennaio (ora di Madrid); una serie che si
   ripete conta come un evento.
9. **Stesso slug se il nome dà la stessa base**: se lo slug attuale è `festival-2026` e il nome nuovo è "Festival", lo slug
   resta `festival-2026` (la regola tiene "nome-numero" come lo stesso nome).
10. **Mi ficha atomica**: **corretto il 14 novembre su tua richiesta** con la funzione SQL `update_my_profile` (security
    invoker, una sola transazione: o tutto o niente), nella stessa migrazione, con test pgTAP. L'action la userà dopo la
    rigenerazione dei tipi (§8, passo 5): fino ad allora fa ancora due scritture.
11. **Limiti**: 30 salvataggi della scheda all'ora per organizzazione, 10 download dei dati all'ora per utente.
12. **Invita** non fatto: era nel BUILD_PLAN della sessione 7, ma non nella tua lista.

## 6. Saltati (non bloccanti)
- **Redirect dei vecchi slug in `/a/[slug]`**: bloccato dai tipi. `organization_slugs` non esiste nei tipi generati finché la
  migrazione non è applicata e `npm run db:types` non è rilanciato; il client Supabase tipizzato rifiuta una tabella che
  non conosce, quindi il codice non passava il typecheck. Da fare subito dopo i tipi (§8, passo 5): una lettura in cache
  in `organizations/data.ts` (vecchio slug → slug attuale) e `permanentRedirect` in `src/app/a/[slug]/page.tsx` quando la
  scheda non esiste.
- **Logo**: rimandato dal fondatore.
- **Invita**: vedi §5.12.
- Prova a secco dei pgTAP e revisione con `architecture-reviewer`: non fatte.

## 7. Testo delle due PR
### PR 1 — pulizia (non in bozza), branch `chore/aggiornamenti` → `main` (già pushato)
**Titolo:** `Aggiornamenti patch e minor delle dipendenze`

**Descrizione:**
```markdown
## Cosa cambia
Solo aggiornamenti patch e minor, nessun major.

- `next` ed `eslint-config-next` 16.4.2 → 16.4.6, `react` e `react-dom` 19.3.0 → 19.3.1 (restano fissati a versione esatta).
- Nei range di `package.json` (`npm update`): `@playwright/test` 1.65.1, `@supabase/supabase-js` 2.119.0,
  `tailwindcss` e `@tailwindcss/turbopack` 4.3.5, `maplibre-gl` 6.18.0, `vitest` 5.1.0, `dependency-cruiser` 18.7.2,
  `eslint-plugin-import-x` 4.18.1, `prettier` 3.10.1.
- La CLI Supabase resta fissata a `2.122.0`.

`npm audit --omit=dev`: 0 vulnerabilità. Nelle dipendenze di sviluppo restano 7 "moderate" (prima 8).

## Test
- `npm run check`: Vitest 179/179, lint e typecheck verdi.
- `npm run deps` e `npm run build`: verdi.
- e2e 30/30, e2e demo 6/6.

## Major non fatti (da decidere a parte)
`eslint` 9 → 10, `typescript` 5.9 → 7, `@types/node` 22 → 26, `supabase` (CLI) 2.122.0 → 3.x.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### PR 2 — sessione 7 (in bozza finché la migrazione non è applicata), branch `feat/profilo` → `main`
**Titolo:** `Sessione 7: Mi ficha, Mi cuenta, Archivo e Ayuda y contacto`

**Descrizione:**
```markdown
## Cosa cambia
Sessione 7 (home privata). Piano: `docs/piani/sessione-7.md`, rapporto: `docs/rapporti/sessione-7.md`.
Parte da `chore/aggiornamenti`: da unire dopo quella PR.

- **Mi ficha** (`/panel/ficha`): scheda pubblica per tipo, contatti pubblici in evidenza, "Nuestra historia",
  "Mostrar mi perfil en Google" per Gente que hace cosas. NIF e tipo di entità non modificabili.
- **Nome e indirizzo**: quando cambia il nome cambia lo slug; il vecchio resta riservato all'organizzazione e rimanda al
  nuovo (redirect da completare dopo i tipi, vedi sotto). Al massimo 5 cambi ogni 30 giorni.
- **Mi cuenta** (`/panel/cuenta`): "Descargar mis datos" (JSON, privato, mai in cache) ed "Eliminar cuenta" con la parola
  ELIMINAR: si cancellano sempre account, realtà, eventi, risposte, NIF e vecchi indirizzi.
- **/panel**: Archivo (eventi fatti quest'anno e in totale, solo per la realtà) e Ayuda y contacto.
- Sicurezza: formato di `contact_email` controllato nel database e `mailto:` codificato (B4).

**Database** (una migrazione: `20261114133035_profile_account`, non ancora applicata): `organization_slugs`,
`make_unique_slug` e trigger delle organizzazioni, vincolo su `contact_email`, `delete_my_account`, `export_my_data`.

## Test
- pgTAP: nuovo `19_profile_account.sql`; `05_protected_columns.sql` aggiornato alla decisione sullo slug.
- Vitest 188/188, deps e build verdi.
- e2e 36/37 in locale: il rosso è il redirect del vecchio slug (aspetta migrazione, tipi e codice del redirect).

## Prima del merge
1. db-test verde in questa PR.
2. Il fondatore applica la migrazione su mapa-dev.
3. L'agente rigenera i tipi, aggiunge il redirect dei vecchi slug in `/a/[slug]`, rilancia check ed e2e, push qui.

## Da confermare
Le scelte dell'agente sono in `docs/rapporti/sessione-7.md` (§5).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## 7 bis. Correzioni del fondatore (14 novembre, dopo il rapporto)
Nella stessa migrazione `20261114133035_profile_account` (non ancora applicata):
1. **Sospese bloccate nel database**: policy di `update` di `organizations` e `organization_answers` con
   `is_org_active`. pgTAP 19: una sospesa non modifica scheda né risposte (anche via `update_my_profile`), ma scarica i dati.
2. **Mi ficha atomica**: funzione `update_my_profile` (security invoker). pgTAP 19: con una risposta troppo lunga o mezzo
   punto non cambia niente (nome, slug, risposte, vecchi slug); un salvataggio riuscito scrive scheda e risposte insieme e
   non scrive i campi di un altro tipo. L'action la userà dopo i tipi rigenerati.
3. **AGENTS.md**: regola sugli slug aggiornata (organizzazioni: segue il nome, vecchio riservato con 308; eventi: mai).

## 7 ter. Dopo la migrazione (14 novembre)
- Migrazione `20261114133035_profile_account` applicata su mapa-dev dal fondatore, dopo db-test verde nella PR #22.
- Tipi rigenerati (`organization_slugs`, `update_my_profile`).
- `/a/<vecchio slug>` → redirect permanente (308) al nuovo (`getOrganizationSlugRedirect`, in cache come la scheda).
- Mi ficha salva con una sola chiamata a `update_my_profile` (o tutto o niente); errori della funzione tradotti sul campo.
- Test: Vitest 188/188, deps e build verdi, e2e **37/37**.

## 8. Domani, nell'ordine
1. **Fondatore**: apre la PR 1 (pulizia) da GitHub. CI **~4-5 minuti**. Se verde, merge (**~1 minuto**).
2. **Agente, con il tuo permesso**: push di `feat/profilo` (**~10 secondi**). Fondatore: apre la PR 2 in bozza. Se la PR 1 è
   già unita, la PR 2 mostra solo i commit della sessione 7.
3. **CI della PR 2** (check, secrets-scan, db-test con pgTAP 1–19): **~5 minuti**. Se db-test fallisce, lo correggo prima
   del passo 4.
4. **Fondatore, solo con db-test verde**: dal tuo terminale, prima `npx supabase db push --linked --dry-run` (deve
   comparire solo `20261114133035_profile_account`, **~10 secondi**), poi `npx supabase db push --linked` (**~15 secondi**).
5. **Agente**: `npm run db:types` (**~15 secondi**); poi il redirect dei vecchi slug in `/a/[slug]` e `updateProfile` con
   una sola chiamata a `update_my_profile` (**~30-40 minuti** con i test); `npm run check` e `npm run deps` (**~2 minuti**); `npx playwright test` (**~3 minuti**, attesi 37/37);
   commit e, con il tuo permesso, push sulla PR 2 (**~10 secondi**). CI di nuovo **~5 minuti**.
6. **Fondatore**: prova dal vivo sull'anteprima (Mi ficha con cambio di nome e vecchio indirizzo, scarica i dati,
   elimina un account di prova) (**~10 minuti**).
