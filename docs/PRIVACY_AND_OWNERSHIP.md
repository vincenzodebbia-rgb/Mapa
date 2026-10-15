# Privacy e proprietà

> Due lettori. La **parte A** è per Claude e per chi scrive codice: regole che il codice deve rispettare.
> Le **parti B–E** sono per il fondatore: cose da fare fuori dal codice.
> Non è consulenza legale. I testi legali definitivi (aviso legal, privacidad, condiciones) vanno rivisti da un avvocato prima del lancio pubblico.

## A. Regole per il codice (privacy by design)

1. **Minimo indispensabile.** Si raccolgono solo i dati elencati in `docs/DATA_MODEL.md` (colonna "Personal data"). Un nuovo dato personale richiede di aggiornare quella tabella e questo file nella stessa PR.
2. **Cittadini senza account e senza tracce.** Nessun account, nessun cookie, nessun identificatore, nessuna geolocalizzazione, nessun "aggiungi al calendario". L'unico cookie del sito è quello di sessione di Supabase per chi fa login: è tecnico, quindi **non serve un banner cookie**. Il giorno in cui si aggiunge qualsiasi altro cookie o script esterno, questa regola cade e serve un banner: per questo è vietato senza decisione scritta (ADR).
3. **Niente analytics nella demo.** In seguito solo strumenti senza cookie e aggregati, scelti con un ADR.
4. **Niente dati personali nei log**, negli errori inviati a strumenti esterni, negli URL, nei nomi dei file.
5. **Numeri di registro e registro importato** non sono mai leggibili da `anon` o `authenticated`.
6. **Contatti pubblici solo per scelta.** I campi di contatto di un'organizzazione sono pubblici perché li compila lei sapendolo: il modulo lo dice in chiaro ("Este contacto será público").
7. **Immagini:** ri-codificate lato server, metadati EXIF/GPS rimossi. Chi carica dichiara di avere i diritti.
8. **Diritti GDPR nel prodotto:** "Descargar mis datos" (JSON) ed "Eliminar cuenta" in `/panel`, senza dover scrivere email.
9. **Accettazioni registrate:** versione di condiciones e privacidad, data, dichiarazione di età. Le versioni dei testi stanno in `messages/es.json` con un numero di versione.
10. **Regione UE:** progetti Supabase in una regione UE; funzioni Vercel in `fra1`. Nessun servizio che sposti dati personali fuori dall'UE senza ADR.
11. **Segnalazioni di contenuti illegali (DSA):** un indirizzo email in `/legal`. Quando il fondatore rimuove un contenuto, l'organizzazione riceve una motivazione (testo standard in `messages/es.json`). Niente moderazione automatica, niente segnalazioni tra organizzazioni.
12. **Seed e test** con dati inventati. Mai nomi, email o indirizzi di persone o associazioni reali.

## B. Titolare del trattamento: cosa devi fare tu

Finché non esiste un'associazione, **sei tu, come persona, il titolare del trattamento** dei dati di chi si registra. Non è un problema, ma comporta obblighi:

| Cosa | Come, a costo zero | Quando |
|---|---|---|
| Registro delle attività di trattamento (RAT) | Strumento gratuito **Facilita RGPD** dell'AEPD, poi adattalo usando la tabella dei dati di `DATA_MODEL.md` | Prima del lancio pubblico |
| Informativa privacy, aviso legal, condiciones | Bozza generata da Facilita + i testi segnaposto di `/legal`; revisione dell'avvocato | Prima del lancio pubblico |
| Accordi con i fornitori (DPA) | Supabase e Vercel li includono nei termini: scarica e archivia le versioni accettate | Quando crei i progetti |
| Aviso legal (LSSI) | Nome, NIE, email di contatto. Valuta con l'avvocato se usare un indirizzo dedicato | Prima del lancio |
| Procedura in caso di violazione dei dati | `docs/operations.md`, sezione "Incidente": entro 72 ore notifica all'AEPD se c'è rischio per le persone | Scritta prima del lancio |
| Conservazione | Account eliminati: subito. Eventi: restano nell'archivio dell'organizzazione finché esiste. Accettazioni: finché esiste l'account. Backup: 30 giorni | Scritta nell'informativa |

**Backup:** sul piano gratuito Supabase non fa backup. Il backup contiene dati personali, quindi **mai** come file o artifact in un repository pubblico. Va cifrato e salvato in un posto privato (vedi `docs/operations.md`).

