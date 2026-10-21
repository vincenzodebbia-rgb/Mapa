# Piano di costruzione

> Una sessione = un ramo = una PR. Prima di ogni sessione: `/clear` in Claude Code, poi incolla il prompt.
> Claude propone un piano (plan mode): leggilo, approvalo, poi lascialo lavorare.
> Le durate sono stime: con i limiti del piano Pro conta 2-4 settimane di calendario fino alla demo.
> Il design (nome, logo, copertina) **non** fa parte di questo piano fino alla Fase D.
> **Ordine (revisione del 21 ottobre, `docs/decisioni/2026-10-revisione-sezioni.md`):** si costruiscono tutte le sessioni 3-9 prima del lancio. **Dopo la sessione 4** il fondatore mostra la demo in privato a 2-3 associazioni di fiducia per raccogliere commenti prima delle sessioni 5-9. Fuori restano solo la Memoria del año e i fili accesi (costruiti, ma dietro il flag `threads` fino a dopo il lancio).
> Le modifiche al database decise nella revisione si fanno con migrazioni nuove nella sessione che costruisce quella parte.

## Fase 0 — Prima di scrivere codice (tu, senza Claude Code)

- [ ] **Salvataggio del vecchio progetto.** Nel vecchio repository: `git add -A && git commit -m "archive" && git push`. Esporta il vecchio database in un file cifrato per te. Non lo migrerai.
- [ ] **Strumenti sul computer:** Node.js 22 LTS, Git, (su Windows) Git Bash, `jq`. Claude Pro attivo con Claude Code (app desktop, terminale o claude.ai/code).
- [ ] **Account a tuo nome con 2FA** e codici di recupero salvati offline: GitHub, Supabase, Vercel, Cloudflare (per Turnstile).
- [ ] **GitHub:** nuovo repository **pubblico** e vuoto (pubblico = protezioni del ramo gratuite e AGPL coerente). Nome neutro, es. `mapa`, finché il nome non è deciso.
- [ ] **Supabase:** due progetti nella stessa regione UE (Frankfurt o Paris): `mapa-dev` e `mapa-prod`. Salva URL, chiave publishable, chiave secret e password del database in un password manager. **Mai** in chat, mai nel codice.
- [ ] **Open data, verifica a mano (15 minuti):**
  - il dataset del registro/censo di associazioni del Comune di Madrid contiene davvero il **numero di iscrizione**? Annota il nome della colonna. Se non c'è, fermati: la registrazione per numero va ripensata prima della sessione 5;
  - il dataset dei confini dei barrios (formato GeoJSON o shapefile) e la sua licenza.
- [ ] **Kit nel repository:** clona il repo vuoto, copia dentro tutti i file di questo kit, `git add -A && git commit -m "chore: project rules and docs" && git push`.

## Sessione 1 — Scheletro e guardrail (ramo `chore/skeleton`)

