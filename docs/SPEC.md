# Specifica del prodotto — versione 1 (demo)

> Documento per Claude Code e per il fondatore. Le decisioni qui sotto sono prese: non vanno ridiscusse durante lo sviluppo. Se una richiesta le contraddice, Claude lo dice e chiede.
> Identificatori nel codice in inglese, testi dell'interfaccia in spagnolo (`messages/es.json`).
> **Nome, logo, copertina e stile visivo NON sono decisi.** Si costruisce con segnaposto neutri (`src/config/brand.ts`, token in `src/app/globals.css`). Vedi `docs/DESIGN_HANDOFF.md`.
> Revisione del fondatore del 21 ottobre 2026 applicata: `docs/decisioni/2026-10-revisione-sezioni.md`.
> Decisioni sull'iscrizione del 29 ottobre 2026 applicate: `docs/decisioni/2026-10-29-iscrizione.md`.

**Principio.** La mappa non deve mai ingannare: mostra cose che succedono davvero. Chi esiste ma non fa eventi si vede altrove (mappa Conexiones, scheda, pagina di barrio).

## 1. Cos'è
Una mappa di Madrid che mostra **cosa fanno oggi** le piccole associazioni, i collettivi e i professionisti della cultura e del sociale, e i **fili** tra le associazioni che si sono conosciute o hanno collaborato. Gratis, open source (AGPL-3.0), senza pubblicità né algoritmi. L'obiettivo è che le persone chiudano la mappa ed escano.

## 2. Chi c'è

| Tipo (`organizations.kind`) | Come entra | Sulla mappa | Cosa può fare |
|---|---|---|---|
| `association` — nella UI "Asociación", "Fundación", "Cooperativa" o "Entidad pública" (terzo settore ed enti pubblici: centri culturali municipali, biblioteche) | Email + NIF dell'ente, obbligatorio, col formato del suo tipo (§8). Se il NIF è nell'elenco del Comune entra subito, verificata. Un NIF = un solo account (tranne gli enti pubblici) | Su **Hoy** solo tramite i suoi eventi. Su **Conexiones** un punto alla sede, solo se ha dato un indirizzo | Pubblicare eventi, fili (dopo il lancio), home privata, Invita, annunci nella bacheca Profesionales |
| `venue` — nella UI "Actividad comercial" (bar, librerie, gallerie, studi, caffè culturali, sale piccole, locali notturni…); la sezione resta "Espacios" | Email + NIF d'impresa **facoltativo** + tipo di attività + domande (§8). Indirizzo obbligatorio | Su **Hoy** solo tramite i suoi eventi. Su **Conexiones** un punto alla sede | Pubblicare eventi, annunci "Ofrezco espacio" nella bacheca, home privata. Niente fili né inviti |
| `professional` — nella UI **"Gente que hace cosas"** (collettivi, artisti, persone con progetti) | Iscrizione libera con email | **Nessun punto proprio.** Compare solo tramite i suoi eventi, nel luogo dell'evento | Pubblicare eventi in qualsiasi luogo, annunci nella bacheca Profesionales |
| Luoghi non registrati (bar, studi) | Non si registrano | Solo il giorno di un evento, come "dove succede" | Niente: sono un indirizzo dentro l'evento |
| Cittadini | Nessun account | Vedono tutto il pubblico | Solo condividere un evento |

