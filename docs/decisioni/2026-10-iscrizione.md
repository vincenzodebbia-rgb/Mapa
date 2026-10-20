# Aggiornamento del modello dati — decisioni sull'iscrizione (15–17 ottobre 2026)

> Da applicare a `docs/DATA_MODEL.md` e `docs/SPEC.md` **all'inizio della sessione 2**, prima di scrivere le migrazioni.
> Testo in italiano (regola sulla lingua del 17 ottobre); nomi di tabelle, colonne e funzioni in inglese.
> Dove questo documento contraddice DATA_MODEL.md, vale questo documento.
> **Applicato il 2026-10-18** (sessione 2) a DATA_MODEL, SPEC e PRIVACY_AND_OWNERSHIP, con tre correzioni del fondatore:
> i `venue` possono pubblicare `spaces`; il NIF accetta solo il formato degli enti (mai DNI/NIE);
> le domande sono obbligatorie per i `venue` e facoltative per le `association`.

## 1. Chi entra e come

| Chi | Come entra | Revisione | `entry_method` |
|---|---|---|---|
| Associazione presente nell'elenco del Comune (NIF trovato in `municipal_associations`) | subito | nessuna | `municipal_registry` |
| Chiunque arrivi con un invito valido di un'associazione già sulla mappa, di qualunque tipo | subito | nessuna | `invite` |
| Spazio (`venue`) con attività "tranquilla" | email + NIF + tipo di attività + 3 domande | nessuna | `self_declared` |
| Spazio (`venue`) con attività "dubbia", senza invito | subito | avviso al fondatore (`flagged_for_review = true`) | `self_declared` |
| Collettivo o artista (`professional`) | solo email, nessun punto fisso | nessuna | `email_only` |
| Associazione **non** nell'elenco del Comune e senza invito | **DA DECIDERE** (sessione 5): o entra senza revisione, o entra con avviso | — | `self_declared` |

- Lo schema deve permettere entrambe le scelte dell'ultimo caso: la differenza è solo se `register_entity()` mette `flagged_for_review = true`. Nessuna migrazione in più quando si decide.
- La categoria del Comune "Comerciantes, empresarios, profesionales y autónomos" (157 righe) si importa comunque con la sua categoria: come trattarla si decide nella sessione 5.
- **Nessun tetto di prezzo** sugli eventi (già così nello schema: non aggiungere vincoli).
- In tutta la UI, `venue` si chiama "Espacio" e ha una sua sezione "Espacios". Attenzione al conflitto di nome con la tabella `spaces` (spazi disponibili in affitto/prestito): il nome delle due sezioni nella UI si decide nella sessione 9, lo schema non cambia.

## 2. Nuovi enum

- `entry_method`: `municipal_registry`, `invite`, `self_declared`, `email_only`
- `venue_activity`: tranquille `libreria`, `sala_pequena`, `centro_cultural`, `galeria`, `taller_estudio`, `cafe_cultural`; dubbie `discoteca_club`, `bar_nocturno`, `otro`
- `org_status`: `active`, `suspended`
- `moderation_action`: `suspend`, `reactivate`, `delete`

La lista "tranquilla / dubbia" vive in **un solo posto**: la funzione SQL `is_doubtful_activity(venue_activity)` (immutable), usata da `register_entity()`. TypeScript non la ripete.

## 3. Nuove tabelle

| Tabella | Blocco | Scopo | Dati personali |
|---|---|---|---|
| `municipal_associations` | onboarding | Copia minima dell'elenco del Comune per riconoscere le associazioni dal NIF | no (enti) |
| `organization_answers` | onboarding | Le 3 risposte aperte dell'iscrizione | no (testo scritto dall'ente) |
| `app_admins` | account | Chi può usare la pagina privata di revisione (oggi: solo il fondatore) | user id |
| `moderation_actions` | account | Storico di sospensioni, riattivazioni ed eliminazioni, con motivazione | user id dell'admin |