> Leggi AGENTS.md, docs/SPEC.md e docs/DESIGN_HANDOFF.md. create-next-app rifiuta una cartella che contiene già i nostri file, quindi: `npx create-next-app@latest ../scaffold-tmp --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --disable-git --skip-install`, poi `cp -rn ../scaffold-tmp/. .` (copia solo i file che mancano: i nostri file vincono sempre), poi unisci il blocco Next.js di `../scaffold-tmp/AGENTS.md` in cima al nostro AGENTS.md senza perdere le nostre regole (`next dev` lo riaggiunge da solo: va committato), e solo dopo cancella `../scaffold-tmp`. In package.json metti `"name": "mapa"`. Aggiungi `!.env.example` al .gitignore.
> Installa: `@supabase/ssr @supabase/supabase-js server-only zod next-intl maplibre-gl react-map-gl sharp` e in dev `eslint-plugin-import-x eslint-import-resolver-typescript dependency-cruiser vitest @playwright/test prettier`.
> Script in package.json: `typecheck` (tsc --noEmit), `lint` (eslint .), `deps` (depcruise src --config .dependency-cruiser.cjs), `test` (vitest run), `e2e` (playwright test), `check` (typecheck + lint + test), `db:types` (supabase gen types typescript --project-id <dev> > src/lib/database.types.ts).
> Usa i file già presenti: eslint.config.mjs, .dependency-cruiser.cjs, .claude/, .github/, src/config/, src/app/globals.css (non cambiarne i valori). TypeScript strict. Crea: `src/lib/supabase/{server,client,proxy-session,admin,unwrap}.ts` (admin = chiave secret, `server-only`), `src/lib/env.ts` (variabili validate con zod), `src/lib/dates.ts` (Europe/Madrid), `src/proxy.ts` (solo refresh della sessione), next-intl senza routing con `messages/es.json`, le cartelle vuote dei 9 blocchi, `src/components/ui/` con Button e Input sui token, una home provvisoria con il nome da `brand.ts`. Elimina le pagine demo di create-next-app.
> Configura in `next.config.ts` gli header di sicurezza (CSP statica che permette solo self, Supabase, tiles.openfreemap.org, challenges.cloudflare.com; X-Content-Type-Options; Referrer-Policy strict-origin-when-cross-origin).
> Prova i guardiani: crea un file che importa un blocco da un altro e uno con un colore esadecimale, mostrami che `npm run lint` fallisce con il messaggio giusto, poi cancellali. Esegui `npm run check` e `npm run build` e incolla l'output. Aggiorna PROGRESS.md.

**Tu dopo la sessione:** su GitHub → Settings → Rules → nuovo ruleset su `main`: PR obbligatoria, check `check` e `secrets-scan` obbligatori, blocco force push. In Actions → Variables aggiungi `DEV_SUPABASE_URL` e `DEV_SUPABASE_PUBLISHABLE_KEY`. Su Vercel importa il repo, regione funzioni `fra1`, variabili: Preview → progetto dev, Production → progetto prod.
**Si chiude quando:** lint rosso sull'import vietato, CI verde sulla PR, anteprima Vercel che si apre dal telefono.

## Sessione 2 — Database (ramo `feat/database`)

> Leggi docs/DATA_MODEL.md e la sezione Database di AGENTS.md. Collega la CLI Supabase **solo** a mapa-dev. Scrivi le migrazioni in quest'ordine: estensioni ed enum; neighborhoods; organizations, memberships, organization_verifications, registry_entities, terms_acceptances; events, event_organizers; threads; invites; spaces; geocode_cache, rate_limits; funzioni; viste `map_items` e `connection_lines`; bucket e policy Storage. RLS e policy nella stessa migrazione di ogni tabella. Poi `supabase/seed.sql` secondo SPEC §15 (dati fittizi, date relative a now(), 5 numeri di registro inventati). Scrivi i 10 test pgTAP elencati in DATA_MODEL. Applica a mapa-dev con `npx supabase db push`, genera i tipi con `npm run db:types`. Prova a lanciare i test pgTAP in GitHub Actions; se non riesci, dimmelo e scrivi gli stessi controlli come test Vitest che usano la chiave publishable contro mapa-dev. Mostrami l'output dei test.

**Si chiude quando:** i test di sicurezza passano, `connection_lines` non mostra fili pending ad anon, i tipi generati sono nella PR.

## Sessione 3 — Mappa "Hoy" e "Conexiones" statica, in sola lettura (ramo `feat/map`)

