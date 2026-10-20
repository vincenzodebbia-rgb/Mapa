# Specifica del prodotto — versione 1 (demo)

> Documento per Claude Code e per il fondatore. Le decisioni qui sotto sono prese: non vanno ridiscusse durante lo sviluppo. Se una richiesta le contraddice, Claude lo dice e chiede.
> Identificatori nel codice in inglese, testi dell'interfaccia in spagnolo (`messages/es.json`).
> **Nome, logo, copertina e stile visivo NON sono decisi.** Si costruisce con segnaposto neutri (`src/config/brand.ts`, token in `src/app/globals.css`). Vedi `docs/DESIGN_HANDOFF.md`.

## 1. Cos'è
Una mappa di Madrid che mostra **cosa fanno oggi** le piccole associazioni, i collettivi e i professionisti della cultura e del sociale, e i **fili** tra le associazioni che si sono conosciute o hanno collaborato. Gratis, open source (AGPL-3.0), senza pubblicità né algoritmi. L'obiettivo è che le persone chiudano la mappa ed escano.

## 2. Chi c'è

| Tipo (`organizations.kind`) | Come entra | Sulla mappa | Cosa può fare |
|---|---|---|---|
| `association` (terzo settore) | Email + NIF dell'ente. Se il NIF è nell'elenco del Comune entra subito, verificata (§8). Un NIF = un solo account | Un punto alla sede, solo se ha dato un indirizzo | Pubblicare eventi, fili, home privata, Invita, pubblicare spazi, memoria dell'anno |
| `venue` — nella UI "Espacio" (librerie, sale piccole, centri culturali, gallerie, studi, caffè culturali, locali notturni…) | Email + NIF dell'ente + tipo di attività + domande (§8) | Un punto alla sede, solo se ha dato un indirizzo | Pubblicare eventi, pubblicare spazi disponibili, home privata. Niente fili né inviti |
| `professional` (collettivi, artisti, chi ha progetti) | Iscrizione libera con email | **Nessun punto proprio.** Compare solo tramite i suoi eventi, nel luogo dell'evento | Pubblicare eventi in qualsiasi luogo, profilo nella sezione Profesionales |
| Luoghi non registrati (bar, studi) | Non si registrano | Solo il giorno di un evento, come "dove succede" | Niente: sono un indirizzo dentro l'evento |
| Cittadini | Nessun account | Vedono tutto il pubblico | Solo condividere un evento |

Nella UI `venue` si chiama "Espacio" e ha una sua sezione "Espacios". Attenzione: anche gli "Espacios disponibles" (§10, tabella `spaces`) usano la stessa parola; il nome delle due sezioni si decide nella sessione 9.