### municipal_associations (privata)
`cif text primary key` (normalizzato come in `organization_verifications`), `name text not null`, `registry_number text`, `district text`, `neighborhood text`, `category text`, `imported_at timestamptz default now()`.
- RLS attiva, **nessuna policy**. Si legge solo tramite `lookup_municipal_association(p_nif)`.
- Si importa **solo** da `CIF`, `Razon_Social`, `Num_Inscripcion`, `Distrito`, `Barrio`, `Categoria`. **Mai** telefono, email, indirizzo, numero soci. Righe con lo stesso CIF unite in una (94 casi). Script `scripts/import-municipal-associations.ts` nella sessione 5; nella sessione 2 solo la tabella e qualche riga **fittizia** nel seed.
- Fonte: dataset "Entidades de participación ciudadana. Asociaciones (Sección 1ª)", CSV `;`, UTF-8 con BOM, licenza CC BY 4.0 (attribuzione in `/legal`).

### organization_answers (privata)
`organization_id uuid primary key references organizations on delete cascade`, `what_for_whom text (≤500)`, `how_sustained text (≤500)`, `updated_at`.
- RLS: `select`/`update` solo dai membri dell'organizzazione. Inserita da `register_entity()`. Gli admin la leggono solo tramite `admin_review_list()`.
- Il "tipo di attività" (terza domanda) è la colonna `organizations.venue_activity`. Il campo facoltativo "web o red social" è `organizations.contact_url` (pubblico, già esistente).

### app_admins
`user_id uuid primary key references auth.users on delete cascade`, `created_at`.
- RLS attiva, **nessuna policy**. Funzione `is_admin()` (security definer, stable) = esiste una riga per `auth.uid()`.
- Il fondatore si aggiunge **una volta**, a mano, dopo il primo login su mapa-dev e su mapa-prod (procedura in `docs/operations.md`). Mai ruoli in `user_metadata`.

### moderation_actions (privata)
`id`, `organization_id uuid` (**senza** foreign key: la riga resta anche dopo l'eliminazione), `organization_name text not null` (copia al momento dell'azione), `action moderation_action not null`, `reason text not null (≤1000)`, `admin_id uuid references auth.users on delete set null`, `created_at`.
- RLS attiva, nessuna policy. Scritta solo da `moderate_organization()`.
- La motivazione viene inviata all'organizzazione per email dall'action (testo standard in `messages/es.json` + motivo), come chiede la regola DSA.

## 4. Modifiche a tabelle esistenti