> Leggi SPEC §4 e §6. Nel blocco `map`: `data.ts` legge la vista `map_items` (e i barrios); funzioni pure `light-state.ts` (`getLightState`: solo `pulse` e `lit`, niente `faint`), `to-geojson.ts`, `build-popup.ts` (solo `textContent`, link solo http/https) con test Vitest, compreso un titolo `<img src=x onerror=alert(1)>`. Un solo componente client `components/map-view.tsx` con react-map-gl/maplibre, caricato con `dynamic(..., { ssr: false })` da un piccolo wrapper client; i dati arrivano dalla pagina server come GeoJSON e aggiornano la `<Source>`. I colori della mappa si leggono a runtime dalla variabile CSS `--color-light`.
> **Hoy (`/`):** solo eventi (`pulse` oggi, `lit` prossimi 7 giorni). Interruttore "Solo hoy" (`?solo=hoy`), filtri nell'URL: Gratis/De pago, Categoría, Quién organiza (Asociaciones · Espacios · Gente que hace cosas), Barrio (centra la mappa e filtra l'elenco). Legenda richiudibile a due stati, vista elenco con gli stessi filtri, messaggio per i giorni vuoti, attribuzione OpenStreetMap visibile. Pulse disattivato con prefers-reduced-motion.
> **Conexiones (`/conexiones`):** mappa statica di chi c'è, con lo stesso componente: associazioni ed espacios attivi con indirizzo, punto acceso, nome al tocco con link a `/a/[slug]`, vista elenco. Nessun filo.
> Niente immagini. Se serve una migrazione (es. tipo degli organizzatori nella vista, centro dei barrios), scrivila e fermati: il push su mapa-dev lo lancia il fondatore.
> Test Playwright: "la home mostra almeno un punto dalla seed e la vista elenco mostra lo stesso numero di elementi", e lo stesso per `/conexiones`.

**Si chiude quando:** dal telefono vedi gli eventi della seed nei due stati, "Solo hoy" e i filtri funzionano, `/conexiones` mostra chi c'è; i test Playwright passano.

## Sessione 4 — Pagine pubbliche e Google (ramo `feat/public-pages`)

> Leggi SPEC §5 (pagina evento), §7, §14. Pagine `/a/[slug]`, `/e/[slug]`, `/barrio/[slug]`, `/que-es`, `/legal` composte in `src/app` chiamando i blocchi. Metadati, JSON-LD (`Event`, `Organization`, `BreadcrumbList`), Open Graph (pagina evento: immagine generata di solo testo con titolo, data e luogo, oppure nessuna; **nessuna foto evento**), `sitemap.ts` e `robots.ts` con le regole di indicizzazione della tabella §14, redirect 301 degli eventi 7 giorni dopo la fine, `noindex` dei barrios vuoti e di "Gente que hace cosas" che l'ha chiesto. Pulsante Compartir (Web Share API con fallback WhatsApp e copia). `/legal` con testi segnaposto e attribuzioni degli open data e di OpenStreetMap.
> Scheda `/a/[slug]`: logo piccolo facoltativo e "Nuestra historia" (SPEC §7). Se si fanno qui (o nella sessione 7): migrazione con colonna `logo_path`, bucket `org-logos` + policy (stessa regola di percorso di `event-images`) e colonna `story` (max 1000); logo ri-codificato con sharp in WebP max 256×256 px senza metadati, test che un JPEG con GPS esce senza GPS.
> Pagine di barrio: servono i confini ufficiali, script `scripts/import-neighborhoods.ts` (open data del Comune, licenza nelle attribuzioni di `/legal`). Test: JSON-LD valido su una pagina evento della seed.

**Si chiude quando:** le pagine si aprono dal telefono, la sitemap contiene solo pagine indicizzabili.