**Il vecchio progetto.** Il database del vecchio Marrangió contiene associazioni reali inserite senza la loro iscrizione. **Non migrarle** nel nuovo progetto: contraddice la regola "sulla mappa solo chi si iscrive". Esporta un archivio cifrato per te e cancella il vecchio progetto quando il nuovo è online. Sostituisci anche il vecchio `COPYRIGHT.md` ("tutti i diritti riservati, riproduzione vietata"): contraddice la licenza AGPL e confonde chiunque legga il codice.

## C. Proprietà dell'idea: cosa resta tuo

**L'idea in sé non si può proteggere da nessuna parte.** Si proteggono: il codice e i testi (diritto d'autore, automatico), il nome e il logo (marchio, a pagamento), i domini e gli account (a chi li intesta), la direzione del progetto (governance).

Misure gratuite da fare subito:
1. **Licenza giusta e firmata.** `LICENSE` con il testo AGPL-3.0 integro, `NOTICE.md` con "Copyright (C) 2026 Vincenzo De Biase". Chi copia il codice deve pubblicare le sue modifiche e citarti.
2. **CLA per chi contribuisce.** Un contributor licence agreement (gratis con CLA Assistant su GitHub) ti lascia la possibilità di cambiare o doppiare la licenza in futuro. Senza, ogni contributo esterno ti lega per sempre all'AGPL. Va attivato prima della prima PR esterna.
3. **Politica del marchio** (`TRADEMARKS.md`): il codice è libero, il nome e il logo no. Chi fa un fork deve cambiare nome. Vale anche prima della registrazione, come dichiarazione pubblica; la registrazione la rafforza.
4. **Account a tuo nome, con 2FA e codici di recupero salvati offline:** GitHub (repository sotto il tuo account o un'organizzazione di cui sei unico owner), Vercel, Supabase, Cloudflare, dominio, email del progetto. Nessun collaboratore, umano o AI, ha la password o le chiavi di produzione.
5. **Prova di data.** La storia di git con le date è già una prova della paternità. Tieni anche una copia datata dei documenti di progetto (es. un'email a te stesso con allegati, o un registro di opere online).
6. **Logo generato con AI:** probabilmente non protetto da diritto d'autore. Il logo definitivo va disegnato o rielaborato da una persona, e poi registrato come marchio.

Misure a pagamento, dopo aver scelto il nome definitivo:
- **Marchio spagnolo (OEPM)** nelle classi 41 e 42: circa 207 € online. Prima di registrare, cerca il nome nelle banche dati OEPM/EUIPO.
- **Marchio UE (EUIPO)** solo quando apri un'altra città o un altro paese: da 850 €.
- **Dominio** `.org` o `.es`: circa 10-15 €/anno. Compralo appena il nome è deciso, prima di dirlo in giro.

## D. Dati, associazioni e partner

La tua posizione è "la piattaforma e i dati restano miei". Il modo che regge giuridicamente ed eticamente è questo:
- **La piattaforma, il marchio e il database come insieme** sono tuoi: li hai progettati e ci hai investito.
- **I contenuti di ogni associazione sono suoi.** Con le condiciones l'associazione concede alla piattaforma una licenza non esclusiva per mostrarli; può scaricarli e cancellarli quando vuole. È anche la garanzia che rende credibile "anti-estrattivo" nei barrios.
- **I partner** (un festival, un'associazione vicinale) non ricevono dati personali in automatico. Se un giorno serve condividere i contatti con un partner, si aggiunge una casella di consenso esplicita e separata, e la condivisione passa da te. Nella v1 questa funzione non esiste.
- Prima di collaborare con un partner, **un accordo scritto di una pagina**: chi fa cosa, cosa resta tuo (piattaforma e marchio), cosa resta delle associazioni (i loro contenuti), cosa riceve il partner (visibilità, attribuzione), come si chiude.

## E. Quando fondare un'associazione

Da solo puoi lanciare la demo e il pilota. Un'**asociación registrata** (3 fondatori, iscrizione in Comunidad de Madrid, circa 45 €) serve per: bandi municipali, ringraziare commercianti senza diventare tu un'attività economica, volontari, spazi e prestiti del Comune. Quando nasce, tieni il marchio e i domini a tuo nome e concedili in licenza all'associazione: così resta tua la creatura, e l'associazione può usarla.
