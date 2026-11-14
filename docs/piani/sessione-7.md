# Piano della sessione 7 — Home privata: Mi ficha, Mi cuenta, Archivo, Ayuda y contacto (ramo `feat/profilo`)

> Scritto dall'agente il 14 novembre 2026, lavorando da solo (fondatore assente). Le scelte dell'agente sono segnate
> **[P1]**, **[P2]**… e sono tutte **da confermare** (elenco anche in `docs/rapporti/sessione-7.md`).
> Fonti: `docs/SPEC.md` §7 e §9, `docs/BUILD_PLAN.md` (sessione 7), `docs/DATA_MODEL.md`,
> `docs/decisioni/2026-10-revisione-sezioni.md` §4, §6, §10, `docs/rapporti/sicurezza-2026-11.md` (B1, B3, B4, B5),
> le istruzioni del fondatore del 14 novembre.

## 1. Principio e confini
- **Un account = una realtà** (associazione, espacio, "gente que hace cosas"). Le persone non hanno profili propri
  dentro un'associazione. Per questo "Eliminar cuenta" cancella **sempre** anche la realtà.
- **Il logo NON si fa** (rimandato dal fondatore). La colonna `logo_path` e il bucket `org-logos` restano come sono.
- **Invita** (previsto in BUILD_PLAN per la sessione 7) non è nella lista del fondatore: **non si fa** in questa sessione.
- Memoria del año: fuori dalla v1 (flag `annualMemory` spento), come deciso.
- `/panel` resta composizione di pagina: nessun blocco nuovo. Mi ficha sta nel blocco `organizations` (possiede la
  scheda), Mi cuenta nel blocco `account`, Archivo nel blocco `events`.

## 2. Pagine
| Rotta | Cosa |
|---|---|
| `/panel` | Nome, Nuevo evento, Mis eventos (sessione 6), **Archivo**, link a **Mi ficha** e **Mi cuenta**, **Ayuda y contacto**, Salir. |
| `/panel/ficha` | Modulo di modifica della scheda pubblica, campi per tipo. |
| `/panel/cuenta` | "Descargar mis datos" e "Eliminar cuenta" con conferma scritta. |
| `/panel/cuenta/datos` | Route Handler `GET`: il JSON di `export_my_data()` come file da scaricare, `private, no-store`. |

Tutte private (`instant = false`, `noindex`), utente ricontrollato nella pagina e nell'action (mai solo nel proxy).

## 3. Mi ficha
- **Campi per tipo** (gli stessi dell'iscrizione) **[P1]**:
  - associazione (anche fondazione, cooperativa, ente pubblico): nome, `one_liner`, `when_to_visit`, `usual_category`,
    indirizzo + pin, "¿Para qué y para quién?" (`what_for_whom`), "¿Cómo os sostenéis?" (`how_sustained`), contatti,
    "Nuestra historia";
  - espacio (`commercial`): nome, attività (`venue_activity`), `one_liner`, `when_to_visit`, `usual_category`,
    indirizzo + pin (obbligatori), `what_for_whom`, `what_they_offer` (obbligatori), contatti, "Nuestra historia";
  - "Gente que hace cosas": nome, `one_liner`, barrio (elenco), `seeking_offering` (Busco / Ofrezco), contatti,
    "Mostrar mi perfil en Google" (`indexable`; spento = `noindex` e fuori dalla sitemap, già così dalla sessione 4).
  - Contatti pubblici facoltativi, ben visibili in un blocco a sé: email, telefono, "Web o red social".
  - "Nuestra historia": facoltativa, max 1000 caratteri, solo testo, solo associazioni ed espacios (SPEC §7).
- **Non modificabili**: NIF, tipo di entità (`entity_type`), `kind`. Non sono nel modulo e il database non dà il permesso.
- Cambiare l'attività di un espacio in una "dubbia" riaccende l'avviso di revisione: lo fa già il trigger.
- **Organizzazione sospesa** **[P2]**: niente modulo, un messaggio. Controllo nell'action e nella pagina; la policy di
  `update` nel database resta com'è (B1 del rapporto di sicurezza: decisione aperta del fondatore).
- **Contatti nel database (B4)** **[P3]**: vincoli `check` su `contact_email` (una sola `@`, niente spazi, `?`, `&`, `<`, `>`)
  e `contact_phone` (cifre, spazi, `+`, `-`, `(`, `)`, `.`), `not valid` per non bloccare righe vecchie; nella scheda pubblica
  il `mailto:` passa da `encodeURIComponent`.
- Limite: 30 salvataggi all'ora per organizzazione (action). Geocodifica come negli eventi (pin, altrimenti Nominatim).

## 4. Nome e indirizzo della scheda (slug)
Decisione del fondatore: **quando cambia il nome, cambia anche lo slug**; il vecchio resta riservato all'organizzazione e
rimanda con un **redirect permanente** al nuovo.
- **Conflitto con AGENTS.md** ("Slugs are generated once, unique, and never change when a title changes"): la regola resta
  per gli eventi; per le organizzazioni vale la decisione del fondatore, che conserva lo scopo della regola (i link già
  condivisi funzionano). AGENTS.md lo può aggiornare solo il fondatore.
- Database **[P4]**: tabella `organization_slugs (slug primary key, organization_id, created_at)` con i vecchi slug.
  `make_unique_slug(..., 'organizations')` considera occupati anche questi, così nessun'altra organizzazione prende un
  vecchio slug. Lo fa il trigger `organizations_before_write` quando cambia `name`:
  - se il nuovo nome dà lo stesso slug di prima (maiuscole, accenti) → nessun cambio;
  - se dà uno slug già stato dell'organizzazione stessa → lo riprende (e quello lasciato va nei vecchi);
  - altrimenti uno slug nuovo e unico; il vecchio va in `organization_slugs`.
- **Limite** **[P5]**: al massimo 5 cambi di slug ogni 30 giorni per organizzazione (`check_rate_limit` nel trigger):
  ogni cambio riserva uno slug per sempre, senza limite si potrebbero "occupare" nomi.
- Lettura pubblica dei vecchi slug solo per organizzazioni visibili (RLS che passa da `organizations`): una sospesa non
  rimanda da nessuna parte (404).
- `/a/[slug]`: se lo slug non esiste ma è un vecchio slug → `permanentRedirect` (308) al nuovo. La pagina resta statica
  (`ensureStatic = "navigation"`), redirect vero come per gli eventi.
- Sitemap e link interni (scheda, pagine evento, barrios, /panel) leggono sempre lo slug attuale dal database: dopo un
  cambio si aggiornano con `updateTag(ORGANIZATIONS_TAG)` ed `updateTag(EVENTS_TAG)`.
- Eliminare l'account elimina anche i vecchi slug (a cascata): tornano liberi **[P6]**.

## 5. Mi cuenta
- **Descargar mis datos**: JSON di `export_my_data()` (aggiunti i vecchi slug), file `mis-datos-<data>.json`.
- **Eliminar cuenta** **[P7]**: la schermata spiega prima che si cancellano l'account, la realtà, i suoi eventi, la scheda,
  i vecchi indirizzi e le risposte dell'iscrizione, e che non si può annullare. Conferma scritta: digitare `ELIMINAR`.
  Ordine nell'action: zod → utente → limite → file di Storage della realtà (il logo, se c'è, con il client dell'utente e la
  policy di `org-logos`) → `delete_my_account()` → uscita → home con un messaggio.