## Punto demo privata (dopo la sessione 4, tu con Claude)
> Leggi SPEC §15 (sito demo). Banner fisso **"Demo · datos de ejemplo"** dietro un flag (es. `demoBanner`, acceso solo nel progetto demo tramite variabile d'ambiente). Controlla che i nomi della seed siano chiaramente inventati.

**Tu:** su Vercel un secondo progetto (es. `mapa-demo`) dallo stesso repository, con le variabili di **mapa-dev** in Production. Dopo il primo login sulla demo, aggiungi a mano la tua riga in `memberships` verso un'associazione fittizia della seed (come per `app_admins`, `docs/operations.md`). Poi mostra la demo in privato a 2-3 associazioni di fiducia e raccogli i commenti prima delle sessioni 5-9.

## Sessione 5 — Accesso e registrazione (ramo `feat/onboarding`)

> Leggi SPEC §2 e §8, e PRIVACY_AND_OWNERSHIP parte A. Login con link magico (`/entrar`), callback, `src/proxy.ts` che aggiorna la sessione; le pagine private ricontrollano l'utente con `getClaims()`. `/registro` con i tre percorsi (associazione, espacio, "Gente que hace cosas" = `professional`; vedi `docs/decisioni/2026-10-iscrizione.md` e `docs/decisioni/2026-10-revisione-sezioni.md`). Espacios: "¿Quiénes sois?" (`what_for_whom`), tipo de actividad, "¿Qué ofrecéis?" e indirizzo, tutti obbligatori; migrazione che sostituisce `how_sustained` con `what_they_offer` (espandi → migra i dati → contrai) e aggiorna `admin_review_list`. Inviti facoltativi; revisione automatica minima per tutti; chiamano le funzioni SQL `lookup_municipal_association`, `register_entity` e `create_professional`; casella regole + condiciones + privacidad + età, con versione dei testi. Cloudflare Turnstile sui moduli (verifica lato server in `src/lib/turnstile.ts`) e `check_rate_limit` sui tentativi. Script `scripts/import-municipal-associations.ts` che importa il CSV del Comune (solo CIF, Razon_Social, Num_Inscripcion, Distrito, Barrio, Categoria; righe con lo stesso CIF unite) usando la chiave secret; in dev usa solo i NIF fittizi della seed. Avviso al fondatore per gli espacios dubbi (`founderNotificationEmail` in `brand.ts`, mai NIF né email). Decidere: associazione fuori elenco senza invito (con o senza avviso), categoria "Comerciantes…", espacio gestito da un autonomo. Test: NIF già usato, NIF personale, NIF valido in elenco e fuori elenco.

**Si chiude quando:** un'associazione di prova si registra dal telefono e arriva a `/panel`.

## Sessione 6 — Eventi (ramo `feat/events`)

> Leggi SPEC §5. Modulo in 4 blocchi a `/panel/eventos/nuevo` e modifica a `/panel/eventos/[id]`. Geocodifica lato server in `src/lib/domain/geocode.ts` (Nominatim, User-Agent da env, cache in `geocode_cache`, max 1 richiesta/secondo) e pin trascinabile. **Nessuna immagine evento** (SPEC §5): niente campo nel modulo né nella pagina; il bucket `event-images` (e la colonna `image_path`) si possono togliere con una migrazione. Co-organizzatori con il componente di ricerca passato come slot dalla pagina (il blocco events non importa organizations). Ripetizioni gestite dalla funzione SQL `event_occurrences`. Limite 20 eventi al giorno con `check_rate_limit`. Sezione "Mis eventos" e "Archivo" in `/panel`.

**Si chiude quando:** crei un evento dal telefono in meno di un minuto e lo vedi acceso sulla mappa.

## Sessione 7 — Home privata (ramo `feat/panel`)

> Leggi SPEC §9. In `/panel`: Invita (facoltativo; link `/invitacion/[token]`, messaggio precompilato, WhatsApp/copia, landing pubblica tramite `get_invite`), Mi ficha (dati di contatto pubblici ben visibili, logo, "Nuestra historia" se non fatti nella sessione 4, "Mostrar mi perfil en Google" per "Gente que hace cosas"), riquadro "Ayuda y contacto" (`brand.contactEmail` + link a `/legal`), Mi cuenta: "Descargar mis datos" (`export_my_data`) ed "Eliminar cuenta" (prima i file Storage, compreso il logo, poi `delete_my_account`, con conferma). Niente Memoria del año (flag `annualMemory` spento). `/panel` è composizione di pagina: nessun blocco nuovo.

**Si chiude quando:** scarichi il tuo JSON ed elimini un account di prova senza lasciare tracce (test).

## Sessione 8 — Fili e Conexiones (ramo `feat/threads`, flag `threads`)

> Leggi SPEC §6. Si costruisce prima del lancio ma resta **dietro il flag `threads` spento** fino a dopo il lancio. Proporre, accettare, ignorare, modificare la propria storia, eliminare. Pending visibile solo alle due associazioni. Su `/conexiones` (che già mostra chi c'è dalla sessione 3) si aggiungono le linee dalla vista `connection_lines` nello stesso componente `map-view` (modalità linee), colori casuali dai token `--color-thread-*`, solo con il flag acceso. Elenco dei fili nella scheda dell'associazione. Test: un terzo non vede il pending.

## Sessione 9 — Bacheca Profesionales (ramo `feat/professionals`, flag `professionals`)

> Leggi SPEC §10. `/profesionales` solo per utenti registrati: bacheca di annunci **Busco / Ofrezco** (tipo, barrio, descrizione max 300, contatto scelto), filtri Busco/Ofrezco, tipo, barrio, testo. Scadenza automatica dopo 60 giorni con rinnovo a un clic; pulsante "Ya lo he encontrado" che chiude l'annuncio. Gli ex "Espacios disponibles" sono annunci "Ofrezco espacio", pubblicabili solo da associazioni ed espacios. Migrazione: scadenza, stato chiuso, eventuale unificazione con `spaces`. Nessun messaggio interno. È composizione di `organizations` e `spaces`.

## Punto demo
Controlla i 15 criteri di accettazione di SPEC §16 dal telefono, uno per uno. Ciò che non è pronto va dietro un flag, non si cancella.

## Prima del lancio pubblico (3-5 giorni)
- [ ] Testi legali rivisti da un avvocato; RAT compilato (PRIVACY parte B).
- [ ] Indirizzi email reali in `brand.ts` (contatto e contenuti illegali).
- [ ] Test pgTAP in CI (o equivalenti) per ogni tabella; drift dei tipi in CI.
- [ ] Test Playwright dei flussi: registrazione, evento, filo, elimina account.
- [ ] Monitoraggio errori senza dati personali (Sentry piano gratuito, con `sendDefaultPii: false`) — con ADR.
- [ ] Backup cifrato giornaliero in un repository privato o storage privato (`docs/operations.md`).
- [ ] Knip (codice morto) in CI.
- [ ] `ARCHITECTURE.md` aggiornato; `PROGRESS.md` pulito.
- [ ] Supabase Pro (25 $/mese) quando ci sono associazioni vere: backup automatici e niente pausa.
- [ ] CLA Assistant attivo sul repository.
- [ ] Revisione della sicurezza: `/security-review` in Claude Code + Security Advisor di Supabase senza avvisi.

## Fase D — Design (quando nome e concetto visivo sono decisi)
Segui `docs/DESIGN_HANDOFF.md`. Un solo ramo `design/identity`. Poi compra il dominio, aggiorna `NEXT_PUBLIC_SITE_URL`, valuta il marchio (PRIVACY parte C).

## Dopo ogni sessione (checklist per te, senza leggere codice)
1. Claude ha incollato l'output di `npm run check`? Se dice "fatto" senza output, chiedilo.
2. Lancia `@architecture-reviewer`: deve dire "OK to merge".
3. Nella PR, scheda "Files changed": i file stanno nelle cartelle del blocco della sessione? Compaiono migrazioni vecchie, `.env`, test modificati o cancellati? Se sì, fermati e chiedi perché.
4. Apri l'anteprima Vercel dal telefono e fai quello che dice la sessione.
5. Chiedi: "Spiegami in italiano cosa hai cambiato e cosa potrebbe rompersi."
6. CI verde → merge. Rosso → non si unisce, mai.
7. Se Claude sbaglia due volte la stessa cosa: `/clear`, poi riparti con un prompt più preciso.