Accesso: **link magico via email** (Supabase Auth), nessuna password. Chi crea un account dichiara di avere almeno 18 anni (da confermare con l'avvocato, vedi PRIVACY).

Protezione da spam: conferma email, Cloudflare Turnstile sui moduli di iscrizione e invito, limite di frequenza sulle azioni di pubblicazione. **Nessun sistema di segnalazione tra organizzazioni.** Esiste solo un indirizzo email pubblico per segnalare contenuti illegali (obbligo DSA), nella pagina `/legal`.

**Revisione del fondatore (minima).** Non c'è moderazione prima della pubblicazione: tutti entrano subito. Il fondatore riceve un avviso solo per gli espacios con attività "dubbia" entrati senza invito, e ogni 2-3 mesi rilegge tutti i profili in una pagina privata (`admin_review_list`: nome, tipo, attività, barrio, web, risposte; mai NIF né email). Può sospendere, riattivare o eliminare un'organizzazione, sempre con una motivazione che le arriva per email (DSA). Un'organizzazione sospesa sparisce dal pubblico con tutti i suoi contenuti; i suoi membri la vedono ancora. Non è una dashboard: niente statistiche né contatori.

## 3. Pagine (URL in spagnolo)

| Rotta | Pubblico | Contenuto |
|---|---|---|
| `/` | tutti | Mappa **Hoy** a schermo intero (§4) |
| `/conexiones` | tutti | Mappa **Conexiones** (§6) |
| `/a/[slug]` | tutti | Scheda pubblica dell'organizzazione (§7) |
| `/e/[slug]` | tutti | Pagina evento (§5) |
| `/barrio/[slug]` | tutti | Pagina di quartiere (§14) |
| `/que-es` | tutti | Testo breve "qué es" + manifesto (segnaposto in `messages/es.json`) |
| `/legal` | tutti | Aviso legal, privacidad, condiciones, email contenuti illegali, link al codice sorgente, attribuzioni open data |
| `/entrar` | tutti | Login con link magico |
| `/registro` | tutti | Scelta: "Soy una asociación" / "Soy un espacio" / "Soy profesional o colectivo" (§8) |
| `/invitacion/[token]` | tutti | Atterraggio da un invito, con il nome di chi invita (§9) |
| `/panel` | loggati | Home privata (§9) |
| `/panel/eventos/nuevo`, `/panel/eventos/[id]` | loggati | Modulo evento (§5) |
| `/profesionales` | solo loggati | Sezione professionisti e spazi (§10) |

Nessuna pagina "tutte le associazioni" ordinata per popolarità. Una vista elenco esiste solo come alternativa accessibile alla mappa (stessi dati, ordinati per orario).

## 4. Mappa "Hoy" (`/`)

**Apertura.** Si entra direttamente nella mappa. La copertina/intro animata è uno **slot vuoto** dietro il flag `intro` (spento): verrà progettata con l'identità visiva. Nessun lavoro su di essa nella v1.

**Base.** MapLibre con lo stile indicato in `brand.mapStyleUrl` (segnaposto: stile scuro di OpenFreeMap). Centro iniziale: Madrid. Niente geolocalizzazione, nessuna richiesta di permessi.

**Tre stati di luce, stessa dimensione per tutti i punti:**

| Stato | Cosa rappresenta | Aspetto (token) |
|---|---|---|
| `pulse` | Evento che si svolge **oggi** (ora di Madrid) e non è ancora finito | `--color-light`, pulsante |
| `lit` | Evento nei prossimi 7 giorni, **oppure** associazione con attività negli ultimi 90 giorni | `--color-light`, fermo |
| `faint` | Associazione registrata senza attività negli ultimi 90 giorni | `--color-faint` |

"Attività" = ha pubblicato o aggiornato un evento, un filo o la scheda (`organizations.last_activity_at`). Gli eventi finiti spariscono dalla mappa (restano nell'archivio). Funzione pura `getLightState(item, now)` con test unitari. Con `prefers-reduced-motion` il `pulse` non pulsa.

**Legenda:** solo i tre stati, piccola, richiudibile.

**Filtri:** `Gratis / De pago` e `Categoría`. Nessun filtro per zona: si zooma. I filtri stanno nell'URL (`?precio=gratis&cat=musica`). Le categorie **non hanno colori**.
Categorie (`event_category`): `musica` Música · `teatro_danza` Teatro y danza · `arte` Arte · `talleres` Talleres · `encuentros` Encuentros y charlas · `comunidad` Comunidad · `otros` Otros.

**Popup** al tocco: titolo, organizzatore/i, orario, prezzo, indirizzo, pulsante "Ver". Costruito con `textContent`.

**Vista elenco** (pulsante): gli stessi elementi visibili, ordinati per orario.

**Giorni vuoti:** "Hoy no hay nada por aquí. Mira los próximos días." Mai contenuti finti.

## 5. Eventi

**Modulo in 4 blocchi** (`/panel/eventos/nuevo`), pensato per il telefono, obiettivo 30 secondi:
1. **Qué**: `title` (obbligatorio, max 120); `category` (precompilata con la più usata dall'organizzazione); `price_type` `free` | `donation` | `paid` (precompilato `free`) + `price_amount` se `paid`.
2. **Cuándo**: giorno; ora di inizio e di fine (fine proposta = inizio + 2 h); interruttore "Se repite" → `weekly` | `monthly` + data di fine (max 6 mesi).
3. **Dónde**: precompilato con la sede (associazioni). Si può cambiare: indirizzo + nome del luogo (`venue_name`). Geocodifica lato server (Nominatim, User-Agent con contatto, cache, max 1 richiesta/secondo) e **pin trascinabile**. Senza coordinate l'evento non si pubblica.
4. **Más** (chiuso di default): immagine (max 2 MB, ri-codificata lato server, ridimensionata, **metadati EXIF/GPS rimossi**); descrizione (max 500); **"Organizado junto a"** altre organizzazioni registrate.

Regole:
- Pubblicazione **senza limite di numero** (solo limite tecnico anti-abuso: 20 eventi al giorno per organizzazione).
- Nessuna prova o conferma. Ogni evento mostra sempre chi lo propone.
- Un co-organizzatore può togliersi da un evento in qualsiasi momento. La collaborazione si legge solo nella pagina evento ("Organizado por X y Y"), non cambia il punto sulla mappa.
- Ripetizioni: si salva la regola, le occorrenze si calcolano in un solo posto, la funzione SQL `event_occurrences`, in ora locale di Madrid (le 19:00 restano 19:00 anche al cambio dell'ora legale). Testata.
- Dopo `ends_at` l'evento non è più sulla mappa ma resta nell'**archivio** dell'organizzazione.
- Chi carica un'immagine dichiara di averne i diritti (casella nel modulo, testo in `messages/es.json`).

**Pagina evento** `/e/[slug]`: titolo, organizzatore/i (link), data e ora, prezzo, luogo, descrizione, immagine, "Cómo llegar" (OpenStreetMap con coordinate), **Compartir** (Web Share API; fallback link WhatsApp `https://wa.me/?text=` + copia link). Open Graph. Nessun "aggiungi al calendario".

## 6. Fili e mappa "Conexiones" (`/conexiones`)
- **Solo tra associazioni.**
- **Richiesta e conferma:** A propone il filo a B con una storia breve (max 300). Il filo `pending` è visibile **solo ad A e B**, nella loro home. B accetta (e può aggiungere la sua storia) o lo ignora. Dopo 60 giorni il pending scade. Nessuna email, nessuna notifica.
- **Mappa statica:** solo associazioni con almeno un filo confermato e i fili tra loro. Colore del filo casuale tra `--color-thread-*`, solo estetico.
- **Tocco su un filo:** le due associazioni e le storie. Su telefono la scheda dell'associazione mostra anche l'elenco dei suoi fili.
- **Nessun effetto:** nessun conteggio pubblico, nessuna classifica, nessun vantaggio.
- I fili non invecchiano. Ciascuna delle due può eliminarlo; le storie si aggiornano.

## 7. Scheda pubblica `/a/[slug]`
Minima, senza numeri né contatori: nome; `one_liner` (max 120); `when_to_visit` (es. "Los jueves a las 19h"); contatto esterno scelto da loro (email e/o telefono e/o link); barrio; indirizzo solo se scelto; prossimi eventi; per le associazioni, fili confermati con storie. Professionisti: niente punto, niente indirizzo.

## 8. Registrazione `/registro`
**Chi entra e come** (in parole semplici):

| Chi | Cosa succede |
|---|---|
| Associazione che sta nell'elenco del Comune (cerchiamo il suo NIF) | Entra subito, con il segno "verificata". Le chiediamo "¿Sois *nombre*?" con il nome ufficiale |
| Chiunque arrivi con un invito valido di un'associazione già sulla mappa | Entra subito, qualunque tipo scelga, senza controlli |
| Espacio con un'attività tranquilla (libreria, sala pequeña, centro cultural, galería, taller/estudio, café cultural) | Entra subito |
| Espacio con un'attività "dubbia" (discoteca/club, bar nocturno, otro) senza invito | Entra subito, ma il fondatore riceve un avviso e la guarda |
| Collettivo o artista | Solo email, nessun punto fisso |
| Associazione che non sta nell'elenco e non ha invito | Entra; se con o senza avviso al fondatore **si decide nella sessione 5** |

**Associazione ed Espacio:** email → link magico → NIF dell'ente (solo formato da ente, mai DNI/NIE). Se il NIF è già usato: messaggio con l'email di contatto del progetto. Poi il nome (precompilato con il nome ufficiale se è nell'elenco, modificabile) e le domande:
1. "¿Qué hacéis y para quién?" (max 500)
2. Tipo de actividad — solo per gli Espacios: Librería · Sala pequeña · Centro cultural · Galería · Taller o estudio · Café cultural · Discoteca o club · Bar nocturno · Otro
3. "¿Cómo se sostiene el proyecto?" (max 500)

Per gli **Espacios** le tre risposte sono obbligatorie; per le **associazioni** le domande 1 e 3 sono facoltative. Per tutti c'è il campo facoltativo **"Web o red social"** (pubblico, `contact_url`).
Poi: one_liner, when_to_visit, contatto, indirizzo facoltativo (con pin), categoria abituale.

**Professionista/collettivo:** email → link magico → nome, cosa fa, barrio, contatto, "Web o red social", una riga "Busco / Ofrezco".

In entrambi: casella obbligatoria con 3 regole brevi (realtà vera, nessuna vendita di prodotti, attività reali) + accettazione di condiciones e privacidad. Si salvano versione dei testi e data dell'accettazione.

## 9. Home privata `/panel`
- **Mis eventos:** "Nuevo evento", in arrivo (modifica/elimina), passati.
- **Archivo:** numero di eventi fatti nell'anno e in totale (solo per loro).
- **Hilos** (associazioni): richieste in attesa, fili attivi con storie modificabili, "Proponer un hilo".
- **Invita:** link personale `/invitacion/[token]`, messaggio precompilato con il nome di chi invita, pulsanti WhatsApp / copia. Nessun conteggio pubblico. Chi arriva da un invito può proporre subito un filo a chi l'ha invitato.
- **Memoria del año** (associazioni, flag `annualMemory`): pagina stampabile `/panel/memoria/[anno]`.
- **Mi ficha:** modifica della scheda pubblica (e interruttore "Mostrar mi perfil en Google" per i professionisti).
- **Mi cuenta:** scarica tutti i miei dati (JSON) ed elimina account.
- **Nessun conteggio delle visite.**

## 10. Profesionales `/profesionales` (solo registrati)
- Ricerca con pochi filtri: tipo (`association` / `professional` / `space`), testo libero "busco/ofrezco", barrio.
- **Espacios disponibles:** li pubblicano **le associazioni e gli Espacios** (`venue`), mai i professionisti (tipo, barrio, gratis o a pagamento, descrizione, contatto).
- Profili minimi: niente foto, niente portfolio, niente contatori.
- **Nessuna messaggistica interna.** Si mostra il contatto scelto, poi ci si incontra di persona.

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
- Immagini senza metadati EXIF/GPS.
- Nessun dato personale nei log.
- Database e funzioni in regione UE.
- `/legal` con aviso legal, privacidad, condiciones, email contenuti illegali (testi segnaposto finché un avvocato non li rivede).

## 13. Fuori perimetro nella versione 1
Le parti non pronte restano dietro un flag in `src/config/flags.ts` (con scadenza), non vengono cancellate.

Copertina/intro animata e identità visiva · notifiche · account per cittadini · aggiungi al calendario · chat o messaggi interni · like/follower/contatori · segnalazioni tra organizzazioni · prove o conferme degli eventi · colori per categoria o per organizzazione · Ghost Map o realtà non registrate sulla mappa · formulari "raccolta bisogni" · filo creato dal vivo all'aperitivo · personalizzazione della pagina da parte dell'associazione · sezione storie/memorie · lingua italiana (predisposta, non attiva) · esportazione eventi in formati aperti (iCal/JSON/ActivityPub: modello dati **predisposto**, implementazione dopo, flag `openFeeds`) · dashboard del fondatore con statistiche (esiste solo la pagina privata di revisione, §2) · pagina "quién cree en este barrio" (dopo che esiste un'associazione titolare).

## 14. Pagine per Google (SEO)

| Pagina | Indicizzata | Regola |
|---|---|---|
| `/a/[slug]` associazione | sì | sempre |
| `/a/[slug]` professionista | sì di default | interruttore "Mostrar mi perfil en Google"; se spento `noindex` |
| `/e/[slug]` evento | sì fino alla fine | 7 giorni dopo `ends_at` → redirect 301 alla scheda dell'organizzatore |
| `/barrio/[slug]` | solo con contenuto | `noindex` finché non ha almeno un'associazione o un evento futuro |
| `/`, `/conexiones`, `/que-es`, `/legal` | sì | |
| `/panel`, `/profesionales`, `/entrar`, `/registro`, `/invitacion/*` | no | `noindex`, fuori dalla sitemap |

**Pagine di barrio.** Elenco ufficiale dei barrios di Madrid (open data del Comune, con confini) importato in `neighborhoods`. Organizzazioni ed eventi ricevono il barrio in automatico dalle coordinate. La pagina mostra: "Qué pasa en [Barrio]", mappa centrata, prossimi eventi, associazioni, barrios vicini. Nessuna classifica.

**Regole per tutte le pagine pubbliche:** `generateMetadata` con titolo e descrizione specifici in spagnolo; JSON-LD schema.org (`Event`, `Organization`, `BreadcrumbList`); Open Graph; `sitemap.ts` dinamica solo con pagine indicizzabili; `robots.ts` che esclude le aree private; slug stabili; contenuto renderizzato sul server.

## 15. Dati per la demo
`supabase/seed.sql` con **organizzazioni ed eventi inventati e dichiaratamente fittizi** (nessun nome reale) concentrati in un barrio (es. Carabanchel) più qualche evento altrove e 4-6 fili confermati. Date relative a `now()`, così la demo è viva ogni giorno. Elenco del Comune di prova con 5 NIF fittizi in `municipal_associations`.

## 16. Criteri di accettazione della demo
1. Aprendo `/` da telefono si vede Madrid con punti `pulse`, `lit` e `faint` dai dati di seed.
2. Un'associazione si registra con un NIF presente in `municipal_associations` ed entra verificata a `/panel`; con un NIF già usato o in formato personale (DNI/NIE) riceve il messaggio di errore.
3. Un evento creato dal telefono con titolo e data (resto precompilato) appare sulla mappa in meno di 1 minuto di lavoro.
4. Un professionista crea un evento in un bar: il bar compare sulla mappa solo per quell'evento.
5. A propone un filo a B; solo A e B lo vedono in attesa; dopo l'accettazione compare su `/conexiones` e la storia si legge toccandolo.
6. Il link Invita apre `/invitacion/[token]` con il nome di chi invita.
7. Un titolo evento con `<script>` o `<img onerror>` appare come testo nel popup e nella pagina.
8. Un utente non può modificare eventi di un'organizzazione di cui non è membro (test).
9. Un anonimo non può leggere NIF né fili `pending`, neanche attraverso le viste (test).
10. Un'immagine caricata con coordinate GPS nei metadati viene salvata senza.
11. "Eliminar cuenta" cancella account, membership e contenuti personali; "Descargar mis datos" restituisce un JSON.
12. `/barrio/[slug]` con dati mostra eventi e associazioni ed è in sitemap; un barrio vuoto ha `noindex`.
13. Una pagina evento contiene JSON-LD `Event` valido; 7 giorni dopo la fine reindirizza alla scheda.
14. Cambiando `appName` in `brand.ts` e un token in `globals.css`, il nome e il colore cambiano ovunque senza toccare altri file.
15. La CI è verde sulla PR della demo: lint con i confini, typecheck, dipendenze, test, build, scansione segreti.