### organizations
Nuove colonne:
- `entry_method entry_method not null` (impostata solo dalle funzioni; esclusa dal `grant update`);
- `venue_activity venue_activity` — obbligatoria se `kind = 'venue'`, nulla altrimenti (check constraint); pubblica; **inclusa** nel `grant update` (l'ente può correggerla, ma il cambio ricalcola `flagged_for_review` con un trigger);
- `status org_status not null default 'active'` (esclusa dal `grant update`);
- `flagged_for_review boolean not null default false` (esclusa dal `grant update`);
- `last_reviewed_at timestamptz` (esclusa dal `grant update`).

RLS `select` cambia:
- `anon` e `authenticated`: solo `status = 'active'`;
- i membri vedono sempre la propria organizzazione, anche se sospesa (per leggere la motivazione e scaricare i dati).

### events, event_organizers, threads, spaces
- Gli elementi di un'organizzazione `suspended` **spariscono dal pubblico**: le policy `select` pubbliche aggiungono la condizione "l'organizzazione proprietaria è `active`" (per `threads`: entrambe). I membri continuano a vederli.
- Le viste `map_items` e `connection_lines` restano `security_invoker`: ereditano il filtro senza codice in più.
- Un'organizzazione sospesa non può creare eventi, fili, inviti né spazi (controllo nelle policy `insert`).

### invites
- Può creare inviti solo un'organizzazione `association` e `active` (trigger). Chi usa l'invito entra con `entry_method = 'invite'`, qualunque `kind` scelga, senza avviso.

### organization_verifications
Invariata. Il NIF resta obbligatorio per `association` e `venue`, qualunque sia il modo di ingresso (anche con invito).

## 5. Funzioni nuove o cambiate

| Funzione | Tipo | Cosa fa |
|---|---|---|
| `lookup_municipal_association(p_nif)` | security definer | Restituisce solo `true/false` + il nome ufficiale, per mostrare "¿Sois *nombre*?" in fase di iscrizione. Mai altri campi. L'action chiama prima `check_rate_limit` (anti-enumerazione: max 10 al giorno per connessione). |
| `register_entity(...)` | security definer, **cambiata** | Nuovi parametri `p_venue_activity default null`, `p_what_for_whom default null`, `p_how_sustained default null`. Decide `entry_method`: invito valido → `invite`; altrimenti `association` con NIF nell'elenco → `municipal_registry`; altrimenti `self_declared`. Mette `flagged_for_review = true` se `venue` + `is_doubtful_activity()` + nessun invito. Il caso "associazione fuori elenco senza invito" usa per ora `flagged_for_review = false` e ha un commento `-- DA DECIDERE (sessione 5)`. Salva le risposte in `organization_answers`. Restituisce anche `flagged` così l'action sa se mandare l'avviso. Nuovo codice di errore `venue_activity_required`. |
| `create_professional(...)` | security definer, **cambiata** | `entry_method` = `invite` se c'è un invito valido, altrimenti `email_only`. |
| `is_doubtful_activity(p_activity)` | immutable | Vedi §2. |
| `is_admin()` | security definer, stable | Vedi `app_admins`. |
| `admin_review_list()` | security definer | Se `is_admin()`: per **tutte** le organizzazioni restituisce `id, slug, name, kind, entry_method, venue_activity, neighborhood name, contact_url, what_for_whom, how_sustained, status, flagged_for_review, created_at, last_reviewed_at`. **Mai** NIF, email, telefono, user id. Altrimenti errore `forbidden`. |
| `moderate_organization(p_org, p_action, p_reason)` | security definer | Se `is_admin()`: `suspend` / `reactivate` cambiano `status`; `delete` elimina l'organizzazione (stessa cascata di `delete_my_account`, senza toccare `auth.users`). Scrive sempre `moderation_actions`. Motivo obbligatorio. Restituisce l'email del contatto dell'ente solo all'action server, per l'invio della motivazione. |
| `mark_reviewed(p_org)` | security definer | Se `is_admin()`: `last_reviewed_at = now()`, `flagged_for_review = false`. |
| `export_my_data()` | **cambiata** | Include anche `organization_answers` e le `moderation_actions` sulla propria organizzazione. |
| `delete_my_account()` | **cambiata** | Elimina anche `organization_answers`. |

L'avviso al fondatore per gli spazi "dubbi" lo manda l'**action** (non il database), alla mail in `src/config/brand.ts` → `founderNotificationEmail`, con: nome, tipo, attività, web, risposte. **Mai il NIF né l'email di chi si iscrive.**

## 6. Test pgTAP da aggiungere (dopo i 10 esistenti)

11. `anon` e utenti normali non leggono `municipal_associations`, `organization_answers` (di altri), `app_admins`, `moderation_actions`.
12. Un'organizzazione `suspended` e i suoi eventi, fili e spazi non sono visibili ad `anon` né ad altri utenti, anche tramite `map_items` e `connection_lines`; il suo membro li vede ancora.
13. `admin_review_list()` e `moderate_organization()` falliscono per un non-admin; per un admin `admin_review_list()` non ha colonne con NIF né email (controllo sui nomi delle colonne restituite).
14. `register_entity`: NIF nell'elenco → `municipal_registry`, non segnalato; invito valido per una discoteca → `invite`, non segnalato; discoteca senza invito → `self_declared`, segnalato; libreria senza invito → non segnalato; `venue` senza attività → `venue_activity_required`.
15. Un utente non può modificare `entry_method`, `status`, `flagged_for_review`, `last_reviewed_at` della propria organizzazione.
16. `lookup_municipal_association` restituisce solo `found` e `name`.

## 7. Privacy (da riportare in `docs/PRIVACY_AND_OWNERSHIP.md`)

- La revisione di tutti i profili ogni 2-3 mesi esiste e va scritta nelle condiciones e nell'informativa.
- Per la revisione con Claude si usano solo i dati di `admin_review_list()` (nome, tipo, attività, barrio, web, risposte). Mai NIF né email.
- Nuova riga nella tabella dei dati: `organization_answers` (testo scritto dall'ente, privato), `moderation_actions` (conservazione: finché serve per eventuali reclami, massimo 3 anni).

## 8. SPEC.md

Aggiornare la sezione sull'iscrizione con la tabella del §1 (in linguaggio semplice) e le tre domande in spagnolo:
1. "¿Qué hacéis y para quién?"
2. Tipo de actividad (elenco del §2, in spagnolo nell'interfaccia)
3. "¿Cómo se sostiene el proyecto?"
Più il campo facoltativo "Web o red social" per tutti.
