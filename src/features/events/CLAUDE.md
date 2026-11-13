Questo blocco possiede `events`, `event_organizers` e il bucket di Storage `event-images` (non usato: niente immagini degli eventi nella v1, si può togliere con una migrazione).
Contratto: data.ts (letture server-only → DTO in types.ts), actions.ts, schema.ts, components/. Nient'altro si importa da fuori.
I nomi degli organizzatori arrivano da una join in data.ts; mai importare da src/features/organizations. La ricerca dei co-organizzatori è uno slot (`coorganizerPicker`) passato dalla pagina.
Le ripetizioni le espande solo la funzione SQL `event_occurrences`. Mai reimplementarle in TypeScript.
Gli orari sono timestamptz; si mostrano in Europe/Madrid con src/lib/dates.ts.
Geocodifica solo tramite src/lib/domain/geocode.ts (Nominatim, cache, 1 richiesta/s). Senza coordinate = non si può pubblicare.
Niente immagini degli eventi nella v1 (docs/SPEC.md §5): nessun campo immagine nel modulo né nella pagina evento. Open Graph usa un'immagine generata di solo testo, oppure nessuna.
Il tetto di 20 eventi al giorno per organizzazione lo applica il database (trigger events_rate_limit, errore `rate_limited`), anche per gli insert diretti via API: l'action traduce `rate_limited` nel messaggio "Demasiados intentos". Il limite dell'action con isWithinRateLimit resta utile per contare anche i tentativi falliti.
Le letture pubbliche (pagina evento, elenchi dei prossimi eventi, sitemap) usano createSupabasePublicClient() dentro `'use cache'` + cacheLife("minutes") + cacheTag(EVENTS_TAG): la pagina evento è completamente statica, quindi il 404 e il redirect dopo 7 giorni (308, event-page-rules.ts) sono stati veri. Ogni scrittura su un evento deve chiamare updateTag(EVENTS_TAG).
La prossima occorrenza e la fine dell'ultima arrivano dalla funzione SQL event_schedule; gli elenchi dalla vista upcoming_events (60 giorni). EventDetails scrive da sé il proprio JSON-LD (event-json-ld.ts) e il pulsante Compartir (Web Share API, link WhatsApp, copia).
