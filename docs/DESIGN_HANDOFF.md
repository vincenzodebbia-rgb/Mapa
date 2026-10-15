# Design: cosa manca e dove andrà

> Nome, logo, copertina e stile visivo **non sono decisi**. Il codice è costruito perché il design arrivi dopo
> senza toccare la logica. Questo file è il contratto tra le due fasi.

## Regola per Claude, prima del design
Interfaccia neutra e funzionante. Usa solo i token esistenti. **Non** inventare un nome, un logo, una copertina,
un'animazione d'ingresso, illustrazioni, font decorativi o colori nuovi. Se una schermata sembra spoglia, va bene così.

## Dove vive il design (gli unici posti)

| Cosa | File | Oggi (segnaposto) | Arriverà con il design |
|---|---|---|---|
| Nome, tagline, descrizione | `src/config/brand.ts` | "Mapa", "Tu barrio vive" | nome definitivo, sottotitolo |
| Colori, font, raggi, ombre | `src/app/globals.css` (`@theme`) | grigi caldi e un arancione neutro | palette definitiva |
| Font | `src/app/layout.tsx` (solo il caricamento con `next/font`) + `--font-display`/`--font-sans` | font di sistema | font del marchio |
| Logo, favicon, icone PWA, immagine Open Graph | `public/brand/` | logo testuale | SVG del logo, favicon 32 px, icone 192 e 512 px (anche "maskable"), OG 1200×630 |
| Stile della mappa | `brand.mapStyleUrl` | stile scuro di OpenFreeMap | stile personalizzato (es. fatto con Maputnik) salvato in `public/brand/map-style.json` |
| Aspetto dei 3 stati di luce | token `--color-light`, `--color-faint` + animazione `pulse` in `globals.css` | pallino che pulsa | forma e animazione definitive |
| Colori dei fili | token `--color-thread-1…4` | 4 colori neutri | palette dei fili |
| Copertina / intro | `src/components/brand/intro.tsx` dietro il flag `intro` (spento) | vuoto | copertina e animazione d'ingresso |
| Testi del marchio | `messages/es.json` (chiavi `brand.*`, `queEs.*`) | segnaposto | manifesto, "qué es" |

## Il patto
- La fase design può cambiare **solo** i file della tabella e lo stile dei componenti in `src/components/ui/`.
- Se il design richiede di spostare elementi in una pagina o aggiungere una funzione, è una normale PR di prodotto, con la sua voce in `docs/SPEC.md`.
- Le regole restano: niente colori fuori dai token, niente `style={{}}`, contrasto AA, `prefers-reduced-motion` rispettato, la mappa resta leggibile (nessun pattern sopra la mappa).

## Prova che il patto funziona (criterio 14 della SPEC)
Cambiare `appName` in `brand.ts` e il valore di `--color-light` deve cambiare nome e colore delle luci ovunque, senza toccare altri file.

## Prompt per la sessione di design (quando il nome è deciso)
> Leggi `docs/DESIGN_HANDOFF.md`. Ti do: nome, sottotitolo, palette (valori), font (nomi Google Fonts o file), logo SVG e lo stile mappa JSON.
> Aggiorna solo i file della tabella "Dove vive il design". Poi attiva il flag `intro` e costruisci la copertina in `src/components/brand/intro.tsx` secondo questa descrizione: [descrizione]. Durata massima 3 secondi, saltabile con un tocco, nessuna animazione con `prefers-reduced-motion`. Mostrala solo quando si arriva su `/` da fuori dal sito, **senza salvare nulla nel browser** (niente localStorage o cookie: salvare "già vista" sul dispositivo richiederebbe il consenso e un banner).
> Mostrami screenshot da telefono di `/`, `/a/[slug]`, `/e/[slug]` e `/panel` prima e dopo. Verifica il contrasto AA dei nuovi token. Esegui `npm run check`.