Nella UI `venue` si chiama "Espacio" (all'iscrizione "Actividad comercial") e `professional` si chiama "Gente que hace cosas"; i valori nel codice non cambiano. La forma giuridica scelta all'iscrizione ("¿Qué sois?", §8) si salva in `organizations.entity_type`: è un dato interno, **mai** mostrato come etichetta o "banda" sulla mappa né nei suoi riquadri (sul telefono meno elementi = più chiarezza). Il filtro "Quién organiza" usa `kind`. Gli ex "Espacios disponibles" diventano annunci di tipo "Ofrezco espacio" nella bacheca Profesionales (§10): la parola "Espacios" indica solo i `venue`.

Accesso: **link magico via email** (Supabase Auth), nessuna password. Chi crea un account dichiara di avere almeno 18 anni (da confermare con l'avvocato, vedi PRIVACY).

Protezione da spam: conferma email, Cloudflare Turnstile sui moduli di iscrizione e invito, limite di frequenza sulle azioni di pubblicazione. **Nessun sistema di segnalazione tra organizzazioni.** Esiste solo un indirizzo email pubblico per segnalare contenuti illegali (obbligo DSA), nella pagina `/legal`.

**Revisione del fondatore (minima).** Non c'è moderazione prima della pubblicazione: tutti entrano subito. Alcune iscrizioni senza invito ricevono un **avviso al fondatore** (`flagged_for_review` + `flag_reason`, tabella in §8): associazioni, fondazioni e cooperative fuori dall'elenco del Comune, enti pubblici (sempre), attività commerciali senza NIF o con attività "dubbia". Ogni 2-3 mesi il fondatore rilegge tutti i profili in una pagina privata (`admin_review_list`: nome, tipo, attività, barrio, web, risposte, motivo dell'avviso; mai NIF né email). Nella sessione 5 l'avviso resta **solo nel database**, letto da una pagina privata minima in sola lettura (solo `is_admin()`) con le organizzazioni segnalate; l'invio per email (a `FOUNDER_NOTIFICATION_EMAIL`, variabile server, mai in `brand.ts`) si decide con il dominio, prima del pilota. Può sospendere, riattivare o eliminare un'organizzazione, sempre con una motivazione che le arriva per email (DSA). Un'organizzazione sospesa sparisce dal pubblico con tutti i suoi contenuti; i suoi membri la vedono ancora. Non è una dashboard: niente statistiche né contatori.

## 3. Pagine (URL in spagnolo)

| Rotta | Pubblico | Contenuto |
|---|---|---|
| `/` | tutti | Mappa **Hoy** a schermo intero (§4) |
| `/conexiones` | tutti | Mappa **Conexiones**: ora chi c'è, dopo il lancio anche i fili (§6) |
| `/a/[slug]` | tutti | Scheda pubblica dell'organizzazione (§7) |
| `/e/[slug]` | tutti | Pagina evento (§5) |
| `/barrio/[slug]` | tutti | Pagina di quartiere (§14) |
| `/que-es` | tutti | Testo breve "qué es" + manifesto (segnaposto in `messages/es.json`) |
| `/legal` | tutti | Aviso legal, privacidad, condiciones, email contenuti illegali, link al codice sorgente, attribuzioni open data |
| `/entrar` | tutti | Login con link magico |
| `/registro` | tutti | Prima domanda "¿Qué sois?" con sei opzioni (§8; testi esatti in `messages/es.json`) |
| `/invitacion/[token]` | tutti | Atterraggio da un invito, con il nome di chi invita (§9) |
| `/panel` | loggati | Home privata (§9) |
| `/panel/eventos/nuevo`, `/panel/eventos/[id]` | loggati | Modulo evento (§5) |
| `/profesionales` | solo loggati | Bacheca annunci Busco / Ofrezco (§10) |
| `/revision` | solo admin (`is_admin()`) | Pagina privata di revisione del fondatore (§2). Sessione 5: sola lettura, solo le organizzazioni segnalate |

Nessuna pagina "tutte le associazioni" ordinata per popolarità. Una vista elenco esiste solo come alternativa accessibile alla mappa (stessi dati e stessi filtri; su Hoy ordinati per orario).

## 4. Mappa "Hoy" (`/`)

**Apertura.** Si entra direttamente nella mappa. La copertina/intro animata è uno **slot vuoto** dietro il flag `intro` (spento): verrà progettata con l'identità visiva. Nessun lavoro su di essa nella v1.

**Base.** MapLibre con lo stile indicato in `brand.mapStyleUrl` (segnaposto: stile scuro di OpenFreeMap). Centro iniziale: Madrid. Niente geolocalizzazione, nessuna richiesta di permessi.

**Solo eventi.** Sulla mappa Hoy ci sono solo occorrenze di eventi non ancora finite nei prossimi 7 giorni. Le organizzazioni **non** compaiono come punti propri (si vedono su Conexiones, §6).

**Due stati di luce, stessa dimensione per tutti i punti:**

| Stato | Cosa rappresenta | Aspetto (token) |
|---|---|---|
| `pulse` | Evento che si svolge **oggi** (ora di Madrid) e non è ancora finito | `--color-light`, pulsante |
| `lit` | Evento nei prossimi 7 giorni | `--color-light`, fermo |

Lo stato `faint` non esiste più sulla mappa Hoy. Gli eventi finiti spariscono dalla mappa (restano nell'archivio). Funzione pura `getLightState(item, now)` con test unitari. Con `prefers-reduced-motion` il `pulse` non pulsa.

**Interruttore "Solo hoy"** ben visibile, nell'URL (`?solo=hoy`): se attivo si vedono solo gli eventi di oggi. Di default è spento (oggi + 7 giorni).

**Legenda:** solo i due stati, con una frase chiara per ciascuno, piccola, richiudibile.

**Filtri** (tutti nell'URL, es. `?precio=gratis&cat=musica&quien=asociaciones&barrio=opanel`). Le categorie **non hanno colori**.
- `Gratis / De pago`: "Gratis" comprende `free` e `donation` (aportación voluntaria); "De pago" è `paid`.
- `Categoría` (`event_category`): `musica` Música · `teatro_danza` Teatro y danza · `arte` Arte · `talleres` Talleres · `encuentros` Encuentros y charlas · `comunidad` Comunidad · `otros` Otros.
- `Quién organiza`: Asociaciones · Espacios · Gente que hace cosas. Un evento compare se **almeno uno** dei suoi organizzatori è di quel tipo.
- `Barrio` (da `neighborhoods`): centra la mappa sul barrio e filtra la vista elenco. I punti fuori dal barrio restano visibili sulla mappa.

**Popup** al tocco: titolo, organizzatore/i, orario, prezzo, indirizzo, pulsante "Ver". Costruito con `textContent`.

**Vista elenco** (pulsante, nell'URL): gli stessi elementi con gli stessi filtri, ordinati per orario.

**Giorni vuoti:** "Hoy no hay nada por aquí. Mira los próximos días." Mai contenuti finti.

## 5. Eventi

**Modulo in 4 blocchi** (`/panel/eventos/nuevo`), pensato per il telefono, obiettivo 30 secondi:
1. **Qué**: `title` (obbligatorio, max 120); `category` (precompilata con la più usata dall'organizzazione); `price_type` `free` | `donation` | `paid` (precompilato `free`) + `price_amount` se `paid`.
2. **Cuándo**: giorno; ora di inizio e di fine (fine proposta = inizio + 2 h); interruttore "Se repite" → `weekly` | `monthly` + data di fine (max 6 mesi).
3. **Dónde**: precompilato con la sede (associazioni). Si può cambiare: indirizzo + nome del luogo (`venue_name`). Geocodifica lato server (Nominatim, User-Agent con contatto, cache, max 1 richiesta/secondo) e **pin trascinabile**. Senza coordinate l'evento non si pubblica.
4. **Más** (chiuso di default): descrizione (max 500); **"Organizado junto a"** altre organizzazioni registrate. **Nessuna immagine** nella v1 (si riconsidera solo con un piano a pagamento e un database grande).

Regole:
- Pubblicazione **senza limite di numero** (solo limite tecnico anti-abuso: 20 eventi al giorno per organizzazione).
- Nessuna prova o conferma. Ogni evento mostra sempre chi lo propone.
- Un co-organizzatore può togliersi da un evento in qualsiasi momento. La collaborazione si legge solo nella pagina evento ("Organizado por X y Y"), non cambia il punto sulla mappa.
- Ripetizioni: si salva la regola, le occorrenze si calcolano in un solo posto, la funzione SQL `event_occurrences`, in ora locale di Madrid (le 19:00 restano 19:00 anche al cambio dell'ora legale). Testata.
- Dopo `ends_at` l'evento non è più sulla mappa ma resta nell'**archivio** dell'organizzazione.
- Il bucket `event-images` non si usa (si potrà rimuovere con una migrazione nella sessione 6).

**Pagina evento** `/e/[slug]`: titolo, organizzatore/i (link), data e ora, prezzo, luogo, descrizione, "Cómo llegar" (OpenStreetMap con coordinate), **Compartir** (Web Share API; fallback link WhatsApp `https://wa.me/?text=` + copia link). Open Graph con un'immagine generata di solo testo (titolo, data, luogo) oppure nessuna immagine. Nessun "aggiungi al calendario".

## 6. Fili e mappa "Conexiones" (`/conexiones`)

**Ora (prima del lancio): mappa statica di chi c'è.** Tutte le associazioni e gli espacios iscritti e attivi (`status = active`) che hanno dato un indirizzo, ciascuno con un punto acceso (`--color-light`, fermo) e il nome al tocco con link alla scheda `/a/[slug]`. Nessun filo. Vista elenco equivalente. Stesso componente mappa di Hoy. Così chi si iscrive "si accende" subito, anche senza eventi.

**Dopo il lancio:** si aggiungono i fili tra associazioni come descritto qui sotto. Il flag `threads` resta spento fino ad allora (lo schema è già pronto).

- **Solo tra associazioni.**
- **Richiesta e conferma:** A propone il filo a B con una storia breve (max 300). Il filo `pending` è visibile **solo ad A e B**, nella loro home. B accetta (e può aggiungere la sua storia) o lo ignora. Dopo 60 giorni il pending scade. Nessuna email, nessuna notifica.
- **Mappa statica:** i punti di chi c'è (come sopra) più i fili confermati tra associazioni. Colore del filo casuale tra `--color-thread-*`, solo estetico.
- **Tocco su un filo:** le due associazioni e le storie. Su telefono la scheda dell'associazione mostra anche l'elenco dei suoi fili.
- **Nessun effetto:** nessun conteggio pubblico, nessuna classifica, nessun vantaggio.
- I fili non invecchiano. Ciascuna delle due può eliminarlo; le storie si aggiornano.

## 7. Scheda pubblica `/a/[slug]`
Minima, senza numeri né contatori: logo piccolo (facoltativo); nome; `one_liner` (max 120); `when_to_visit` (es. "Los jueves a las 19h"); contatto esterno scelto da loro (email e/o telefono e/o web o red social, modificabile da "Mi ficha"); barrio; indirizzo solo se scelto (sempre per gli espacios); **"Nuestra historia"** (associazioni ed espacios, facoltativo); prossimi eventi; per le associazioni, fili confermati con storie (dopo il lancio). "Gente que hace cosas": niente punto, niente indirizzo.

- **Logo:** una sola immagine per organizzazione, facoltativa, ri-codificata lato server in WebP, **massimo 256×256 px**, metadati rimossi, bucket `org-logos` (stessa regola di percorso di `event-images`: prima cartella = organizzazione). Nessuna galleria, nessuna copertina. È l'**unica immagine della v1**. Migrazione (colonna `logo_path` + bucket + policy) nella sessione 4 o 7.
- **"Nuestra historia":** campo testuale facoltativo (max 1000 caratteri, solo testo), modificabile da "Mi ficha". Colonna `story`, migrazione nella sessione 4 o 7. Nessuna sezione separata di storie.

## 8. Registrazione `/registro`
Prima: email → link magico. Poi la **prima domanda: "¿Qué sois?"**. Il NIF e le domande dipendono dalla risposta.

| Opzione (UI) | Esempi | `entity_type` → `kind` | NIF | Avviso al fondatore (senza invito) |
|---|---|---|---|---|
| Asociación | culturali, vicinali, ONG | `association` → `association` | **obbligatorio**, lettera G | no se è nell'elenco del Comune; **sì** se è fuori elenco |
| Fundación | fondazioni culturali o sociali | `foundation` → `association` | **obbligatorio**, lettera G | come le associazioni |
| Cooperativa | cooperative culturali o di lavoro | `cooperative` → `association` | **obbligatorio**, lettera F | come le associazioni |
| Entidad pública | centro cultural municipal, biblioteca | `public_entity` → `association` | **obbligatorio**, lettera P, Q o S; **riusabile** (molti centri usano il NIF del Comune) | **sì, sempre**, anche al primo uso (il NIF di un ente pubblico è pubblico: non prova niente) |
| Actividad comercial | bar, librería, galería, estudio, café cultural | `commercial` → `venue` | **facoltativo**, solo NIF d'impresa: lettera A, B, E o J | **sì** se senza NIF o con attività "dubbia"; no se ha il NIF e un'attività "tranquilla" |
| Gente que hace cosas | artisti, collettivi senza forma giuridica | `informal` → `professional` | nessuno | no |

- Fundación, cooperativa ed entidad pública hanno gli stessi diritti di un'associazione (fili, inviti, filtro "Asociaciones").
- **Un invito valido** fa sempre entrare **senza avviso**, qualunque tipo.
- Associazione (o fondazione, cooperativa) **nell'elenco del Comune**: entra subito con il segno "verificata"; le chiediamo "¿Sois *nombre*?" con il nome ufficiale. **Fuori elenco e senza invito** (es. appena nata): entra subito, con avviso.
- Le associazioni della categoria del Comune **"Comerciantes, empresarios, profesionales y autónomos"** non vengono riconosciute dal NIF (non si importano): se si iscrivono sono fuori elenco, quindi con avviso.
- **Mai documenti personali:** qualunque NIF in formato DNI/NIE (o K/L/M) si rifiuta, anche nel campo facoltativo dell'Actividad comercial. Sotto quel campo, una riga di aiuto: *"Si tu NIF es tu DNI personal o eres autónomo/a, no lo pongas."*
- **Autonomi soli:** nessuna strada propria. Gli artisti entrano come "Gente que hace cosas"; un bar o una libreria gestiti da un autonomo entrano come "Actividad comercial" senza NIF.
- Se il NIF è già usato (tranne gli enti pubblici): messaggio con l'email di contatto del progetto.
- L'avviso resta nel database (`flagged_for_review` + `flag_reason`: `not_in_registry`, `public_entity`, `no_nif`, `doubtful_activity`) e si legge in `/revision`. Non contiene mai NIF né email di chi si iscrive.

**Inviti facoltativi:** nessuno è obbligato a usarli. La **revisione automatica minima** vale per tutti: formato del NIF secondo il tipo, un NIF = un account (tranne gli enti pubblici), conferma email, anti-robot (Turnstile), limiti di frequenza, avviso al fondatore secondo la tabella.

**Asociación, Fundación, Cooperativa, Entidad pública:** NIF → nome (precompilato con il nome ufficiale se è nell'elenco, modificabile) → domande facoltative (decisione del 18 ottobre): "¿Qué hacéis y para quién?" (max 500, `what_for_whom`) e "¿Cómo se sostiene el proyecto?" (max 500, `how_sustained`); indirizzo facoltativo (con pin).

**Actividad comercial** — tre domande, tutte obbligatorie, più l'indirizzo:
1. "¿Quiénes sois?" (max 500) → colonna `what_for_whom`
2. Tipo de actividad: Librería · Sala pequeña · Centro cultural · Galería · Taller o estudio · Café cultural · Discoteca o club · Bar nocturno · Otro
3. "¿Qué ofrecéis a nivel cultural?" (max 500) → colonna `what_they_offer` (le associazioni continuano a usare `how_sustained`)
4. Indirizzo (con pin): obbligatorio, perché è un luogo.
- NIF facoltativo (vedi tabella). Chi non mette il NIF può indicare un **link pubblico** che mostri che il luogo esiste (web, Instagram, Google Maps): **facoltativo** (un bar di quartiere può non avere né web né social). È lo stesso campo "Web o red social" (`contact_url`, pubblico) e compare nella pagina di revisione.

Per tutti c'è il campo facoltativo **"Web o red social"** (pubblico, `contact_url`).
Poi: one_liner, when_to_visit, contatto, categoria abituale. Tutto si salva in una sola chiamata (`register_entity`).

**"Gente que hace cosas"** (`professional`): nome, cosa fa, barrio, contatto, "Web o red social", una riga "Busco / Ofrezco".

In entrambi: casella obbligatoria con 3 regole brevi (realtà vera, nessuna vendita di prodotti, attività reali) + accettazione di condiciones e privacidad. Si salvano versione dei testi e data dell'accettazione.

## 9. Home privata `/panel`
- **Mis eventos:** "Nuevo evento", in arrivo (modifica/elimina), passati.
- **Archivo:** numero di eventi fatti nell'anno e in totale (solo per loro).
- **Hilos** (associazioni, dopo il lancio, flag `threads`): richieste in attesa, fili attivi con storie modificabili, "Proponer un hilo".
- **Invita:** link personale `/invitacion/[token]`, messaggio precompilato con il nome di chi invita, pulsanti WhatsApp / copia. Facoltativo. Nessun conteggio pubblico. Chi arriva da un invito può proporre subito un filo a chi l'ha invitato (quando i fili sono attivi).
- **Mi ficha:** modifica della scheda pubblica, compresi in modo ben visibile i **dati di contatto pubblici** (email, telefono, web o red social), il logo e "Nuestra historia" (§7); interruttore "Mostrar mi perfil en Google" per "Gente que hace cosas".
- **Mi cuenta:** scarica tutti i miei dati (JSON) ed elimina account.
- **Ayuda y contacto:** un riquadro con l'email del progetto per domande e problemi (`brand.contactEmail`) e il link a `/legal`.
- **Memoria del año:** fuori dalla v1, rimandata (flag `annualMemory` spento). Non si costruisce ora.
- **Nessun conteggio delle visite.**

## 10. Profesionales `/profesionales` (solo registrati) — bacheca annunci
- **Annunci semplici:** **Busco / Ofrezco**, tipo, barrio, descrizione breve (max 300), contatto scelto.
- **Scadenza automatica:** ogni annuncio scade dopo **60 giorni**; si rinnova con un clic.
- Pulsante **"Ya lo he encontrado"** che chiude l'annuncio.
- Ricerca con pochi filtri: Busco / Ofrezco, tipo, barrio, testo libero.
- **"Ofrezco espacio":** gli ex "Espacios disponibles" sono annunci di questo tipo nella stessa bacheca. Li pubblicano **le associazioni e gli Espacios** (`venue`), mai "Gente que hace cosas".
- Niente foto, niente portfolio, niente contatori.
- **Nessuna messaggistica interna.** Si mostra il contatto scelto, poi ci si parla fuori.
- Migrazione (scadenza, stato chiuso, eventuale unificazione con `spaces`) nella sessione 9.

## 11. Identità visiva
Non decisa. Segnaposto neutri, un solo tema scuro, mobile-first. Tutto ciò che è visivo vive in `src/app/globals.css` (token), `src/config/brand.ts` e `public/brand/`. Claude non disegna loghi, copertine, illustrazioni o animazioni. Dettagli e slot in `docs/DESIGN_HANDOFF.md`.

## 12. Privacy e sicurezza (minimo non negoziabile anche nella demo)
Regole complete in `docs/PRIVACY_AND_OWNERSHIP.md`. In sintesi:
- RLS su ogni tabella; un utente modifica solo le organizzazioni di cui è membro (`memberships`).
- Elenco del Comune importato, NIF e risposte dell'iscrizione mai visibili al pubblico. Si accettano solo NIF di enti, mai documenti personali.
- Ogni vista `security_invoker = true`.
- Nessun analytics, tracker, script di terze parti o cookie oltre a quello di sessione: quindi nessun banner cookie.
- Nessuna password (solo link magico). Chiavi segrete solo lato server.
- Testi dal database sempre come testo, mai come HTML.
- Unica immagine della v1: il logo dell'organizzazione, ri-codificato lato server senza metadati EXIF/GPS. Nessuna foto degli eventi.
- Nessun dato personale nei log.
- Database e funzioni in regione UE.
- `/legal` con aviso legal, privacidad, condiciones, email contenuti illegali (testi segnaposto finché un avvocato non li rivede).

## 13. Fuori perimetro nella versione 1
Le parti non pronte restano dietro un flag in `src/config/flags.ts` (con scadenza), non vengono cancellate.

Copertina/intro animata e identità visiva · notifiche · account per cittadini · aggiungi al calendario · chat o messaggi interni · like/follower/contatori · segnalazioni tra organizzazioni · prove o conferme degli eventi · colori per categoria o per organizzazione · Ghost Map o realtà non registrate sulla mappa · formulari "raccolta bisogni" · filo creato dal vivo all'aperitivo · personalizzazione della pagina da parte dell'associazione · sezione storie/memorie · lingua italiana (predisposta, non attiva) · esportazione eventi in formati aperti (iCal/JSON/ActivityPub: modello dati **predisposto**, implementazione dopo, flag `openFeeds`) · dashboard del fondatore con statistiche (esiste solo la pagina privata di revisione, §2) · pagina "quién cree en este barrio" (dopo che esiste un'associazione titolare) · **foto degli eventi** e qualsiasi immagine oltre al logo · **Memoria del año** (rimandata, flag `annualMemory`) · **"Lugares amigos"** (bar di quartiere come punto d'incontro/sostenitori: se ne parla in una sessione dedicata ai finanziamenti) · organizzazioni come punti propri sulla mappa Hoy.

I **fili** (§6) sono costruiti prima del lancio ma restano spenti (flag `threads`) e si accendono dopo il lancio.

## 14. Pagine per Google (SEO)

| Pagina | Indicizzata | Regola |
|---|---|---|
| `/a/[slug]` associazione | sì | sempre |
| `/a/[slug]` professionista | sì di default | interruttore "Mostrar mi perfil en Google"; se spento `noindex` |
| `/e/[slug]` evento | sì fino alla fine | 7 giorni dopo la fine dell'ultima occorrenza → redirect permanente alla scheda dell'organizzatore (308 di Next.js, che Google tratta come 301; decisione della sessione 4) |
| `/barrio/[slug]` | solo con contenuto | `noindex` finché non ha almeno un'associazione o un evento futuro |
| `/`, `/conexiones`, `/que-es`, `/legal` | sì | |
| `/panel`, `/profesionales`, `/entrar`, `/registro`, `/invitacion/*`, `/revision` | no | `noindex`, fuori dalla sitemap |

**Pagine di barrio.** Elenco ufficiale dei barrios di Madrid (open data del Comune, con confini) importato in `neighborhoods`. Organizzazioni ed eventi ricevono il barrio in automatico dalle coordinate. La pagina mostra: "Qué pasa en [Barrio]", mappa centrata, prossimi eventi, associazioni, barrios vicini. Nessuna classifica.

**Regole per tutte le pagine pubbliche:** `generateMetadata` con titolo e descrizione specifici in spagnolo; JSON-LD schema.org (`Event`, `Organization`, `BreadcrumbList`); Open Graph; `sitemap.ts` dinamica solo con pagine indicizzabili; `robots.ts` che esclude le aree private; slug stabili; contenuto renderizzato sul server.

## 15. Dati per la demo
`supabase/seed.sql` con **organizzazioni ed eventi inventati e dichiaratamente fittizi** (nessun nome reale) concentrati in un barrio (es. Carabanchel) più qualche evento altrove e 4-6 fili confermati. Date relative a `now()`, così la demo è viva ogni giorno. Elenco del Comune di prova con 5 NIF fittizi in `municipal_associations`.

**Sito demo** (dopo la sessione 4): un secondo progetto Vercel (es. `mapa-demo`) dallo stesso repository, con le variabili di **mapa-dev** in Production, per avere un indirizzo stabile da mostrare. Banner fisso ben visibile **"Demo · datos de ejemplo"**; nomi delle realtà fittizie chiaramente inventati. Un account demo del fondatore collegato a un'associazione fittizia della seed (riga in `memberships` aggiunta a mano su mapa-dev dopo il primo login, come per `app_admins`), per mostrare dal vivo "pubblico un evento in 30 secondi".

## 16. Criteri di accettazione della demo
1. Aprendo `/` da telefono si vede Madrid con punti `pulse` e `lit` (solo eventi) dai dati di seed; "Solo hoy" lascia solo i `pulse`; `/conexiones` mostra le associazioni e gli espacios attivi con indirizzo.
2. Un'associazione si registra con un NIF presente in `municipal_associations` ed entra verificata a `/panel`; con un NIF già usato o in formato personale (DNI/NIE) riceve il messaggio di errore.
3. Un evento creato dal telefono con titolo e data (resto precompilato) appare sulla mappa in meno di 1 minuto di lavoro.
4. Un professionista crea un evento in un bar: il bar compare sulla mappa solo per quell'evento.
5. Con il flag `threads` acceso (prova su mapa-dev): A propone un filo a B; solo A e B lo vedono in attesa; dopo l'accettazione compare su `/conexiones` e la storia si legge toccandolo.
6. Il link Invita apre `/invitacion/[token]` con il nome di chi invita.
7. Un titolo evento con `<script>` o `<img onerror>` appare come testo nel popup e nella pagina.
8. Un utente non può modificare eventi di un'organizzazione di cui non è membro (test).
9. Un anonimo non può leggere NIF né fili `pending`, neanche attraverso le viste (test).
10. Un logo caricato con coordinate GPS nei metadati viene salvato senza, in WebP, al massimo 256×256 px.
11. "Eliminar cuenta" cancella account, membership e contenuti personali; "Descargar mis datos" restituisce un JSON.
12. `/barrio/[slug]` con dati mostra eventi e associazioni ed è in sitemap; un barrio vuoto ha `noindex`.
13. Una pagina evento contiene JSON-LD `Event` valido; 7 giorni dopo la fine reindirizza alla scheda.
14. Cambiando `appName` in `brand.ts` e un token in `globals.css`, il nome e il colore cambiano ovunque senza toccare altri file.
15. La CI è verde sulla PR della demo: lint con i confini, typecheck, dipendenze, test, build, scansione segreti.