- `delete_my_account()` cambia: elimina **sempre** l'organizzazione dell'utente, anche se avesse altri membri (nella v1 non
  succede: un account = una realtà). Prima la eliminava solo se l'utente era l'unico membro.

## 6. Archivo e Ayuda y contacto
- **Archivo** **[P8]**: "eventi fatti" = eventi già finiti (`ends_at <= now()`); "quest'anno" = cominciati nell'anno in corso a
  Madrid. Una serie che si ripete conta come un evento (senza espandere le ripetizioni, B9). Solo per la realtà stessa
  (client dell'utente, RLS), mai in cache.
- **Ayuda y contacto**: `brand.contactEmail` (ancora segnaposto, B14) e link a `/legal`.

## 7. Database (una sola migrazione)
`organization_slugs` + RLS + policy; `make_unique_slug` che guarda anche i vecchi slug; `organizations_before_write` con il
cambio di slug e il limite; vista `organization_slug_redirects` (`security_invoker`); vincoli su `contact_email` e
`contact_phone`; `delete_my_account()` che elimina sempre la realtà; `export_my_data()` con i vecchi slug.
Test pgTAP nuovo `19_profile_account.sql`.

## 8. Test
- Vitest: schema del modulo Mi ficha (per tipo, contatti, storia), conferma di eliminazione, conteggi dell'Archivo se in TS.
- pgTAP: cambio di nome → slug nuovo + vecchio in `organization_slugs`; un'altra organizzazione non prende il vecchio slug;
  ritorno al nome di prima; limite dei cambi; vecchi slug di una sospesa invisibili; vincoli dei contatti; `entity_type` e NIF
  non modificabili; `delete_my_account` elimina realtà, eventi, risposte, verifica e vecchi slug anche con un altro membro;
  `export_my_data` contiene i vecchi slug.
- e2e: Mi ficha salva e la scheda pubblica cambia; vecchio indirizzo → 308 al nuovo (aspetta la migrazione); Mi cuenta
  scarica il JSON con i propri dati; Eliminar cuenta senza la parola giusta non elimina, con la parola elimina tutto (scheda
  404, eventi spariti); Archivo e Ayuda visibili.

## 9. Ordine di lavoro
1. Migrazione + pgTAP. 2. Mi ficha (schema, action, modulo, pagina) e redirect dei vecchi slug. 3. Mi cuenta. 4. Archivo e
Ayuda in /panel. 5. Test, check, deps, build, e2e. 6. Rapporto e PROGRESS.
