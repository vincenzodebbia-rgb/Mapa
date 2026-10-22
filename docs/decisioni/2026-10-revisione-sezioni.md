# Revisione delle sezioni — decisioni del fondatore (21 ottobre 2026)

> **Applicata** a `docs/SPEC.md` e `docs/BUILD_PLAN.md` il 21 ottobre 2026, all'inizio della sessione 3 (ramo `feat/map`).
> Da applicare a `docs/SPEC.md` e `docs/BUILD_PLAN.md` **all'inizio della sessione 3**, prima di scrivere codice.
> Dove questo documento contraddice SPEC.md, vale questo documento. Le modifiche al database previste qui
> si fanno con migrazioni nuove **nella sessione che costruisce quella parte**, non nella sessione 3.

## Principio
La mappa non deve mai ingannare: mostra cose che succedono davvero. Chi esiste ma non fa eventi si vede altrove.

## 1. Mappa "Hoy" (`/`) — cambia
- Sulla mappa Hoy ci sono **solo eventi**. Le organizzazioni **non** compaiono come punti propri.
  - `pulse` = evento di oggi non ancora finito.
  - `lit` = evento nei prossimi 7 giorni.
  - Lo stato `faint` **sparisce** dalla mappa Hoy.
- Interruttore ben visibile **"Solo hoy"** (nell'URL, es. `?solo=hoy`): se attivo, si vedono solo gli eventi di oggi. Di default è spento (si vedono oggi + 7 giorni), così la mappa è viva ma onesta: la legenda dice chiaramente cosa significa ogni luce.
- Filtri (tutti nell'URL, nessun colore per categoria):
  - Gratis / De pago (esistente);
  - Categoría (esistente);
  - **Quién organiza**: Asociaciones · Espacios · Gente que hace cosas;
  - **Barrio**: un selettore che centra la mappa sul barrio e filtra la vista elenco (usa `neighborhoods`).
- La vista elenco segue gli stessi filtri.
- Conseguenza: `getLightState` ha due stati per gli eventi; la vista `map_items` può restare com'è (le organizzazioni si filtrano nel codice o con una vista nuova), da decidere nel piano della sessione 3.

## 2. Mappa "Conexiones" (`/conexiones`) — cambia per ora
- **Ora (prima del lancio):** mappa statica di **chi c'è**: tutte le associazioni e gli espacios iscritti e attivi (`status = active`) che hanno dato un indirizzo, ciascuno con un punto acceso e il nome al tocco (link alla scheda). Nessun filo.
- **Dopo il lancio:** si aggiungono i fili tra associazioni come da SPEC §6 (flag `threads` resta spento fino ad allora; schema già pronto).
- Così chi si iscrive "si accende" subito, anche se non ha eventi.

## 3. Chi si iscrive — nomi e domande
- Il tipo `professional` nell'interfaccia si chiama **"Gente que hace cosas"** (collettivi, artisti, persone con progetti). Il valore nel codice resta `professional`.
- **Espacios**: domande ridotte a **chi sono, dove sono, cosa offrono**:
  1. "¿Quiénes sois?" (obbligatoria, max 500) → colonna `what_for_whom`;
  2. Tipo de actividad (obbligatorio, elenco esistente);
  3. "¿Qué ofrecéis?" (obbligatoria, max 500) → colonna `how_sustained` va rinominata o sostituita con una colonna `what_they_offer` (migrazione nella sessione 5; aggiornare `admin_review_list`).
  - L'indirizzo per gli espacios è obbligatorio (sono un luogo).
- **Associazioni**: domande facoltative come deciso il 18 ottobre.
- **Inviti**: facoltativi (nessuno è obbligato a usarli). La **revisione automatica minima** resta per tutti: NIF da ente con controllo del formato, un NIF = un account, conferma email, anti-robot, limiti di frequenza, avviso al fondatore per gli espacios "dubbi" senza invito.

## 4. Scheda pubblica `/a/[slug]` — aggiunta
- **Logo piccolo, facoltativo**: una sola immagine per organizzazione, ri-codificata lato server in WebP, **massimo 256×256 px**, metadati rimossi, bucket `org-logos` (stessa regola di percorso di `event-images`). Nessuna galleria, nessuna foto di copertina. **(Da riconfermare: vedi §10.)**
- Spazio di archiviazione: con 256 px e WebP ogni logo pesa pochi KB; il limite gratuito di Supabase Storage non è un problema per migliaia di organizzazioni.
- Migrazione (colonna `logo_path` + bucket + policy) nella sessione 4 o 7.
- **Confermato il 21 ottobre sera.**

## 5. Pagine di quartiere `/barrio/[slug]` — confermate
Restano nel piano (sessione 4), sono importanti per farsi trovare. Serve l'import dei confini ufficiali dei barrios (script `scripts/import-neighborhoods.ts`).

## 6. Home privata `/panel` — aggiunte
- **"Ayuda y contacto"**: un riquadro con l'email del progetto per domande e problemi (da `brand.ts`), più il link alla pagina `/legal`.
- **Mi ficha** permette di modificare i dati di contatto pubblici (email, telefono, web o red social) — già previsto, va reso evidente.
- **Memoria del año**: resta **fuori** dalla v1, rimandata (flag `annualMemory` spento). Non si costruisce ora.

## 7. Bacheca "Profesionales" (`/profesionales`) — confermata e semplificata
Resta nel piano (sessione 9), solo per iscritti. Regole:
- Annunci semplici: **Busco / Ofrezco**, tipo, barrio, descrizione breve (max 300), contatto scelto.
- **Scadenza automatica**: ogni annuncio scade dopo **60 giorni** (si può rinnovare con un clic).
- Pulsante **"Ya lo he encontrado"** che chiude l'annuncio.
- Nessuna messaggistica interna: si mostra il contatto, poi si parlano fuori.
- Gli "Espacios disponibles" diventano annunci di tipo "Ofrezco espacio" nella stessa bacheca: così sparisce il doppio uso della parola "Espacios".
- Migrazione (scadenza, stato chiuso, eventuale unificazione con `spaces`) nella sessione 9.

## 8. Co-organizzatori
Restano nel piano ("Organizado junto a"), senza urgenza.

## 9. Ordine di lavoro
Si costruiscono tutte le sessioni 3-9 prima del lancio. Fuori resta solo la Memoria del año (e i fili veri e propri, che si accendono dopo il lancio). **Aggiornato il 21 ottobre sera, vedi §10: dopo la sessione 4 la demo si mostra in privato a 2-3 associazioni di fiducia.**

## 10. Aggiunte del 21 ottobre (sera) — decisioni del fondatore
- **Nessuna foto degli eventi nella v1.** Si toglie il campo immagine dal modulo evento e dalla pagina evento; il bucket `event-images` non si usa (si potrà rimuovere con una migrazione nella sessione 6). Si riconsidera solo con un piano a pagamento e un database grande. Open Graph della pagina evento: immagine generata con solo testo (titolo, data, luogo) oppure nessuna.
- **Logo piccolo dell'organizzazione (§4): CONFERMATO** dal fondatore (resta come descritto al §4). È l'unica immagine della v1.
- Idea "Lugares amigos" (bar di quartiere come punto d'incontro/sostenitori): **rimandata**, se ne parla in una sessione dedicata ai finanziamenti. Non si costruisce ora.
- **"Nuestra historia"**: campo testuale facoltativo nella scheda pubblica di associazioni ed espacios (max 1000 caratteri, solo testo), modificabile da "Mi ficha". Migrazione (colonna `story`) nella sessione 4 o 7. Nessuna sezione separata di storie.
- **Demo da mostrare alle associazioni**: un sito demo separato con i dati fittizi di mapa-dev.
  - Un secondo progetto Vercel (es. `mapa-demo`) dallo stesso repository, con le variabili di **mapa-dev** in Production: indirizzo stabile da mostrare.
  - Banner fisso ben visibile: **"Demo · datos de ejemplo"**. Nomi delle realtà fittizie chiaramente inventati: nessuno deve pensare che siano associazioni vere.
  - Un account demo del fondatore collegato a un'associazione fittizia della seed (riga in `memberships` aggiunta a mano su mapa-dev dopo il primo login, come per `app_admins`), per mostrare dal vivo "pubblico un evento in 30 secondi".
  - Da fare dopo la sessione 4 (serve almeno mappa + pagine).
- **Ordine:** si costruisce tutto (sessioni 3-9), ma **dopo la sessione 4** il fondatore mostra la demo in privato a 2-3 associazioni di fiducia per raccogliere commenti prima delle sessioni 5-9.
